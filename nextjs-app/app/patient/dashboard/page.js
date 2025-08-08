"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { createConsultation, createAppointment, getPatientConsultations, getPatientConsultationsWithResponses, getPatientAppointments, createPatientProfile, getPatientProfile, addFollowUpResponse, closeConsultation, uploadMedicalRecord, getPatientMedicalRecords, deleteMedicalRecord } from "../../../lib/database";

export default function PatientDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ask-question");
  const [question, setQuestion] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentType, setAppointmentType] = useState("general");
  const [message, setMessage] = useState("");
  const [consultations, setConsultations] = useState([]);
  const [consultationsWithResponses, setConsultationsWithResponses] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/patient/login');
        return;
      }
      
      // Check if user is a patient
      const userRole = user.user_metadata?.role;
      if (userRole !== 'patient') {
        router.push('/');
        return;
      }
      
      setUser(user);
      
      // Get or create patient profile
      try {
        const { data: profile, error: profileError } = await getPatientProfile(user.id);
        
        if (profileError && profileError.code === 'PGRST116') {
          // Table doesn't exist - create it manually
          console.log("Patient profiles table doesn't exist. Creating profile manually...");
          const { data: newProfile, error: createError } = await createPatientProfile(
            user.id,
            user.user_metadata?.full_name || user.email?.split('@')[0],
            user.user_metadata?.date_of_birth || null,
            user.user_metadata?.gender || null
          );
          
          if (createError) {
            console.error("Error creating patient profile:", createError);
            setMessage("Error creating profile: " + createError.message);
          } else {
            setPatientProfile(newProfile);
          }
        } else if (profile) {
          setPatientProfile(profile);
        } else {
          // Profile doesn't exist - create it
          const { data: newProfile, error: createError } = await createPatientProfile(
            user.id,
            user.user_metadata?.full_name || user.email?.split('@')[0],
            user.user_metadata?.date_of_birth || null,
            user.user_metadata?.gender || null
          );
          
          if (createError) {
            console.error("Error creating patient profile:", createError);
            setMessage("Error creating profile: " + createError.message);
          } else {
            setPatientProfile(newProfile);
          }
        }
      } catch (error) {
        console.error("Error in profile setup:", error);
        setMessage("Error setting up profile: " + error.message);
      }
      
      setLoading(false);
    };

    getUser();
  }, [router]);

  useEffect(() => {
    if (patientProfile) {
      loadConsultations();
      loadAppointments();
      loadMedicalRecords();
    }
  }, [patientProfile]);

  const loadConsultations = async () => {
    if (!patientProfile) return;
    
    try {
      console.log("🔍 Loading consultations for patient:", patientProfile.id);
      
      // Load all consultations
      const { data, error } = await getPatientConsultations(patientProfile.id);
      console.log("📊 All consultations result:", { data, error });
      
      if (error) {
        console.error("❌ Error loading consultations:", error);
      } else if (data) {
        setConsultations(data);
        console.log("✅ Loaded all consultations:", data.length);
        
        // Filter consultations with responses
        const consultationsWithResponses = data.filter(c => c.response && c.response.trim() !== '');
        setConsultationsWithResponses(consultationsWithResponses);
        console.log("✅ Consultations with responses:", consultationsWithResponses.length);
        
        // Log each consultation for debugging
        data.forEach((consultation, index) => {
          console.log(`📋 Consultation ${index + 1}:`, {
            id: consultation.id,
            question: consultation.question,
            response: consultation.response,
            status: consultation.status,
            doctor: consultation.doctor_profiles?.full_name || 'No doctor assigned'
          });
        });
      }
    } catch (error) {
      console.error("💥 Error in loadConsultations:", error);
    }
  };

  const loadAppointments = async () => {
    if (!patientProfile) return;
    
    try {
      const { data, error } = await getPatientAppointments(patientProfile.id);
      if (error) {
        console.error("Error loading appointments:", error);
      } else if (data) {
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error in loadAppointments:", error);
    }
  };

  const loadMedicalRecords = async () => {
    if (!patientProfile) return;
    
    try {
      const { data, error } = await getPatientMedicalRecords(patientProfile.id);
      if (error) {
        console.error("Error loading medical records:", error);
      } else if (data) {
        setMedicalRecords(data);
      }
    } catch (error) {
      console.error("Error in loadMedicalRecords:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB
  const isPdfSignature = async (file) => {
    try {
      const ab = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(ab);
      // '%PDF' signature
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    } catch {
      return false;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    setMessage("");
    if (!file) return;

    const isPdfType = file.type === 'application/pdf';
    const isPdfMagic = await isPdfSignature(file);
    if (!isPdfType || !isPdfMagic) {
      setSelectedFile(null);
      setMessage("Invalid file. Please upload a valid PDF.");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      setSelectedFile(null);
      setMessage("File too large. Max size is 10MB.");
      return;
    }

    setSelectedFile(file);
    setFileDescription(file.name.replace(/\.pdf$/i, ''));
  };

  const handleUploadMedicalRecord = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedFile || !patientProfile) {
      setMessage("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const description = (fileDescription && fileDescription.trim()) || selectedFile.name.replace(/\.pdf$/i, '');
      const { data, error } = await uploadMedicalRecord(selectedFile, patientProfile.id, description);
      if (error) {
        console.error("Error uploading medical record:", error);
        setMessage("Error uploading file: " + error.message);
      } else {
        setMessage("Medical record uploaded successfully! Doctors can now view it.");
        setSelectedFile(null);
        setFileDescription("");
        loadMedicalRecords(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleUploadMedicalRecord:", error);
      setMessage("Error uploading file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedicalRecord = async (recordId) => {
    try {
      const { error } = await deleteMedicalRecord(recordId);
      if (error) {
        console.error("Error deleting medical record:", error);
        setMessage("Error deleting file: " + error.message);
      } else {
        setMessage("Medical record deleted successfully!");
        loadMedicalRecords(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleDeleteMedicalRecord:", error);
      setMessage("Error deleting file: " + error.message);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !symptoms.trim()) {
      setMessage("Please fill in all fields");
      return;
    }

    if (!patientProfile) {
      setMessage("Profile not found. Please refresh the page and try again.");
      return;
    }

    try {
      console.log("🔍 Submitting question:", { 
        question, 
        symptoms, 
        patientProfileId: patientProfile.id,
        patientName: patientProfile.full_name 
      });
      
      const { data, error } = await createConsultation(patientProfile.id, question, symptoms);
      
      console.log("📊 Consultation result:", { data, error });
      
      if (error) {
        console.error("❌ Error creating consultation:", error);
        setMessage("Error submitting question: " + error.message);
      } else {
        console.log("✅ Question submitted successfully:", data);
        setMessage("Question submitted! A doctor will respond soon.");
        setQuestion("");
        setSymptoms("");
        loadConsultations(); // Reload the list
      }
    } catch (error) {
      console.error("💥 Error in handleAskQuestion:", error);
      setMessage("Error submitting question: " + error.message);
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpMessage.trim() || !selectedConsultation) {
      setMessage("Please enter a follow-up message");
      return;
    }

    try {
      const { error } = await addFollowUpResponse(selectedConsultation.id, followUpMessage, true);
      if (error) {
        console.error("Error adding follow-up:", error);
        setMessage("Error sending follow-up: " + error.message);
      } else {
        setMessage("Follow-up sent! The doctor will respond soon.");
        setFollowUpMessage("");
        setSelectedConsultation(null);
        loadConsultations(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleFollowUp:", error);
      setMessage("Error sending follow-up: " + error.message);
    }
  };

  const handleCloseConsultation = async (consultationId) => {
    try {
      const { error } = await closeConsultation(consultationId);
      if (error) {
        console.error("Error closing consultation:", error);
        setMessage("Error closing consultation: " + error.message);
      } else {
        setMessage("Consultation closed successfully.");
        loadConsultations(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleCloseConsultation:", error);
      setMessage("Error closing consultation: " + error.message);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentDate || !appointmentTime || !appointmentType) {
      setMessage("Please fill in all appointment details");
      return;
    }

    if (!patientProfile) {
      setMessage("Profile not found. Please refresh the page and try again.");
      return;
    }

    try {
      const { error } = await createAppointment(patientProfile.id, appointmentDate, appointmentTime, appointmentType);
      if (error) {
        console.error("Error creating appointment:", error);
        setMessage("Error booking appointment: " + error.message);
      } else {
        setMessage("Appointment booked successfully! You'll receive a confirmation soon.");
        setAppointmentDate("");
        setAppointmentTime("");
        setAppointmentType("general");
        loadAppointments(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleBookAppointment:", error);
      setMessage("Error booking appointment: " + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDoctorName = (consultation) => {
    if (consultation.doctor_profiles?.full_name) {
      return `Dr. ${consultation.doctor_profiles.full_name}`;
    }
    return "Dr. [Assigned Doctor]";
  };

  const isConsultationClosed = (consultation) => {
    return consultation.status === 'closed' || consultation.closed_at;
  };

  const isConsultationExpired = (consultation) => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return new Date(consultation.created_at) < fiveDaysAgo;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <h1 style={{ color: '#28a745', margin: 0 }}>👤 Patient Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Welcome back, {patientProfile?.full_name || user?.email?.split('@')[0]}
          </p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '10px 20px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        borderBottom: '1px solid #dee2e6',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab("ask-question")}
          style={{
            padding: '12px 20px',
            background: activeTab === "ask-question" ? '#28a745' : 'transparent',
            color: activeTab === "ask-question" ? 'white' : '#28a745',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ❓ Ask Doctor
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          style={{
            padding: '12px 20px',
            background: activeTab === "appointments" ? '#28a745' : 'transparent',
            color: activeTab === "appointments" ? 'white' : '#28a745',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📅 Book Appointment
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: '12px 20px',
            background: activeTab === "history" ? '#28a745' : 'transparent',
            color: activeTab === "history" ? 'white' : '#28a745',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📋 Medical History
        </button>
        <button
          onClick={() => setActiveTab("responses")}
          style={{
            padding: '12px 20px',
            background: activeTab === "responses" ? '#28a745' : 'transparent',
            color: activeTab === "responses" ? 'white' : '#28a745',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💬 Doctor Responses ({consultationsWithResponses.length})
        </button>
        <button
          onClick={() => setActiveTab("medical-records")}
          style={{
            padding: '12px 20px',
            background: activeTab === "medical-records" ? '#28a745' : 'transparent',
            color: activeTab === "medical-records" ? 'white' : '#28a745',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📄 Medical Records
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {activeTab === "ask-question" && (
          <div>
            <h2>❓ Ask a Question to Doctor</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Describe your symptoms and concerns. A doctor will respond within 24 hours.
            </p>
            
            <form onSubmit={handleAskQuestion}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  What's your main concern?
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe your main health concern or question..."
                  required
                  style={{ 
                    width: "100%", 
                    padding: '12px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Symptoms (if any)
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="List any symptoms you're experiencing..."
                  required
                  style={{ 
                    width: "100%", 
                    padding: '12px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <button 
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Submit Question
              </button>
            </form>
          </div>
        )}

        {activeTab === "appointments" && (
          <div>
            <h2>📅 Book an Appointment</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Schedule an appointment with our doctors.
            </p>
            
            <form onSubmit={handleBookAppointment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                    style={{ 
                      width: "100%", 
                      padding: '12px', 
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                    style={{ 
                      width: "100%", 
                      padding: '12px', 
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Appointment Type
                </label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  required
                  style={{ 
                    width: "100%", 
                    padding: '12px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="general">General Checkup</option>
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              
              <button 
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Book Appointment
              </button>
            </form>

            {/* Show existing appointments */}
            {appointments.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3>Your Appointments</h3>
                <div style={{ marginTop: '15px' }}>
                  {appointments.map((appointment) => (
                    <div key={appointment.id} style={{ 
                      border: '1px solid #dee2e6', 
                      borderRadius: '8px', 
                      padding: '15px',
                      marginBottom: '10px',
                      background: '#f8f9fa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}</strong>
                          <p style={{ margin: '5px 0', color: '#666' }}>Type: {appointment.appointment_type}</p>
                        </div>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: appointment.status === 'confirmed' ? '#28a745' : '#ffc107', 
                          color: appointment.status === 'confirmed' ? 'white' : 'black', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <h2>📋 Medical History</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '20px',
              marginTop: '20px'
            }}>
              <div style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '8px', 
                padding: '20px',
                background: '#f8f9fa'
              }}>
                <h3>🩺 Last Checkup</h3>
                <p><strong>Date:</strong> January 15, 2024</p>
                <p><strong>Doctor:</strong> Dr. Smith</p>
                <p><strong>Diagnosis:</strong> Healthy, no issues</p>
                <p><strong>Notes:</strong> Regular checkup completed successfully</p>
              </div>
              
              <div style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '8px', 
                padding: '20px',
                background: '#f8f9fa'
              }}>
                <h3>💊 Current Medications</h3>
                <p><strong>Vitamin D:</strong> 1000 IU daily</p>
                <p><strong>Prescribed:</strong> January 10, 2024</p>
                <p><strong>Duration:</strong> 3 months</p>
              </div>
              
              <div style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '8px', 
                padding: '20px',
                background: '#f8f9fa'
              }}>
                <h3>🔬 Lab Results</h3>
                <p><strong>Blood Test:</strong> December 20, 2023</p>
                <p><strong>Status:</strong> <span style={{ color: '#28a745' }}>Normal</span></p>
                <p><strong>Cholesterol:</strong> 180 mg/dL</p>
                <p><strong>Blood Sugar:</strong> 95 mg/dL</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "responses" && (
          <div>
            <h2>💬 Doctor Responses</h2>
            {consultationsWithResponses.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ color: '#666' }}>
                  No doctor responses yet. Ask a question to get started!
                </p>
                <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  <p><strong>Debug Info:</strong></p>
                  <p>Total consultations: {consultations.length}</p>
                  <p>Consultations with responses: {consultationsWithResponses.length}</p>
                  <p>Check browser console for detailed logs.</p>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '20px' }}>
                {consultationsWithResponses.map((consultation) => (
                  <div key={consultation.id} style={{ 
                    border: '2px solid #007bff', 
                    borderRadius: '8px', 
                    padding: '20px',
                    marginBottom: '15px',
                    background: '#f8f9fa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ color: '#007bff', margin: 0 }}>{getDoctorName(consultation)}</h4>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {!isConsultationClosed(consultation) && !isConsultationExpired(consultation) && (
                          <button
                            onClick={() => setSelectedConsultation(consultation)}
                            style={{
                              padding: '6px 12px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Continue Chat
                          </button>
                        )}
                        {!isConsultationClosed(consultation) && (
                          <button
                            onClick={() => handleCloseConsultation(consultation.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Close Chat
                          </button>
                        )}
                        {(isConsultationClosed(consultation) || isConsultationExpired(consultation)) && (
                          <span style={{ 
                            padding: '4px 8px', 
                            background: '#6c757d', 
                            color: 'white', 
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {isConsultationClosed(consultation) ? 'Closed' : 'Expired'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ fontWeight: 'bold', color: '#333' }}><strong>Your Question:</strong> {consultation.question}</p>
                      {consultation.symptoms && (
                        <p style={{ color: '#666' }}><strong>Symptoms:</strong> {consultation.symptoms}</p>
                      )}
                    </div>
                    
                    {consultation.response && (
                      <div style={{ 
                        marginBottom: '15px', 
                        padding: '15px', 
                        background: '#e3f2fd', 
                        borderRadius: '8px',
                        border: '1px solid #2196f3'
                      }}>
                        <strong style={{ color: '#1976d2' }}>Doctor's Response:</strong>
                        <p style={{ margin: '8px 0 0 0', color: '#333', fontSize: '16px' }}>{consultation.response}</p>
                      </div>
                    )}
                    
                    {consultation.follow_up_response && (
                      <div style={{ 
                        marginBottom: '15px', 
                        padding: '15px', 
                        background: consultation.follow_up_from_patient ? '#fff3e0' : '#e8f5e8', 
                        borderRadius: '8px',
                        border: `1px solid ${consultation.follow_up_from_patient ? '#ff9800' : '#4caf50'}`
                      }}>
                        <strong style={{ color: consultation.follow_up_from_patient ? '#e65100' : '#2e7d32' }}>
                          {consultation.follow_up_from_patient ? 'Your Follow-up:' : 'Doctor\'s Follow-up:'}
                        </strong>
                        <p style={{ margin: '8px 0 0 0', color: '#333', fontSize: '16px' }}>{consultation.follow_up_response}</p>
                      </div>
                    )}
                    
                    <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                      Answered {formatDate(consultation.answered_at || consultation.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "medical-records" && (
          <div>
            <h2>📄 Medical Records</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Upload your medical records (PDF files) to help doctors better understand your medical history. This is optional but helpful.
            </p>
            
            <div style={{ 
              border: '2px dashed #ddd', 
              borderRadius: '8px', 
              padding: '30px', 
              textAlign: 'center',
              marginBottom: '30px',
              background: '#f8f9fa'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>📄</div>
              <h3>Upload Medical Records</h3>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Supported format: PDF files only<br/>
                Maximum file size: 10MB per file
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileSelect}
                  style={{ 
                    width: "100%", 
                    padding: '12px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxWidth: '400px'
                  }}
                />
              </div>
              
              {selectedFile && (
                <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e8', borderRadius: '8px' }}>
                  <p><strong>Selected File:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>
              )}

              {selectedFile && (
                <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="e.g., Blood Test Report Jan 2025"
                    style={{
                      width: "100%",
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              )}
              
              <button 
                onClick={handleUploadMedicalRecord}
                disabled={!selectedFile || uploading}
                style={{
                  padding: '12px 24px',
                  background: selectedFile ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedFile ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload Medical Record'}
              </button>
            </div>
            
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '8px', 
              padding: '20px',
              marginTop: '20px'
            }}>
              <h4>💡 Tips for Medical Records</h4>
              <ul style={{ textAlign: 'left', margin: '10px 0' }}>
                <li>Upload recent lab results, X-rays, or medical reports</li>
                <li>Include medication lists and allergy information</li>
                <li>Add previous diagnosis and treatment history</li>
                <li>Include vaccination records if relevant</li>
                <li>Make sure files are clear and readable</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Follow-up Modal */}
      {selectedConsultation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3>Continue Chat with {getDoctorName(selectedConsultation)}</h3>
            <p><strong>Original Question:</strong> {selectedConsultation.question}</p>
            {selectedConsultation.response && (
              <p><strong>Doctor's Response:</strong> {selectedConsultation.response}</p>
            )}
            
            <form onSubmit={handleFollowUp}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Your Follow-up Message:
                </label>
                <textarea
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  placeholder="Ask a follow-up question or provide additional information..."
                  required
                  style={{ 
                    width: "100%", 
                    padding: '12px', 
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Send Follow-up
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedConsultation(null);
                    setFollowUpMessage("");
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          background: message.includes("successfully") || message.includes("submitted") ? '#28a745' : '#dc3545',
          color: 'white',
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
