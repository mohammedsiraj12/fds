import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { consultations, users } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low - Routine checkup' },
  { value: 'medium', label: 'Medium - Mild symptoms' },
  { value: 'high', label: 'High - Concerning symptoms' },
  { value: 'urgent', label: 'Urgent - Severe symptoms' }
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General Medicine' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'other', label: 'Other' }
];

export default function ConsultationSystem({ userType }) {
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewConsultation, setShowNewConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [newConsultation, setNewConsultation] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'general',
    doctor_id: ''
  });

  const { joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    loadConsultations();
    if (userType === 'patient') {
      loadDoctors();
    }
  }, [userType]);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const response = await consultations.getAll();
      setConsultations(response.data.consultations);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultations');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await users.getDoctors();
      setDoctors(response.data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    try {
      const response = await consultations.create(newConsultation);
      setConsultations(prev => [response.data, ...prev]);
      setShowNewConsultation(false);
      setNewConsultation({
        title: '',
        description: '',
        severity: 'medium',
        category: 'general',
        doctor_id: ''
      });
      toast.success('Consultation request created successfully!');
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Failed to create consultation');
    }
  };

  const handleJoinConsultation = (consultation) => {
    setSelectedConsultation(consultation);
    joinRoom(`consultation_${consultation.id}`);
  };

  const handleRespondToConsultation = async (consultationId, response) => {
    try {
      await consultations.respond(consultationId, { response });
      loadConsultations(); // Refresh the list
      toast.success('Response sent successfully!');
    } catch (error) {
      console.error('Error responding to consultation:', error);
      toast.error('Failed to send response');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {userType === 'patient' ? 'My Consultations' : 'Patient Consultations'}
          </h2>
          <p className="text-gray-600">
            {userType === 'patient' 
              ? 'Manage your consultations with doctors' 
              : 'View and respond to patient consultation requests'
            }
          </p>
        </div>
        {userType === 'patient' && (
          <Button
            onClick={() => setShowNewConsultation(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Consultation
          </Button>
        )}
      </div>

      {/* Consultations List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading consultations...</p>
          </div>
        ) : consultations.length === 0 ? (
          <Card className="p-8 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No consultations yet</h3>
            <p className="text-gray-600">
              {userType === 'patient' 
                ? 'Create your first consultation to get started'
                : 'No patient consultations to review at this time'
              }
            </p>
          </Card>
        ) : (
          consultations.map((consultation) => (
            <Card key={consultation.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{consultation.title}</h3>
                  <p className="text-gray-600 mt-1">{consultation.description}</p>
                </div>
                <div className="flex space-x-2">
                  <Badge className={getSeverityColor(consultation.severity)}>
                    {consultation.severity}
                  </Badge>
                  <Badge className={getStatusColor(consultation.status)}>
                    {consultation.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {userType === 'patient' ? 
                    `Dr. ${consultation.doctor_name}` : 
                    consultation.patient_name
                  }
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {formatDistanceToNow(new Date(consultation.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center">
                  <span className="capitalize">{consultation.category.replace('_', ' ')}</span>
                </div>
              </div>

              {consultation.doctor_response && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Doctor's Response:</h4>
                  <p className="text-blue-800">{consultation.doctor_response}</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={() => handleJoinConsultation(consultation)}
                  variant="outline"
                  size="sm"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                {userType === 'doctor' && consultation.status === 'pending' && (
                  <Button
                    onClick={() => {
                      const response = prompt('Enter your response:');
                      if (response) {
                        handleRespondToConsultation(consultation.id, response);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    Respond
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New Consultation Modal */}
      <Modal
        isOpen={showNewConsultation}
        onClose={() => setShowNewConsultation(false)}
        title="Request New Consultation"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateConsultation} className="space-y-6">
          <Input
            label="Consultation Title"
            value={newConsultation.title}
            onChange={(e) => setNewConsultation(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief title for your consultation"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newConsultation.description}
              onChange={(e) => setNewConsultation(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your symptoms, concerns, or questions in detail..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Severity Level"
              value={newConsultation.severity}
              onChange={(value) => setNewConsultation(prev => ({ ...prev, severity: value }))}
              options={SEVERITY_OPTIONS}
            />

            <Select
              label="Category"
              value={newConsultation.category}
              onChange={(value) => setNewConsultation(prev => ({ ...prev, category: value }))}
              options={CATEGORY_OPTIONS}
            />
          </div>

          <Select
            label="Preferred Doctor (Optional)"
            value={newConsultation.doctor_id}
            onChange={(value) => setNewConsultation(prev => ({ ...prev, doctor_id: value }))}
            options={[
              { value: '', label: 'Any available doctor' },
              ...doctors.map(doctor => ({
                value: doctor.id,
                label: `Dr. ${doctor.full_name} - ${doctor.specialization}`
              }))
            ]}
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewConsultation(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Consultation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
