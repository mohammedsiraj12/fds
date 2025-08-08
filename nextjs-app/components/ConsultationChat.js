import React, { useEffect, useState } from "react";
import {
  sendConsultationMessage,
  getConsultationMessages,
} from "../lib/database";

export default function ConsultationChat({ consultationId, userId, userRole }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await getConsultationMessages(consultationId);
      if (!error) setMessages(data);
    }
    fetchMessages();
    // Optionally poll for new messages every 5s
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [consultationId]);

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);
    await sendConsultationMessage(consultationId, userId, userRole, input);
    setInput("");
    const { data } = await getConsultationMessages(consultationId);
    setMessages(data);
    setLoading(false);
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h3>Consultation Chat</h3>
      <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 4 }}>
            <b>{msg.sender_role === "doctor" ? "Doctor" : "Patient"}:</b>{" "}
            {msg.message}
            <span style={{ color: "#888", fontSize: 10, marginLeft: 8 }}>
              {new Date(msg.sent_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1 }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
