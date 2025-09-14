'use client';
import { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  ClockIcon,
  StarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Tabs, { TabPanel } from '../../../components/ui/Tabs';
import NotificationCenter from '../../../components/features/NotificationCenter';
import ConsultationSystem from '../../../components/features/ConsultationSystem';
import PrescriptionManager from '../../../components/features/PrescriptionManager';
import ReviewSystem from '../../../components/features/ReviewSystem';
import { useSocket } from '../../../hooks/useSocket';
import { consultations, prescriptions, reviews, users } from '../../../lib/api';

export default function EnhancedDoctorDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    pendingConsultations: 0,
    todayAppointments: 0,
    avgRating: 0,
    totalReviews: 0,
    activePrescriptions: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const { isConnected } = useSocket();

  useEffect(() => {
    loadUserData();
    loadStats();
    loadRecentActivity();
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
      const [consultationsRes, prescriptionsRes, reviewsRes] = await Promise.all([
        consultations.getAll({ status: 'pending' }),
        prescriptions.getAll({ status: 'active' }),
        reviews.getByDoctor(null, { limit: 100 })
      ]);

      const totalReviews = reviewsRes.data.reviews.length;
      const avgRating = totalReviews > 0 
        ? reviewsRes.data.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0;

      setStats({
        totalPatients: 150, // This would come from a dedicated endpoint
        pendingConsultations: consultationsRes.data.total,
        todayAppointments: 8, // This would come from appointments endpoint
        avgRating: avgRating.toFixed(1),
        totalReviews,
        activePrescriptions: prescriptionsRes.data.prescriptions?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const [consultationsRes, prescriptionsRes] = await Promise.all([
        consultations.getAll({ limit: 5 }),
        prescriptions.getAll({ limit: 5 })
      ]);

      const activities = [
        ...consultationsRes.data.consultations.map(c => ({
          id: `consultation-${c.id}`,
          type: 'consultation',
          title: `New consultation from ${c.patient_name}`,
          description: c.title,
          time: c.created_at,
          severity: c.severity
        })),
        ...prescriptionsRes.data.prescriptions.map(p => ({
          id: `prescription-${p.id}`,
          type: 'prescription',
          title: `Prescription issued to ${p.patient_name}`,
          description: p.diagnosis,
          time: p.created_at
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const tabs = [
    { id: 'consultations', label: 'Consultations' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'schedule', label: 'Schedule' }
  ];

  const quickActions = [
    {
      name: 'View Consultations',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      count: stats.pendingConsultations,
      action: () => setActiveTab(0)
    },
    {
      name: 'Create Prescription',
      icon: DocumentTextIcon,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => setActiveTab(1)
    },
    {
      name: 'Check Reviews',
      icon: StarIcon,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      count: stats.totalReviews,
      action: () => setActiveTab(2)
    },
    {
      name: 'Manage Schedule',
      icon: CalendarDaysIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      count: stats.todayAppointments,
      action: () => setActiveTab(3)
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'consultation':
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
      case 'prescription':
        return <DocumentTextIcon className="h-5 w-5" />;
      default:
        return <BellIcon className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
              <p className="text-gray-600">Good morning, Dr. {user?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}></div>
                <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingConsultations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Apps</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <StarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgRating}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prescriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePrescriptions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
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
                  className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200 relative`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-sm font-medium block">{action.name}</span>
                  {action.count !== undefined && action.count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                      {action.count > 99 ? '99+' : action.count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 p-1 bg-gray-100 rounded">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-gray-400">
                            {new Date(activity.time).toLocaleTimeString()}
                          </p>
                          {activity.severity && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                              {activity.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <Tabs tabs={tabs} defaultIndex={activeTab}>
                <TabPanel>
                  <ConsultationSystem userType="doctor" />
                </TabPanel>
                <TabPanel>
                  <PrescriptionManager userType="doctor" />
                </TabPanel>
                <TabPanel>
                  <ReviewSystem userType="doctor" />
                </TabPanel>
                <TabPanel>
                  <div className="text-center py-8">
                    <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule Management</h3>
                    <p className="text-gray-600 mb-4">
                      Schedule management feature coming soon. You can manage your availability and appointments here.
                    </p>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => alert('Schedule management feature coming soon!')}
                    >
                      Set Availability
                    </Button>
                  </div>
                </TabPanel>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
