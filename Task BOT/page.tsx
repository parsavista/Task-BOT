'use client'
import { useState, useEffect } from 'react';
import { Task } from '@/types/task';
import { TaskList } from '@/components/task-list';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
import { DiscordBotSetup } from '@/components/discord-bot-setup';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { sdk } from "@farcaster/miniapp-sdk";
import { useAddMiniApp } from "@/hooks/useAddMiniApp";
import { useQuickAuth } from "@/hooks/useQuickAuth";
import { useIsInFarcaster } from "@/hooks/useIsInFarcaster";

export default function Home(): JSX.Element {
    const { addMiniApp } = useAddMiniApp();
    const isInFarcaster = useIsInFarcaster()
    useQuickAuth(isInFarcaster)
    useEffect(() => {
      const tryAddMiniApp = async () => {
        try {
          await addMiniApp()
        } catch (error) {
          console.error('Failed to add mini app:', error)
        }

      }

    

      tryAddMiniApp()
    }, [addMiniApp])
    useEffect(() => {
      const initializeFarcaster = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 100))
          
          if (document.readyState !== 'complete') {
            await new Promise<void>(resolve => {
              if (document.readyState === 'complete') {
                resolve()
              } else {
                window.addEventListener('load', () => resolve(), { once: true })
              }

            })
          }

    

          await sdk.actions.ready()
          console.log('Farcaster SDK initialized successfully - app fully loaded')
        } catch (error) {
          console.error('Failed to initialize Farcaster SDK:', error)
          
          setTimeout(async () => {
            try {
              await sdk.actions.ready()
              console.log('Farcaster SDK initialized on retry')
            } catch (retryError) {
              console.error('Farcaster SDK retry failed:', retryError)
            }

          }, 1000)
        }

      }

    

      initializeFarcaster()
    }, [])
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBotSetupOpen, setIsBotSetupOpen] = useState<boolean>(false);

  // Load tasks from localStorage
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem('tasks')) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = (): void => {
      const webhookUrl = localStorage.getItem('discordWebhook');
      if (!webhookUrl) return;

      const now = Date.now();

      tasks.forEach((task) => {
        if (task.status === 'completed') return;

        task.reminders.forEach((reminder) => {
          // Check if reminder time has passed and not sent yet
          if (reminder.time <= now && !reminder.sent) {
            sendReminderToDiscord(task, reminder, webhookUrl);
            
            // Mark reminder as sent
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      reminders: t.reminders.map((r) =>
                        r.id === reminder.id ? { ...r, sent: true } : r
                      ),
                    }
                  : t
              )
            );
          }
        });
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [tasks]);

  const sendReminderToDiscord = async (
    task: Task,
    reminder: { id: number; time: number; sent: boolean },
    webhookUrl: string
  ): Promise<void> => {
    try {
      const timeRemaining = task.deadline - Date.now();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      const daysRemaining = Math.floor(hoursRemaining / 24);

      const embed = {
        title: '⏰ یادآوری تسک',
        fields: [
          { name: 'عنوان', value: task.title, inline: false },
          { name: 'توضیحات', value: task.description || 'ندارد', inline: false },
          { name: 'ددلاین', value: new Date(task.deadline).toLocaleString('fa-IR'), inline: true },
          {
            name: 'زمان باقیمانده',
            value:
              daysRemaining > 0
                ? `${daysRemaining} روز`
                : hoursRemaining > 0
                ? `${hoursRemaining} ساعت`
                : 'کمتر از ۱ ساعت',
            inline: true,
          },
        ],
        color: timeRemaining < 24 * 60 * 60 * 1000 ? 0xff0000 : 0xffa500,
        timestamp: new Date().toISOString(),
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (error) {
      console.error('Error sending reminder to Discord:', error);
    }
  };

  const addTask = (title: string, description: string, deadline: number, reminderCount: number): void => {
    const now = Date.now();
    const timeUntilDeadline = deadline - now;
    const interval = timeUntilDeadline / reminderCount;

    const reminders = Array.from({ length: reminderCount }, (_, i) => ({
      id: i,
      time: now + interval * (i + 1),
      sent: false,
    }));

    const newTask: Task = {
      id: String(Date.now()),
      title,
      description,
      deadline,
      reminderCount,
      reminders,
      createdAt: now,
      status: 'active',
    };

    setTasks((prev) => [...prev, newTask]);
    toast.success('تسک با موفقیت اضافه شد!');
  };

  const completeTask = (taskId: number): void => {
    setTasks((prev) =>
      prev.map((task) => (task.id === String(taskId) ? { ...task, status: 'completed' as const } : task))
    );
    toast.success('تسک به عنوان تکمیل شده علامت‌گذاری شد!');
  };

  const deleteTask = (taskId: number): void => {
    setTasks((prev) => prev.filter((task) => task.id !== String(taskId)));
    toast.success('تسک حذف شد!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-12">
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                مدیریت تسک‌ها 📝
              </h1>
              <p className="text-gray-600 mt-2">با یادآوری خودکار به Discord</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsBotSetupOpen(true)}
                className="relative"
              >
                <Bot className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-5 w-5" />
                تسک جدید
              </Button>
            </div>
          </div>

          {/* Task List */}
          <TaskList
            tasks={tasks}
            onCompleteTask={completeTask}
            onDeleteTask={deleteTask}
          />

          {/* Dialogs */}
          <AddTaskDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onAddTask={addTask}
          />
          <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
          <DiscordBotSetup open={isBotSetupOpen} onOpenChange={setIsBotSetupOpen} />
        </div>
      </div>
    </div>
  );
}
