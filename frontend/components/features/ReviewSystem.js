import { useState, useEffect } from 'react';
import { 
  StarIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  UserIcon,
  CalendarIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { reviews, consultations } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
};

export default function ReviewSystem({ userType }) {
  const [reviewsList, setReviewsList] = useState([]);
  const [consultationList, setConsultationList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewReview, setShowNewReview] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [filters, setFilters] = useState({
    rating: '',
    sortBy: 'newest'
  });
  const [newReview, setNewReview] = useState({
    consultation_id: '',
    rating: 5,
    title: '',
    comment: '',
    anonymous: false
  });
  const [response, setResponse] = useState('');

  useEffect(() => {
    loadReviews();
    if (userType === 'patient') {
      loadCompletedConsultations();
    }
  }, [userType, filters]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = {
        rating: filters.rating,
        sort_by: filters.sortBy,
        limit: 20
      };
      
      const response = userType === 'patient' 
        ? await reviews.getByPatient(params)
        : await reviews.getByDoctor(null, params); // Doctor ID will be determined by auth
        
      setReviewsList(response.data.reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedConsultations = async () => {
    try {
      const response = await consultations.getAll({ 
        status: 'completed',
        limit: 50 
      });
      
      // Filter consultations that don't have reviews yet
      const unreviewed = response.data.consultations.filter(
        consultation => !consultation.has_review
      );
      setConsultationList(unreviewed);
    } catch (error) {
      console.error('Error loading consultations:', error);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      const response = await reviews.create(newReview);
      setReviewsList(prev => [response.data, ...prev]);
      setShowNewReview(false);
      resetReviewForm();
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Failed to submit review');
    }
  };

  const handleRespondToReview = async (e) => {
    e.preventDefault();
    try {
      await reviews.respond(selectedReview.id, { response });
      setReviewsList(prev => prev.map(review =>
        review.id === selectedReview.id
          ? { ...review, doctor_response: response }
          : review
      ));
      setShowResponseModal(false);
      setResponse('');
      setSelectedReview(null);
      toast.success('Response sent successfully!');
    } catch (error) {
      console.error('Error responding to review:', error);
      toast.error('Failed to send response');
    }
  };

  const resetReviewForm = () => {
    setNewReview({
      consultation_id: '',
      rating: 5,
      title: '',
      comment: '',
      anonymous: false
    });
  };

  const renderStars = (rating, interactive = false, onStarClick = null) => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating;
      const StarComponent = isFilled ? StarSolidIcon : StarIcon;
      
      stars.push(
        <button
          key={i}
          type="button"
          className={`h-5 w-5 ${
            interactive 
              ? 'cursor-pointer hover:scale-110 transition-transform' 
              : 'cursor-default'
          } ${isFilled ? 'text-yellow-400' : 'text-gray-300'}`}
          onClick={() => interactive && onStarClick && onStarClick(i)}
          disabled={!interactive}
        >
          <StarComponent className="w-full h-full" />
        </button>
      );
    }
    
    return <div className="flex space-x-1">{stars}</div>;
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {userType === 'patient' ? 'My Reviews' : 'Patient Reviews'}
          </h2>
          <p className="text-gray-600">
            {userType === 'patient' 
              ? 'Share your experience with doctors' 
              : 'View and respond to patient feedback'
            }
          </p>
        </div>
        {userType === 'patient' && consultationList.length > 0 && (
          <Button
            onClick={() => setShowNewReview(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Write Review
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            placeholder="Filter by rating"
            value={filters.rating}
            onChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
            options={[
              { value: '', label: 'All ratings' },
              { value: '5', label: '5 stars' },
              { value: '4', label: '4+ stars' },
              { value: '3', label: '3+ stars' },
              { value: '2', label: '2+ stars' },
              { value: '1', label: '1+ star' }
            ]}
          />
          
          <Select
            placeholder="Sort by"
            value={filters.sortBy}
            onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'highest_rating', label: 'Highest rated' },
              { value: 'lowest_rating', label: 'Lowest rated' }
            ]}
          />
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading reviews...</p>
          </div>
        ) : reviewsList.length === 0 ? (
          <Card className="p-8 text-center">
            <StarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600">
              {userType === 'patient' 
                ? 'Complete consultations to leave reviews'
                : 'Patient reviews will appear here'
              }
            </p>
          </Card>
        ) : (
          reviewsList.map((review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {review.anonymous ? 'Anonymous Patient' : review.patient_name}
                      </h4>
                      {userType === 'patient' && (
                        <span className="text-sm text-gray-500">
                          for Dr. {review.doctor_name}
                        </span>
                      )}
                      <Badge className="bg-gray-100 text-gray-800">
                        Verified Patient
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-2">
                      {renderStars(review.rating)}
                      <span className={`font-medium ${getRatingColor(review.rating)}`}>
                        {RATING_LABELS[review.rating]}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                {userType === 'doctor' && !review.doctor_response && (
                  <Button
                    onClick={() => {
                      setSelectedReview(review);
                      setShowResponseModal(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                    Respond
                  </Button>
                )}
              </div>
              
              {review.title && (
                <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
              )}
              
              <p className="text-gray-700 mb-4">{review.comment}</p>
              
              {review.doctor_response && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h6 className="font-medium text-blue-900 mb-1">
                        Response from Dr. {review.doctor_name}
                      </h6>
                      <p className="text-blue-800">{review.doctor_response}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* New Review Modal */}
      <Modal
        isOpen={showNewReview}
        onClose={() => setShowNewReview(false)}
        title="Write a Review"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateReview} className="space-y-4">
          <Select
            label="Consultation"
            value={newReview.consultation_id}
            onChange={(value) => setNewReview(prev => ({ ...prev, consultation_id: value }))}
            options={[
              { value: '', label: 'Select a consultation to review' },
              ...consultationList.map(consultation => ({
                value: consultation.id,
                label: `Dr. ${consultation.doctor_name} - ${consultation.title}`
              }))
            ]}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex items-center space-x-4">
              {renderStars(newReview.rating, true, (rating) => 
                setNewReview(prev => ({ ...prev, rating }))
              )}
              <span className="text-sm text-gray-600">
                {RATING_LABELS[newReview.rating]}
              </span>
            </div>
          </div>

          <Input
            label="Review Title (Optional)"
            value={newReview.title}
            onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Summarize your experience"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Review
            </label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Share your experience with this doctor..."
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={newReview.anonymous}
              onChange={(e) => setNewReview(prev => ({ ...prev, anonymous: e.target.checked }))}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-900">
              Submit anonymously
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewReview(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>

      {/* Response Modal */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        title="Respond to Review"
        maxWidth="max-w-lg"
      >
        {selectedReview && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                {renderStars(selectedReview.rating)}
                <span className="text-sm text-gray-600">
                  by {selectedReview.anonymous ? 'Anonymous Patient' : selectedReview.patient_name}
                </span>
              </div>
              <p className="text-gray-800">{selectedReview.comment}</p>
            </div>
            
            <form onSubmit={handleRespondToReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Response
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Thank the patient for their feedback and address any concerns..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResponseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Send Response
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
