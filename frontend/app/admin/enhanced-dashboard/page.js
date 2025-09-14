'use client';
import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  ServerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Tabs, { TabPanel } from '../../../components/ui/Tabs';
import UserManagement from '../../../components/features/UserManagement';
import SystemAnalytics from '../../../components/features/SystemAnalytics';
import AuditLogs from '../../../components/features/AuditLogs';
import { apiClient } from '../../../lib/apiClient';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalConsultations: 0,
    totalPrescriptions: 0,
    systemHealth: 'good',
    dailyActiveUsers: 0,
    monthlyRevenue: 0
  });
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadAnalytics();
    loadSystemAlerts();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAdminAnalytics();
      setAnalytics({
        totalUsers: response.overview?.total_users || 0,
        totalDoctors: response.overview?.user_breakdown?.doctor || 0,
        totalPatients: response.overview?.user_breakdown?.patient || 0,
        totalConsultations: response.overview?.total_consultations || 0,
        totalPrescriptions: 0, // Add if available in backend
        systemHealth: 'good',
        dailyActiveUsers: response.recent_activity?.new_users || 0,
        monthlyRevenue: response.overview?.total_revenue || 0
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set default values on error
      setAnalytics({
        totalUsers: 0,
        totalDoctors: 0,
        totalPatients: 0,
        totalConsultations: 0,
        totalPrescriptions: 0,
        systemHealth: 'unknown',
        dailyActiveUsers: 0,
        monthlyRevenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemAlerts = async () => {
    // Mock system alerts - in real app, this would come from monitoring system
    const mockAlerts = [
      {
        id: 1,
        type: 'warning',
        title: 'High Server Load',
        description: 'Server CPU usage is at 85%',
        time: new Date().toISOString(),
        severity: 'medium'
      },
      {
        id: 2,
        type: 'info',
        title: 'Scheduled Maintenance',
        description: 'System maintenance scheduled for tomorrow at 2 AM',
        time: new Date().toISOString(),
        severity: 'low'
      }
    ];
    setSystemAlerts(mockAlerts);
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'users', label: 'User Management' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'settings', label: 'System Settings' }
  ];

  const quickStats = [
    {
      name: 'Total Users',
      value: analytics.totalUsers,
      icon: UsersIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase'
    },
    {
      name: 'Active Doctors',
      value: analytics.totalDoctors,
      icon: ShieldCheckIcon,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'increase'
    },
    {
      name: 'Total Consultations',
      value: analytics.totalConsultations,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      change: '+28%',
      changeType: 'increase'
    },
    {
      name: 'System Health',
      value: analytics.systemHealth,
      icon: ServerIcon,
      color: 'bg-yellow-500',
      change: 'Stable',
      changeType: 'neutral'
    }
  ];

  const quickActions = [
    {
      name: 'User Management',
      icon: UsersIcon,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setActiveTab(1)
    },
    {
      name: 'System Analytics',
      icon: ChartBarIcon,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setActiveTab(0)
    },
    {
      name: 'View Audit Logs',
      icon: ClipboardDocumentListIcon,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setActiveTab(2)
    },
    {
      name: 'System Settings',
      icon: CogIcon,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => setActiveTab(3)
    }
  ];

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIcon = (severity) => {
    const className = "h-5 w-5";
    switch (severity) {
      case 'high': return <ExclamationTriangleIcon className={`${className} text-red-500`} />;
      case 'medium': return <ExclamationTriangleIcon className={`${className} text-yellow-500`} />;
      default: return <ExclamationTriangleIcon className={`${className} text-blue-500`} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">System management and analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.name} className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 ${stat.color} rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof stat.value === 'string' ? stat.value.toUpperCase() : stat.value.toLocaleString()}
                      </p>
                      <div className={`text-xs font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' :
                        stat.changeType === 'decrease' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {stat.change}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* System Alerts */}
        {systemAlerts.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h2>
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm mt-1">{alert.description}</p>
                      <p className="text-xs mt-2 opacity-75">
                        {new Date(alert.time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
              <SystemAnalytics analytics={analytics} />
            </TabPanel>
            <TabPanel>
              <UserManagement />
            </TabPanel>
            <TabPanel>
              <AuditLogs />
            </TabPanel>
            <TabPanel>
              <div className="text-center py-8">
                <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">System Settings</h3>
                <p className="text-gray-600 mb-4">
                  Configure system-wide settings and preferences.
                </p>
                
                <div className="max-w-2xl mx-auto">
                  <div className="grid gap-4">
                    <Card className="p-4 text-left">
                      <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Configure system email notifications and alerts
                      </p>
                      <Button variant="outline" size="sm">Configure</Button>
                    </Card>
                    
                    <Card className="p-4 text-left">
                      <h4 className="font-medium text-gray-900 mb-2">Security Settings</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Manage authentication and security policies
                      </p>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Card>
                    
                    <Card className="p-4 text-left">
                      <h4 className="font-medium text-gray-900 mb-2">Backup & Recovery</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Configure system backups and disaster recovery
                      </p>
                      <Button variant="outline" size="sm">Setup</Button>
                    </Card>
                  </div>
                </div>
              </div>
            </TabPanel>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
