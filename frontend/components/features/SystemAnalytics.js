import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Select from '../ui/Select';

export default function SystemAnalytics({ analytics }) {
  const [timeRange, setTimeRange] = useState('30');
  const [chartData, setChartData] = useState({
    userGrowth: [],
    consultationTrends: [],
    revenueData: []
  });

  useEffect(() => {
    generateMockChartData();
  }, [timeRange]);

  const generateMockChartData = () => {
    const days = parseInt(timeRange);
    const userGrowthData = [];
    const consultationData = [];
    const revenueData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      userGrowthData.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 50) + 20,
        doctors: Math.floor(Math.random() * 10) + 5,
        patients: Math.floor(Math.random() * 40) + 15
      });
      
      consultationData.push({
        date: date.toISOString().split('T')[0],
        consultations: Math.floor(Math.random() * 30) + 10,
        completed: Math.floor(Math.random() * 20) + 8
      });
      
      revenueData.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 1000) + 500
      });
    }

    setChartData({
      userGrowth: userGrowthData,
      consultationTrends: consultationData,
      revenueData: revenueData
    });
  };

  const calculateGrowth = (data, key) => {
    if (data.length < 2) return 0;
    const latest = data[data.length - 1][key];
    const previous = data[data.length - 2][key];
    return ((latest - previous) / previous * 100).toFixed(1);
  };

  const kpiCards = [
    {
      title: 'Daily Active Users',
      value: analytics.dailyActiveUsers || '1,234',
      change: calculateGrowth(chartData.userGrowth, 'users'),
      icon: UsersIcon,
      color: 'blue'
    },
    {
      title: 'Total Consultations',
      value: analytics.totalConsultations || '5,678',
      change: calculateGrowth(chartData.consultationTrends, 'consultations'),
      icon: DocumentTextIcon,
      color: 'green'
    },
    {
      title: 'Monthly Revenue',
      value: `$${analytics.monthlyRevenue?.toLocaleString() || '25,890'}`,
      change: calculateGrowth(chartData.revenueData, 'revenue'),
      icon: ChartBarIcon,
      color: 'purple'
    }
  ];

  const getChangeIcon = (change) => {
    const changeNum = parseFloat(change);
    if (changeNum > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    } else if (changeNum < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change) => {
    const changeNum = parseFloat(change);
    if (changeNum > 0) return 'text-green-600';
    if (changeNum < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">System Analytics</h2>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 3 months' }
          ]}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <div className={`flex items-center mt-2 ${getChangeColor(kpi.change)}`}>
                    {getChangeIcon(kpi.change)}
                    <span className="text-sm font-medium ml-1">
                      {Math.abs(parseFloat(kpi.change))}%
                    </span>
                  </div>
                </div>
                <div className={`p-3 bg-${kpi.color}-100 rounded-lg`}>
                  <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Users</span>
              <span className="font-medium">{analytics.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Doctors</span>
              <span className="font-medium">{analytics.totalDoctors}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Patients</span>
              <span className="font-medium">{analytics.totalPatients}</span>
            </div>
            
            {/* Simple bar chart representation */}
            <div className="mt-6">
              <div className="space-y-3">
                {chartData.userGrowth.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 w-16">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(day.users / 70) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-8">{day.users}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Consultation Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Consultation Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Consultations</span>
              <span className="font-medium">{analytics.totalConsultations}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium">89%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Avg Response Time</span>
              <span className="font-medium">2.4 hours</span>
            </div>
            
            {/* Consultation trend chart */}
            <div className="mt-6">
              <div className="space-y-3">
                {chartData.consultationTrends.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 w-16">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(day.consultations / 40) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 w-8">{day.consultations}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">245ms</div>
            <div className="text-sm text-gray-600">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">12%</div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">1,234</div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
        </div>
      </Card>

      {/* Recent Activity Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-900">New user registrations</span>
            </div>
            <span className="text-sm font-medium text-gray-600">+23 today</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-900">Consultations completed</span>
            </div>
            <span className="text-sm font-medium text-gray-600">156 today</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-900">Prescriptions issued</span>
            </div>
            <span className="text-sm font-medium text-gray-600">89 today</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-900">System alerts</span>
            </div>
            <span className="text-sm font-medium text-gray-600">2 active</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
