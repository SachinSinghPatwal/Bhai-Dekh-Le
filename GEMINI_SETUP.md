# Getting Your Gemini API Key

## What You Need

For this project, you only need:
- ✅ **GEMINI_API_KEY** - That's it!

No project name, project ID, or any other configuration needed.

---

## How to Get Your Free Gemini API Key

### Step 1: Go to Google AI Studio
Visit: https://makersuite.google.com/app/apikey
(or search "Google AI Studio API Key")

### Step 2: Sign in with your Google Account
Use any personal Google account.

### Step 3: Create API Key
1. Click "Get API Key" or "Create API Key"
2. Select "Create API key in new project" (easiest option)
3. Copy the generated key

### Step 4: Add to Your .env File
```env
GEMINI_API_KEY=AIzaSyC_your_actual_key_here_xxxxxxxxxxxxx
```

---

## Free Tier Limits

Gemini 1.5 Flash (used in this project):
- ✅ **15 requests per minute** (free)
- ✅ **1,500 requests per day** (free)
- ✅ **1 million requests per month** (free)

This is more than enough for job application automation!

---

## Testing Your API Key

Once you've added it to `.env`, test it:

```bash
# Start your server
npm run dev

# Test with a sample job match (will use Gemini)
curl -X POST http://localhost:8000/api/v1/automation/apply \
  -H "Content-Type: application/json" \
  -d '{"threshold": 70}'
```

If configured correctly, you'll see Gemini scoring jobs in the logs.

---

## Troubleshooting

### "GEMINI_API_KEY not found"
- Check `.env` file exists in `Backend/` directory
- Verify the variable name is exactly `GEMINI_API_KEY`
- Restart your server after adding the key

### "API key not valid"
- Get a fresh key from Google AI Studio
- Make sure you copied the full key (starts with `AIzaSy...`)
- Check for extra spaces or quotes

### "Quota exceeded"
- You've hit the free tier limit (15 req/min or 1500/day)
- Wait a few minutes and try again
- Or upgrade to paid tier if needed

---

## Models Used

The project uses **Gemini 1.5 Flash** which is:
- Fast (good for automation)
- Free tier available
- Great for text analysis
- No additional setup required

That's it! Just the API key. 🎉
