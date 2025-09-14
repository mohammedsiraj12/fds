"use client";
import { useState } from "react";
import { signup } from "../../../lib/auth";
import { useRouter } from "next/navigation";

export default function PatientSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await signup(email, password, 'patient');
      setMessage("Signup successful! Redirecting to patient dashboard...");
      setTimeout(() => {
        router.push('/patient/dashboard');
      }, 1000);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>👤 Patient Registration</h2>
        <p style={{ color: '#666' }}>Create your account to access healthcare services</p>
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
            placeholder="Password (minimum 6 characters)"
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
        
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Creating account..." : "Register as Patient"}
        </button>
      </form>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>Already registered? <a href="/patient/login" style={{ color: '#28a745', textDecoration: 'none' }}>Login here</a></p>
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
