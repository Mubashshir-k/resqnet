-- ResQNet Test Data
-- Run this in Supabase SQL Editor after running database-schema.sql

-- Test Users (with proper UUID format)
-- Password: TestPass123! (for all test users)
-- Note: These UUIDs are placeholders - use real ones from Supabase Auth if available

INSERT INTO users (id, name, email, role, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John Reporter', 'user@test.com', 'user', now()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Jane Volunteer', 'volunteer@test.com', 'volunteer', now()),
  ('550e8400-e29b-41d4-a716-446655440003', 'Admin Manager', 'admin@test.com', 'admin', now()),
  ('550e8400-e29b-41d4-a716-446655440004', 'Bob Citizen', 'citizen@test.com', 'user', now());

-- Test Reports (Incidents)
INSERT INTO reports (id, user_id, title, description, image_url, latitude, longitude, category, priority_score, status, created_at, updated_at) VALUES
  
  -- High Priority - Fire
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Building Fire on Main Street', 
   'Large fire on the 5th floor of the downtown office building. Multiple people trapped inside. Smoke visible from blocks away. Emergency services have been called.',
   'https://via.placeholder.com/400x300?text=Fire+Incident', 
   40.7128, -74.0060, 'fire', 95, 'pending', now(), now()),
  
  -- High Priority - Medical Emergency
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Multiple Casualties Vehicle Crash', 
   'Head-on collision on Highway 101. Two vehicles involved. At least 4 people injured. One vehicle on fire. Paramedics en route.',
   'https://via.placeholder.com/400x300?text=Vehicle+Crash', 
   37.7749, -122.4194, 'accident', 92, 'assigned', now(), now()),
  
  -- Medium Priority - Flood
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Flash Flood in Downtown Area', 
   'Heavy rainfall has caused flooding in the downtown district. Streets are impassable. Several vehicles stranded. Water rising rapidly in basement areas.',
   'https://via.placeholder.com/400x300?text=Flood+Situation', 
   39.0997, -94.5786, 'flood', 75, 'assigned', now(), now()),
  
  -- High Priority - Medical
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Hospital Evacuation Required', 
   'Gas leak detected in hospital basement. Entire east wing needs immediate evacuation. 200+ patients need to be relocated. Hazmat team called.',
   'https://via.placeholder.com/400x300?text=Hospital+Emergency', 
   34.0522, -118.2437, 'medical', 88, 'pending', now(), now()),
  
  -- Medium Priority - Accident
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'Train Derailment', 
   'Passenger train derailed near station. Multiple cars displaced. Approximately 150 passengers on board. Some injuries reported. Railway emergency protocol activated.',
   'https://via.placeholder.com/400x300?text=Train+Incident', 
   41.8781, -87.6298, 'accident', 85, 'resolved', now(), now()),
  
  -- Low Priority - Other
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Power Outage in Residential Area', 
   'Complete power loss affecting 500+ homes. Cause unknown. Utility company investigating. Some traffic lights out.',
   'https://via.placeholder.com/400x300?text=Power+Outage', 
   47.6062, -122.3321, 'other', 45, 'pending', now(), now()),
  
  -- High Priority - Fire
  ('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Warehouse Fire', 
   'Industrial warehouse fire in Port District. Heavy black smoke. Wind pushing smoke toward residential area. 50+ firefighters deployed.',
   'https://via.placeholder.com/400x300?text=Warehouse+Fire', 
   48.8566, 2.3522, 'fire', 90, 'assigned', now(), now()),
  
  -- Medium Priority - Medical
  ('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004', 'Disease Outbreak at School', 
   'Multiple students showing symptoms of unknown illness. School clinic overwhelmed. 30+ cases reported. Health department notified.',
   'https://via.placeholder.com/400x300?text=Health+Emergency', 
   51.5074, -0.1278, 'medical', 65, 'pending', now(), now());

-- Test Assignments (Volunteer Tasks)
INSERT INTO assignments (id, report_id, volunteer_id, status, updated_at) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'accepted', now()),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'completed', now()),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'accepted', now());

-- Summary
-- This creates:
-- - 4 test users (1 regular, 1 volunteer, 1 admin, 1 citizen)
-- - 8 test incidents with various priorities and statuses
-- - 3 volunteer assignments

-- All incidents based on real disaster scenarios
-- Coordinates from major cities worldwide
-- Priority scores range from 45 (low) to 95 (critical)
-- Mix of all categories: fire, medical, accident, flood, other
-- Mix of all statuses: pending, assigned, resolved
