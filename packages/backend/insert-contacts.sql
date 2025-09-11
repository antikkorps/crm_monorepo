-- Insert demo contact persons
INSERT INTO contact_persons (
  id, first_name, last_name, email, phone, title, 
  institution_id, is_primary, is_active, created_at, updated_at
) VALUES 
(
  gen_random_uuid(), 
  'Dr. John', 
  'Smith', 
  'john.smith@generalhospital.com', 
  '+1-555-0101', 
  'Chief Medical Officer',
  'b4a29c10-42fa-4303-bac3-d118fc0499a5', 
  true,
  true, 
  NOW(), 
  NOW()
),
(
  gen_random_uuid(), 
  'Sarah', 
  'Johnson', 
  'sarah.johnson@generalhospital.com', 
  '+1-555-0102', 
  'Department Head',
  'b4a29c10-42fa-4303-bac3-d118fc0499a5', 
  false,
  true, 
  NOW(), 
  NOW()
),
(
  gen_random_uuid(), 
  'Dr. Michael', 
  'Brown', 
  'michael.brown@citymedical.com', 
  '+1-555-0201', 
  'Senior Physician',
  'b4a29c10-42fa-4303-bac3-d118fc0499a5', 
  false,
  true, 
  NOW(), 
  NOW()
),
(
  gen_random_uuid(), 
  'Lisa', 
  'Davis', 
  'lisa.davis@citymedical.com', 
  '+1-555-0202', 
  'Procurement Manager',
  'b4a29c10-42fa-4303-bac3-d118fc0499a5', 
  false,
  true, 
  NOW(), 
  NOW()
);

SELECT COUNT(*) as contact_count FROM contact_persons;