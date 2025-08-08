"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DoctorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [authMethod, setAuthMethod] = useState("email");
  const router = useRouter();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      // Update user metadata with doctor role
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'doctor' }
      });
      
      if (updateError) {
        setMessage("Login successful but role update failed: " + updateError.message);
      } else {
        setMessage("Login successful! Redirecting to doctor dashboard...");
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1000);
      }
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ phone, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'doctor' }
      });
      
      if (updateError) {
        setMessage("Login successful but role update failed: " + updateError.message);
      } else {
        setMessage("Login successful! Redirecting to doctor dashboard...");
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1000);
      }
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: 'doctor' }
      });
      
      if (updateError) {
        setMessage("Login successful but role update failed: " + updateError.message);
      } else {
        setMessage("Login successful! Redirecting to doctor dashboard...");
        setTimeout(() => {
          router.push('/doctor/dashboard');
        }, 1000);
      }
    }
  };

  const handleSubmit = (e) => {
    if (authMethod === "email") {
      handleEmailLogin(e);
    } else {
      if (showOtpInput) {
        handleOtpLogin(e);
      } else {
        handlePhoneLogin(e);
      }
    }
  };

  const sendOtp = async () => {
    setMessage("");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setMessage("OTP sent to your phone! Please check your SMS.");
      setShowOtpInput(true);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>👨‍⚕️ Doctor Login</h2>
        <p style={{ color: '#666' }}>Access your patient consultations and medical dashboard</p>
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
        {authMethod === "email" ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Doctor Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
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
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="tel"
                placeholder="Doctor Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: "100%", padding: 8 }}
              />
            </div>
            {!showOtpInput && (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="password"
                  placeholder="Password (optional for OTP login)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>
            )}
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
        
        <button 
          type="submit" 
          style={{ width: "100%", padding: 10, background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          disabled={loading}
        >
          {loading ? "Processing..." : showOtpInput ? "Verify OTP" : "Login as Doctor"}
        </button>
      </form>

      {authMethod === "phone" && !showOtpInput && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            onClick={sendOtp}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Send OTP
          </button>
        </div>
      )}
      
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <p>New doctor? <a href="/doctor/signup" style={{ color: '#007bff' }}>Sign up here</a></p>
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
