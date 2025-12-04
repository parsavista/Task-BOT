'use client'
import { useState, useEffect } from 'react';
import { TaskList } from '@/components/task-list';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { DiscordBotSetup } from '@/components/discord-bot-setup';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { getSpacetimeClient } from '@/lib/spacetime-client';
import type { Task } from '@/spacetime_module_bindings/task_type';
import type { Reminder } from '@/spacetime_module_bindings/reminder_type';
import { sdk } from '@farcaster/miniapp-sdk';
import { useAddMiniApp } from '@/hooks/useAddMiniApp';
import { useQuickAuth } from '@/hooks/useQuickAuth';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';

export default function Home(): JSX.Element {
  const { addMiniApp } = useAddMiniApp();
  const isInFarcaster = useIsInFarcaster();
  useQuickAuth(isInFarcaster);

  useEffect(() => {
    const tryAddMiniApp = async (): Promise<void> => {
      try {
        await addMiniApp();
      } catch (error) {
        console.error('Failed to add mini app:', error);
      }
    };

    tryAddMiniApp();
  }, [addMiniApp]);

  useEffect(() => {
    const initializeFarcaster = async (): Promise<void> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (document.readyState !== 'complete') {
          await new Promise<void>((resolve) => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', () => resolve(), { once: true });
            }
          });
        }

        await sdk.actions.ready();
        console.log('Farcaster SDK initialized successfully - app fully loaded');
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);

        setTimeout(async () => {
          try {
            await sdk.actions.ready();
            console.log('Farcaster SDK initialized on retry');
          } catch (retryError) {
            console.error('Farcaster SDK retry failed:', retryError);
          }
        }, 1000);
      }
    };

    initializeFarcaster();
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Record<string, Reminder[]>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBotSetupOpen, setIsBotSetupOpen] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const savedWebhook = localStorage.getItem('discordWebhook');
    if (savedWebhook) {
      setWebhookUrl(savedWebhook);
    }

    const client = getSpacetimeClient();
    if (!client) {
      console.error('Failed to initialize SpacetimeDB client');
      return;
    }

    const unsubOnConnect = client.onConnect(() => {
      setIsConnected(true);
      toast.success('متصل به دیتابیس شدید!');
      loadTasksAndReminders(client);
    });

    const unsubOnDisconnect = client.onDisconnect(() => {
      setIsConnected(false);
      toast.error('اتصال به دیتابیس قطع شد');
    });

    const unsubTaskInsert = client.db.task.onInsert((ctx, task) => {
      setTasks((prev) => [...prev, task]);
    });

    const unsubTaskUpdate = client.db.task.onUpdate((ctx, oldTask, newTask) => {
      setTasks((prev) => prev.map((t) => (t.id === newTask.id ? newTask : t)));
    });

    const unsubTaskDelete = client.db.task.onDelete((ctx, task) => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    });

    const unsubReminderInsert = client.db.reminder.onInsert((ctx, reminder) => {
      setReminders((prev) => ({
        ...prev,
        [String(reminder.taskId)]: [...(prev[String(reminder.taskId)] || []), reminder],
      }));
    });

    const unsubReminderUpdate = client.db.reminder.onUpdate((ctx, oldReminder, newReminder) => {
      setReminders((prev) => ({
        ...prev,
        [String(newReminder.taskId)]: (prev[String(newReminder.taskId)] || []).map((r) =>
          r.id === newReminder.id ? newReminder : r
        ),
      }));
    });

    return () => {
      unsubOnConnect();
      unsubOnDisconnect();
      unsubTaskInsert();
      unsubTaskUpdate();
      unsubTaskDelete();
      unsubReminderInsert();
      unsubReminderUpdate();
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !webhookUrl) return;

    const interval = setInterval(() => {
      checkAndSendReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks, reminders, webhookUrl, isConnected]);

  const loadTasksAndReminders = (client: ReturnType<typeof getSpacetimeClient>): void => {
    if (!client) return;

    const loadedTasks = Array.from(client.db.task.iter());
    setTasks(loadedTasks);

    const loadedReminders: Record<string, Reminder[]> = {};
    for (const reminder of client.db.reminder.iter()) {
      const taskId = String(reminder.taskId);
      if (!loadedReminders[taskId]) {
        loadedReminders[taskId] = [];
      }
      loadedReminders[taskId].push(reminder);
    }
    setReminders(loadedReminders);
  };

  const checkAndSendReminders = async (): Promise<void> => {
    if (!webhookUrl) return;

    const client = getSpacetimeClient();
    if (!client) return;

    const now = Date.now();

    for (const task of tasks) {
      if (task.status.tag === 'Completed') continue;

      const taskReminders = reminders[String(task.id)] || [];
      for (const reminder of taskReminders) {
        if (!reminder.sent && Number(reminder.timeMs) <= now) {
          await sendDiscordReminder(task, Number(reminder.timeMs));
          client.reducers.markReminderSent(reminder.id);
        }
      }
    }
  };

  const sendDiscordReminder = async (task: Task, reminderTime: number): Promise<void> => {
    try {
      const timeUntilDeadline = Number(task.deadlineMs) - Date.now();
      const hoursLeft = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60));

      const embed = {
        title: '⏰ یادآوری تسک',
        description: task.title,
        color: 3447003,
        fields: [
          {
            name: 'توضیحات',
            value: task.description || 'توضیحاتی وجود ندارد',
            inline: false,
          },
          {
            name: 'زمان باقیمانده',
            value: `${hoursLeft} ساعت و ${minutesLeft} دقیقه`,
            inline: true,
          },
          {
            name: 'ددلاین',
            value: new Date(Number(task.deadlineMs)).toLocaleString('fa-IR'),
            inline: true,
          },
        ],
        timestamp: new Date(reminderTime).toISOString(),
        footer: {
          text: 'Task Reminder System',
        },
      };

      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          protocol: 'https',
          origin: new URL(webhookUrl).host,
          path: new URL(webhookUrl).pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: [embed],
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send Discord notification');
      }

      toast.success('یادآوری به Discord ارسال شد!');
    } catch (error) {
      console.error('Error sending Discord reminder:', error);
      toast.error('خطا در ارسال یادآوری به Discord');
    }
  };

  const addTask = (title: string, description: string, deadline: number, reminderCount: number): void => {
    const client = getSpacetimeClient();
    if (!client) {
      toast.error('اتصال به دیتابیس برقرار نیست');
      return;
    }

    try {
      client.reducers.createTask(title, description, BigInt(deadline), reminderCount);
      toast.success('تسک با موفقیت اضافه شد!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('خطا در اضافه کردن تسک');
    }
  };

  const deleteTask = (id: bigint): void => {
    const client = getSpacetimeClient();
    if (!client) {
      toast.error('اتصال به دیتابیس برقرار نیست');
      return;
    }

    try {
      client.reducers.deleteTask(id);
      toast.success('تسک حذف شد');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('خطا در حذف تسک');
    }
  };

  const toggleTaskStatus = (id: bigint): void => {
    const client = getSpacetimeClient();
    if (!client) {
      toast.error('اتصال به دیتابیس برقرار نیست');
      return;
    }

    try {
      client.reducers.completeTask(id);
      toast.success('وضعیت تسک تغییر کرد');
    } catch (error) {
      console.error('Error toggling task status:', error);
      toast.error('خطا در تغییر وضعیت تسک');
    }
  };

  const saveWebhook = (url: string): void => {
    setWebhookUrl(url);
    localStorage.setItem('discordWebhook', url);
    toast.success('تنظیمات Discord ذخیره شد!');
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">مدیریت تسک‌ها</h1>
            <p className="text-gray-600">
              تسک‌هایت رو اضافه کن و یادآوری خودکار دریافت کن
              {isConnected && <span className="text-green-600 ml-2">● متصل</span>}
              {!isConnected && <span className="text-red-600 ml-2">● قطع</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsBotSetupOpen(true)}
              variant="outline"
              size="icon"
              className="text-black border-black hover:bg-gray-100"
              title="راه‌اندازی Discord Bot"
            >
              <Bot className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              size="icon"
              className="text-black border-black hover:bg-gray-100"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
              disabled={!isConnected}
            >
              <Plus className="h-5 w-5 mr-2" />
              تسک جدید
            </Button>
          </div>
        </div>

        {!isConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-black text-sm">
              ⚠️ در حال اتصال به دیتابیس... اگر این پیام باقی ماند، لطفاً SpacetimeDB را راه‌اندازی کنید.
            </p>
          </div>
        )}

        {!webhookUrl && isConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-black text-sm">
              ⚠️ لطفاً ابتدا Discord Webhook URL را در تنظیمات وارد کنید تا یادآوری‌ها ارسال شوند.
            </p>
          </div>
        )}

        <TaskList tasks={tasks} reminders={reminders} onDelete={deleteTask} onToggleStatus={toggleTaskStatus} />

        <AddTaskDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddTask={addTask} />

        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} webhookUrl={webhookUrl} onSaveWebhook={saveWebhook} />

        <DiscordBotSetup open={isBotSetupOpen} onOpenChange={setIsBotSetupOpen} />
      </div>
    </div>
  );
}
