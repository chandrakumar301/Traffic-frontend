import React, { useState } from 'react';
import TrafficDashboard from '@/components/TrafficDashboard';
import LiveLocationTracker from '@/components/LiveLocationTracker';
import UserBoard from '@/components/UserBoard';
import { Button } from '@/components/ui/button';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  areaName?: string | null;
}

interface DashboardContainerProps {
  ws?: WebSocket | null;
  user?: { id: string; name: string } | null;
  allLocations?: any[];
}

const DashboardContainer = ({ ws, user, allLocations = [] }: DashboardContainerProps) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'location' | 'userboard'>('dashboard');
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  const handleLocationUpdate = (location: Location) => {
    setUserLocation(location);
    console.log('User location updated:', location);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950">
      {/* View Switcher */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-3 flex gap-2">
        <Button
          onClick={() => setActiveView('dashboard')}
          className={`flex items-center gap-2 ${
            activeView === 'dashboard'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
          } text-white font-semibold transition-all`}
        >
          <span className="text-lg">🚦</span>
          Traffic Dashboard
        </Button>
        <Button
          onClick={() => setActiveView('location')}
          className={`flex items-center gap-2 ${
            activeView === 'location'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
          } text-white font-semibold transition-all`}
        >
          <span className="text-lg">📍</span>
          Live Location
        </Button>
        <Button
          onClick={() => setActiveView('userboard')}
          className={`flex items-center gap-2 ${
            activeView === 'userboard'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
          } text-white font-semibold transition-all`}
        >
          <span className="text-lg">🚗</span>
          User Board
        </Button>
        {userLocation && (
          <div className="ml-auto flex items-center gap-3 px-4 py-2 bg-slate-700/50 rounded-lg">
            <span className="text-green-400">●</span>
            <div className="text-sm text-slate-300">
              {userLocation.areaName ? (
                <span>{userLocation.areaName}</span>
              ) : (
                <span>Lat: {userLocation.latitude.toFixed(4)}, Lon: {userLocation.longitude.toFixed(4)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <TrafficDashboard userDirection="north" userSpeed={45} />
        )}
        {activeView === 'location' && (
          <LiveLocationTracker onLocationUpdate={handleLocationUpdate} ws={ws} userId={user?.id} allLocations={allLocations} />
        )}
        {activeView === 'userboard' && (
          <UserBoard />
        )}
      </div>
    </div>
  );
};

export default DashboardContainer;
