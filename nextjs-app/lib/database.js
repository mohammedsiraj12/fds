import { supabase } from './supabaseClient';

// Database table names
export const TABLES = {
  CONSULTATIONS: 'consultations',
  APPOINTMENTS: 'appointments',
  MESSAGES: 'messages',
  PATIENT_PROFILES: 'patient_profiles',
  DOCTOR_PROFILES: 'doctor_profiles'
};

// Create database tables (run this once to set up)
export async function setupDatabase() {
  try {
    // Create consultations table
    const { error: consultationsError } = await supabase
      .from(TABLES.CONSULTATIONS)
      .select('*')
      .limit(1);

    if (consultationsError && consultationsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      await supabase.rpc('create_consultations_table');
    }

    // Create appointments table
    const { error: appointmentsError } = await supabase
      .from(TABLES.APPOINTMENTS)
      .select('*')
      .limit(1);

    if (appointmentsError && appointmentsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      await supabase.rpc('create_appointments_table');
    }

    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup error:', error);
  }
}

// Consultation functions
export async function createConsultation(patientId, question, symptoms) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .insert([
      {
        patient_id: patientId,
        question: question,
        symptoms: symptoms,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ])
    .select();

  return { data, error };
}

export async function getPatientConsultations(patientId) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select(`
      *,
      doctor_profiles(full_name, specialization)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// Get patient consultations that have doctor responses
export async function getPatientConsultationsWithResponses(patientId) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select(`
      *,
      doctor_profiles(full_name, specialization)
    `)
    .eq('patient_id', patientId)
    .not('response', 'is', null)
    .order('created_at', { ascending: false });

  return { data, error };
}

// Add follow-up response to existing consultation
export async function addFollowUpResponse(consultationId, response, isFromPatient = true) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .update({
      follow_up_response: response,
      follow_up_from_patient: isFromPatient,
      follow_up_at: new Date().toISOString(),
      status: isFromPatient ? 'waiting_doctor' : 'answered'
    })
    .eq('id', consultationId)
    .select();

  return { data, error };
}

// Close consultation manually
export async function closeConsultation(consultationId) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .update({
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('id', consultationId)
    .select();

  return { data, error };
}

// Get consultations that should be auto-closed (older than 5 days)
export async function getConsultationsToAutoClose() {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select('*')
    .lt('created_at', fiveDaysAgo.toISOString())
    .eq('status', 'answered')
    .is('closed_at', null);

  return { data, error };
}

// Upload medical record PDF
export async function uploadMedicalRecord(file, patientId, description = 'Medical Record') {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Build safe file path: {patientId}/medical_records/{timestamp}_{slug}.pdf
    const originalName = (file.name || 'medical-record').toString();
    const baseName = originalName.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const safeFileName = `${Date.now()}_${baseName || 'medical-record'}.pdf`;
    const filePath = `${patientId}/medical_records/${safeFileName}`;

    // Upload file to Supabase Storage with correct content type
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-records')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL from the correct bucket
    const { data: urlData } = supabase.storage
      .from('medical-records')
      .getPublicUrl(filePath);

    // Save record to database
    const { data, error } = await supabase
      .from('medical_records')
      .insert([
        {
          patient_id: patientId,
          file_name: originalName,
          file_url: urlData.publicUrl,
          file_path: filePath,
          description: description,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        }
      ])
      .select();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Helper to create a time-limited signed URL for viewing/downloading a medical record
export async function getSignedMedicalRecordUrl(filePath, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from('medical-records')
    .createSignedUrl(filePath, expiresInSeconds);
  return { data, error };
}

// Get patient's medical records
export async function getPatientMedicalRecords(patientId) {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('uploaded_at', { ascending: false });

  return { data, error };
}

// Delete medical record
export async function deleteMedicalRecord(recordId) {
  // Fetch the record to get storage path
  const { data: recordRows, error: fetchError } = await supabase
    .from('medical_records')
    .select('id, file_path')
    .eq('id', recordId)
    .limit(1);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const record = Array.isArray(recordRows) ? recordRows[0] : recordRows;
  if (!record) {
    return { data: null, error: new Error('Record not found') };
  }

  // Remove file from storage (ignore missing file errors)
  const { error: storageError } = await supabase.storage
    .from('medical-records')
    .remove([record.file_path]);

  if (storageError && storageError.message && !/not found/i.test(storageError.message)) {
    // If it's not a simple not-found, surface the error
    return { data: null, error: storageError };
  }

  // Delete DB row
  const { data, error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', recordId)
    .select();

  return { data, error };
}

export async function getDoctorConsultations(doctorId) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select(`
      *,
      patient_profiles!inner(full_name, date_of_birth, gender)
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  return { data, error };
}

// New function to get all pending consultations (for doctors to see unassigned ones)
export async function getAllPendingConsultations() {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select(`
      *,
      patient_profiles(full_name, date_of_birth, gender)
    `)
    .is('doctor_id', null)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data, error };
}

// Debug function to get ALL consultations (for troubleshooting)
export async function getAllConsultations() {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .select(`
      *,
      patient_profiles(full_name, date_of_birth, gender)
    `)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function respondToConsultation(consultationId, doctorId, response) {
  const { data, error } = await supabase
    .from(TABLES.CONSULTATIONS)
    .update({
      doctor_id: doctorId,
      response: response,
      status: 'answered',
      answered_at: new Date().toISOString()
    })
    .eq('id', consultationId)
    .select();

  return { data, error };
}

// Appointment functions
export async function createAppointment(patientId, date, time, type) {
  const { data, error } = await supabase
    .from(TABLES.APPOINTMENTS)
    .insert([
      {
        patient_id: patientId,
        appointment_date: date,
        appointment_time: time,
        appointment_type: type,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ])
    .select();

  return { data, error };
}

export async function getPatientAppointments(patientId) {
  const { data, error } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select(`
      *,
      doctor_profiles!inner(full_name, specialization)
    `)
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: true });

  return { data, error };
}

export async function getDoctorAppointments(doctorId) {
  const { data, error } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select(`
      *,
      patient_profiles!inner(full_name, date_of_birth, gender)
    `)
    .eq('doctor_id', doctorId)
    .order('appointment_date', { ascending: true });

  return { data, error };
}

// Profile functions
export async function createPatientProfile(userId, fullName, dateOfBirth, gender) {
  const { data, error } = await supabase
    .from(TABLES.PATIENT_PROFILES)
    .insert([
      {
        user_id: userId,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        gender: gender,
        created_at: new Date().toISOString()
      }
    ])
    .select();

  return { data, error };
}

export async function createDoctorProfile(userId, fullName, specialization, licenseNumber) {
  const { data, error } = await supabase
    .from(TABLES.DOCTOR_PROFILES)
    .insert([
      {
        user_id: userId,
        full_name: fullName,
        specialization: specialization,
        license_number: licenseNumber,
        created_at: new Date().toISOString()
      }
    ])
    .select();

  return { data, error };
}

export async function getPatientProfile(userId) {
  const { data, error } = await supabase
    .from(TABLES.PATIENT_PROFILES)
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
}

export async function getDoctorProfile(userId) {
  const { data, error } = await supabase
    .from(TABLES.DOCTOR_PROFILES)
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
}
