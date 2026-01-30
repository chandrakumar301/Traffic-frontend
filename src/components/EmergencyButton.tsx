import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface EmergencyButtonProps {
  onActivate: () => void;
  isActive: boolean;
  countdown: number;
}

export const EmergencyButton = ({ onActivate, isActive, countdown }: EmergencyButtonProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playLadyVoiceAlert = () => {
    try {
      // Stop previous speech
      window.speechSynthesis.cancel();
      
      const text = "Attention! Emergency ambulance is coming. Please clear the traffic immediately.";
      utteranceRef.current = new SpeechSynthesisUtterance(text);
      
      utteranceRef.current.rate = 0.9;
      utteranceRef.current.pitch = 1.8;
      utteranceRef.current.volume = 1.0;
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      console.log(`🔊 Available voices: ${voices.length}`);
      
      if (voices.length > 0) {
        // Try to find female voice
        const femaleVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          return (
            name.includes('female') || 
            name.includes('woman') ||
            name.includes('zira') ||
            name.includes('victoria') ||
            name.includes('samantha') ||
            name.includes('google us english female')
          );
        }) || voices[Math.min(1, voices.length - 1)]; // Fallback to second voice
        
        if (femaleVoice) {
          utteranceRef.current.voice = femaleVoice;
          console.log(`🎤 Using voice: ${femaleVoice.name}`);
        }
      }

      utteranceRef.current.onstart = () => {
        console.log('🔊 Voice alert started');
      };

      utteranceRef.current.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event.error);
      };

      utteranceRef.current.onend = () => {
        console.log('🔊 Voice alert ended');
      };

      window.speechSynthesis.speak(utteranceRef.current);
      console.log('🚨 Playing emergency voice alert');
    } catch (error) {
      console.error("❌ Voice error:", error);
    }
  };

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(`🔊 Voices loaded: ${voices.length}`);
    };
    
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Try loading immediately too
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      console.log('🚨 Emergency activated! Playing voice...');
      
      // Play immediately with a small delay to ensure voices are loaded
      const delay = setTimeout(() => {
        playLadyVoiceAlert();
      }, 100);
      
      // Repeat every 5 seconds
      intervalRef.current = setInterval(() => {
        playLadyVoiceAlert();
      }, 5000);
      
      return () => {
        clearTimeout(delay);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.speechSynthesis.cancel();
      };
    }
  }, [isActive]);

  return (
    <Button
      onClick={onActivate}
      disabled={isActive}
      size="lg"
      className={`text-white font-bold shadow-2xl transition-all text-sm ${
        isActive
          ? 'bg-red-600/50 cursor-not-allowed animate-pulse'
          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105'
      }`}
    >
      <span className="text-xl">🚨</span>
      {isActive ? `Ambulance (${countdown}s)` : 'Emergency'}
    </Button>
  );
};

export default EmergencyButton;
