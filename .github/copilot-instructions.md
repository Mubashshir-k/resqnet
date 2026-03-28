<!-- Copilot Instructions for ResQNet Development -->

## Project Context

**ResQNet** is an AI-powered disaster response PWA built with React, Tailwind CSS, Supabase, and OpenAI.

### Tech Stack
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Backend: Supabase (Auth, Database, Storage, Realtime)
- AI: OpenAI API (GPT-3.5)
- State: Zustand
- Icons: Lucide React

### Project Structure
```
src/
  ├── components/     # Reusable UI components
  ├── pages/         # Route pages (6 screens)
  ├── services/      # Supabase and OpenAI integration
  ├── store/         # Zustand auth store
  ├── types/         # TypeScript interfaces
  ├── hooks/         # Custom React hooks
  ├── utils/         # Helper functions
  └── App.tsx        # Router with protected routes
```

### Key Features
1. **Authentication**: Email/password signup with role selection (user/volunteer/admin)
2. **Report Submission**: Form with image upload, AI categorization, priority scoring
3. **Map View**: SVG-based incident visualization with priority color coding
4. **Admin Dashboard**: Manage all reports, assign volunteers, track status
5. **Real-Time Updates**: Supabase subscriptions for live data sync
6. **Mobile-First**: Fully responsive PWA with Tailwind CSS

### Database
- Tables: users, reports, assignments
- Storage: reports bucket for incident images
- RLS: Row-level security for data protection (recommended)
- Indexes: Optimized for priority and status queries

### Environment Variables Required
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
```

### Development Guidelines
- Use React hooks and Zustand for state management
- Implement error boundaries and loading states
- Mobile-first responsive design with Tailwind
- Deploy to Vercel with environment variables
- All forms require validation and error handling
- Use Lucide React icons consistently

### Common Tasks
- **Add a new page**: Create in src/pages/, add route in App.tsx, add to Header navigation
- **Add UI component**: Create in src/components/, use Tailwind classes from design system
- **Database query**: Use services in src/services/database.ts
- **Authentication check**: Use useAuthStore hook with ProtectedRoute wrapper

### Design System
- **Primary Color**: Red (#E53935) - use `text-primary-500`, `bg-primary-500`, etc.
- **Typography**: Inter/Roboto via Tailwind default
- **Spacing**: 4px grid (use Tailwind utilities)
- **Cards**: `bg-white rounded-lg shadow-sm border border-gray-200`
- **Buttons**: Base style in Button.tsx component

### Testing Credentials (After Setup)
- Test signup with any email/password
- Use role selector to test different views
- Create dummy reports to test AI categorization
- Test map and assignment features

### Deployment Checklist
- [ ] All environment variables in Vercel
- [ ] Database schema created in Supabase
- [ ] Storage bucket "reports" created and set to private
- [ ] RLS policies enabled (recommended)
- [ ] Build compiles without errors
- [ ] Routes protected with ProtectedRoute wrapper
- [ ] OpenAI API key valid and has credits

---

**Last Updated**: 2024-03-25
