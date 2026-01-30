import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
}

interface AIAssistProps {
  globalMessages?: any[];
}

const AIAssist = ({ globalMessages }: AIAssistProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      from: 'assistant',
      text: '👋 Hi! I\'m your AI Traffic Assistant. Ask me about traffic conditions, congestion, routes, or any traffic-related questions!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      from: 'user',
      text: text.trim()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      console.log('🤖 Sending to AI assistant:', text);
      
      const response = await fetch('http://localhost:3001/api/assistant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          prompt: text.trim(),
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ AI response received:', data);
      
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        from: 'assistant',
        text: data.reply || 'I could not generate a response. Please try again.'
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('❌ AI Assistant error:', error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        from: 'assistant',
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to connect to AI assistant. Make sure the backend server is running on port 3001.'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xl flex items-center justify-center hover:shadow-3xl transition-all hover:scale-110"
        title="AI Traffic Assistant"
      >
        🤖
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] rounded-xl shadow-2xl overflow-hidden bg-white border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <span className="font-bold">AI Traffic Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/20 rounded p-1 transition-all"
              title="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                    msg.from === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg rounded-bl-none px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  sendMessage(input);
                }
              }}
              placeholder="Ask about traffic..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm disabled:bg-slate-100"
              disabled={loading}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? '...' : 'Send'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssist;
