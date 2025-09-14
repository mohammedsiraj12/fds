
"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/apiClient';
import toast from 'react-hot-toast';
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function VideoRoom({ roomId, token, onEnd }) {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const websocketRef = useRef(null);
  const chatEndRef = useRef(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    initializeVideoRoom();
    return () => {
      cleanup();
    };
  }, [roomId, token]);

  const initializeVideoRoom = async () => {
    try {
      // Get room details
      const roomData = await apiClient.getVideoRoom(roomId, token);
      setRoom(roomData);

      // Initialize media
      await setupMedia();

      // Setup WebSocket connection
      setupWebSocket();

      // Get existing chat messages
      const messages = await apiClient.getRoomMessages(roomId);
      setChatMessages(messages.messages || []);

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize video room:', error);
      toast.error('Failed to join video room');
      setLoading(false);
    }
  };

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Setup peer connection
      setupPeerConnection(stream);
      setConnectionStatus('Media ready');
    } catch (error) {
      console.error('Failed to setup media:', error);
      toast.error('Failed to access camera/microphone');
      setConnectionStatus('Media access denied');
    }
  };

  const setupPeerConnection = (stream) => {
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = peerConnection;

    // Add local stream
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('Connected');
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      setConnectionStatus(state);
      setIsConnected(state === 'connected');
      
      if (state === 'failed' || state === 'disconnected') {
        toast.error('Connection lost. Trying to reconnect...');
        // Implement reconnection logic here
      }
    };
  };

  const setupWebSocket = () => {
    const wsUrl = `ws://localhost:8002/video/rooms/${roomId}/ws?token=${token}&user_id=${user.id}&user_role=${user.role}`;
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('WebSocket connected');
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'user_joined':
          toast.success(`${data.user_role} joined the call`);
          break;
          
        case 'user_left':
          toast.info('User left the call');
          setRemoteStream(null);
          break;
          
        case 'offer':
          await handleOffer(data.offer);
          break;
          
        case 'answer':
          await handleAnswer(data.answer);
          break;
          
        case 'ice-candidate':
          await handleIceCandidate(data.candidate);
          break;
          
        case 'chat':
          setChatMessages(prev => [...prev, {
            sender_email: data.from_email || 'Unknown',
            message: data.message,
            timestamp: data.timestamp
          }]);
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('Disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error');
    };
  };

  const handleOffer = async (offer) => {
    try {
      const peerConnection = peerConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      websocketRef.current.send(JSON.stringify({
        type: 'answer',
        answer: answer
      }));
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      const peerConnection = peerConnectionRef.current;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      const peerConnection = peerConnectionRef.current;
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  };

  const startCall = async () => {
    try {
      const peerConnection = peerConnectionRef.current;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      websocketRef.current.send(JSON.stringify({
        type: 'offer',
        offer: offer
      }));
      
      // Update room status to active
      await apiClient.updateRoomStatus(roomId, { status: 'active' });
      toast.success('Call started');
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call');
    }
  };

  const endCall = async () => {
    try {
      // Update room status
      await apiClient.updateRoomStatus(roomId, { 
        status: 'ended',
        actual_duration: Math.round((Date.now() - new Date(room?.room?.created_at).getTime()) / 60000)
      });
      
      cleanup();
      if (onEnd) onEnd();
      toast.success('Call ended');
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: 'chat',
        message: newMessage.trim()
      }));
      setNewMessage('');
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining video room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Video Consultation</h1>
          <p className="text-sm text-gray-400">{connectionStatus}</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowChat(!showChat)}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
            Chat
          </Button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-screen object-cover"
            style={{ display: remoteStream ? 'block' : 'none' }}
          />
          
          {/* Waiting message */}
          {!remoteStream && (
            <div className="flex items-center justify-center h-screen bg-gray-800">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <VideoCameraIcon className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-lg">Waiting for other participant...</p>
                <p className="text-sm text-gray-400 mt-2">
                  {room?.is_host ? 'Share the room link to invite participants' : 'The host will start the call soon'}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <VideoCameraSlashIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-4 bg-gray-800 bg-opacity-90 p-4 rounded-lg">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoEnabled ? 'bg-gray-600' : 'bg-red-600'}`}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon className="w-6 h-6" />
                ) : (
                  <VideoCameraSlashIcon className="w-6 h-6" />
                )}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${isAudioEnabled ? 'bg-gray-600' : 'bg-red-600'}`}
              >
                <MicrophoneIcon className="w-6 h-6" />
              </button>
              
              {!isConnected && room?.is_host && (
                <Button onClick={startCall} className="px-6">
                  Start Call
                </Button>
              )}
              
              <button
                onClick={endCall}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700"
              >
                <PhoneXMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-blue-400 mb-1">
                    {msg.sender_email}
                  </div>
                  <div className="bg-gray-700 p-2 rounded">
                    {msg.message}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <Button onClick={sendMessage} size="sm">
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}