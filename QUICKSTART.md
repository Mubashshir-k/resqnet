# 🚀 Quick Start Guide

> Get ResQNet running in 5 minutes

## 1. Install Dependencies (30 seconds)

```bash
npm install
```

## 2. Get API Keys (2 minutes)

### Supabase
1. Visit https://supabase.com → Create free account
2. New Project → Project Settings → API
3. Copy `Project URL` and `Anon Key`

### OpenAI
1. Visit https://platform.openai.com/api-keys
2. Create new secret key (add $5+ credits if needed)
3. Copy the key

## 3. Setup Environment (1 minute)

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-key
```

## 4. Initialize Database (1 minute)

1. In Supabase: SQL Editor → New Query
2. Copy all SQL from [database-schema.sql](./database-schema.sql)
3. Paste → Run
4. Create storage bucket: "reports" (Private)

## 5. Start Development (1 minute)

```bash
npm run dev
```

- Opens http://localhost:3000
- Hot reload enabled
- Ready to test!

---

## Test the App (2 minutes)

1. **Sign Up** → test@example.com / Password123
2. **Report Incident** → Write description
3. **View Map** → See your report
4. **Admin Panel** → `/admin` to manage

## Deploy to Vercel (5 minutes)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "ResQNet" && git push

# 2. Go to vercel.com → Import Git repo
# 3. Add environment variables
# 4. Deploy

# Or use Vercel CLI:
npm i -g vercel && vercel --prod
```

---

## Troubleshooting

**"Module not found"** → `npm install`

**"env is undefined"** → Check `.env.local` exists

**"API error"** → Verify keys are correct in Supabase dashboard

**Build fails** → Run `npm run build` to see errors

---

## Full Guides

- 📖 [Complete README](./README.md)
- 📖 [Setup Instructions](./SETUP.md)
- 📖 [Project Summary](./PROJECT_SUMMARY.md)

---

**That's it! You're ready to save disasters. 🎯**
