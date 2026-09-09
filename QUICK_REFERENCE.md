# ⚡ QUICK REFERENCE CARD

**Last Updated**: September 9, 2026, 1:19 PM

---

## 🚀 One Command to Run Everything

```bash
npm run automation:full -- <24-character-mongodb-user-id>
```

**Does: Auth → Scrape → Rate → Tailor → Upload → Apply**

---

## 📋 Quick Commands

| Task | Command |
|------|---------|
| **Full Pipeline** | `npm run automation:full -- <24-character-mongodb-user-id>` |
| **Just Auth** | `npm run automation:auth -- <24-character-mongodb-user-id>` |
| **Just Scrape** | `npm run automation:scrape -- <24-character-mongodb-user-id>` |
| **Start Server** | `npm run dev` |
| **Install Browsers** | `npm run playwright:install` |

---

## 🔧 Quick Setup

```bash
# 1. Get Gemini API key (FREE)
https://makersuite.google.com/app/apikey

# 2. Configure
cd Backend
cp .env.example .env
# Add: GEMINI_API_KEY, MONGODB_URI, ENCRYPTION_KEY

# 3. Run
npm run dev
npm run automation:full -- <24-character-mongodb-user-id>
```

---

## 📊 Pipeline Options

### CLI Flags
```bash
--max-jobs=50          # Number of jobs to scrape
--threshold=70         # Match score (0-100)
--skip-auth            # Use existing session
--no-tailor            # Skip resume tailoring
--no-upload            # Skip profile upload
```

### Example
```bash
npm run automation:full -- <24-character-mongodb-user-id> --max-jobs=30 --threshold=80
```

---

## 🎯 Your Resume Pattern

```
WHAT: Built REST API for user management
HOW: Using Node.js, Express, JWT authentication
WHY: Reduced auth time by 40%, improved security
```

**Gemini preserves layout, enhances wording!**

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `FullAutomationPipeline.ts` | Main orchestrator |
| `ResumeTailoringService.ts` | Resume optimization |
| `NaukriProfileService.ts` | Profile upload |
| `run-full-automation.ts` | CLI script |
| `.env` | Your credentials |

---

## 🌐 Quick API Calls

### Full Pipeline
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{"maxJobs": 50, "matchThreshold": 70}'
```

### Upload Resume
```bash
curl -X POST http://localhost:8000/api/v1/users/<userId>/resume \
  -F "resume=@resume.txt"
```

### Check Stats
```bash
curl http://localhost:8000/api/v1/users/<userId>/stats
```

---

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| Browser won't open | Check `PLAYWRIGHT_HEADLESS=false` in `.env` |
| Gemini errors | Verify `GEMINI_API_KEY` is valid |
| Auth failed | Run `npm run automation:auth -- <24-character-mongodb-user-id>` again; it waits for you to complete login |
| No jobs found | Lower threshold or update preferences |
| Resume not uploading | Use `.txt` file format |

---

## 📊 Expected Results

For **50 jobs scraped**:
- ✅ Rated: 50 jobs
- ✅ Qualified: ~23 jobs (score ≥ 70)
- ✅ Resumes tailored: 5 (top matches)
- ✅ Applied: 20 jobs
- ⏱️ Time: 30-45 minutes

---

## 📚 Docs at a Glance

| Doc | Read When |
|-----|-----------|
| `SETUP.md` | First time setup |
| `FULL_PIPELINE.md` | Using the pipeline |
| `API_REFERENCE.md` | API integration |
| `RESUME_PATTERN.md` | Resume formatting |
| `GEMINI_SETUP.md` | Getting API key |

---

## ✅ Pre-Flight Checklist

Before running:
- [ ] `.env` configured
- [ ] MongoDB running
- [ ] Gemini API key valid
- [ ] Resume uploaded (`.txt` format)
- [ ] Playwright browsers installed

---

## 🎯 Success Indicators

**Pipeline working when:**
- ✅ Browser opens (headed mode)
- ✅ Jobs appear in database
- ✅ Gemini scores logged
- ✅ Tailored resumes created
- ✅ Applications sent
- ✅ Profile updated

---

## 📞 Need Help?

1. Check logs: `Backend/logs/combined.log`
2. Review docs: All 10 `.md` files
3. Test steps individually first
4. Verify `.env` variables

---

## 🏃 Quick Start (Copy-Paste)

```bash
# Terminal 1: Start server
cd Backend
npm run dev

# Terminal 2: Run automation
cd Backend
npm run automation:full -- <24-character-mongodb-user-id>

# Watch progress and wait for completion!
```

---

**That's it! You're ready to automate! 🚀**

**Total Time Investment**: 3 hours development, 10 min setup, 1 command to run
