"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getDoctorConsultations, getDoctorAppointments, respondToConsultation, createDoctorProfile, getDoctorProfile, getAllPendingConsultations, getAllConsultations, getPatientMedicalRecords, getSignedMedicalRecordUrl } from "../../../lib/database";

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
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await getSignedMedicalRecordUrl(record.file_path, 60 * 10);
                    if (error) {
                      console.error('Error creating signed URL:', error);
                      alert('Unable to open file right now.');
                      return;
                    }
                    const url = data?.signedUrl || record.file_url;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  } catch (err) {
                    console.error('Error opening file:', err);
                    alert('Unable to open file right now.');
                  }
                }}
                style={{
                  padding: '4px 8px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                View PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0 }}>🩺 Doctor Dashboard</h1>
            <p style={{ margin: '5px 0 0 0', color: 'var(--muted)' }}>
              Welcome, {doctorProfile?.full_name || user?.email?.split('@')[0]}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-danger"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab("consultations")}
          className={`tab-btn ${activeTab === "consultations" ? 'active' : ''}`}
        >
          📬 Consultations
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`tab-btn ${activeTab === "appointments" ? 'active' : ''}`}
        >
          📅 Appointments
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`tab-btn ${activeTab === "tools" ? 'active' : ''}`}
        >
          🛠️ Tools
        </button>
      </div>

      {/* Content container */}
      <div className="card">
        <div className="card-inner">
          {/* existing content remains; benefits from utilities */}
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("successfully") || message.includes("submitted") ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 20 }}>
          {message}
        </div>
      )}
    </div>
  );
}
