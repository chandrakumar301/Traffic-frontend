import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface EmergencyButtonProps {
  onActivate: () => void;
  isActive: boolean;
  countdown: number;
}

export const EmergencyButton = ({ onActivate, isActive, countdown }: EmergencyButtonProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playLadyVoiceAlert = () => {
    try {
      // Stop any previous speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(
        "Attention! Emergency ambulance is coming. Please clear the traffic immediately."
      );
      
      utterance.rate = 0.9;
      utterance.pitch = 1.8;
      utterance.volume = 1.0;
      
      // Wait for voices to load if not already available
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        // Look for female voice first
        const femaleVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman') || 
          v.name.includes('Zira') ||
          v.name.includes('Victoria') ||
          v.name.includes('Samantha') ||
          v.lang.includes('en-US') && v.name.includes('Google')
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        } else if (voices.length > 1) {
          // Use second voice as fallback (often female)
          utterance.voice = voices[1];
        }
      }
      
      console.log("Playing voice alert...", utterance.voice?.name);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Voice error:", error);
    }
  };

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      // Play immediately
      setTimeout(() => playLadyVoiceAlert(), 100);
      
      // Repeat every 5 seconds
      intervalRef.current = setInterval(() => {
        playLadyVoiceAlert();
      }, 5000);
      
      return () => {
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
          ? 'bg-red-600/50 cursor-not-allowed'
          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105'
      }`}
    >
      <span className="text-xl">🚨</span>
      {isActive ? `Ambulance (${countdown}s)` : 'Emergency'}
    </Button>
  );
};

export default EmergencyButton;
