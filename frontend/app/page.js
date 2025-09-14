"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Navigation from "../components/layout/Navigation";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  HeartIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  const { user, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role) {
      router.push(`/${user.role}/dashboard`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                MedConsult
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Connecting Patients with Qualified Doctors
              </p>
              <p className="text-lg mb-12 text-blue-200 max-w-2xl mx-auto">
                Get professional medical consultations from the comfort of your home. 
                Our platform makes healthcare accessible, convenient, and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Choose MedConsult?
              </h2>
              <p className="text-lg text-gray-600">
                Modern healthcare solutions designed for your convenience
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">24/7 Availability</h3>
                <p className="text-gray-600">
                  Access medical consultations anytime, anywhere. Our doctors are available round the clock.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Your medical information is protected with industry-standard security measures.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HeartIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Care</h3>
                <p className="text-gray-600">
                  Connect with verified, licensed doctors who provide professional medical advice.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Get Started Today
              </h2>
              <p className="text-lg text-gray-600">
                Choose your role to access the platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" 
                    onClick={() => setSelectedRole('doctor')}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                    <span className="text-3xl">👨‍⚕️</span>
                  </div>
                  <Card.Title className="text-blue-600 mb-4">For Doctors</Card.Title>
                  <Card.Content>
                    <ul className="text-left space-y-2 mb-6">
                      <li className="flex items-center">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-500 mr-2" />
                        Manage patient consultations
                      </li>
                      <li className="flex items-center">
                        <CalendarDaysIcon className="w-5 h-5 text-blue-500 mr-2" />
                        Schedule appointments
                      </li>
                      <li className="flex items-center">
                        <UserGroupIcon className="w-5 h-5 text-blue-500 mr-2" />
                        Build your patient network
                      </li>
                    </ul>
                  </Card.Content>
                </div>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" 
                    onClick={() => setSelectedRole('patient')}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                    <span className="text-3xl">👤</span>
                  </div>
                  <Card.Title className="text-green-600 mb-4">For Patients</Card.Title>
                  <Card.Content>
                    <ul className="text-left space-y-2 mb-6">
                      <li className="flex items-center">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-500 mr-2" />
                        Ask medical questions
                      </li>
                      <li className="flex items-center">
                        <CalendarDaysIcon className="w-5 h-5 text-green-500 mr-2" />
                        Book appointments
                      </li>
                      <li className="flex items-center">
                        <UserGroupIcon className="w-5 h-5 text-green-500 mr-2" />
                        Access medical records
                      </li>
                    </ul>
                  </Card.Content>
                </div>
              </Card>
            </div>
            
            <div className="text-center mt-8">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-md mx-auto pt-16 px-4">
        <Card>
          <Card.Header>
            <Card.Title className="text-center">
              Welcome, {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}!
            </Card.Title>
            <p className="text-center text-gray-600">
              Please login or sign up to continue
            </p>
          </Card.Header>
          
          <Card.Content className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setSelectedRole(null)}
              className="w-full mb-4"
            >
              ← Back to Role Selection
            </Button>
            
            <div className="grid grid-cols-1 gap-3">
              <Link href={`/${selectedRole}/login`}>
                <Button className="w-full">
                  Login as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
                </Button>
              </Link>
              
              <Link href={`/${selectedRole}/signup`}>
                <Button variant="success" className="w-full">
                  Sign Up as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
                </Button>
              </Link>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
