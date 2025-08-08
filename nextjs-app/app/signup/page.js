"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [authMethod, setAuthMethod] = useState("email"); // "email" or "phone"
  const router = useRouter();

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage("Signup successful! Please check your email to confirm your account. Redirecting to login...");
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  const handlePhoneSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ phone, password });
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
        router.push('/login');
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
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Sign Up</h2>
      
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
        {authMethod === "email" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Email"
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
                placeholder="Phone Number (e.g., +1234567890)"
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
          style={{ width: "100%", padding: 10 }}
          disabled={loading}
        >
          {loading ? "Processing..." : showOtpInput ? "Verify OTP" : "Sign Up"}
        </button>
      </form>
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>Already have an account? <a href="/login" style={{ color: '#007bff' }}>Login here</a></p>
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