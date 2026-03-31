# Gemini Setup Guide (ResQNet)

This guide walks you from **creating a Gemini API key** to **running the app with Gemini**.

---

## 1) Create a Gemini API Key

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** (or go to the API keys section).
4. Click **Create API key**.
5. Copy the generated key.

Recommended:
- Keep this key private.
- Do not paste it into code files.
- Use environment variables only.

---

## 2) Add Key to Your Local Environment

In the project root, copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add:

```env
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash
```

Notes:
- `VITE_GEMINI_MODEL` is optional. If omitted, app defaults to `gemini-1.5-flash`.
- Never commit real API keys to GitHub.

---

## 3) Remove Old OpenAI Key (Optional but Recommended)

If you still have OpenAI env vars in `.env`, remove them if no longer needed:

```env
# Example old key (remove if unused)
# VITE_OPENAI_API_KEY=...
```

---

## 4) Install Dependencies (If Needed)

Current Gemini integration in this project uses `fetch` directly, so there is no mandatory Gemini SDK install.

Still, make sure dependencies are up to date:

```bash
npm install
```

---

## 5) Restart the Dev Server

After editing `.env`, restart Vite:

```bash
npm run dev
```

If server was already running, stop and start again so env vars reload.

---

## 6) Verify Gemini Is Working in App

1. Login as a normal user.
2. Open **Report Incident** page.
3. Enter a realistic description (fire/medical/flood/etc.).
4. Submit report.
5. Check resulting report category/priority in dashboard/admin view.

Expected:
- App uses Gemini for analysis.
- If Gemini quota/network fails, app falls back to local keyword-based analysis.

---

## 7) Troubleshooting

### A) `Missing VITE_GEMINI_API_KEY`
- Ensure `.env` is in project root.
- Ensure key name is exactly `VITE_GEMINI_API_KEY`.
- Restart dev server.

### B) Quota / Rate limit errors
- Gemini free tier has limits.
- Retry later, or use billing/upgrade in Google AI Studio.
- App should still work with local fallback.

### C) JSON parse errors from model response
- Rarely model may return extra formatting.
- Current code already strips markdown fences and validates schema.

### D) Key works locally but not after deploy
- Add env vars in your hosting platform settings (Vercel/Netlify/etc.).
- Redeploy after setting vars.

---

## 8) Security Note (Important)

Current integration calls Gemini from the browser, which means API key can be exposed to advanced users.

For production, move Gemini call behind a backend API route:
- Frontend sends report text to your backend endpoint.
- Backend uses secret Gemini key.
- Backend returns normalized JSON result.

If you want, I can implement this secure backend-proxy version next.

