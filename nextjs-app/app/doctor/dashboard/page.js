"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getDoctorConsultations, getDoctorAppointments, respondToConsultation, createDoctorProfile, getDoctorProfile, getAllPendingConsultations, getAllConsultations, getPatientMedicalRecords } from "../../../lib/database";

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("consultations");
  const [consultations, setConsultations] = useState([]);
  const [pendingConsultations, setPendingConsultations] = useState([]);
  const [allConsultations, setAllConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/doctor/login');
        return;
      }
      
      // Check if user is a doctor
      const userRole = user.user_metadata?.role;
      if (userRole !== 'doctor') {
        router.push('/');
        return;
      }
      
      setUser(user);
      
      // Get or create doctor profile
      try {
        const { data: profile, error: profileError } = await getDoctorProfile(user.id);
        
        if (profileError && profileError.code === 'PGRST116') {
          // Table doesn't exist - create it manually
          console.log("Doctor profiles table doesn't exist. Creating profile manually...");
          const { data: newProfile, error: createError } = await createDoctorProfile(
            user.id,
            user.user_metadata?.full_name || user.email?.split('@')[0],
            user.user_metadata?.specialization || 'General Medicine',
            user.user_metadata?.license_number || 'N/A'
          );
          
          if (createError) {
            console.error("Error creating doctor profile:", createError);
            setMessage("Error creating profile: " + createError.message);
          } else {
            setDoctorProfile(newProfile);
          }
        } else if (profile) {
          setDoctorProfile(profile);
        } else {
          // Profile doesn't exist - create it
          const { data: newProfile, error: createError } = await createDoctorProfile(
            user.id,
            user.user_metadata?.full_name || user.email?.split('@')[0],
            user.user_metadata?.specialization || 'General Medicine',
            user.user_metadata?.license_number || 'N/A'
          );
          
          if (createError) {
            console.error("Error creating doctor profile:", createError);
            setMessage("Error creating profile: " + createError.message);
          } else {
            setDoctorProfile(newProfile);
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
    if (doctorProfile) {
      loadConsultations();
      loadAppointments();
    }
  }, [doctorProfile]);

  const loadConsultations = async () => {
    if (!doctorProfile) return;
    
    try {
      console.log("🔍 Loading consultations for doctor:", doctorProfile.id);
      
      // Load assigned consultations
      const { data: assignedData, error: assignedError } = await getDoctorConsultations(doctorProfile.id);
      console.log("📊 Assigned consultations result:", { data: assignedData, error: assignedError });
      
      if (assignedError) {
        console.error("❌ Error loading assigned consultations:", assignedError);
      } else if (assignedData) {
        setConsultations(assignedData);
        console.log("✅ Loaded assigned consultations:", assignedData.length);
      }

      // Load pending consultations (unassigned)
      const { data: pendingData, error: pendingError } = await getAllPendingConsultations();
      console.log("📊 Pending consultations result:", { data: pendingData, error: pendingError });
      
      if (pendingError) {
        console.error("❌ Error loading pending consultations:", pendingError);
      } else if (pendingData) {
        setPendingConsultations(pendingData);
        console.log("✅ Loaded pending consultations:", pendingData.length);
      }

      // Load ALL consultations for debugging
      const { data: allData, error: allError } = await getAllConsultations();
      console.log("📊 All consultations result:", { data: allData, error: allError });
      
      if (allError) {
        console.error("❌ Error loading all consultations:", allError);
      } else if (allData) {
        setAllConsultations(allData);
        console.log("✅ Loaded all consultations:", allData.length);
      }
    } catch (error) {
      console.error("💥 Error in loadConsultations:", error);
    }
  };

  const loadAppointments = async () => {
    if (!doctorProfile) return;
    
    try {
      const { data, error } = await getDoctorAppointments(doctorProfile.id);
      if (error) {
        console.error("Error loading appointments:", error);
      } else if (data) {
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error in loadAppointments:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleRespondToConsultation = async (e) => {
    e.preventDefault();
    if (!response.trim() || !selectedConsultation) {
      setMessage("Please enter a response");
      return;
    }

    try {
      const { error } = await respondToConsultation(selectedConsultation.id, doctorProfile.id, response);
      if (error) {
        console.error("Error responding to consultation:", error);
        setMessage("Error responding to consultation: " + error.message);
      } else {
        setMessage("Response sent successfully!");
        setResponse("");
        setSelectedConsultation(null);
        loadConsultations(); // Reload the list
      }
    } catch (error) {
      console.error("Error in handleRespondToConsultation:", error);
      setMessage("Error responding to consultation: " + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Component to display patient medical records
  const PatientMedicalRecords = ({ patientId }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadRecords = async () => {
        if (!patientId) return;
        
        try {
          const { data, error } = await getPatientMedicalRecords(patientId);
          if (error) {
            console.error("Error loading medical records:", error);
          } else if (data) {
            setRecords(data);
          }
        } catch (error) {
          console.error("Error in loadRecords:", error);
        } finally {
          setLoading(false);
        }
      };

      loadRecords();
    }, [patientId]);

    if (loading) {
      return <p style={{ color: '#666', fontSize: '14px' }}>Loading medical records...</p>;
    }

    if (records.length === 0) {
      return <p style={{ color: '#666', fontSize: '14px' }}>No medical records uploaded by this patient.</p>;
    }

    return (
      <div>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
          Patient has uploaded {records.length} medical record(s):
        </p>
        {records.map((record) => (
          <div key={record.id} style={{ 
            border: '1px solid #dee2e6', 
            borderRadius: '4px', 
            padding: '8px',
            marginBottom: '8px',
            background: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px' }}>{record.file_name}</strong>
                {record.description && (
                  <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>{record.description}</p>
                )}
                <p style={{ margin: '2px 0', color: '#666', fontSize: '12px' }}>
                  Uploaded: {new Date(record.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <a
                href={record.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '4px 8px',
                  background: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                View PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    );
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
          <h1 style={{ color: '#007bff', margin: 0 }}>👨‍⚕️ Doctor Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>
            Welcome back, Dr. {doctorProfile?.full_name || user?.email?.split('@')[0]}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            style={{ 
              padding: '8px 16px', 
              background: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
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
      </div>

      {/* Debug Info */}
      {showDebug && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px' 
        }}>
          <h4>🐛 Debug Information</h4>
          <p><strong>Doctor Profile ID:</strong> {doctorProfile?.id || 'Not created'}</p>
          <p><strong>All Consultations:</strong> {allConsultations.length}</p>
          <p><strong>Pending Consultations:</strong> {pendingConsultations.length}</p>
          <p><strong>Assigned Consultations:</strong> {consultations.length}</p>
          <div style={{ marginTop: '10px' }}>
            <h5>All Consultations in Database:</h5>
            {allConsultations.map((c, i) => (
              <div key={i} style={{ fontSize: '12px', marginBottom: '5px' }}>
                ID: {c.id} | Patient: {c.patient_profiles?.full_name || 'Unknown'} | 
                Question: {c.question?.substring(0, 50)}... | 
                Status: {c.status} | Doctor: {c.doctor_id || 'None'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        borderBottom: '1px solid #dee2e6'
      }}>
        <button
          onClick={() => setActiveTab("consultations")}
          style={{
            padding: '12px 20px',
            background: activeTab === "consultations" ? '#007bff' : 'transparent',
            color: activeTab === "consultations" ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📋 Consultations
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          style={{
            padding: '12px 20px',
            background: activeTab === "appointments" ? '#007bff' : 'transparent',
            color: activeTab === "appointments" ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📅 Appointments
        </button>
        <button
          onClick={() => setActiveTab("patients")}
          style={{
            padding: '12px 20px',
            background: activeTab === "patients" ? '#007bff' : 'transparent',
            color: activeTab === "patients" ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          👥 Patients
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          style={{
            padding: '12px 20px',
            background: activeTab === "tools" ? '#007bff' : 'transparent',
            color: activeTab === "tools" ? 'white' : '#007bff',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🛠️ Medical Tools
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {activeTab === "consultations" && (
          <div>
            <h2>📋 Patient Consultations</h2>
            
            {/* Pending Consultations Section */}
            {pendingConsultations.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>🆕 New Questions Awaiting Response ({pendingConsultations.length})</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '20px'
                }}>
                  {pendingConsultations.map((consultation) => (
                    <div key={consultation.id} style={{ 
                      border: '2px solid #dc3545', 
                      borderRadius: '8px', 
                      padding: '20px',
                      background: '#fff5f5'
                    }}>
                      <h4>Patient: {consultation.patient_profiles?.full_name || 'Unknown'}</h4>
                      <p><strong>Issue:</strong> {consultation.question}</p>
                      {consultation.symptoms && (
                        <p><strong>Symptoms:</strong> {consultation.symptoms}</p>
                      )}
                      <p><strong>Status:</strong> 
                        <span style={{ color: '#dc3545', marginLeft: '5px' }}>
                          Waiting for response
                        </span>
                      </p>
                      <p><strong>Time:</strong> {formatDate(consultation.created_at)}</p>
                      
                      <button 
                        onClick={() => setSelectedConsultation(consultation)}
                        style={{
                          padding: '8px 16px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        Respond Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Consultations Section */}
            {consultations.length > 0 && (
              <div>
                <h3 style={{ color: '#007bff', marginBottom: '15px' }}>✅ Your Answered Consultations ({consultations.length})</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '20px'
                }}>
                  {consultations.map((consultation) => (
                    <div key={consultation.id} style={{ 
                      border: '1px solid #dee2e6', 
                      borderRadius: '8px', 
                      padding: '20px',
                      background: '#f8f9fa'
                    }}>
                      <h4>Patient: {consultation.patient_profiles?.full_name || 'Unknown'}</h4>
                      <p><strong>Issue:</strong> {consultation.question}</p>
                      {consultation.symptoms && (
                        <p><strong>Symptoms:</strong> {consultation.symptoms}</p>
                      )}
                      <p><strong>Status:</strong> 
                        <span style={{ color: '#28a745', marginLeft: '5px' }}>
                          Answered
                        </span>
                      </p>
                      <p><strong>Time:</strong> {formatDate(consultation.created_at)}</p>
                      
                      {consultation.response && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e8', borderRadius: '4px' }}>
                          <strong>Your Response:</strong> {consultation.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No consultations message */}
            {pendingConsultations.length === 0 && consultations.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ color: '#666' }}>
                  No consultations yet. Patients will appear here when they ask questions.
                </p>
                {showDebug && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                    <p><strong>Debug:</strong> Total consultations in database: {allConsultations.length}</p>
                    <p>If you see consultations above but not here, there might be an issue with the query.</p>
                  </div>
                )}
              </div>
            )}

            {/* Response Modal */}
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
                  <h3>Respond to Patient</h3>
                  <p><strong>Patient:</strong> {selectedConsultation.patient_profiles?.full_name}</p>
                  <p><strong>Question:</strong> {selectedConsultation.question}</p>
                  {selectedConsultation.symptoms && (
                    <p><strong>Symptoms:</strong> {selectedConsultation.symptoms}</p>
                  )}
                  
                  {/* Patient Medical Records Section */}
                  <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>📄 Patient Medical Records</h4>
                    <PatientMedicalRecords patientId={selectedConsultation.patient_id} />
                  </div>

                  <form onSubmit={handleRespondToConsultation}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Your Response:
                      </label>
                      <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Enter your medical advice..."
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
                        Send Response
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedConsultation(null);
                          setResponse("");
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
          </div>
        )}

        {activeTab === "appointments" && (
          <div>
            <h2>📅 Today's Appointments</h2>
            {appointments.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
                No appointments scheduled yet.
              </p>
            ) : (
              <div style={{ marginTop: '20px' }}>
                {appointments.map((appointment) => (
                  <div key={appointment.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '15px',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <div>
                      <h4>{formatTime(appointment.appointment_time)} - {appointment.patient_profiles?.full_name || 'Unknown Patient'}</h4>
                      <p style={{ margin: '5px 0', color: '#666' }}>{appointment.appointment_type}</p>
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
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "patients" && (
          <div>
            <h2>👥 Patient Records</h2>
            <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
              Patient records will appear here when they interact with you.
            </p>
          </div>
        )}

        {activeTab === "tools" && (
          <div>
            <h2>🛠️ Medical Tools</h2>
            <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>
              This section can be expanded for prescription management, lab result uploads, etc.
            </p>
          </div>
        )}
      </div>

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
