'use client';

import { TaskCard } from './task-card';
import type { Task } from '@/types/task';

interface TaskListProps {
  tasks: Task[];
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
}

export function TaskList({ tasks, onCompleteTask, onDeleteTask }: TaskListProps): JSX.Element {
  const activeTasks = tasks.filter((task) => task.status === 'active');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-2xl font-bold text-black mb-2">هیچ تسکی وجود ندارد</h2>
        <p className="text-gray-600">با کلیک روی دکمه &quot;تسک جدید&quot; اولین تسکت رو اضافه کن!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-black mb-4">تسک‌های فعال ({activeTasks.length})</h2>
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onToggleStatus={onCompleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-black mb-4">تسک‌های تکمیل شده ({completedTasks.length})</h2>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onToggleStatus={onCompleteTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
