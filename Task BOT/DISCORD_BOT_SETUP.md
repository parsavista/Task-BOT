# راهنمای راه‌اندازی Discord Bot برای مدیریت تسک‌ها

این اپ از **SpacetimeDB** برای ذخیره‌سازی real-time تسک‌ها و **Discord Bot** برای مدیریت تسک‌ها از داخل Discord استفاده می‌کند.

## ✅ مرحله 1: نصب و راه‌اندازی SpacetimeDB

### نصب SpacetimeDB CLI

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://install.spacetimedb.com | sh

# Windows (PowerShell)
iwr https://windows.spacetimedb.com -useb | iex
```

### راه‌اندازی دیتابیس محلی

```bash
# شروع SpacetimeDB server
spacetime start

# در ترمینال دیگری، publish کنید module رو
cd spacetime-server/spacetimedb
spacetime publish task-manager

# مشاهده لاگ‌ها (اختیاری)
spacetime logs task-manager
```

**نکته**: پورت پیش‌فرض SpacetimeDB روی `3000` است. اگر Next.js روی همین پورت است، می‌تونید پورت SpacetimeDB رو تغییر بدید:

```bash
spacetime start --listen-addr 127.0.0.1:3001
```

و در `.env.local` تغییر بدید:
```
NEXT_PUBLIC_SPACETIME_HOST=ws://127.0.0.1:3001
```

## 🤖 مرحله 2: ساخت Discord Bot

### 1. رفتن به Discord Developer Portal

- به [Discord Developer Portal](https://discord.com/developers/applications) بروید
- روی **"New Application"** کلیک کنید
- یک نام برای Bot انتخاب کنید (مثلاً "Task Manager Bot")

### 2. دریافت Application ID

- از صفحه **General Information**، **Application ID** را کپی کنید

### 3. ساخت Bot و دریافت Token

- از منوی سمت چپ، روی **Bot** کلیک کنید
- روی **"Reset Token"** کلیک کنید و Token را کپی کنید
- **مهم**: این Token را در جای امنی ذخیره کنید!

### 4. فعال‌سازی Privileged Gateway Intents (اختیاری)

در صفحه Bot، اگر نیاز دارید:
- **Message Content Intent** را فعال کنید

### 5. دعوت Bot به سرور

- از منوی سمت چپ، روی **OAuth2** > **URL Generator** کلیک کنید
- در **Scopes**، انتخاب کنید:
  - ✅ `bot`
  - ✅ `applications.commands`
- در **Bot Permissions**، انتخاب کنید:
  - ✅ Send Messages
  - ✅ Embed Links
  - ✅ Use Slash Commands
- URL تولید شده را کپی کنید و در مرورگر باز کنید
- Bot را به سرور دلخواه اضافه کنید

### 6. تنظیم Interactions Endpoint URL

- برگردید به صفحه **General Information**
- در قسمت **Interactions Endpoint URL**، آدرس زیر را وارد کنید:

```
https://your-app-domain.com/api/discord-bot/interactions
```

**نکته**: برای تست محلی، می‌تونید از [ngrok](https://ngrok.com) استفاده کنید:

```bash
ngrok http 3000
```

بعد URL ngrok رو + `/api/discord-bot/interactions` وارد کنید.

### 7. دریافت Public Key

- در همون صفحه **General Information**، **Public Key** را کپی کنید
- این رو در فایل `.env.local` اضافه کنید:

```
DISCORD_PUBLIC_KEY=your_public_key_here
```

## ⚙️ مرحله 3: پیکربندی اپ

### 1. ساخت فایل .env.local

در ریشه پروژه:

```bash
cp .env.example .env.local
```

و مقادیر رو پر کنید:

```env
NEXT_PUBLIC_SPACETIME_HOST=ws://127.0.0.1:3000
NEXT_PUBLIC_SPACETIME_DB_NAME=task-manager

DISCORD_PUBLIC_KEY=your_discord_public_key_here
SPACETIME_HOST=ws://127.0.0.1:3000
SPACETIME_DB_NAME=task-manager
```

### 2. نصب dependencies و اجرای اپ

```bash
npm install
npm run dev
```

اپ روی `http://localhost:3000` در دسترس است.

