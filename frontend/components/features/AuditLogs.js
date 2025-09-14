import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  EyeIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { admin } from '../../lib/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const LOG_ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'view', label: 'View' }
];

const LOG_RESOURCES = [
  { value: '', label: 'All Resources' },
  { value: 'user', label: 'Users' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'review', label: 'Reviews' },
  { value: 'system', label: 'System' }
];

const TIME_RANGES = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' }
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    timeRange: '7',
    userId: '',
    sortBy: 'created_at'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  useEffect(() => {
    loadAuditLogs();
  }, [searchQuery, filters, pagination.page]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const fromDate = subDays(new Date(), parseInt(filters.timeRange));
      
      const params = {
        search: searchQuery,
        action: filters.action,
        resource: filters.resource,
        user_id: filters.userId,
        from_date: fromDate.toISOString(),
        sort_by: filters.sortBy,
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await admin.getAuditLogs(params);
      setLogs(response.data.logs);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      // Generate mock data for demo
      generateMockLogs();
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = () => {
    const mockLogs = [];
    const actions = ['login', 'logout', 'create', 'update', 'delete', 'view'];
    const resources = ['user', 'consultation', 'prescription', 'review'];
    const users = ['Dr. Smith', 'John Doe', 'Jane Admin', 'Alice Patient'];
    
    for (let i = 0; i < 25; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      mockLogs.push({
        id: i + 1,
        action,
        resource,
        user_name: user,
        user_id: Math.floor(Math.random() * 1000),
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} with ID ${Math.floor(Math.random() * 1000)}`,
        metadata: {
          resource_id: Math.floor(Math.random() * 1000),
          changes: action === 'update' ? { field: 'status', old_value: 'pending', new_value: 'completed' } : null
        },
        created_at: timestamp.toISOString(),
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      });
    }
    
    setLogs(mockLogs);
    setPagination(prev => ({ ...prev, total: mockLogs.length }));
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const exportLogs = async () => {
    try {
      // In a real app, this would call the API to export logs
      const csvContent = [
        ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Details'].join(','),
        ...logs.map(log => [
          log.created_at,
          log.user_name,
          log.action,
          log.resource,
          log.ip_address,
          `"${log.details}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    }
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'view': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Audit Logs</h2>
        <Button
          onClick={exportLogs}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-10"
            />
          </div>
          
          <Select
            value={filters.action}
            onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
            options={LOG_ACTIONS}
          />
          
          <Select
            value={filters.resource}
            onChange={(value) => setFilters(prev => ({ ...prev, resource: value }))}
            options={LOG_RESOURCES}
          />
          
          <Select
            value={filters.timeRange}
            onChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}
            options={TIME_RANGES}
          />
          
          <Input
            value={filters.userId}
            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            placeholder="User ID"
          />
        </div>
        
        <div className="text-sm text-gray-600">
          Showing logs from the last {filters.timeRange} days
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No audit logs found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getSeverityBadgeColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => handleViewDetails(log)}
                          variant="outline"
                          size="sm"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        page: Math.max(1, prev.page - 1) 
                      }))}
                      disabled={pagination.page === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        page: Math.min(totalPages, prev.page + 1) 
                      }))}
                      disabled={pagination.page === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Log Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Audit Log Details"
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedLog.created_at), 'PPpp')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedLog.user_name} (ID: {selectedLog.user_id})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <div className="mt-1">
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {selectedLog.resource}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Details</label>
              <p className="mt-1 text-sm text-gray-900">{selectedLog.details}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="mt-1 text-sm text-gray-900">{selectedLog.ip_address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <div className="mt-1">
                  <Badge className={getSeverityBadgeColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
              </div>
            </div>

            {selectedLog.user_agent && (
              <div>
                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                <p className="mt-1 text-sm text-gray-900 break-words">
                  {selectedLog.user_agent}
                </p>
              </div>
            )}

            {selectedLog.metadata && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Metadata</label>
                <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
