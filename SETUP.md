# ResQNet Setup & Deployment Guide

## 📋 Table of Contents
1. [Quick Start (5 min)](#quick-start)
2. [Supabase Setup (10 min)](#supabase-setup)
3. [Environment Variables](#environment-variables)
4. [Local Development](#local-development)
5. [Deployment to Vercel](#deployment-to-vercel)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Git account
- Supabase account (free) → https://supabase.com
- OpenAI account → https://platform.openai.com

### Clone and Install (5 minutes)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd resqnet-react

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Add your API keys to .env.local (see next section)
```

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project name: `resqnet`
4. Set password and region
5. Wait for project to initialize (~2 min)

### Step 2: Create Database Tables

1. Go to **SQL Editor** → **New Query**
2. Copy all SQL from [database-schema.sql](./database-schema.sql)
3. Paste and click **Run**
4. ✅ You should see 3 tables created: users, reports, assignments

### Step 3: Create Storage Bucket

1. Go to **Storage** → **New Bucket**
2. Name: `reports`
3. **Uncheck** "Public bucket"
4. Click **Create Bucket**

### Step 4: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY`
3. Save them (you'll need them next)

---

## Environment Variables

### Create `.env.local`

```bash
cp .env.example .env.local
```

### Add Your Keys

```env
# From Supabase > Settings > API
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# From OpenAI API Keys > https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=sk-proj-xxx...
```

### Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy it immediately (you won't see it again)
4. Paste into `.env.local`

⚠️ **NEVER** commit `.env.local` to Git (it's in `.gitignore`)

---

## Local Development

### Start Dev Server

```bash
npm run dev
```

- Opens http://localhost:3000
- Auto-reload on file changes
- Full source maps for debugging

### Test Features

1. **Sign Up**
   - Email: test@example.com
   - Password: TestPass123!
   - Role: Select your role

2. **Create Report**
   - Go to Dashboard → "Report Incident"
   - Fill form with incident description
   - AI will auto-analyze it
   - Submit and check map

3. **Admin Features**
   - Sign up with "admin" role (or modify database)
   - Go to /admin to manage all incidents

4. **View Map**
   - Go to Map View to see all incidents
   - Click markers to see details
   - Filter by priority

### Build & Preview

```bash
# Type-check and build
npm run build

# Preview production build locally
npm run preview
```

---

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial ResQNet commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/resqnet.git
git push -u origin main
```

### Step 2: Deploy to Vercel

**Option A: Web UI**

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repo
4. Click **Import**
5. Go to **Settings** → **Environment Variables**
6. Add these 3 variables:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   VITE_OPENAI_API_KEY=sk-proj-xxx...
   ```
7. Click **Deploy**

**Option B: Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel --prod
# Follow prompts to link project
```

### Step 3: Verify Deployment

- Check Vercel dashboard for "Ready" status
- Visit your deployment URL
- Test sign up and report submission
- Check Supabase for new records

---

## Testing

### User Flow Test Checklist

- [ ] Sign up with email/password
- [ ] Select role (user/volunteer)
- [ ] See dashboard with stats
- [ ] Navigate to "Report Incident"
- [ ] Fill form and submit
- [ ] See AI analysis result
- [ ] View report on Map View
- [ ] See report in My Reports
- [ ] Logout and login again
- [ ] Admin view all reports and assign volunteer

### API Testing

**Test Supabase Connection:**
```bash
curl -X GET https://your-project.supabase.co/rest/v1/users?select=* \
  -H "apikey: your-anon-key"
```

**Test OpenAI API:**
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'
```

---

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "VITE_SUPABASE_URL is undefined"
- Check `.env.local` exists
- Verify you copied values correctly
- Restart `npm run dev`

### "OpenAI API rate limit"
- Check your API key has credits
- Upgrade plan if needed
- Implement request throttling

### Reports not saving to database
- Go to Supabase > SQL Editor
- Run: `SELECT * FROM reports;`
- Check RLS policies don't block inserts
- Check Storage bucket is created

### Map not showing incidents
- Reports might not have latitude/longitude
- Check database for `NULL` coordinates
- Verify geolocation is enabled in browser

### "Build fails with chunk size warning"
- This is normal for this project size
- doesn't prevent deployment
- Use dynamic imports for further optimization

### "Auth not persisting on refresh"
- Check browser allows localStorage
- Clear browser cache and cookies
- Supabase session should auto-restore

---

## Production Checklist

- [ ] Environment variables added to Vercel
- [ ] Database schema created in Supabase
- [ ] Storage bucket "reports" created
- [ ] RLS policies enabled (optional but recommended)
- [ ] Build passes without errors
- [ ] All routes protected with ProtectedRoute
- [ ] OpenAI API key valid with credits
- [ ] Tested signup → report → map flow
- [ ] Tested admin features
- [ ] Set custom domain in Vercel (optional)

---

## Performance Tips

1. **Reduce OpenAI Costs**: Cache AI results in database
2. **Optimize Images**: Compress before upload
3. **Code Splitting**: Use dynamic imports for pages
4. **Database Indexes**: Use provided SQL indexes
5. **Real-time Updates**: Unsubscribe channels when unmounting

---

## Support

- **React Docs**: https://react.dev
- **Supabase Docs**: https://supabase.com/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev

---

**Happy building! 🚀 Let us know if you need help.**
