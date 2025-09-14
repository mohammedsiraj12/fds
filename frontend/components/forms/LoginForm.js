"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/auth";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";

const LoginForm = ({ role }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.user.role !== role) {
        setError(`Access denied. This login is for ${role}s only.`);
        return;
      }
      
      router.push(`/${role}/dashboard`);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
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
        <Card.Title>{roleName} Login</Card.Title>
      </Card.Header>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Enter your email"
        />
        
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Enter your password"
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
          {loading ? "Signing In..." : "Sign In"}
        </Button>
        
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href={`/${role}/signup`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign up here
          </a>
        </div>
      </form>
    </Card>
  );
};

export default LoginForm;
