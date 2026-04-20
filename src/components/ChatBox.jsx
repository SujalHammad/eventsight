import React, { useEffect, useState, useRef } from "react";
import { backend } from "@/lib/api";
import { io } from "socket.io-client";
import { Send, X, MessageSquare } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_BACKEND_BASE_URL?.replace("/api", "") || "http://localhost:8080";

export default function ChatBox({ eventId, sponsorId, organizerId, currentUserRole, onClose, embedded = false, isActive = true, onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socket, setSocket] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true,
    });
    s.on("connect", () => console.log("Socket Connected ✅", s.id));
    s.on("connect_error", (err) => console.log("Socket Error ❌", err));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    async function initChat() {
      if (!eventId || !sponsorId || !organizerId) return;
      setLoading(true);
      try {
        const res = await backend.post(`chat/conversation`, {
          eventId,
          sponsorId,
          organizerId,
        });
        
        const convoId = res.data._id;
        setConversationId(convoId);

        const msgRes = await backend.get(`chat/messages/${convoId}`);
        setMessages(msgRes.data);

        if (socket && convoId) {
          socket.emit("join_room", convoId);
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    initChat();
  }, [eventId, sponsorId, organizerId, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleReceive = (msg) => {
      console.log("New Message Received in Room! 📩", msg);
      setMessages((prev) => [...prev, msg]);
      
      const isMe =
        (currentUserRole === "sponsor" && msg.senderRole === "sponsor") ||
        (currentUserRole === "organizer" && (msg.senderRole === "organizer" || msg.senderRole === "organzier")) ||
        (currentUserRole === "organizer" && msg.senderRole === "organizer");

      if (!isActive && !isMe) {
        // Play notification sound
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
        audio.play().catch(() => {});
        
        toast.success(`New message received`, {
          icon: '💬',
          style: {
            borderRadius: '12px',
            background: '#141416',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        });
        if (onUnreadChange) onUnreadChange(true);
      }
    };
    
    socket.on("receive_message", handleReceive);
    return () => socket.off("receive_message", handleReceive);
  }, [socket, isActive, currentUserRole, onUnreadChange]);

  useEffect(() => {
    if (isActive && onUnreadChange) {
      onUnreadChange(false);
    }
  }, [isActive, onUnreadChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !conversationId || !socket) return;

    socket.emit("send_message", {
      conversationId: conversationId,
      senderId: currentUserRole === "sponsor" ? sponsorId : organizerId,
      senderRole: currentUserRole,
      text,
    });
    setText("");
  };

  return (
    <div className={embedded ? "w-full h-full bg-[#141416] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden" : "fixed bottom-6 right-6 w-80 h-[450px] bg-[#141416] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"}>
      <div className="p-4 bg-[var(--accent)] text-white flex justify-between items-center">
        <div className="font-bold flex items-center gap-2">
          <MessageSquare size={18} />
          {embedded ? "Event Conversation" : "Chat"}
          <span className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`} title={socket?.connected ? 'Connected' : 'Disconnected'}></span>
        </div>
        {!embedded && <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-md transition-colors"><X size={18} /></button>}
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0A0A0B]">
        {loading && <div className="text-center text-sm text-gray-500">Loading chat...</div>}
        {messages.map((m, i) => {
           let isMe = false;
           if (currentUserRole === 'sponsor' && m.senderRole === 'sponsor') isMe = true;
           if (currentUserRole === 'organzier' && m.senderRole === 'organzier') isMe = true;
           if (currentUserRole === 'organizer' && (m.senderRole === 'organizer' || m.senderRole === 'organzier')) isMe = true;

          return (
            <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  isMe ? "bg-[var(--accent)] text-white rounded-tr-sm" : "bg-[#252528] text-white rounded-tl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-[#141416] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-transparent text-white text-sm outline-none px-2"
        />
        <button type="submit" disabled={!text.trim()} className="p-2 bg-[var(--accent)] rounded-xl text-white disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
