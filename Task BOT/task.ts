export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: number;
  reminderCount: number;
  reminders: Array<{
    time: number;
    sent: boolean;
  }>;
  createdAt: number;
  status: 'active' | 'completed';
}