### 3. ثبت Slash Commands در Discord

1. در اپ وب، روی آیکون Bot (🤖) کلیک کنید
2. **Application ID** و **Bot Token** رو وارد کنید
3. روی **"ثبت دستورات Bot"** کلیک کنید

اگه موفقیت‌آمیز بود، دستورات زیر در Discord در دسترس هستند:

## 🎮 دستورات Discord Bot

### `/task add`
اضافه کردن تسک جدید

**پارامترها**:
- `title` (الزامی): عنوان تسک
- `description` (اختیاری): توضیحات تسک
- `deadline` (الزامی): ددلاین به فرمت `YYYY-MM-DD HH:MM` مثال: `2024-12-31 23:59`
- `reminders` (اختیاری): تعداد یادآوری (پیش‌فرض: 3، حداکثر: 10)

**مثال**:
```
/task add title:"تکمیل پروژه" description:"باید تا پایان ماه تموم بشه" deadline:"2024-12-31 18:00" reminders:5
```

### `/task list`
نمایش لیست تسک‌ها

**پارامترها**:
- `status` (اختیاری): فیلتر بر اساس وضعیت
  - `active`: فقط تسک‌های فعال
  - `completed`: فقط تسک‌های تکمیل شده
  - `all`: همه تسک‌ها (پیش‌فرض)

**مثال**:
```
/task list status:active
```

### `/task complete`
علامت‌گذاری تسک به عنوان تکمیل شده

**پارامترها**:
- `task_id` (الزامی): شناسه تسک (از لیست تسک‌ها بدست می‌آید)

**مثال**:
```
/task complete task_id:123
```

## 📡 تنظیم Webhook برای یادآوری‌ها

1. در Discord، به سرور و کانال دلخواه بروید
2. تنظیمات کانال > Integrations > Webhooks
3. **Create Webhook** کلیک کنید
4. نام Webhook رو تنظیم کنید (مثلاً "Task Reminders")
5. **Copy Webhook URL** کلیک کنید
6. در اپ وب، روی آیکون تنظیمات (⚙️) کلیک کنید
7. Webhook URL رو وارد کنید و ذخیره کنید

حالا یادآوری‌های خودکار به این کانال ارسال می‌شوند! 🎉

## 🔄 سینک Real-time

تسک‌هایی که از Discord یا از وب‌اپ اضافه می‌شوند، **به صورت خودکار** در هر دو سینک می‌شوند، چون از SpacetimeDB استفاده می‌کنند.

## 🐛 عیب‌یابی

### "اتصال به دیتابیس برقرار نیست"
- مطمئن شوید SpacetimeDB در حال اجراست: `spacetime start`
- مطمئن شوید module publish شده: `spacetime publish task-manager`
- پورت‌ها رو چک کنید

### "Discord Bot دستورات رو نمی‌بینه"
- مطمئن شوید دستورات ثبت شده‌اند (از داخل اپ)
- چند دقیقه صبر کنید، گاهی Discord کمی تاخیر داره
- مطمئن شوید Bot به سرور اضافه شده با permission های صحیح

### "Interactions Endpoint URL تایید نمیشه"
- مطمئن شوید اپ در دسترس عمومی است (استفاده از ngrok برای تست محلی)
- مطمئن شوید `DISCORD_PUBLIC_KEY` در `.env.local` صحیح است
- لاگ‌های Next.js رو چک کنید

## 🎯 ویژگی‌های کلیدی

✅ **دیتابیس Real-time**: تغییرات بلافاصله در همه‌جا اعمال می‌شوند
✅ **Discord Bot**: مدیریت تسک‌ها از داخل Discord
✅ **یادآوری خودکار**: سیستم یادآوری هوشمند با توزیع مساوی
✅ **سینک خودکار**: تسک‌ها بین وب و Discord به صورت real-time سینک می‌شوند

---

**ساخته شده با ❤️ توسط Modu**
