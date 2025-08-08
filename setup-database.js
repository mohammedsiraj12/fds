// Database Setup Script for Supabase
// Run this in your browser console or Node.js

const SUPABASE_URL = 'https://xreiokflgmmpfehptddr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZWlva2ZsZ21tcGZlaHB0ZGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzUzODcsImV4cCI6MjA3MDE1MTM4N30.QgSq7oFq9vPB_t6wLPP61e9p3vQNVwFS80k9We89uGY';

// SQL Schema to create tables
const SQL_SCHEMA = `
-- Create patient_profiles table
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create doctor_profiles table
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    specialization TEXT,
    license_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    symptoms TEXT,
    response TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);

-- Enable RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
`;

// Function to setup database
async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // This would need to be run in Supabase SQL Editor
    // For now, just log the SQL
    console.log('Copy this SQL and run it in your Supabase SQL Editor:');
    console.log(SQL_SCHEMA);
    
    console.log('✅ Database setup instructions ready!');
    console.log('📝 Go to your Supabase Dashboard → SQL Editor → New Query');
    console.log('📝 Paste the SQL above and click "Run"');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

// Instructions for manual setup
console.log(`
🚀 SUPABASE DATABASE SETUP INSTRUCTIONS:

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste this SQL:

${SQL_SCHEMA}

6. Click "Run" button
7. Your tables will be created automatically!

✅ After running this, your app will have real data storage!
`);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupDatabase, SQL_SCHEMA };
}
