import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface TrafficData {
  signal: 'red' | 'yellow' | 'green';
  avgSpeed: number;
  vehicleCount: number;
  maxSpeed: number;
}

interface DashboardProps {
  userDirection?: 'north' | 'south' | 'east' | 'west';
  userSpeed?: number;
}

const TrafficDashboard = ({ userDirection = 'north', userSpeed = 0 }: DashboardProps) => {
  const [traffic, setTraffic] = useState<Record<string, TrafficData>>({
    north: { signal: 'green', avgSpeed: 45, vehicleCount: 12, maxSpeed: 60 },
    south: { signal: 'red', avgSpeed: 0, vehicleCount: 8, maxSpeed: 60 },
    east: { signal: 'yellow', avgSpeed: 25, vehicleCount: 15, maxSpeed: 50 },
    west: { signal: 'green', avgSpeed: 50, vehicleCount: 10, maxSpeed: 50 }
  });

  // Simulate traffic changes
  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic(prev => {
        const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
        const updated = { ...prev };
        
        directions.forEach(dir => {
          const current = updated[dir];
          const signals: Array<'red' | 'yellow' | 'green'> = ['red', 'yellow', 'green'];
          const randomSignal = signals[Math.floor(Math.random() * signals.length)];
          
          let speed = current.avgSpeed;
          if (randomSignal === 'red') speed = 0;
          else if (randomSignal === 'yellow') speed = Math.random() * 30 + 15;
          else speed = Math.random() * (current.maxSpeed - 35) + 35;
          
          updated[dir] = {
            signal: randomSignal,
            avgSpeed: Math.round(speed),
            vehicleCount: Math.floor(Math.random() * 20) + 5,
            maxSpeed: current.maxSpeed
          };
        });
        
        return updated;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-400';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getSignalLabel = (signal: string) => {
    switch (signal) {
      case 'red':
        return '🛑 Stop';
      case 'yellow':
        return '⚠️ Slow';
      case 'green':
        return '✅ Go';
      default:
        return 'Unknown';
    }
  };

  const getSpeedColor = (speed: number, maxSpeed: number) => {
    const percentage = (speed / maxSpeed) * 100;
    if (percentage === 0) return 'text-red-600';
    if (percentage < 40) return 'text-orange-600';
    if (percentage < 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const DirectionCard = ({ 
    direction, 
    label, 
    icon 
  }: { 
    direction: 'north' | 'south' | 'east' | 'west'; 
    label: string; 
    icon: string;
  }) => {
    const data = traffic[direction];
    const isUserDirection = userDirection === direction;
    const speedPercentage = (data.avgSpeed / data.maxSpeed) * 100;

    return (
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-500 transform cursor-pointer group ${
          isUserDirection
            ? 'ring-4 ring-blue-400 scale-105 shadow-2xl'
            : 'hover:scale-105 shadow-lg'
        }`}
      >
        {/* Background Gradient based on signal */}
        <div className={`absolute inset-0 ${
          data.signal === 'red' ? 'bg-gradient-to-br from-red-600 to-red-700' :
          data.signal === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
          'bg-gradient-to-br from-green-500 to-emerald-600'
        } opacity-80`}></div>

        {/* Content */}
        <div className="relative p-6 text-white z-10">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl drop-shadow-lg">{icon}</span>
              <div>
                <h3 className="text-xl font-bold drop-shadow">{label}</h3>
                {isUserDirection && (
                  <span className="text-xs bg-blue-400 px-2 py-1 rounded-full font-semibold">📍 You</span>
                )}
              </div>
            </div>
            
            {/* Signal indicator */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              data.signal === 'red' ? 'bg-white/20' :
              data.signal === 'yellow' ? 'bg-white/20' :
              'bg-white/20'
            } backdrop-blur-sm border-2 border-white/40 animate-pulse`}>
              <span className="text-2xl">●</span>
            </div>
          </div>

          {/* Speed Display */}
          <div className="mb-4">
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-bold drop-shadow-lg">{data.avgSpeed}</span>
              <span className="text-lg font-semibold mb-1">km/h</span>
            </div>
            <div className="text-sm font-semibold opacity-90">{
              data.avgSpeed === 0 ? '🛑 Stopped' : 
              data.avgSpeed < 20 ? '🐌 Slow' :
              data.avgSpeed < 40 ? '⚠️ Moderate' :
              '✅ Flowing'
            }</div>
          </div>

          {/* Speed Bar */}
          <div className="mb-4">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm border border-white/30">
              <div
                className="h-full bg-white rounded-full transition-all duration-500 drop-shadow-lg"
                style={{ width: `${speedPercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-white/80 mt-1 text-right">{Math.round(speedPercentage)}% capacity</div>
          </div>

          {/* Vehicle Count */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 mb-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">🚗 Vehicles</span>
              <span className="text-2xl font-bold">{data.vehicleCount}</span>
            </div>
          </div>

          {/* Status */}
          <div className="text-xs text-white/80 font-semibold uppercase tracking-wider">
            {data.signal === 'red' ? '🛑 STOP' :
             data.signal === 'yellow' ? '⚠️ CAUTION' :
             '✅ PROCEED'}
          </div>

          {/* User Speed */}
          {isUserDirection && userSpeed !== undefined && (
            <div className="mt-4 bg-blue-600 backdrop-blur-sm rounded-lg p-3 border border-blue-300">
              <div className="text-xs text-blue-100 font-semibold mb-1">YOUR SPEED</div>
              <div className="text-3xl font-bold">{userSpeed} km/h</div>
            </div>
          )}
        </div>

        {/* Animated Border */}
        <div className={`absolute inset-0 rounded-2xl border-2 ${
          data.signal === 'red' ? 'border-red-300' :
          data.signal === 'yellow' ? 'border-yellow-300' :
          'border-green-300'
        } opacity-50 group-hover:opacity-100 transition-opacity`}></div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">🚦</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Traffic Control Dashboard
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Real-time traffic monitoring & intelligent routing</p>
        </div>

        {/* Traffic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DirectionCard direction="north" label="North" icon="⬆️" />
          <DirectionCard direction="south" label="South" icon="⬇️" />
          <DirectionCard direction="east" label="East" icon="➡️" />
          <DirectionCard direction="west" label="West" icon="⬅️" />
        </div>

        {/* Map Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>🗺️</span> Real-time Traffic Flow Map
          </h2>
          
          {/* Intersection Map */}
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-md drop-shadow-2xl">
              {/* Roads */}
              <defs>
                <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#1f293c', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: '#0f172a', stopOpacity: 0.3 }} />
                </linearGradient>
              </defs>
              
              <rect x="0" y="150" width="400" height="100" fill="url(#roadGradient)" stroke="#4b5563" strokeWidth="2" />
              <rect x="150" y="0" width="100" height="400" fill="url(#roadGradient)" stroke="#4b5563" strokeWidth="2" />

              {/* Road markings */}
              <line x1="0" y1="200" x2="150" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="250" y1="200" x2="400" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="200" y1="0" x2="200" y2="150" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="200" y1="250" x2="200" y2="400" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />

              {/* Center Intersection */}
              <rect x="150" y="150" width="100" height="100" fill="#1e293b" stroke="#4b5563" strokeWidth="2" />
              <rect x="160" y="160" width="80" height="80" fill="#0f172a" />

              {/* Traffic Lights with glow */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* North */}
              <circle cx="200" cy="120" r="18" fill={traffic.north.signal === 'red' ? '#dc2626' : traffic.north.signal === 'yellow' ? '#eab308' : '#22c55e'} filter="url(#glow)" />
              <text x="180" y="155" fontSize="14" fontWeight="bold" fill="white">N</text>

              {/* South */}
              <circle cx="200" cy="280" r="18" fill={traffic.south.signal === 'red' ? '#dc2626' : traffic.south.signal === 'yellow' ? '#eab308' : '#22c55e'} filter="url(#glow)" />
              <text x="180" y="320" fontSize="14" fontWeight="bold" fill="white">S</text>

              {/* East */}
              <circle cx="280" cy="200" r="18" fill={traffic.east.signal === 'red' ? '#dc2626' : traffic.east.signal === 'yellow' ? '#eab308' : '#22c55e'} filter="url(#glow)" />
              <text x="300" y="210" fontSize="14" fontWeight="bold" fill="white">E</text>

              {/* West */}
              <circle cx="120" cy="200" r="18" fill={traffic.west.signal === 'red' ? '#dc2626' : traffic.west.signal === 'yellow' ? '#eab308' : '#22c55e'} filter="url(#glow)" />
              <text x="80" y="210" fontSize="14" fontWeight="bold" fill="white">W</text>

              {/* Vehicle flow arrows with animation */}
              <defs>
                <marker id="arrowgreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
                </marker>
                <marker id="arrowyellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#eab308" />
                </marker>
                <marker id="arrowred" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#dc2626" />
                </marker>
              </defs>

              {/* Flow visualization */}
              {traffic.north.signal === 'green' && (
                <line x1="200" y1="150" x2="200" y2="80" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowgreen)" opacity="0.8" />
              )}
              {traffic.south.signal === 'green' && (
                <line x1="200" y1="250" x2="200" y2="320" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowgreen)" opacity="0.8" />
              )}
              {traffic.east.signal === 'green' && (
                <line x1="250" y1="200" x2="320" y2="200" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowgreen)" opacity="0.8" />
              )}
              {traffic.west.signal === 'green' && (
                <line x1="150" y1="200" x2="80" y2="200" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowgreen)" opacity="0.8" />
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-600/50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
              <span className="text-slate-300 font-semibold">Go - Traffic Flowing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"></div>
              <span className="text-slate-300 font-semibold">Caution - Slow Down</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
              <span className="text-slate-300 font-semibold">Stop - Traffic Halted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficDashboard;
