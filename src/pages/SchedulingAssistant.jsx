import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, CalendarHeart } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";

export default function SchedulingAssistant() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const existing = base44.agents.listConversations({ agent_name: "scheduling_assistant" });
    if (existing.length > 0) {
      setConversationId(existing[0].id);
      setMessages(existing[0].messages || []);
    } else {
      setCreating(true);
      const convo = base44.agents.createConversation({
        agent_name: "scheduling_assistant",
        metadata: { name: "Scheduling Chat", description: "Schedule prayer calls" },
      });
      setConversationId(convo.id);
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !conversationId) return;
    const text = input.trim();
    setInput("");
    const convo = base44.agents.getConversation(conversationId);
    await base44.agents.addMessage(convo, { role: "user", content: text });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#EAF2EE] flex items-center justify-center">
          <CalendarHeart className="w-4 h-4 text-[#3D6E64]" />
        </div>
        <div>
          <h1 className="font-serif text-lg text-[#2B2620]">Scheduling Assistant</h1>
          <p className="text-xs text-[#8A8375]">Helps coordinate prayer calls with available prayer warriors</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {creating && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#3D6E64] animate-spin" />
          </div>
        )}
        {!creating && messages.length === 0 && (
          <div className="text-center py-12 text-sm text-[#8A8375]">
            Hi! I can help you schedule a prayer call. Tell me which prayer request you'd like to follow up on, and I'll find available prayer warriors.
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
      </div>

      <div className="flex gap-2 pt-3 border-t border-[#EFE8DA]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about scheduling a prayer call..."
          className="flex-1"
        />
        <Button onClick={send} disabled={!input.trim() || !conversationId} className="rounded-full bg-[#3D6E64] hover:bg-[#2F5850] px-4">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}