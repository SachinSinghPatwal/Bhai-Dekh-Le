# 🚀 Quick Setup Guide - Get Running in 10 Minutes

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ MongoDB running (local or Atlas)
- ⚠️ That's it! (No other accounts or services needed to get started)

---

## Step 1: Install Dependencies (2 minutes)

```bash
cd Backend
npm install
npm run playwright:install
```

---

## Step 2: Get Your API Keys (3 minutes)

### Gemini API Key (FREE - No Credit Card)
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)

### MongoDB (FREE)
**Option A: Local MongoDB**
```bash
# Already have MongoDB? Just use: mongodb://localhost:27017/bhaidekle
```

**Option B: MongoDB Atlas (Cloud - FREE)**
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

---

## Step 3: Configure Environment (2 minutes)

```bash
cd Backend
cp .env.example .env
```

Edit `.env` file:

```env
# Required - Get these first
GEMINI_API_KEY=AIzaSy...your_key_here
MONGODB_URI=mongodb://localhost:27017/bhaidekle
ENCRYPTION_KEY=make_this_32_characters_long!!

# Server settings (defaults are fine)
PORT=8000
NODE_ENV=development

# Playwright settings (defaults are fine)
PLAYWRIGHT_HEADLESS=false
JOB_MATCH_THRESHOLD=70
RESUME_UPLOAD_PATH=./uploads/resumes

# JWT (generate random strings for these)
ACCESS_TOKEN_SECRET=your_random_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=another_random_secret_here
REFRESH_TOKEN_EXPIRY=7d

# Optional
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

**Pro Tip for ENCRYPTION_KEY:**
```bash
# Generate a secure 32-character key:
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## Step 4: Start Server (1 minute)

```bash
npm run dev
```

You should see:
```
⚙️ Server is running at port : 8000
MongoDB connected !! DB HOST: ...
```

---

## Step 5: Test Authentication (2 minutes)

### Option A: Via Script
```bash
# Replace <userId> with actual MongoDB user ID
npm run automation:auth 66e4f1234567890abcdef123
```

A browser will open. Login to Naukri.com manually. Once logged in, the session is saved encrypted.

### Option B: Via API
```bash
curl -X POST http://localhost:8000/api/v1/automation/auth/naukri
```

---

## 🎉 You're Ready!

Now you can:

### 1. Upload Resume
```bash
curl -X POST http://localhost:8000/api/v1/users/<userId>/resume \
  -F "resume=@/path/to/resume.txt"
```

### 2. Set Job Preferences
```bash
curl -X PUT http://localhost:8000/api/v1/users/<userId>/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["Node.js", "TypeScript", "Backend"],
    "locations": ["Remote", "Bangalore"],
    "minSalary": 500000,
    "jobTypes": ["full-time"],
    "employType": ["remote", "hybrid"]
  }'
```

### 3. Scrape Jobs
```bash
curl -X POST http://localhost:8000/api/v1/automation/scrape \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 50}'
```

### 4. Auto-Apply to Jobs
```bash
curl -X POST http://localhost:8000/api/v1/automation/apply \
  -H "Content-Type: application/json" \
  -d '{"threshold": 70}'
```

### 5. Check Stats
```bash
curl http://localhost:8000/api/v1/users/<userId>/stats
```

---

## 📝 Important Notes

### Resume Format
- ✅ Upload `.txt` files (plain text resumes work best)
- ⚠️ PDF support not yet implemented (coming soon)
- 💡 Convert your PDF to text: https://pdftotext.com/

### First Time Setup
1. Create a user first (use existing user routes or MongoDB directly)
2. Get the user's MongoDB `_id` 
3. Use that `_id` for all automation commands

### Gemini API Limits (FREE TIER)
- 15 requests per minute
- 1,500 requests per day
- More than enough for daily job hunting!

---

## 🐛 Common Issues

### "GEMINI_API_KEY not found"
- Check `.env` file exists in `Backend/` folder
- Restart server after editing `.env`

### "User not found"
- Create a user first or use existing user ID
- Check MongoDB connection

### Browser doesn't open for auth
- Check `PLAYWRIGHT_HEADLESS=false` in `.env`
- Run `npm run playwright:install` again

### "Authentication failed"
- Login manually is too slow (2 min timeout)
- Try again with faster login

---

## 🎯 Next Steps

1. **Test the flow end-to-end** with a real job search
2. **Adjust selectors** if Naukri's UI changed (in `Backend/src/config/naukri-selectors.json`)
3. **Tune Gemini prompts** if matching isn't accurate (in `GeminiMatchingService.ts`)
4. **Set up authentication middleware** for production use

---

## 📚 Additional Resources

- [Full Documentation](README.md)
- [Gemini Setup Guide](GEMINI_SETUP.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Project Status](STATUS.md)

---

**Need Help?**
- Check logs in `Backend/logs/`
- Review API endpoints in README
- All services have detailed comments

**Ready to automate your job hunt! 🚀**
