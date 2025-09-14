import { apiClient } from './apiClient';

// API endpoints for Neo4j backend
export const API_ENDPOINTS = {
  CONSULTATIONS: '/consultations',
  APPOINTMENTS: '/appointments',
  MESSAGES: '/messages',
  PATIENTS: '/patients',
  DOCTORS: '/doctors',
  MEDICAL_RECORDS: '/medical-records'
};

// Consultation functions
export async function createConsultation(patientId, question, symptoms) {
  try {
    const data = await apiClient.post(API_ENDPOINTS.CONSULTATIONS, {
      patient_id: patientId,
      question: question,
      symptoms: symptoms,
      status: 'pending'
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPatientConsultations(patientId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.CONSULTATIONS}/patient/${patientId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPatientConsultationsWithResponses(patientId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.CONSULTATIONS}/patient/${patientId}/with-responses`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function addFollowUpResponse(consultationId, response, isFromPatient = true) {
  try {
    const data = await apiClient.put(`${API_ENDPOINTS.CONSULTATIONS}/${consultationId}/follow-up`, {
      response: response,
      from_patient: isFromPatient
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function closeConsultation(consultationId) {
  try {
    const data = await apiClient.put(`${API_ENDPOINTS.CONSULTATIONS}/${consultationId}/close`, {});
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getDoctorConsultations(doctorId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.CONSULTATIONS}/doctor/${doctorId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllPendingConsultations() {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.CONSULTATIONS}/pending`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllConsultations() {
  try {
    const data = await apiClient.get(API_ENDPOINTS.CONSULTATIONS);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function respondToConsultation(consultationId, doctorId, response) {
  try {
    const data = await apiClient.put(`${API_ENDPOINTS.CONSULTATIONS}/${consultationId}/respond`, {
      doctor_id: doctorId,
      response: response
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Appointment functions
export async function createAppointment(patientId, date, time, type) {
  try {
    const data = await apiClient.post(API_ENDPOINTS.APPOINTMENTS, {
      patient_id: patientId,
      appointment_date: date,
      appointment_time: time,
      appointment_type: type,
      status: 'pending'
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPatientAppointments(patientId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS}/patient/${patientId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getDoctorAppointments(doctorId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS}/doctor/${doctorId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Profile functions
export async function createPatientProfile(userId, fullName, dateOfBirth, gender) {
  try {
    const data = await apiClient.post(API_ENDPOINTS.PATIENTS, {
      user_id: userId,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      gender: gender
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createDoctorProfile(userId, fullName, specialization, licenseNumber) {
  try {
    const data = await apiClient.post(API_ENDPOINTS.DOCTORS, {
      user_id: userId,
      full_name: fullName,
      specialization: specialization,
      license_number: licenseNumber
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPatientProfile(userId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.PATIENTS}/${userId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getDoctorProfile(userId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.DOCTORS}/${userId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Message functions
export async function sendConsultationMessage(consultationId, senderId, senderRole, messageText) {
  try {
    const data = await apiClient.post(API_ENDPOINTS.MESSAGES, {
      consultation_id: consultationId,
      sender_id: senderId,
      sender_role: senderRole,
      message: messageText
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getConsultationMessages(consultationId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.MESSAGES}/consultation/${consultationId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Medical records functions (simplified for now)
export async function uploadMedicalRecord(file, patientId, description = 'Medical Record') {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    formData.append('description', description);
    
    const response = await fetch(`http://localhost:8000${API_ENDPOINTS.MEDICAL_RECORDS}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPatientMedicalRecords(patientId) {
  try {
    const data = await apiClient.get(`${API_ENDPOINTS.MEDICAL_RECORDS}/patient/${patientId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteMedicalRecord(recordId) {
  try {
    const data = await apiClient.delete(`${API_ENDPOINTS.MEDICAL_RECORDS}/${recordId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Admin list helpers
export async function getAllPatients() {
  try {
    const data = await apiClient.get(API_ENDPOINTS.PATIENTS);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllDoctors() {
  try {
    const data = await apiClient.get(API_ENDPOINTS.DOCTORS);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
