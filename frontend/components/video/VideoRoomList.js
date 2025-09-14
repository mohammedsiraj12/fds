"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  VideoCameraIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function VideoRoomList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRooms();
  }, [filter]);

  const loadRooms = async () => {
    try {
      const statusFilter = filter === 'all' ? null : filter;
      const response = await apiClient.getMyVideoRooms(statusFilter);
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Failed to load video rooms:', error);
      toast.error('Failed to load video rooms');
    } finally {
      setLoading(false);
    }
  };

  const createEmergencyRoom = async () => {
    try {
      const response = await apiClient.createEmergencyRoom();
      toast.success('Emergency video room created!');
      
      // Redirect to the emergency room
      window.location.href = response.join_url;
    } catch (error) {
      console.error('Failed to create emergency room:', error);
      toast.error('Failed to create emergency room');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-yellow-600 bg-yellow-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'ended': return 'text-gray-600 bg-gray-100';
      case 'emergency_pending': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoomTypeIcon = (type) => {
    switch (type) {
      case 'emergency':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'consultation':
        return <VideoCameraIcon className="w-5 h-5 text-blue-500" />;
      case 'appointment':
        return <CalendarDaysIcon className="w-5 h-5 text-green-500" />;
      default:
        return <VideoCameraIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Video Consultations</h1>
        <div className="flex space-x-3">
          {user?.role === 'patient' && (
            <Button
              onClick={createEmergencyRoom}
              variant="danger"
              className="flex items-center"
            >
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              Emergency Call
            </Button>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center"
          >
            <VideoCameraIcon className="w-4 h-4 mr-2" />
            New Room
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 border-b border-gray-200">
        {['all', 'scheduled', 'active', 'ended'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Emergency Rooms Alert */}
      {rooms.some(room => room.room.room_type === 'emergency' && room.room.status === 'emergency_pending') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 font-medium">
              You have pending emergency consultations that require immediate attention.
            </p>
          </div>
        </div>
      )}

      {/* Rooms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No video rooms found</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? "You haven't created or joined any video rooms yet."
                : `No rooms with status "${filter}" found.`
              }
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Room
            </Button>
          </div>
        ) : (
          rooms.map((roomData) => {
            const { room, host_email, participant_email, is_host, consultation, appointment } = roomData;
            
            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getRoomTypeIcon(room.room_type)}
                      <Card.Title className="text-sm">
                        {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)} Room
                      </Card.Title>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                      {room.status.replace('_', ' ')}
                    </span>
                  </div>
                </Card.Header>

                <Card.Content>
                  <div className="space-y-3">
                    {/* Participants */}
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="w-4 h-4 mr-2" />
                      <div>
                        <p>Host: {is_host ? 'You' : host_email}</p>
                        <p>Participant: {is_host ? participant_email : 'You'}</p>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4 mr-2" />
                      <span>
                        {room.actual_duration 
                          ? `${room.actual_duration} minutes` 
                          : `${room.duration_minutes} minutes (scheduled)`
                        }
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarDaysIcon className="w-4 h-4 mr-2" />
                      <span>{new Date(room.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Related Consultation/Appointment */}
                    {consultation && (
                      <div className="bg-blue-50 p-2 rounded text-sm">
                        <p className="font-medium text-blue-800">Related Consultation</p>
                        <p className="text-blue-600">{consultation.subject}</p>
                      </div>
                    )}

                    {appointment && (
                      <div className="bg-green-50 p-2 rounded text-sm">
                        <p className="font-medium text-green-800">Related Appointment</p>
                        <p className="text-green-600">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </Card.Content>

                <Card.Footer>
                  <div className="flex space-x-2">
                    {room.status === 'scheduled' || room.status === 'emergency_pending' ? (
                      <Link 
                        href={`/video/room/${room.id}?token=${room.token}`}
                        className="flex-1"
                      >
                        <Button className="w-full" size="sm">
                          {room.room_type === 'emergency' ? 'Join Emergency Call' : 'Join Room'}
                        </Button>
                      </Link>
                    ) : room.status === 'ended' && room.recording_url ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const recording = await apiClient.getRoomRecording(room.id);
                            if (recording.available) {
                              window.open(recording.recording_url, '_blank');
                            } else {
                              toast.error('Recording not available');
                            }
                          } catch (error) {
                            toast.error('Failed to load recording');
                          }
                        }}
                      >
                        View Recording
                      </Button>
                    ) : room.status === 'active' ? (
                      <Link 
                        href={`/video/room/${room.id}?token=${room.token}`}
                        className="flex-1"
                      >
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="sm">
                          Rejoin Call
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Room Ended
                      </Button>
                    )}

                    {is_host && room.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiClient.sendVideoInvite(room.id);
                            toast.success('Invitation sent!');
                          } catch (error) {
                            toast.error('Failed to send invitation');
                          }
                        }}
                      >
                        Invite
                      </Button>
                    )}
                  </div>
                </Card.Footer>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <CreateRoomModal
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={() => {
            setShowCreateModal(false);
            loadRooms();
          }}
        />
      )}
    </div>
  );
}

// Create Room Modal Component
function CreateRoomModal({ onClose, onRoomCreated }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    participant_email: '',
    room_type: 'consultation',
    duration_minutes: 30,
    scheduled_start: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For simplicity, we'll need to get participant ID from email
      // In a real app, you'd have a user search endpoint
      const response = await apiClient.createVideoRoom({
        participant_id: formData.participant_email, // This would need to be converted to ID
        room_type: formData.room_type,
        duration_minutes: parseInt(formData.duration_minutes),
        scheduled_start: formData.scheduled_start || null
      });

      toast.success('Video room created successfully!');
      onRoomCreated();
    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error('Failed to create video room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create Video Room</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.participant_email}
                  onChange={(e) => setFormData({...formData, participant_email: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter participant's email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </label>
                <select
                  value={formData.room_type}
                  onChange={(e) => setFormData({...formData, room_type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="consultation">Consultation</option>
                  <option value="appointment">Appointment</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Start (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({...formData, scheduled_start: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}