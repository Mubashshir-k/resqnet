-- ResQNet Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Tables
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'volunteer', 'admin')),
  created_at timestamp DEFAULT now()
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  latitude float NOT NULL,
  longitude float NOT NULL,
  category text DEFAULT 'other' CHECK (category IN ('fire', 'medical', 'accident', 'flood', 'other')),
  priority_score integer NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved')),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  updated_at timestamp DEFAULT now()
);

-- Create Indexes
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_priority_score ON reports(priority_score DESC);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_assignments_volunteer_id ON assignments(volunteer_id);
CREATE INDEX idx_assignments_report_id ON assignments(report_id);
CREATE INDEX idx_assignments_status ON assignments(status);

-- Create Storage Bucket (run in Supabase dashboard)
-- Storage > New Bucket > "reports" > Private

-- Row Level Security (RLS) - Optional but recommended
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and all users (for volunteer assignment)
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can create their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can read all reports
CREATE POLICY "Users can read all reports" ON reports
  FOR SELECT USING (true);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own reports
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all reports" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Volunteers can update reports they are assigned to
CREATE POLICY "Volunteers can update assigned reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.report_id = reports.id 
      AND assignments.volunteer_id = auth.uid()
    )
  );

-- Admins can delete any report
CREATE POLICY "Admins can delete reports" ON reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Assignments - volunteers can see their own, admins see all
CREATE POLICY "Volunteers can read own assignments" ON assignments
  FOR SELECT USING (auth.uid() = volunteer_id);

CREATE POLICY "Admins can read all assignments" ON assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can create assignments" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can delete assignments" ON assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Volunteers can update own assignment status" ON assignments
  FOR UPDATE USING (auth.uid() = volunteer_id);

-- Table Comments (optional)
COMMENT ON TABLE users IS 'User accounts with role-based access';
COMMENT ON TABLE reports IS 'Incident reports submitted by users';
COMMENT ON TABLE assignments IS 'Volunteer task assignments for incidents';
COMMENT ON COLUMN reports.priority_score IS 'AI-assigned priority score 0-100';
COMMENT ON COLUMN reports.category IS 'AI-categorized incident type';
