"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PatientSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [authMethod, setAuthMethod] = useState("email");
  const router = useRouter();

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          role: 'patient',
          full_name: fullName,
          date_of_birth: dateOfBirth,
          gender: gender
        }
      }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage("Signup successful! Please check your email to confirm your account. Redirecting to login...");
      setTimeout(() => {
        router.push('/patient/login');
      }, 3000);
    }
  };

  const handlePhoneSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      phone, 
      password,
      options: {
        data: {
          role: 'patient',
          full_name: fullName,
          date_of_birth: dateOfBirth,
          gender: gender
        }
      }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage("OTP sent to your phone! Please check your SMS.");
      setShowOtpInput(true);
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage("Phone verification successful! Redirecting to login...");
      setTimeout(() => {
        router.push('/patient/login');
      }, 2000);
    }
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
        <h2>👤 Patient Registration</h2>
        <p style={{ color: '#666' }}>Create your account to access healthcare services</p>
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
            background: authMethod === "email" ? '#28a745' : '#f8f9fa',
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
            background: authMethod === "phone" ? '#28a745' : '#f8f9fa',
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
        {/* Patient-specific fields */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <input
            type="date"
            placeholder="Date of Birth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        {authMethod === "email" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Email Address"
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
                placeholder="Phone Number"
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
          style={{ width: "100%", padding: 10, background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
          disabled={loading}
        >
          {loading ? "Processing..." : showOtpInput ? "Verify OTP" : "Register as Patient"}
        </button>
      </form>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>Already registered? <a href="/patient/login" style={{ color: '#28a745' }}>Login here</a></p>
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
