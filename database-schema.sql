-- Database Schema for Doctor-Patient Consultation App
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS doctor_profiles ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);

-- Row Level Security Policies

-- Patient profiles policies
CREATE POLICY "Users can view their own patient profile" ON patient_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patient profile" ON patient_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient profile" ON patient_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Doctor profiles policies
CREATE POLICY "Users can view their own doctor profile" ON doctor_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own doctor profile" ON doctor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor profile" ON doctor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Consultations policies
CREATE POLICY "Patients can view their own consultations" ON consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patient_profiles 
            WHERE patient_profiles.user_id = auth.uid() 
            AND patient_profiles.id = consultations.patient_id
        )
    );

CREATE POLICY "Doctors can view consultations assigned to them" ON consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doctor_profiles 
            WHERE doctor_profiles.user_id = auth.uid() 
            AND doctor_profiles.id = consultations.doctor_id
        )
    );

CREATE POLICY "Patients can create consultations" ON consultations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM patient_profiles 
            WHERE patient_profiles.user_id = auth.uid() 
            AND patient_profiles.id = consultations.patient_id
        )
    );

CREATE POLICY "Doctors can update consultations assigned to them" ON consultations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM doctor_profiles 
            WHERE doctor_profiles.user_id = auth.uid() 
            AND doctor_profiles.id = consultations.doctor_id
        )
    );

-- Appointments policies
CREATE POLICY "Patients can view their own appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM patient_profiles 
            WHERE patient_profiles.user_id = auth.uid() 
            AND patient_profiles.id = appointments.patient_id
        )
    );

CREATE POLICY "Doctors can view appointments assigned to them" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doctor_profiles 
            WHERE doctor_profiles.user_id = auth.uid() 
            AND doctor_profiles.id = appointments.doctor_id
        )
    );

CREATE POLICY "Patients can create appointments" ON appointments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM patient_profiles 
            WHERE patient_profiles.user_id = auth.uid() 
            AND patient_profiles.id = appointments.patient_id
        )
    );

CREATE POLICY "Doctors can update appointments assigned to them" ON appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM doctor_profiles 
            WHERE doctor_profiles.user_id = auth.uid() 
            AND doctor_profiles.id = appointments.doctor_id
        )
    );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patient_profiles_updated_at 
    BEFORE UPDATE ON patient_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_profiles_updated_at 
    BEFORE UPDATE ON doctor_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
