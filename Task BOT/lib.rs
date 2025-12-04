use spacetimedb::{table, reducer, ReducerContext, Table, SpacetimeType};
use std::collections::HashSet;

#[derive(SpacetimeType, Clone, Debug, PartialEq)]
pub enum TaskStatus {
    Active,
    Completed,
}

#[table(name = task, public)]
#[derive(Clone)]
pub struct Task {
    #[primary_key]
    #[auto_inc]
    id: u64,
    title: String,
    description: String,
    // Milliseconds since Unix epoch
    deadline_ms: i64,
    reminder_count: u32,
    // Milliseconds since Unix epoch
    created_at_ms: i64,
    status: TaskStatus,
}

#[table(name = reminder, public)]
#[derive(Clone)]
pub struct Reminder {
    #[primary_key]
    #[auto_inc]
    id: u64,
    #[index(btree)]
    task_id: u64,
    // Milliseconds since Unix epoch
    time_ms: i64,
    #[index(btree)]
    sent: bool,
}

// Helper table to expose due, unsent reminders without returning data from reducers.
// Contains one row per due reminder (by reminder_id).
#[table(name = pending_reminder, public)]
#[derive(Clone)]
pub struct PendingReminder {
    #[primary_key]
    reminder_id: u64,
    task_id: u64,
    time_ms: i64,
}

#[reducer]
pub fn create_task(
    ctx: &ReducerContext,
    title: String,
    description: String,
    deadline_ms: i64,
    reminder_count: u32,
) -> Result<(), String> {
    let title_trimmed = title.trim().to_string();
    if title_trimmed.is_empty() {
        return Err("Title must not be empty".into());
    }

    let now_micros: i64 = ctx.timestamp.to_micros_since_unix_epoch();
    let now_ms: i64 = now_micros / 1000;

    if deadline_ms <= now_ms {
        return Err("Deadline must be in the future".into());
    }

    let task = Task {
        id: 0, // auto_inc
        title: title_trimmed,
        description,
        deadline_ms,
        reminder_count,
        created_at_ms: now_ms,
        status: TaskStatus::Active,
    };

    match ctx.db.task().try_insert(task) {
        Ok(inserted_task) => {
            // Evenly distribute reminders between now and deadline (exclusive of 'now', inclusive of 'deadline')
            if reminder_count > 0 {
                let total_span = deadline_ms - now_ms;
                // Spread reminders at k * interval from now
                let steps = (reminder_count as i64) + 1;
                let interval = if steps > 0 { total_span / steps } else { 0 };
                for k in 1..=reminder_count {
                    let k_i64 = k as i64;
                    let mut time_ms = now_ms + interval * k_i64;
                    if time_ms > deadline_ms {
                        time_ms = deadline_ms;
                    }
                    ctx.db.reminder().insert(Reminder {
                        id: 0, // auto_inc
                        task_id: inserted_task.id,
                        time_ms,
                        sent: false,
                    });
                }
            }
            Ok(())
        }
        Err(e) => {
            let msg = format!("Failed to create task: {}", e);
            spacetimedb::log::error!("{}", msg);
            Err(msg)
        }
    }
}

#[reducer]
pub fn complete_task(ctx: &ReducerContext, task_id: u64) -> Result<(), String> {
    if let Some(mut task) = ctx.db.task().id().find(task_id) {
        task.status = TaskStatus::Completed;
        ctx.db.task().id().update(task);
        Ok(())
    } else {
        Err(format!("Task {} not found", task_id))
    }
}

#[reducer]
pub fn delete_task(ctx: &ReducerContext, task_id: u64) -> Result<(), String> {
    // Collect reminder ids to delete
    let mut reminder_ids_to_delete: Vec<u64> = Vec::new();
    for r in ctx.db.reminder().iter() {
        if r.task_id == task_id {
            reminder_ids_to_delete.push(r.id);
        }
    }

    // Delete related pending reminders and reminders
    for rid in &reminder_ids_to_delete {
        ctx.db.pending_reminder().reminder_id().delete(*rid);
    }
    for rid in reminder_ids_to_delete {
        ctx.db.reminder().id().delete(rid);
    }

    // Delete task
    ctx.db.task().id().delete(task_id);

    Ok(())
}

#[reducer]
pub fn mark_reminder_sent(ctx: &ReducerContext, reminder_id: u64) -> Result<(), String> {
    if let Some(mut reminder) = ctx.db.reminder().id().find(reminder_id) {
        if reminder.sent {
            // Already sent, ensure it's not in pending
            ctx.db.pending_reminder().reminder_id().delete(reminder_id);
            return Ok(());
        }
        reminder.sent = true;
        let rid = reminder.id;
        ctx.db.reminder().id().update(reminder);
        // Remove from pending list if present
        ctx.db.pending_reminder().reminder_id().delete(rid);
        Ok(())
    } else {
        Err(format!("Reminder {} not found", reminder_id))
    }
}

// Populates the pending_reminder table with reminders that are due (time <= now) and not sent.
// Also removes any entries that are no longer due or have been sent.
// Clients should subscribe to the pending_reminder table to "receive" due reminders.
#[reducer]
pub fn get_pending_reminders(ctx: &ReducerContext) -> Result<(), String> {
    let now_micros: i64 = ctx.timestamp.to_micros_since_unix_epoch();
    let now_ms: i64 = now_micros / 1000;

    // Build set of due, unsent reminder ids
    let mut due_ids: HashSet<u64> = HashSet::new();
    for r in ctx.db.reminder().iter() {
        if !r.sent && r.time_ms <= now_ms {
            due_ids.insert(r.id);
            // Ensure present in pending_reminder
            if ctx.db.pending_reminder().reminder_id().find(r.id).is_none() {
                ctx.db.pending_reminder().insert(PendingReminder {
                    reminder_id: r.id,
                    task_id: r.task_id,
                    time_ms: r.time_ms,
                });
            }
        }
    }

    // Remove any pending entries that are not due anymore or were sent/deleted
    let mut to_remove: Vec<u64> = Vec::new();
    for p in ctx.db.pending_reminder().iter() {
        if !due_ids.contains(&p.reminder_id) {
            to_remove.push(p.reminder_id);
        }
    }
    for rid in to_remove {
        ctx.db.pending_reminder().reminder_id().delete(rid);
    }

    Ok(())
}