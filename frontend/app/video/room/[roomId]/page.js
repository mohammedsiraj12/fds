"use client";
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VideoRoom from '../../../components/video/VideoRoom';
import { useRouter } from 'next/navigation';

function VideoRoomContent({ params }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const roomId = params.roomId;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Room Link</h1>
          <p className="text-gray-400 mb-6">This video room link is invalid or expired.</p>
          <button
            onClick={() => router.push('/video')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
          >
            Back to Video Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoRoom
      roomId={roomId}
      token={token}
      onEnd={() => router.push('/video')}
    />
  );
}

export default function VideoRoomPage({ params }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video room...</p>
        </div>
      </div>
    }>
      <VideoRoomContent params={params} />
    </Suspense>
  );
}