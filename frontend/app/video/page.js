"use client";
import { useRequireAuth } from '../../hooks/useAuth';
import VideoRoomList from '../../components/video/VideoRoomList';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function VideoPage() {
  const { user, loading } = useRequireAuth('/login');

  if (loading) {
    return <LoadingSpinner text="Loading video rooms..." />;
  }

  if (!user) {
    return null; // Will redirect via useRequireAuth
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VideoRoomList />
      </div>
    </div>
  );
}