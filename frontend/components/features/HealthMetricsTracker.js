import { useState, useEffect } from 'react';
import { 
  HeartIcon, 
  PlusIcon, 
  ChartBarIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon 
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { healthMetrics } from '../../lib/api';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const METRIC_TYPES = [
  { value: 'blood_pressure', label: 'Blood Pressure (mmHg)' },
  { value: 'heart_rate', label: 'Heart Rate (BPM)' },
  { value: 'weight', label: 'Weight (kg)' },
  { value: 'height', label: 'Height (cm)' },
  { value: 'temperature', label: 'Body Temperature (°C)' },
  { value: 'blood_sugar', label: 'Blood Sugar (mg/dL)' },
  { value: 'cholesterol', label: 'Cholesterol (mg/dL)' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation (%)' }
];

const BLOOD_PRESSURE_RANGES = {
  normal: { systolic: [90, 120], diastolic: [60, 80], color: 'text-green-600', bg: 'bg-green-50' },
  elevated: { systolic: [120, 129], diastolic: [60, 80], color: 'text-yellow-600', bg: 'bg-yellow-50' },
  stage1: { systolic: [130, 139], diastolic: [80, 89], color: 'text-orange-600', bg: 'bg-orange-50' },
  stage2: { systolic: [140, 999], diastolic: [90, 999], color: 'text-red-600', bg: 'bg-red-50' },
};

export default function HealthMetricsTracker() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewMetric, setShowNewMetric] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [newMetric, setNewMetric] = useState({
    type: 'blood_pressure',
    value: '',
    systolic: '',
    diastolic: '',
    notes: '',
    recorded_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
  });

  useEffect(() => {
    loadMetrics();
  }, [selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const fromDate = subDays(new Date(), parseInt(selectedPeriod));
      const response = await healthMetrics.getAll({
        from_date: fromDate.toISOString(),
        limit: 100
      });
      setMetrics(response.data.metrics);
    } catch (error) {
      console.error('Error loading health metrics:', error);
      toast.error('Failed to load health metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMetric = async (e) => {
    e.preventDefault();
    try {
      const metricData = { ...newMetric };
      
      // Handle blood pressure special case
      if (newMetric.type === 'blood_pressure') {
        metricData.value = `${newMetric.systolic}/${newMetric.diastolic}`;
      }
      
      const response = await healthMetrics.create(metricData);
      setMetrics(prev => [response.data, ...prev]);
      setShowNewMetric(false);
      resetForm();
      toast.success('Health metric recorded successfully!');
    } catch (error) {
      console.error('Error creating health metric:', error);
      toast.error('Failed to record health metric');
    }
  };

  const resetForm = () => {
    setNewMetric({
      type: 'blood_pressure',
      value: '',
      systolic: '',
      diastolic: '',
      notes: '',
      recorded_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')
    });
  };

  const calculateBMI = () => {
    const weightMetric = metrics.find(m => m.type === 'weight');
    const heightMetric = metrics.find(m => m.type === 'height');
    
    if (weightMetric && heightMetric) {
      const weight = parseFloat(weightMetric.value);
      const height = parseFloat(heightMetric.value) / 100; // Convert cm to m
      const bmi = weight / (height * height);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const getBloodPressureCategory = (systolic, diastolic) => {
    if (systolic < 120 && diastolic < 80) return { ...BLOOD_PRESSURE_RANGES.normal, category: 'Normal' };
    if (systolic < 130 && diastolic < 80) return { ...BLOOD_PRESSURE_RANGES.elevated, category: 'Elevated' };
    if (systolic < 140 || diastolic < 90) return { ...BLOOD_PRESSURE_RANGES.stage1, category: 'Stage 1 High' };
    return { ...BLOOD_PRESSURE_RANGES.stage2, category: 'Stage 2 High' };
  };

  const getMetricTrend = (metricType) => {
    const typeMetrics = metrics.filter(m => m.type === metricType).slice(0, 2);
    if (typeMetrics.length < 2) return null;
    
    const latest = parseFloat(typeMetrics[0].value);
    const previous = parseFloat(typeMetrics[1].value);
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  const getMetricsByType = () => {
    const grouped = {};
    metrics.forEach(metric => {
      if (!grouped[metric.type]) {
        grouped[metric.type] = [];
      }
      grouped[metric.type].push(metric);
    });
    return grouped;
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;
  const groupedMetrics = getMetricsByType();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Health Metrics</h2>
          <p className="text-gray-600">Track and monitor your health indicators</p>
        </div>
        <div className="flex space-x-3">
          <Select
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 3 months' },
              { value: '365', label: 'Last year' }
            ]}
          />
          <Button
            onClick={() => setShowNewMetric(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Record Metric
          </Button>
        </div>
      </div>

      {/* Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BMI Card */}
        {bmi && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">BMI</p>
                <p className="text-2xl font-bold text-gray-900">{bmi}</p>
                <p className={`text-sm ${bmiCategory.color}`}>{bmiCategory.category}</p>
              </div>
              <ScaleIcon className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        )}

        {/* Latest Blood Pressure */}
        {groupedMetrics.blood_pressure && (
          <Card className="p-6">
            {(() => {
              const latestBP = groupedMetrics.blood_pressure[0];
              const [systolic, diastolic] = latestBP.value.split('/').map(Number);
              const bpCategory = getBloodPressureCategory(systolic, diastolic);
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                    <p className="text-2xl font-bold text-gray-900">{latestBP.value}</p>
                    <p className={`text-sm ${bpCategory.color}`}>{bpCategory.category}</p>
                  </div>
                  <HeartIcon className="h-8 w-8 text-gray-400" />
                </div>
              );
            })()}
          </Card>
        )}

        {/* Latest Heart Rate */}
        {groupedMetrics.heart_rate && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                <p className="text-2xl font-bold text-gray-900">{groupedMetrics.heart_rate[0].value}</p>
                <p className="text-sm text-gray-500">BPM</p>
              </div>
              <div className="flex items-center">
                {getMetricTrend('heart_rate') === 'up' && (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-red-500 mr-1" />
                )}
                {getMetricTrend('heart_rate') === 'down' && (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-green-500 mr-1" />
                )}
                <HeartIcon className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </Card>
        )}

        {/* Latest Weight */}
        {groupedMetrics.weight && (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weight</p>
                <p className="text-2xl font-bold text-gray-900">{groupedMetrics.weight[0].value}</p>
                <p className="text-sm text-gray-500">kg</p>
              </div>
              <div className="flex items-center">
                {getMetricTrend('weight') === 'up' && (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-orange-500 mr-1" />
                )}
                {getMetricTrend('weight') === 'down' && (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-blue-500 mr-1" />
                )}
                <ScaleIcon className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Detailed Metrics List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Measurements</h3>
          <ChartBarIcon className="h-5 w-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading health metrics...</p>
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-8">
            <HeartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No health metrics recorded</h4>
            <p className="text-gray-600">Start tracking your health by recording your first metric</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMetrics).map(([type, typeMetrics]) => (
              <div key={type} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {METRIC_TYPES.find(t => t.value === type)?.label || type.replace('_', ' ')}
                </h4>
                <div className="grid gap-2">
                  {typeMetrics.slice(0, 5).map((metric) => (
                    <div key={metric.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {metric.value}
                          {type !== 'blood_pressure' && (
                            <span className="text-sm text-gray-500 ml-1">
                              {type === 'weight' && 'kg'}
                              {type === 'height' && 'cm'}
                              {type === 'temperature' && '°C'}
                              {type === 'heart_rate' && 'BPM'}
                              {type === 'blood_sugar' && 'mg/dL'}
                              {type === 'cholesterol' && 'mg/dL'}
                              {type === 'oxygen_saturation' && '%'}
                            </span>
                          )}
                        </span>
                        {metric.notes && (
                          <span className="text-sm text-gray-500 italic">
                            {metric.notes}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {format(new Date(metric.recorded_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New Metric Modal */}
      <Modal
        isOpen={showNewMetric}
        onClose={() => setShowNewMetric(false)}
        title="Record Health Metric"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateMetric} className="space-y-4">
          <Select
            label="Metric Type"
            value={newMetric.type}
            onChange={(value) => setNewMetric(prev => ({ 
              ...prev, 
              type: value,
              value: '',
              systolic: '',
              diastolic: ''
            }))}
            options={METRIC_TYPES}
          />

          {newMetric.type === 'blood_pressure' ? (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Systolic"
                type="number"
                value={newMetric.systolic}
                onChange={(e) => setNewMetric(prev => ({ ...prev, systolic: e.target.value }))}
                placeholder="120"
                required
              />
              <Input
                label="Diastolic"
                type="number"
                value={newMetric.diastolic}
                onChange={(e) => setNewMetric(prev => ({ ...prev, diastolic: e.target.value }))}
                placeholder="80"
                required
              />
            </div>
          ) : (
            <Input
              label="Value"
              type="number"
              step="0.1"
              value={newMetric.value}
              onChange={(e) => setNewMetric(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter value"
              required
            />
          )}

          <Input
            label="Date & Time"
            type="datetime-local"
            value={newMetric.recorded_at}
            onChange={(e) => setNewMetric(prev => ({ ...prev, recorded_at: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={newMetric.notes}
              onChange={(e) => setNewMetric(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Any additional notes about this measurement"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewMetric(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Record Metric
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
