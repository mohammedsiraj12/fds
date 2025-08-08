-- Simple SQL to create tables manually in Supabase
-- Copy this and run it in your Supabase SQL Editor

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
    follow_up_response TEXT,
    follow_up_from_patient BOOLEAN DEFAULT false,
    follow_up_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'waiting_doctor', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
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

-- Create medical_records table for PDF uploads
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT DEFAULT 'Medical Record',
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add medical_record_id to consultations table (optional reference)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;

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

-- Basic RLS policies (simplified for testing)
CREATE POLICY "Enable all for authenticated users" ON patient_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for authenticated users" ON doctor_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable all for authenticated users" ON consultations FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON appointments FOR ALL USING (true);
