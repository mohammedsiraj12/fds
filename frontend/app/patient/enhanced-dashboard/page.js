'use client';
import { useState, useEffect } from 'react';
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  StarIcon 
} from '@heroicons/react/24/outline';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Tabs, { TabPanel } from '../../../components/ui/Tabs';
import NotificationCenter from '../../../components/features/NotificationCenter';
import ConsultationSystem from '../../../components/features/ConsultationSystem';
import PrescriptionManager from '../../../components/features/PrescriptionManager';
import HealthMetricsTracker from '../../../components/features/HealthMetricsTracker';
import DoctorSearch from '../../../components/features/DoctorSearch';
import ReviewSystem from '../../../components/features/ReviewSystem';
import { useSocket } from '../../../hooks/useSocket';
import { consultations, users } from '../../../lib/api';

export default function EnhancedPatientDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalConsultations: 0,
    activePrescriptions: 0,
    nextAppointment: null,
    healthScore: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const { isConnected } = useSocket();

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await users.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [consultationsRes] = await Promise.all([
        consultations.getAll({ status: 'active' })
      ]);
      
      setStats({
        totalConsultations: consultationsRes.data.total,
        activePrescriptions: 5, // This will be updated when prescription API is called
        nextAppointment: consultationsRes.data.consultations[0] || null,
        healthScore: 85 // This will be calculated based on health metrics
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const tabs = [
    { id: 'consultations', label: 'Consultations' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'health', label: 'Health Metrics' },
    { id: 'doctors', label: 'Find Doctors' },
    { id: 'reviews', label: 'My Reviews' }
  ];

  const quickActions = [
    {
      name: 'New Consultation',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => setActiveTab(0)
    },
    {
      name: 'View Prescriptions',
      icon: DocumentTextIcon,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => setActiveTab(1)
    },
    {
      name: 'Update Health Data',
      icon: HeartIcon,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => setActiveTab(2)
    },
    {
      name: 'Find Specialists',
      icon: MagnifyingGlassIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => setActiveTab(3)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Consultations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConsultations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Prescriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePrescriptions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Next Appointment</p>
                <p className="text-sm font-bold text-gray-900">
                  {stats.nextAppointment ? 'Today 2:00 PM' : 'None scheduled'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Health Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.healthScore}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.name}
                  onClick={action.action}
                  className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">{action.name}</span>
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Main Content */}
        <Card className="p-6">
          <Tabs tabs={tabs} defaultIndex={activeTab}>
            <TabPanel>
              <ConsultationSystem userType="patient" />
            </TabPanel>
            <TabPanel>
              <PrescriptionManager userType="patient" />
            </TabPanel>
            <TabPanel>
              <HealthMetricsTracker />
            </TabPanel>
            <TabPanel>
              <DoctorSearch />
            </TabPanel>
            <TabPanel>
              <ReviewSystem userType="patient" />
            </TabPanel>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
