import { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon,
  StarIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { users, consultations } from '../../lib/api';
import { debounce } from '../../utils/debounce';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = [
  { value: '', label: 'All Specializations' },
  { value: 'general', label: 'General Medicine' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'gynecology', label: 'Gynecology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'ophthalmology', label: 'Ophthalmology' }
];

const AVAILABILITY_FILTERS = [
  { value: '', label: 'Any time' },
  { value: 'now', label: 'Available now' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' }
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest rated' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'distance', label: 'Nearest' }
];

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [filters, setFilters] = useState({
    specialization: '',
    availability: '',
    minRating: '',
    maxPrice: '',
    location: '',
    sortBy: 'rating'
  });
  const [consultationData, setConsultationData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    category: 'general'
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query, currentFilters) => {
      try {
        setLoading(true);
        const params = {
          query,
          specialization: currentFilters.specialization,
          availability: currentFilters.availability,
          min_rating: currentFilters.minRating,
          max_price: currentFilters.maxPrice,
          location: currentFilters.location,
          sort_by: currentFilters.sortBy,
          limit: 20
        };
        
        const response = await users.getDoctors(params);
        setDoctors(response.data);
      } catch (error) {
        console.error('Error searching doctors:', error);
        toast.error('Failed to search doctors');
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, filters);
  }, [searchQuery, filters, debouncedSearch]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleBookConsultation = async (doctor) => {
    setSelectedDoctor(doctor);
    setConsultationData(prev => ({
      ...prev,
      doctor_id: doctor.id,
      category: doctor.specialization || 'general'
    }));
    setShowConsultationModal(true);
  };

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    try {
      const response = await consultations.create({
        ...consultationData,
        doctor_id: selectedDoctor.id
      });
      
      setShowConsultationModal(false);
      setConsultationData({
        title: '',
        description: '',
        severity: 'medium',
        category: 'general'
      });
      
      toast.success(`Consultation request sent to Dr. ${selectedDoctor.full_name}!`);
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Failed to book consultation');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarSolidIcon key={i} className="h-4 w-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-current" />
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }
    
    return stars;
  };

  const getAvailabilityStatus = (doctor) => {
    // This would typically come from the backend
    const statuses = ['Available now', 'Available today', 'Busy', 'Offline'];
    const colors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-gray-600'];
    const randomIndex = Math.floor(Math.random() * statuses.length);
    
    return {
      status: statuses[randomIndex],
      color: colors[randomIndex]
    };
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Find Doctors</h2>
        <p className="text-gray-600">Search and book consultations with qualified doctors</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search doctors by name, specialization, or location..."
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Select
            placeholder="Specialization"
            value={filters.specialization}
            onChange={(value) => handleFilterChange('specialization', value)}
            options={SPECIALIZATIONS}
          />
          
          <Select
            placeholder="Availability"
            value={filters.availability}
            onChange={(value) => handleFilterChange('availability', value)}
            options={AVAILABILITY_FILTERS}
          />
          
          <Input
            type="number"
            placeholder="Min Rating (1-5)"
            min="1"
            max="5"
            step="0.1"
            value={filters.minRating}
            onChange={(e) => handleFilterChange('minRating', e.target.value)}
          />
          
          <Input
            type="number"
            placeholder="Max Price"
            min="0"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
          />
          
          <Input
            placeholder="Location"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          />
          
          <Select
            placeholder="Sort by"
            value={filters.sortBy}
            onChange={(value) => handleFilterChange('sortBy', value)}
            options={SORT_OPTIONS}
          />
        </div>
      </Card>

      {/* Results */}
      <div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Searching doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <Card className="p-8 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="text-sm text-gray-600">
              Found {doctors.length} doctors matching your criteria
            </div>
            
            {doctors.map((doctor) => {
              const availability = getAvailabilityStatus(doctor);
              
              return (
                <Card key={doctor.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Doctor Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Doctor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            Dr. {doctor.full_name}
                          </h3>
                          
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center">
                              <AcademicCapIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-600 capitalize">
                                {doctor.specialization?.replace('_', ' ') || 'General Medicine'}
                              </span>
                            </div>
                            
                            {doctor.experience_years && (
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-600">
                                  {doctor.experience_years} years exp.
                                </span>
                              </div>
                            )}
                            
                            {doctor.location && (
                              <div className="flex items-center">
                                <MapPinIcon className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-600">
                                  {doctor.location}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center mt-2">
                            <div className="flex items-center">
                              {renderStars(doctor.avg_rating || 4.5)}
                            </div>
                            <span className="ml-2 text-sm text-gray-600">
                              {doctor.avg_rating ? doctor.avg_rating.toFixed(1) : '4.5'} 
                              ({doctor.total_reviews || '50'} reviews)
                            </span>
                          </div>
                          
                          {/* Bio */}
                          {doctor.bio && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {doctor.bio}
                            </p>
                          )}
                          
                          {/* Languages */}
                          {doctor.languages && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {doctor.languages.split(',').map((lang, index) => (
                                <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                                  {lang.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Right Side Info */}
                        <div className="text-right">
                          <div className={`text-sm font-medium ${availability.color}`}>
                            {availability.status}
                          </div>
                          
                          {doctor.consultation_fee && (
                            <div className="text-lg font-bold text-gray-900 mt-1">
                              ${doctor.consultation_fee}
                            </div>
                          )}
                          
                          <div className="mt-3 space-y-2">
                            <Button
                              onClick={() => handleBookConsultation(doctor)}
                              className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                              size="sm"
                            >
                              Book Consultation
                            </Button>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setSelectedDoctor(doctor)}
                              >
                                View Profile
                              </Button>
                              
                              {doctor.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`tel:${doctor.phone}`)}
                                >
                                  <PhoneIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Consultation Modal */}
      <Modal
        isOpen={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        title={`Book Consultation with Dr. ${selectedDoctor?.full_name}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateConsultation} className="space-y-4">
          <Input
            label="Consultation Title"
            value={consultationData.title}
            onChange={(e) => setConsultationData(prev => ({ 
              ...prev, 
              title: e.target.value 
            }))}
            placeholder="Brief title for your consultation"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe your condition
            </label>
            <textarea
              value={consultationData.description}
              onChange={(e) => setConsultationData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Describe your symptoms, concerns, or questions..."
              required
            />
          </div>
          
          <Select
            label="Severity Level"
            value={consultationData.severity}
            onChange={(value) => setConsultationData(prev => ({ 
              ...prev, 
              severity: value 
            }))}
            options={[
              { value: 'low', label: 'Low - Routine checkup' },
              { value: 'medium', label: 'Medium - Mild symptoms' },
              { value: 'high', label: 'High - Concerning symptoms' },
              { value: 'urgent', label: 'Urgent - Severe symptoms' }
            ]}
          />
          
          {selectedDoctor?.consultation_fee && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Consultation Fee:</span>
                <span className="text-lg font-bold text-gray-900">
                  ${selectedDoctor.consultation_fee}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConsultationModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Book Consultation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
