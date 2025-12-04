'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trash2, CheckCircle2, Circle, Clock, Bell } from 'lucide-react';
import type { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number) => void;
}

export function TaskCard({ task, onDelete, onToggleStatus }: TaskCardProps): JSX.Element {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const updateTimeLeft = (): void => {
      const now = Date.now();
      const deadline = task.deadline;
      const createdAt = task.createdAt;
      const total = deadline - createdAt;
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeLeft('زمان تمام شده!');
        setProgress(100);
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days} روز و ${hours} ساعت`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} ساعت و ${minutes} دقیقه`);
      } else {
        setTimeLeft(`${minutes} دقیقه`);
      }

      const progressValue = ((total - remaining) / total) * 100;
      setProgress(Math.min(progressValue, 100));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [task]);

  const sentReminders = task.reminders.filter((r) => r.sent).length;
  const totalReminders = task.reminders.length;
  const isOverdue = Date.now() > task.deadline;
  const isCompleted = task.status === 'completed';

  return (
    <Card className={`border-2 ${isCompleted ? 'border-green-200 bg-green-50' : isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={`text-lg ${isCompleted ? 'line-through text-gray-500' : 'text-black'}`}>
              {task.title}
            </CardTitle>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
          <div className="flex gap-2 mr-2">
            <Button
              onClick={() => onToggleStatus(Number(task.id))}
              variant="ghost"
              size="icon"
              className={isCompleted ? 'text-green-600' : 'text-gray-400'}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={() => onDelete(Number(task.id))}
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-black border-black">
            <Clock className="h-3 w-3 mr-1" />
            {timeLeft}
          </Badge>
          <Badge variant="outline" className="text-black border-black">
            <Bell className="h-3 w-3 mr-1" />
            {sentReminders}/{totalReminders} یادآوری
          </Badge>
          {isOverdue && !isCompleted && (
            <Badge variant="destructive">سررسید گذشته</Badge>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>پیشرفت زمانی</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="text-xs text-gray-500 pt-1">
          ددلاین: {new Date(task.deadline).toLocaleString('fa-IR')}
        </div>
      </CardContent>
    </Card>
  );
}
