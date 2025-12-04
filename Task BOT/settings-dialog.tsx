'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, CheckCircle } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  onSaveWebhook: (url: string) => void;
}

export function SettingsDialog({ open, onOpenChange, webhookUrl, onSaveWebhook }: SettingsDialogProps): JSX.Element {
  const [url, setUrl] = useState<string>(webhookUrl);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(false);

  useEffect(() => {
    setUrl(webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    try {
      if (url) {
        const urlObj = new URL(url);
        setIsValidUrl(urlObj.hostname.includes('discord.com') && urlObj.pathname.includes('/webhooks/'));
      } else {
        setIsValidUrl(false);
      }
    } catch {
      setIsValidUrl(false);
    }
  }, [url]);

  const handleSave = (): void => {
    if (isValidUrl) {
      onSaveWebhook(url);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-2xl">تنظیمات Discord</DialogTitle>
          <DialogDescription className="text-gray-600">
            Webhook URL کانال Discord خودت رو وارد کن
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-black">
              <strong>راهنمای دریافت Webhook URL:</strong>
              <ol className="list-decimal mr-4 mt-2 space-y-1">
                <li>به کانال Discord خودت برو</li>
                <li>روی تنظیمات کانال کلیک کن</li>
                <li>Integrations {'>'} Webhooks رو انتخاب کن</li>
                <li>یه Webhook جدید بساز یا از یکی از موجودها استفاده کن</li>
                <li>URL رو کپی کن و اینجا وارد کن</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="webhook" className="text-black">Discord Webhook URL</Label>
            <Input
              id="webhook"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="text-black border-gray-300 font-mono text-sm"
            />
            {url && (
              <div className="flex items-center gap-2 text-xs">
                {isValidUrl ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">URL معتبر است</span>
                  </>
                ) : (
                  <>
                    <span className="text-red-600">⚠️ URL معتبر نیست</span>
                  </>
                )}
              </div>
            )}
          </div>

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-sm text-black">
              <strong>نکته امنیتی:</strong> Webhook URL رو با کسی به اشتراک نذار. هر کسی که این URL رو داشته باشه می‌تونه به کانالت پیام بفرسته.
            </AlertDescription>
          </Alert>

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
              onClick={handleSave}
              disabled={!isValidUrl}
              className="flex-1 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300"
            >
              ذخیره تنظیمات
            </Button>
          </div>

          <div className="pt-2">
            <Button
              variant="link"
              className="text-blue-600 p-0 h-auto"
              onClick={() => window.open('https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks', '_blank')}
            >
              <ExternalLink className="h-4 w-4 ml-1" />
              راهنمای کامل Discord Webhooks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
