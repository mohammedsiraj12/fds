"use client";
import { useState } from "react";
import { login } from "../../../lib/auth";
import { useRouter } from "next/navigation";

export default function PatientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    try {
      const response = await login(email, password);
      
      // Check if user is a patient
      if (response.user.role !== 'patient') {
        setMessage("Access denied. This login is for patients only.");
        setLoading(false);
        return;
      }
      
      setMessage("Login successful! Redirecting to patient dashboard...");
      setTimeout(() => {
        router.push('/patient/dashboard');
      }, 1000);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>👤 Patient Login</h2>
        <p style={{ color: '#666' }}>Access your health records and book appointments</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              fontSize: "14px"
            }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ 
              width: "100%", 
              padding: 10, 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              fontSize: "14px"
            }}
          />
        </div>
        
        <button 
          type="submit" 
          style={{ 
            width: "100%", 
            padding: 12, 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login as Patient"}
        </button>
      </form>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>New patient? <a href="/patient/signup" style={{ color: '#28a745', textDecoration: 'none' }}>Sign up here</a></p>
        <p><a href="/" style={{ color: '#666', textDecoration: 'none' }}>← Back to Role Selection</a></p>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: 16, 
          padding: 10,
          borderRadius: 4,
          background: message.includes("successful") ? "#d4edda" : "#f8d7da",
          color: message.includes("successful") ? "#155724" : "#721c24",
          border: `1px solid ${message.includes("successful") ? "#c3e6cb" : "#f5c6cb"}`,
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
