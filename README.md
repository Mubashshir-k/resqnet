# ResQNet – AI Disaster Response System

> **AI-powered disaster response coordination platform** | React + Supabase + OpenAI | Mobile-first PWA

[![Status](https://img.shields.io/badge/status-active-success.svg)]() [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚨 About

ResQNet is a progressive web app (PWA) that enables rapid disaster response coordination. Users report incidents with AI-powered categorization and priority scoring, while volunteers and administrators manage response efforts in real-time.

### Key Features

- **📱 Mobile-First Design** – Fully responsive, works offline
- **🤖 AI Analysis** – Automatically categorizes incidents and assigns priority scores
- **🗺️ Real-Time Map** – Visualize all incidents with priority markers
- **👥 Role-Based Access** – Users, Volunteers, and Admin roles
- **📝 Report Management** – Submit, track, and resolve incidents
- **⚡ Real-Time Updates** – Supabase subscriptions for live data
- **🖼️ Image Upload** – Incident photos stored securely
- **📊 Admin Dashboard** – Centralized incident management and volunteer assignment

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password) |
| AI | OpenAI API (GPT-3.5) |
| State | Zustand |
| Icons | Lucide React |
| Deployment | Vercel |

## 📋 Database Schema

### Tables

```sql
-- Users (role-based access)
CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user', -- 'user', 'volunteer', 'admin'
  created_at timestamp DEFAULT now()
)

-- Reports (incident submissions)
CREATE TABLE reports (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  latitude float NOT NULL,
  longitude float NOT NULL,
  category text DEFAULT 'other', -- 'fire', 'medical', 'accident', 'flood', 'other'
  priority_score integer CHECK (priority_score >= 0 AND priority_score <= 100),
  status text DEFAULT 'pending', -- 'pending', 'assigned', 'resolved'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)

-- Assignments (volunteer task assignments)
CREATE TABLE assignments (
  id uuid PRIMARY KEY,
  report_id uuid REFERENCES reports(id),
  volunteer_id uuid REFERENCES users(id),
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'rejected'
  updated_at timestamp DEFAULT now()
)

-- Storage (reports bucket for images)
CREATE BUCKET reports PRIVATE
```

### Indexes

```sql
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_priority_score ON reports(priority_score DESC);
CREATE INDEX idx_assignments_volunteer_id ON assignments(volunteer_id);
CREATE INDEX idx_assignments_report_id ON assignments(report_id);
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier available)
- OpenAI API key

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd resqnet-react
npm install

# 2. Setup environment variables
cp .env.example .env.local

# Add to .env.local:
# - Supabase URL and Anon Key from https://app.supabase.com
# - OpenAI API key from https://platform.openai.com/api-keys
```

### Database Setup

1. Create a new Supabase project
2. Go to SQL Editor → New Query
3. Paste the SQL from [database-schema.sql](./database-schema.sql)
4. Execute the SQL to create tables and indexes

### Configuration

Edit `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=sk-your-key
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run preview
```

## 📱 Screens

| Screen | Features |
|--------|----------|
| **Login/Signup** | Email auth, role selection, form validation |
| **Dashboard** | Stats overview, recent reports, quick actions |
| **Report Incident** | Form, image upload, location (GPS/manual), AI analysis |
| **Map View** | SVG map with incident markers, filter by priority |
| **My Reports** | User's submitted reports, status tracking |
| **Admin Dashboard** | All reports, volunteer assignment, status management |

## 🌍 AI Integration

When a user submits a report, the description is sent to OpenAI API:

```typescript
// Input
"There's a large fire spreading in downtown area, affecting buildings"

// AI Response
{
  "category": "fire",
  "priority_score": 95,
  "reason": "Large active fire affecting multiple buildings - critical priority"
}
```

The AI categorizes incidents into: `fire`, `medical`, `accident`, `flood`, `other`

Priority scores: 0-100 (70+: high, 40-69: medium, 0-39: low)

## 🚢 Deployment

### Vercel

1. Push to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Add Environment Variables
5. Deploy

```bash
# CLI deployment
npm i -g vercel
vercel --prod
```

### Environment Variables in Vercel

Add the same `.env.local` variables in Vercel Settings → Environment Variables

## 📁 Project Structure

```
resqnet-react/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route pages
│   ├── services/           # API & Supabase integration
│   ├── store/              # Zustand stores (auth)
│   ├── types/              # TypeScript interfaces
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions
│   ├── App.tsx             # Router setup
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── .env.example
```

## 🔐 Security

- ✅ Environment variables for sensitive data
- ✅ Supabase Auth for user authentication
- ✅ Row-level security (RLS) policies recommended
- ✅ Private storage bucket for images
- ✅ CORS configured for API calls

### Recommended: Enable RLS on Supabase

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Example: Users can only see their own reports
CREATE POLICY "Users view own reports"
  ON reports
  FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
```

## 📊 Usage Scenarios

### User Reports an Incident
1. User navigates to "Report Incident"
2. Fills form with description and optional image
3. Use GPS location or enter coordinates
4. Submit via OpenAI API for categorization
5. Report appears on map and dashboard
6. Volunteers can accept the task

### Admin Manages Incidents
1. View all reports in admin dashboard
2. See unresolved incidents with highest priority first
3. Assign volunteers to incidents
4. Track status (pending → assigned → resolved)
5. Analytics about response times

## 🎨 Design System

- **Colors**: Red (#E53935) primary, white background, light grey accents
- **Typography**: Inter/Roboto sans-serif
- **Components**: Card-based layout, rounded buttons, Material icons
- **Spacing**: Consistent 4px grid system via Tailwind

## 🐛 Troubleshooting

### Missing Environment Variables
```
Error: VITE_SUPABASE_URL is undefined
```
→ Create `.env.local` and add all required variables from `.env.example`

### OpenAI API Rate Limit
→ Implement request throttling or upgrade API plan

### Supabase Connection Error
→ Verify URL and Anon Key in Supabase dashboard Settings → API

## 📚 Documentation

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)

## 📝 License

MIT License – Feel free to use this project for hackathons, learning, and production.

## 🤝 Contributing

Got ideas? Open an issue or submit a PR!

---

**Built with ❤️ for disaster response coordination**
