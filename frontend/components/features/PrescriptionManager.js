import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  PrinterIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { prescriptions, consultations } from '../../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const DOSAGE_FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'four_times_daily', label: 'Four times daily' },
  { value: 'as_needed', label: 'As needed' },
  { value: 'other', label: 'Other' }
];

const MEDICATION_TYPES = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'ointment', label: 'Ointment' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' }
];

export default function PrescriptionManager({ userType }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [consultationList, setConsultationList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [medications, setMedications] = useState([{
    name: '',
    dosage: '',
    frequency: 'twice_daily',
    duration: '',
    instructions: '',
    type: 'tablet'
  }]);
  const [newPrescription, setNewPrescription] = useState({
    consultation_id: '',
    diagnosis: '',
    notes: '',
    follow_up_date: ''
  });

  useEffect(() => {
    loadPrescriptions();
    if (userType === 'doctor') {
      loadConsultations();
    }
  }, [userType]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptions.getAll();
      setPrescriptions(response.data.prescriptions);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadConsultations = async () => {
    try {
      const response = await consultations.getAll({ status: 'in_progress' });
      setConsultationList(response.data.consultations);
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    try {
      const prescriptionData = {
        ...newPrescription,
        medications
      };
      
      const response = await prescriptions.create(prescriptionData);
      setPrescriptions(prev => [response.data, ...prev]);
      setShowNewPrescription(false);
      resetForm();
      toast.success('Prescription created successfully!');
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const resetForm = () => {
    setNewPrescription({
      consultation_id: '',
      diagnosis: '',
      notes: '',
      follow_up_date: ''
    });
    setMedications([{
      name: '',
      dosage: '',
      frequency: 'twice_daily',
      duration: '',
      instructions: '',
      type: 'tablet'
    }]);
  };

  const addMedication = () => {
    setMedications(prev => [...prev, {
      name: '',
      dosage: '',
      frequency: 'twice_daily',
      duration: '',
      instructions: '',
      type: 'tablet'
    }]);
  };

  const updateMedication = (index, field, value) => {
    setMedications(prev => prev.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    ));
  };

  const removeMedication = (index) => {
    if (medications.length > 1) {
      setMedications(prev => prev.filter((_, i) => i !== index));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const printPrescription = (prescription) => {
    const printWindow = window.open('', '_blank');
    const prescriptionHTML = `
      <html>
        <head>
          <title>Prescription - ${prescription.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .patient-info { margin-bottom: 20px; }
            .medications { margin-bottom: 20px; }
            .medication { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; }
            .footer { margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Medical Prescription</h2>
            <p>Date: ${format(new Date(prescription.created_at), 'PPP')}</p>
          </div>
          <div class="patient-info">
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> ${prescription.patient_name}</p>
            <p><strong>Prescription ID:</strong> ${prescription.id}</p>
          </div>
          <div class="medications">
            <h3>Prescribed Medications</h3>
            ${prescription.medications.map(med => `
              <div class="medication">
                <p><strong>Medication:</strong> ${med.name} (${med.type})</p>
                <p><strong>Dosage:</strong> ${med.dosage}</p>
                <p><strong>Frequency:</strong> ${med.frequency.replace('_', ' ')}</p>
                <p><strong>Duration:</strong> ${med.duration}</p>
                <p><strong>Instructions:</strong> ${med.instructions}</p>
              </div>
            `).join('')}
          </div>
          <div>
            <h3>Diagnosis</h3>
            <p>${prescription.diagnosis}</p>
          </div>
          <div>
            <h3>Additional Notes</h3>
            <p>${prescription.notes || 'None'}</p>
          </div>
          <div class="footer">
            <p><strong>Dr. ${prescription.doctor_name}</strong></p>
            <p>Follow-up Date: ${prescription.follow_up_date ? format(new Date(prescription.follow_up_date), 'PPP') : 'Not specified'}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(prescriptionHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {userType === 'patient' ? 'My Prescriptions' : 'Patient Prescriptions'}
          </h2>
          <p className="text-gray-600">
            {userType === 'patient' 
              ? 'View and manage your prescriptions' 
              : 'Create and manage prescriptions for patients'
            }
          </p>
        </div>
        {userType === 'doctor' && (
          <Button
            onClick={() => setShowNewPrescription(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Prescription
          </Button>
        )}
      </div>

      {/* Prescriptions List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <Card className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions yet</h3>
            <p className="text-gray-600">
              {userType === 'patient' 
                ? 'Your prescriptions will appear here once issued by doctors'
                : 'Create your first prescription to get started'
              }
            </p>
          </Card>
        ) : (
          prescriptions.map((prescription) => (
            <Card key={prescription.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Prescription #{prescription.id}
                  </h3>
                  <p className="text-gray-600">
                    {userType === 'patient' ? 
                      `Prescribed by Dr. ${prescription.doctor_name}` : 
                      `For ${prescription.patient_name}`
                    }
                  </p>
                </div>
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Diagnosis:</h4>
                <p className="text-gray-700">{prescription.diagnosis}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Medications:</h4>
                <div className="grid gap-2">
                  {prescription.medications?.map((medication, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{medication.name} ({medication.type})</p>
                          <p className="text-sm text-gray-600">
                            {medication.dosage} - {medication.frequency.replace('_', ' ')} for {medication.duration}
                          </p>
                          {medication.instructions && (
                            <p className="text-sm text-gray-500 mt-1">
                              <strong>Instructions:</strong> {medication.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )) || <p className="text-gray-500">No medications listed</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(new Date(prescription.created_at), { addSuffix: true })}
                  </div>
                  {prescription.follow_up_date && (
                    <div className="flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      Follow-up: {format(new Date(prescription.follow_up_date), 'PPP')}
                    </div>
                  )}
                </div>
              </div>

              {prescription.notes && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Additional Notes:</h4>
                  <p className="text-blue-800">{prescription.notes}</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={() => printPrescription(prescription)}
                  variant="outline"
                  size="sm"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  onClick={() => setSelectedPrescription(prescription)}
                  variant="outline"
                  size="sm"
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New Prescription Modal */}
      <Modal
        isOpen={showNewPrescription}
        onClose={() => setShowNewPrescription(false)}
        title="Create New Prescription"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreatePrescription} className="space-y-6">
          <Select
            label="Consultation"
            value={newPrescription.consultation_id}
            onChange={(value) => setNewPrescription(prev => ({ ...prev, consultation_id: value }))}
            options={[
              { value: '', label: 'Select a consultation' },
              ...consultationList.map(consultation => ({
                value: consultation.id,
                label: `${consultation.patient_name} - ${consultation.title}`
              }))
            ]}
            required
          />

          <Input
            label="Diagnosis"
            value={newPrescription.diagnosis}
            onChange={(e) => setNewPrescription(prev => ({ ...prev, diagnosis: e.target.value }))}
            placeholder="Patient's diagnosis"
            required
          />

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Medications</h3>
              <Button
                type="button"
                onClick={addMedication}
                variant="outline"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Medication
              </Button>
            </div>

            {medications.map((medication, index) => (
              <Card key={index} className="p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Medication Name"
                    value={medication.name}
                    onChange={(e) => updateMedication(index, 'name', e.target.value)}
                    placeholder="Enter medication name"
                    required
                  />
                  <Select
                    label="Type"
                    value={medication.type}
                    onChange={(value) => updateMedication(index, 'type', value)}
                    options={MEDICATION_TYPES}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Input
                    label="Dosage"
                    value={medication.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                    placeholder="e.g., 500mg, 2 tablets"
                    required
                  />
                  <Select
                    label="Frequency"
                    value={medication.frequency}
                    onChange={(value) => updateMedication(index, 'frequency', value)}
                    options={DOSAGE_FREQUENCIES}
                  />
                  <Input
                    label="Duration"
                    value={medication.duration}
                    onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                    placeholder="e.g., 7 days, 2 weeks"
                    required
                  />
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Special Instructions
                    </label>
                    <textarea
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Take with food, before meals, etc."
                    />
                  </div>
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeMedication(index)}
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={newPrescription.notes}
                onChange={(e) => setNewPrescription(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Any additional notes for the patient"
              />
            </div>
            <Input
              label="Follow-up Date (Optional)"
              type="date"
              value={newPrescription.follow_up_date}
              onChange={(e) => setNewPrescription(prev => ({ ...prev, follow_up_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewPrescription(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Create Prescription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
