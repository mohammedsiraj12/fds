"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "../../lib/auth";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";

const SignupForm = ({ role }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    ...(role === "doctor" && {
      specialization: "",
      licenseNumber: "",
    }),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await signup(formData.email, formData.password, role);
      router.push(`/${role}/dashboard`);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Card className="w-full max-w-md mx-auto">
      <Card.Header>
        <Card.Title>{roleName} Sign Up</Card.Title>
      </Card.Header>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
          placeholder="Enter your full name"
        />
        
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Enter your email"
        />
        
        {role === "doctor" && (
          <>
            <Input
              label="Specialization"
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              required
              placeholder="e.g., Cardiology, General Medicine"
            />
            
            <Input
              label="License Number"
              type="text"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
              placeholder="Medical license number"
            />
          </>
        )}
        
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Enter your password"
        />
        
        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="Confirm your password"
        />
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        
        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
        
        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href={`/${role}/login`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in here
          </a>
        </div>
      </form>
    </Card>
  );
};

export default SignupForm;
