# 🧪 Test Data Setup Guide

## Test Credentials

Use these credentials to login and test the application:

### 1. Regular User (Reporter)
- **Email**: `user@test.com`
- **Password**: `TestPass123!`
- **Role**: User
- **Test Access**: Report incidents, view map, see own reports

### 2. Volunteer Responder
- **Email**: `volunteer@test.com`
- **Password**: `TestPass123!`
- **Role**: Volunteer
- **Test Access**: View assignments, accept tasks, update status

### 3. Administrator
- **Email**: `admin@test.com`
- **Password**: `TestPass123!`
- **Role**: Admin
- **Test Access**: Manage all incidents, assign volunteers, view analytics

### 4. Citizen (Another User)
- **Email**: `citizen@test.com`
- **Password**: `TestPass123!`
- **Role**: User
- **Test Access**: Same as Regular User

---

## Setup Instructions

### Step 1: Create Auth Users in Supabase

1. Go to https://app.supabase.com
2. Select your ResQNet project
3. Left sidebar → **"Authentication"** → **"Users"**
4. Click **"Create new user"** button
5. Fill in for each user:
   - **Email**: Use email from credentials above
   - **Password**: `TestPass123!`
   - **Auto Confirm User**: Toggle ON
6. Click **"Create user"**
7. **Repeat 4 times** for all 4 test users

**Expected Result**: You'll see 4 users in the Authentication > Users list

### Step 2: Insert Test Data into Database

1. Copy all SQL from [test-data.sql](./test-data.sql)
2. Go to Supabase → **"SQL Editor"** → **"New Query"**
3. Paste the SQL code
4. Click **"Run"** button
5. You should see:
   ```
   ✓ 4 rows inserted into users
   ✓ 8 rows inserted into reports
   ✓ 3 rows inserted into assignments
   ```

---

## Test Data Summary

### Users Created (4 total)
| Email | Role | Purpose |
|-------|------|---------|
| user@test.com | User | Create test reports |
| volunteer@test.com | Volunteer | Accept assignments |
| admin@test.com | Admin | Manage incidents |
| citizen@test.com | User | Secondary reporter |

### Test Incidents Created (8 total)

| # | Title | Category | Priority | Status |
|---|-------|----------|----------|--------|
| 1 | Building Fire on Main Street | 🔥 Fire | 95 (Critical) | Pending |
| 2 | Vehicle Crash | 🚗 Accident | 92 (Critical) | Assigned |
| 3 | Flash Flood | 💧 Flood | 75 (High) | Assigned |
| 4 | Hospital Evacuation | 🏥 Medical | 88 (Critical) | Pending |
| 5 | Train Derailment | 🚂 Accident | 85 (High) | Resolved |
| 6 | Power Outage | ⚡ Other | 45 (Low) | Pending |
| 7 | Warehouse Fire | 🔥 Fire | 90 (Critical) | Assigned |
| 8 | Disease Outbreak | 🏥 Medical | 65 (Medium) | Pending |

### Volunteer Assignments (3 total)
- Volunteer assigned to: Vehicle Crash (accepted)
- Volunteer assigned to: Flash Flood (completed)
- Volunteer assigned to: Warehouse Fire (accepted)

---

## 🧪 Test Scenarios

### Scenario 1: Regular User Testing
**Login as**: `user@test.com` / `TestPass123!`

1. ✅ See Dashboard with 8 incidents
2. ✅ Click "Report Incident" → Submit a new incident
3. ✅ Go to "Map View" → See all incidents with color-coded priority
4. ✅ Go to "My Reports" → See your submitted reports
5. ✅ Check status of each report (pending/assigned/resolved)

### Scenario 2: Volunteer Testing
**Login as**: `volunteer@test.com` / `TestPass123!`

1. ✅ See Dashboard with incident stats
2. ✅ Go to "My Reports" → See assigned tasks
3. ✅ View assignment status (pending/accepted/completed)
4. ✅ Check which incidents are assigned to you

### Scenario 3: Admin Testing
**Login as**: `admin@test.com` / `TestPass123!`

1. ✅ See Admin Dashboard
2. ✅ View ALL incidents (not just yours)
3. ✅ See assignment details
4. ✅ Filter incidents by status/priority
5. ✅ Assign volunteers to pending incidents
6. ✅ Mark incidents as resolved
7. ✅ View analytics/stats

### Scenario 4: AI Integration Testing
**As any user:**

1. ✅ Go to "Report Incident"
2. ✅ Enter description: "There's a large fire spreading rapidly with smoke"
3. ✅ Submit → AI should categorize as "fire" with high priority (80+)
4. ✅ Check the result in "Map View"

---

## Testing Checklist

### Authentication
- [ ] Sign up with new email works
- [ ] Login with correct credentials works
- [ ] Login with wrong credentials fails
- [ ] Session persists on refresh
- [ ] Logout clears session

### Dashboard
- [ ] Dashboard loads for all roles
- [ ] Stats showing correct counts
- [ ] Recent reports displayed
- [ ] Action buttons visible

### Report Submission
- [ ] Form validation works (required fields)
- [ ] Image upload works (optional)
- [ ] Location button works (GPS or manual)
- [ ] AI analysis runs and shows results
- [ ] Report appears on map after submission

### Map View
- [ ] Map displays all incidents
- [ ] Markers colored by priority (red=high, orange=medium, green=low)
- [ ] Clicking marker shows details
- [ ] Filter buttons work (by priority/status)
- [ ] Responsive on mobile

### Admin Panel
- [ ] See all incidents
- [ ] Filter by status works
- [ ] Can assign volunteer to incident
- [ ] Can mark incident resolved
- [ ] Stats update correctly

### Real-Time Updates
- [ ] Open app in 2 browsers
- [ ] Submit incident in one browser
- [ ] Other browser shows new incident (may need refresh)

---

## Clean Up (Optional)

To reset and delete all test data:

```sql
-- Delete in order (respecting foreign keys)
DELETE FROM assignments;
DELETE FROM reports;
DELETE FROM users WHERE email IN ('user@test.com', 'volunteer@test.com', 'admin@test.com', 'citizen@test.com');
```

Then delete the auth users from Supabase Authentication panel.

---

## Need Help?

If something doesn't work:

1. **Check browser console** (F12 → Console tab)
2. **Check Supabase logs** (Supabase → Logs)
3. **Verify API keys** in `.env.local`
4. **Restart dev server** (`npm run dev`)

---

**Happy Testing! 🚀**
