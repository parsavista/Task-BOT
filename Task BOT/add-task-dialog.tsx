'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (title: string, description: string, deadline: number, reminderCount: number) => void;
}

export function AddTaskDialog({ open, onOpenChange, onAddTask }: AddTaskDialogProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  const [reminderCount, setReminderCount] = useState<number>(3);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!title || !deadline) {
      return;
    }

    const deadlineTime = new Date(deadline).getTime();
    if (deadlineTime <= Date.now()) {
      alert('ددلاین باید در آینده باشد!');
      return;
    }

    onAddTask(title, description, deadlineTime, reminderCount);

    setTitle('');
    setDescription('');
    setDeadline('');
    setReminderCount(3);
    onOpenChange(false);
  };

  const getMinDateTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-2xl">تسک جدید اضافه کن</DialogTitle>
          <DialogDescription className="text-gray-600">
            اطلاعات تسک رو وارد کن. سیستم به صورت خودکار یادآوری‌ها رو تنظیم می‌کنه.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-black">عنوان تسک *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تکمیل پروژه"
              required
              className="text-black border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-black">توضیحات</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="جزئیات تسک رو اینجا بنویس..."
              rows={3}
              className="text-black border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline" className="text-black">زمان ددلاین *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={getMinDateTime()}
              required
              className="text-black border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderCount" className="text-black">تعداد یادآوری</Label>
            <Input
              id="reminderCount"
              type="number"
              value={reminderCount}
              onChange={(e) => setReminderCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              min="1"
              max="10"
              className="text-black border-gray-300"
            />
            <p className="text-xs text-gray-500">
              یادآوری‌ها به صورت مساوی تا زمان ددلاین توزیع می‌شوند (حداقل 1، حداکثر 10)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-black border-black hover:bg-gray-100"
            >
              لغو
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-black text-white hover:bg-gray-800"
            >
              اضافه کردن تسک
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
