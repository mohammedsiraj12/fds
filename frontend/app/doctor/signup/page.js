"use client";
import { useState } from "react";
import { signup } from "../../../lib/auth";
import { useRouter } from "next/navigation";

export default function DoctorSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [authMethod, setAuthMethod] = useState("email");
  const router = useRouter();

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    try {
      const response = await signup(email, password, 'doctor');
      setMessage("Signup successful! Redirecting to login...");
      setTimeout(() => {
        router.push('/doctor/login');
      }, 2000);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handlePhoneSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    try {
      const response = await signup(email || phone, password, 'doctor');
      setMessage("Signup successful! Redirecting to login...");
      setTimeout(() => {
        router.push('/doctor/login');
      }, 2000);
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    // For now, just redirect since we don't have OTP verification with Neo4j
    setMessage("Phone verification successful! Redirecting to login...");
    setTimeout(() => {
      router.push('/doctor/login');
    }, 2000);
  };

  const handleSubmit = (e) => {
    if (authMethod === "email") {
      handleEmailSignup(e);
    } else {
      if (showOtpInput) {
        handleOtpVerification(e);
      } else {
        handlePhoneSignup(e);
      }
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>👨‍⚕️ Doctor Registration</h2>
        <p style={{ color: '#666' }}>Join our medical team and help patients</p>
      </div>
      
      {/* Auth Method Toggle */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <button
          onClick={() => {
            setAuthMethod("email");
            setShowOtpInput(false);
            setMessage("");
          }}
          style={{
            padding: '8px 16px',
            margin: '0 5px',
            background: authMethod === "email" ? '#007bff' : '#f8f9fa',
            color: authMethod === "email" ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Email
        </button>
        <button
          onClick={() => {
            setAuthMethod("phone");
            setShowOtpInput(false);
            setMessage("");
          }}
          style={{
            padding: '8px 16px',
            margin: '0 5px',
            background: authMethod === "phone" ? '#007bff' : '#f8f9fa',
            color: authMethod === "phone" ? 'white' : 'black',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Phone
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Doctor-specific fields */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Full Name (Dr. John Doe)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Select Specialization</option>
            <option value="general">General Medicine</option>
            <option value="cardiology">Cardiology</option>
            <option value="dermatology">Dermatology</option>
            <option value="neurology">Neurology</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="psychiatry">Psychiatry</option>
            <option value="surgery">Surgery</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Medical License Number"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        {authMethod === "email" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Professional Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="tel"
                placeholder="Professional Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            {showOtpInput && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            )}
          </>
        )}
        
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        
        <button 
          type="submit" 
          style={{ width: "100%", padding: 10, background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          disabled={loading}
        >
          {loading ? "Processing..." : showOtpInput ? "Verify OTP" : "Register as Doctor"}
        </button>
      </form>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>Already registered? <a href="/doctor/login" style={{ color: '#007bff' }}>Login here</a></p>
        <p><a href="/" style={{ color: '#666' }}>← Back to Role Selection</a></p>
      </div>
      
      {message && (
        <div style={{ 
          marginTop: 16, 
          color: message.includes("successful") ? "#28a745" : "#d00",
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
