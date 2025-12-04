'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bot, ExternalLink } from 'lucide-react';

interface DiscordBotSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscordBotSetup({ open, onOpenChange }: DiscordBotSetupProps): JSX.Element {
  const [botToken, setBotToken] = useState<string>('');
  const [applicationId, setApplicationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!botToken || !applicationId) {
      toast.error('لطفاً تمام فیلدها را پر کنید');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/discord-bot/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken,
          applicationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ثبت دستورات');
      }

      toast.success('دستورات Discord Bot با موفقیت ثبت شدند! 🎉');
      setBotToken('');
      setApplicationId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error registering Discord bot:', error);
      toast.error(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Bot className="h-6 w-6" />
            راه‌اندازی Discord Bot
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            برای استفاده از دستورات Discord Bot، ابتدا اطلاعات بات خود را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-black mb-2">📋 مراحل راه‌اندازی:</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>
                به{' '}
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Discord Developer Portal
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                بروید
              </li>
              <li>یک Application جدید بسازید یا Application موجود را انتخاب کنید</li>
              <li>از صفحه General Information، Application ID را کپی کنید</li>
              <li>از صفحه Bot، Bot Token را کپی کنید (Reset Token اگر لازم باشد)</li>
              <li>در قسمت OAuth2 {'>'} URL Generator، scope: bot و applications.commands را انتخاب کنید</li>
              <li>Bot Permissions: Send Messages, Embed Links را انتخاب کنید</li>
              <li>URL تولید شده را کپی کنید و Bot را به سرور خود دعوت کنید</li>
              <li>
                در صفحه General Information، Interactions Endpoint URL را به این آدرس تنظیم کنید:
                <code className="block mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/discord-bot/interactions` : '/api/discord-bot/interactions'}
                </code>
              </li>
            </ol>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="applicationId" className="text-black">
                Application ID *
              </Label>
              <Input
                id="applicationId"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                placeholder="123456789012345678"
                required
                className="text-black border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="botToken" className="text-black">
                Bot Token *
              </Label>
              <Input
                id="botToken"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4.ABCDEF.XYZ123..."
                required
                className="text-black border-gray-300"
              />
              <p className="text-xs text-gray-500">این اطلاعات ذخیره نمی‌شود و فقط برای ثبت دستورات استفاده می‌شود</p>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-black mb-2">🤖 دستورات موجود:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">/task add</code> - اضافه کردن تسک جدید
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">/task list</code> - نمایش لیست تسک‌ها
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">/task complete</code> - علامت‌گذاری تسک به عنوان تکمیل شده
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 text-black border-black hover:bg-gray-100">
                لغو
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 bg-black text-white hover:bg-gray-800">
                {isLoading ? 'در حال ثبت...' : 'ثبت دستورات Bot'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
