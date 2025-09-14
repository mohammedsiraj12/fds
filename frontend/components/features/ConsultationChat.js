"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  sendConsultationMessage,
  getConsultationMessages,
} from "../../lib/database";
import { formatRelativeTime } from "../../utils/formatters";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { PaperAirplaneIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function ConsultationChat({ consultationId, userId, userRole, consultationStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const { data, error } = await getConsultationMessages(consultationId);
        if (!error && data) {
          setMessages(data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setFetchingMessages(false);
      }
    }

    if (consultationId) {
      fetchMessages();
      // Poll for new messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [consultationId]);

  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    
    setLoading(true);
    try {
      await sendConsultationMessage(consultationId, userId, userRole, input);
      setInput("");
      
      // Fetch updated messages
      const { data } = await getConsultationMessages(consultationId);
      if (data) setMessages(data);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'default';
    }
  };

  const isDisabled = consultationStatus === 'completed' || consultationStatus === 'cancelled';

  return (
    <Card>
      <Card.Header>
        <div className="flex justify-between items-center">
          <Card.Title>Consultation Chat</Card.Title>
          {consultationStatus && (
            <Badge variant={getStatusColor(consultationStatus)}>
              {consultationStatus.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        {/* Messages Container */}
        <div className="border rounded-lg bg-gray-50 p-4 h-96 overflow-y-auto">
          {fetchingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-500">
              <UserCircleIcon className="w-12 h-12 mb-2" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.sender_role === userRole;
                const isDoctor = msg.sender_role === "doctor";
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : isDoctor
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-sm">
                          {isDoctor ? "👨‍⚕️ Doctor" : "👤 Patient"}
                        </span>
                        {msg.sent_at && (
                          <span className={`text-xs ml-2 ${
                            isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatRelativeTime(msg.sent_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {!isDisabled && (
          <form onSubmit={handleSend} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              loading={loading}
              className="self-end"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </Button>
          </form>
        )}

        {isDisabled && (
          <div className="text-center text-gray-500 text-sm p-4 bg-gray-50 rounded-md">
            This consultation has been {consultationStatus}. No new messages can be sent.
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
