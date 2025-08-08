"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check user role from metadata or redirect to role selection
        const userRole = user.user_metadata?.role;
        if (userRole) {
          router.push(`/${userRole}/dashboard`);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        Loading...
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div style={{ maxWidth: 600, margin: "2rem auto", textAlign: "center", padding: 20 }}>
        <h1>Welcome to Doctor-Patient Consultation App</h1>
        <p style={{ marginBottom: '40px', fontSize: '18px' }}>
          Please select your role to continue
        </p>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div 
            onClick={() => setSelectedRole('doctor')}
            style={{
              width: '250px',
              padding: '30px',
              border: '2px solid #007bff',
              borderRadius: '10px',
              cursor: 'pointer',
              background: '#f8f9fa',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e3f2fd'}
            onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
          >
            <h2 style={{ color: '#007bff', marginBottom: '10px' }}>👨‍⚕️ Doctor</h2>
            <p>Access patient consultations, manage appointments, and provide medical advice</p>
          </div>
          
          <div 
            onClick={() => setSelectedRole('patient')}
            style={{
              width: '250px',
              padding: '30px',
              border: '2px solid #28a745',
              borderRadius: '10px',
              cursor: 'pointer',
              background: '#f8f9fa',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e8f5e8'}
            onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
          >
            <h2 style={{ color: '#28a745', marginBottom: '10px' }}>👤 Patient</h2>
            <p>Book appointments, ask questions to doctors, and manage your health records</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", textAlign: "center" }}>
      <h1>Welcome, {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}!</h1>
      <p style={{ marginBottom: '30px' }}>Please login or sign up to continue</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setSelectedRole(null)}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Role Selection
        </button>
      </div>
      
      <Link
        href={`/${selectedRole}/login`}
        style={{
          margin: 10,
          padding: 15,
          display: "inline-block",
          border: "1px solid #007bff",
          borderRadius: 4,
          background: "#007bff",
          color: "white",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        Login as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
      </Link>
      <Link
        href={`/${selectedRole}/signup`}
        style={{
          margin: 10,
          padding: 15,
          display: "inline-block",
          border: "1px solid #28a745",
          borderRadius: 4,
          background: "#28a745",
          color: "white",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        Sign Up as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
      </Link>
    </div>
  );
}
