import React, { useEffect, useState } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface TrafficData {
  distance: number;
  direction: 'North' | 'South' | 'East' | 'West';
  assignedSpeed: string;
  inRange: boolean;
  areaName?: string | null;
}

const UserBoard = () => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [status, setStatus] = useState('Waiting for GPS permission...');
  const [areaName, setAreaName] = useState<string | null>(null);

  // Traffic signal location (can be customized via props later)
  const SIGNAL_LAT = 17.3850;
  const SIGNAL_LON = 78.4867;
  const RANGE_LIMIT = 1.5; // km

  // Haversine formula to calculate distance between two coordinates
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // Determine direction relative to signal
  const getDirection = (userLat: number, userLon: number) => {
    const latDiff = userLat - SIGNAL_LAT;
    const lonDiff = userLon - SIGNAL_LON;

    const angle = Math.atan2(latDiff, lonDiff) * (180 / Math.PI);

    if (angle >= -45 && angle < 45) {
      return 'East' as const;
    } else if (angle >= 45 && angle < 135) {
      return 'North' as const;
    } else if (angle >= 135 || angle < -135) {
      return 'West' as const;
    } else {
      return 'South' as const;
    }
  };

  // Assign speed based on direction
  const assignSpeed = (direction: string) => {
    if (direction === 'North' || direction === 'South') {
      return '35 km/h';
    } else {
      return '25 km/h';
    }
  };

  // Reverse geocode to get area name
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Traffic-Control-App/1.0'
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};
      return addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || data.display_name || null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('GPS Active ✔');

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const newLocation: UserLocation = { latitude, longitude, accuracy };
        setLocation(newLocation);

        // Calculate traffic data
        const distance = getDistance(latitude, longitude, SIGNAL_LAT, SIGNAL_LON);
        const direction = getDirection(latitude, longitude);
        const assignedSpeed = assignSpeed(direction);
        const inRange = distance <= RANGE_LIMIT;

        setTrafficData({
          distance,
          direction,
          assignedSpeed,
          inRange,
        });

        // Try reverse geocode
        const area = await reverseGeocode(latitude, longitude);
        setAreaName(area);
      },
      (error) => {
        setStatus('Location access denied. Please turn ON GPS.');
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 border-b border-slate-700">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <span>🚗</span> Smart Traffic Control
        </h1>
        <p className="text-indigo-100 text-sm">Real GPS-Based Traffic Management</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 space-y-6">
        {/* GPS Status Card */}
        <div className={`rounded-2xl p-6 border-2 ${
          status.includes('denied')
            ? 'border-red-500 bg-red-500/10'
            : 'border-green-500 bg-green-500/10'
        }`}>
          <h2 className="text-xl font-bold text-white mb-2">📡 GPS Status</h2>
          <p className={`text-lg font-semibold ${
            status.includes('denied') ? 'text-red-300' : 'text-green-300'
          }`}>
            {status}
          </p>
        </div>

        {/* Location Details Card */}
        {location && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📍</span> Your Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Latitude</p>
                <p className="text-2xl font-bold text-cyan-400">{location.latitude.toFixed(6)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Longitude</p>
                <p className="text-2xl font-bold text-cyan-400">{location.longitude.toFixed(6)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Accuracy</p>
                <p className="text-2xl font-bold text-blue-400">{Math.round(location.accuracy)} m</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Area</p>
                <p className="text-xl font-bold text-purple-400">{areaName || 'Loading...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Traffic Control Info Card */}
        {trafficData && (
          <div className={`rounded-2xl p-8 border-2 ${
            trafficData.inRange
              ? 'border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
              : 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-red-500/20'
          }`}>
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <span>🚦</span> Traffic Control Data
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Distance */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-2">Distance to Signal</p>
                <p className="text-4xl font-bold text-cyan-400">{trafficData.distance.toFixed(2)}</p>
                <p className="text-slate-300 text-sm mt-1">km</p>
              </div>

              {/* Direction */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm mb-2">Your Direction</p>
                <p className="text-4xl font-bold text-indigo-400">{trafficData.direction}</p>
                <p className="text-slate-300 text-sm mt-1">
                  {trafficData.direction === 'North' && '⬆️'}
                  {trafficData.direction === 'South' && '⬇️'}
                  {trafficData.direction === 'East' && '➡️'}
                  {trafficData.direction === 'West' && '⬅️'}
                </p>
              </div>
            </div>

            {/* Assigned Speed */}
            <div className={`rounded-xl p-8 border-2 text-center ${
              trafficData.inRange
                ? 'border-green-400 bg-green-500/20'
                : 'border-orange-400 bg-orange-500/20'
            }`}>
              <p className="text-slate-300 text-lg mb-3">Assigned Speed Limit</p>
              <p className={`text-6xl font-bold ${
                trafficData.inRange ? 'text-green-300' : 'text-orange-300'
              }`}>
                {trafficData.assignedSpeed}
              </p>
              <p className={`text-sm mt-3 ${
                trafficData.inRange
                  ? 'text-green-200'
                  : 'text-orange-200'
              }`}>
                {trafficData.inRange 
                  ? '✅ Within range - Follow the speed limit' 
                  : `⚠️ Outside ${RANGE_LIMIT} km range - Speed limit not applicable`}
              </p>
            </div>

            {/* Range Indicator */}
            <div className="mt-6 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Range Status</p>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    trafficData.inRange ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min((trafficData.distance / RANGE_LIMIT) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {trafficData.inRange ? 'In Range' : `Out of Range (${RANGE_LIMIT} km limit)`}
              </p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!trafficData && location && (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-slate-400">Loading traffic control data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBoard;
