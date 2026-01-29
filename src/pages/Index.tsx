import { useState, useEffect } from "react";
import DashboardContainer from "@/components/DashboardContainer";
import { MessageBar } from "@/components/MessageBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmergencyButton } from "@/components/EmergencyButton";
import ResizablePanel from "@/components/ResizablePanel";
import AIAssist from '@/components/AIAssist';

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'emergency' | 'normal';
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState(30);
  const [userName, setUserName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [allLocations, setAllLocations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      const websocket = new WebSocket('ws://localhost:3001');

      websocket.onopen = () => {
        console.log("WebSocket connected!");
        websocket.send(JSON.stringify({
          type: 'connect',
          userName: user.name
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        switch (data.type) {
          case 'connected':
            setUser(prev => ({ ...prev!, id: data.userId }));
            setMessages(data.messages);
            break;
          case 'userList':
            // data.users = [{ userId, userName }, ...]
            setConnectedUsers((data.users || []).map((u: { userId: string; userName: string }) => ({ id: u.userId, name: u.userName })));
            break;
          case 'locations':
            // data.locations = [{ userId, userName, location: { latitude, longitude, accuracy, timestamp } }, ...]
            setAllLocations(data.locations || []);
            break;
          case 'newMessage':
            setMessages(prev => [...prev, data.message]);
            break;
          case 'emergency':
            setMessages(prev => [...prev, data.message]);
            setIsEmergencyActive(true);
            setEmergencyCountdown(30);
            // Trigger voice announcement for all users
            playEmergencyVoice();
            break;
          case 'trafficUpdate':
            // Handle traffic update if needed
            break;
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected!");
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    }
  }, [user]);

  useEffect(() => {
    if (isEmergencyActive && emergencyCountdown > 0) {
      const timer = setInterval(() => {
        setEmergencyCountdown(prev => prev - 1);
      }, 1000);

      if (emergencyCountdown === 0) {
        setIsEmergencyActive(false);
      }

      return () => clearInterval(timer);
    }
  }, [isEmergencyActive, emergencyCountdown]);

  // Play voice repeatedly while emergency is active (for other users)
  useEffect(() => {
    if (isEmergencyActive) {
      const voiceInterval = setInterval(() => {
        playEmergencyVoice();
      }, 5000);
      
      return () => clearInterval(voiceInterval);
    }
  }, [isEmergencyActive]);

  const handleConnect = () => {
    if (userName.trim()) {
      setUser({ id: '', name: userName.trim() });
    }
  };

  const handleSendMessage = (content: string) => {
    if (ws && user && content.trim()) {
      const messagePayload = {
        type: 'message',
        userId: user.id,
        content: content.trim()
      };
      console.log("Sending message:", messagePayload);
      ws.send(JSON.stringify(messagePayload));
      setNewMessage("");

      // Add local message immediately for better UX
      const newMsg = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        content: content.trim(),
        timestamp: new Date(),
        type: 'normal' as const
      };
      setMessages(prev => [...prev, newMsg]);
    }
  };

  const handleEmergency = () => {
    if (ws && user) {
      ws.send(JSON.stringify({
        type: 'emergency',
        userId: user.id
      }));
    }
  };

  const handleCancelEmergency = () => {
    setIsEmergencyActive(false);
    setEmergencyCountdown(0);
    window.speechSynthesis.cancel();
  };

  const playEmergencyVoice = () => {
    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(
        "Attention! Emergency ambulance is coming. Please clear the traffic immediately."
      );
      
      utterance.rate = 0.9;
      utterance.pitch = 1.8;
      utterance.volume = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        const femaleVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman') || 
          v.name.includes('Zira') ||
          v.name.includes('Victoria') ||
          v.name.includes('Samantha')
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        } else if (voices.length > 1) {
          utterance.voice = voices[1];
        }
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Voice error:", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 shadow-xl border-2 border-primary/10">
          <h2 className="text-2xl font-bold mb-4 text-center text-primary">Join Traffic Communication</h2>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            Enter your name to join the traffic communication system
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                className="text-lg"
                autoFocus
              />
              {userName.trim() === "" && (
                <p className="text-xs text-muted-foreground">
                  Please enter your name to continue
                </p>
              )}
            </div>
            <Button
              onClick={handleConnect}
              className="w-full text-lg py-6"
              disabled={userName.trim() === ""}
            >
              Connect to Chat
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Chat Open Button - when chat is closed */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 left-6 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
          title="Open Chat"
        >
          <span className="text-2xl">💬</span>
        </button>
      )}

      {/* Left side - Messages Panel */}
      {isChatOpen && (
      <ResizablePanel initialWidth={420} initialHeight={600} initialX={12} initialY={12}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <div>
                <div className="font-bold text-lg">Traffic Chat</div>
                <div className="text-sm text-indigo-100">Connected as: {user.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EmergencyButton
                onActivate={handleEmergency}
                isActive={isEmergencyActive}
                countdown={emergencyCountdown}
              />
              <button
                onClick={() => setIsChatOpen(false)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Connected users list */}
          <div className="text-xs font-semibold text-indigo-200 mb-2">Online Users ({connectedUsers.length})</div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {connectedUsers.length === 0 ? (
              <div className="text-xs text-indigo-200">No other users</div>
            ) : (
              connectedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-1 rounded-full whitespace-nowrap">
                  <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-900">
                    {u.name ? u.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs">{u.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-800">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-slate-400">No messages yet. Start a conversation!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isYou = msg.userId === user.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs ${isYou ? 'order-2' : 'order-1'}`}>
                    {/* Sender name - only show for others */}
                    {!isYou && (
                      <div className="text-xs text-slate-400 mb-1 px-3">
                        {msg.userName}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        msg.type === 'emergency'
                          ? 'bg-red-600 text-white rounded-tl-none'
                          : isYou
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-700 text-slate-100 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {/* Time */}
                    <div className={`text-xs text-slate-500 mt-1 ${isYou ? 'text-right' : 'text-left'} px-3`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>

                    {/* Emergency indicator */}
                    {msg.type === 'emergency' && (
                      <div className="text-xs text-red-300 mt-1 px-3">
                        🚨 Emergency Alert
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(newMessage)}
                className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <Button 
                onClick={() => handleSendMessage(newMessage)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </ResizablePanel>
      )}

      {/* Right side - Dashboard Container (Traffic + Live Location) */}
      <div className="flex-1 relative overflow-auto">
        <DashboardContainer ws={ws} user={user} allLocations={allLocations} />
      </div>

      {/* Emergency Alert Modal */}
      {isEmergencyActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-8 max-w-md shadow-2xl border-2 border-red-400 animate-pulse">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🚨</div>
              <h1 className="text-4xl font-bold mb-2">EMERGENCY ALERT</h1>
              <p className="text-xl mb-6">Ambulance is coming!</p>
              
              <div className="bg-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-sm mb-2">Activated by:</p>
                <p className="text-2xl font-bold">{user.name}</p>
              </div>

              <div className="text-lg mb-6">
                <p className="font-semibold">All traffic halted</p>
                <p className="text-red-100">Emergency vehicle has priority</p>
              </div>

              <div className="text-5xl font-bold text-red-300 mb-6 tabular-nums">
                {emergencyCountdown}s
              </div>

              <button
                onClick={handleCancelEmergency}
                className="w-full bg-white text-red-600 font-bold py-3 rounded-lg hover:bg-red-50 transition-all text-lg"
              >
                Cancel Emergency
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI assistant floating icon/panel */}
      <AIAssist globalMessages={messages} />
    </div>
  );
}

export default Index;
