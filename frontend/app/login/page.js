"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "../../hooks/useAuth";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Navigation from "../../components/layout/Navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { login: authLogin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8002/auth/login', {
        email,
        password
      });

      if (response.data) {
        const { access_token, user } = response.data;
        
        // Store token in localStorage
        localStorage.setItem('auth_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update auth state
        authLogin(user);
        
        setSuccess(true);
        setMessage("Login successful! Redirecting to dashboard...");
        
        // Redirect based on user role
        setTimeout(() => {
          if (user.role === 'doctor') {
            router.push('/doctor/dashboard');
          } else if (user.role === 'patient') {
            router.push('/patient/dashboard');
          } else {
            router.push('/admin/dashboard');
          }
        }, 1500);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.detail || 
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-md mx-auto pt-16 px-4">
        <Card>
          <Card.Header>
            <Card.Title className="text-center text-2xl font-bold text-gray-900">
              Welcome Back
            </Card.Title>
            <p className="text-center text-gray-600 mt-2">
              Sign in to your MedConsult account
            </p>
          </Card.Header>
          
          <Card.Content>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* Forgot Password */}
            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>

            {/* Signup Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`mt-4 p-3 rounded-md text-center ${
                success 
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Demo Accounts */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Accounts:</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Doctor:</strong> doctor@demo.com / password123</p>
            <p><strong>Patient:</strong> patient@demo.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
