# راهنمای تنظیم Discord Bot Interactions Endpoint ✅

## مشکل: "interactions endpoint url could not be verified"

این مشکل به این دلیل پیش میاد که Discord نمی‌تونه به endpoint شما دسترسی داشته باشه یا signature رو تایید کنه.

---

## ✅ راه‌حل گام به گام:

### 1️⃣ اپ رو Publish کنید

**مهم:** Discord نمی‌تونه به `localhost` دسترسی داشته باشه!

1. در Ohara، روی دکمه **"Publish"** کلیک کنید
2. لینک deploy شده رو کپی کنید (مثلاً: `https://your-app.vercel.app`)
3. این URL رو یادداشت کنید

### 2️⃣ Public Key رو از Discord بگیرید

1. به [Discord Developer Portal](https://discord.com/developers/applications) برید
2. روی Application خودتون کلیک کنید
3. از قسمت **"General Information"** مقدار **"PUBLIC KEY"** رو کپی کنید
   - یه رشته hex با طول 64 کاراکتر است
   - مثال: `1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### 3️⃣ Public Key رو در Vercel تنظیم کنید

**در Vercel Dashboard:**
1. به پروژه خودتون برید
2. Settings → Environment Variables
3. یه متغیر جدید اضافه کنید:
   - **Name:** `DISCORD_PUBLIC_KEY`
   - **Value:** مقدار Public Key که کپی کردید
4. روی **"Save"** کلیک کنید
5. **مهم:** اپ رو دوباره Deploy کنید تا تغییرات اعمال بشه

### 4️⃣ Interactions Endpoint URL رو تنظیم کنید

1. برگردید به Discord Developer Portal
2. از منوی سمت چپ، **"General Information"** رو انتخاب کنید
3. پایین صفحه، قسمت **"INTERACTIONS ENDPOINT URL"** رو پیدا کنید
4. این URL رو وارد کنید:
   ```
   https://your-app.vercel.app/api/discord-bot/interactions
   ```
5. روی **"Save Changes"** کلیک کنید

Discord الان باید endpoint رو verify کنه و ✅ نشون بده!

---

## 🔍 عیب‌یابی

اگه هنوز ارور داد:

### ❌ "The specified interactions endpoint url could not be verified"

**چک کنید:**
- ✅ اپ publish شده و در دسترس عموم (public) است؟
- ✅ `DISCORD_PUBLIC_KEY` در Vercel تنظیم شده؟
- ✅ اپ رو دوباره deploy کردید بعد از تنظیم متغیر؟
- ✅ URL endpoint دقیقاً صحیح است؟ (`/api/discord-bot/interactions`)
- ✅ Public Key از Discord کپی شده بدون فاصله یا کاراکتر اضافی؟

### 🧪 تست کردن Endpoint

می‌تونید با curl تست کنید:

```bash
curl -X POST https://your-app.vercel.app/api/discord-bot/interactions \
  -H "Content-Type: application/json" \
  -d '{"type": 1}'
```

**پاسخ صحیح:** `401 Unauthorized` (چون signature نداره)
**پاسخ اشتباه:** `500 Internal Server Error` یا timeout

---

## 📝 چک‌لیست نهایی

- [ ] اپ در Ohara **Publish** شده
- [ ] Public Key از Discord Developer Portal کپی شده
- [ ] `DISCORD_PUBLIC_KEY` در Vercel Environment Variables تنظیم شده
- [ ] اپ دوباره Deploy شده
- [ ] Interactions Endpoint URL در Discord تنظیم شده
- [ ] Discord endpoint رو verify کرده (✅ سبز)

---

## 🎉 بعد از موفقیت

وقتی Discord endpoint رو verify کرد:

1. Bot Commands رو register کنید از طریق اپ وب (دکمه 🤖)
2. Bot رو به سرور Discord اضافه کنید
3. از دستورات Slash استفاده کنید:
   - `/task add` - اضافه کردن تسک
   - `/task list` - لیست تسک‌ها
   - `/task complete` - تکمیل تسک

**موفق باشید! 🚀**
