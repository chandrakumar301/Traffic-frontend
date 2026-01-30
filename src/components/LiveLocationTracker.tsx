import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  areaName?: string | null;
}

interface LiveLocationTrackerProps {
  onLocationUpdate?: (location: Location) => void;
  ws?: WebSocket | null;
  userId?: string;
  allLocations?: Array<any>;
}

const LiveLocationTracker = ({ onLocationUpdate, ws, userId, allLocations = [] }: LiveLocationTrackerProps) => {
  const [status, setStatus] = useState('🔍 Requesting location permission...');
  const [location, setLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const markerRef = React.useRef<L.Marker | null>(null);
  const accuracyCircleRef = React.useRef<L.Circle | null>(null);
  const otherMarkersRef = React.useRef<Map<string, L.Marker>>(new Map());
  const watchIdRef = React.useRef<number | null>(null);

  // Simple in-memory cache for reverse geocoding
  const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const geocodeCache: Map<string, { area: string | null; ts: number }> = (globalThis as any).__geocodeCache || new Map();
  (globalThis as any).__geocodeCache = geocodeCache;

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const key = `${lat.toFixed(4)}|${lon.toFixed(4)}`;
      const cached = geocodeCache.get(key);
      if (cached && Date.now() - cached.ts < GEOCODE_CACHE_TTL) {
        return cached.area;
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Traffic-Control-App/1.0'
        },
      });
      if (!res.ok) {
        geocodeCache.set(key, { area: null, ts: Date.now() });
        return null;
      }
      const data = await res.json();
      const addr = data.address || {};
      const area = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || data.display_name || null;

      geocodeCache.set(key, { area, ts: Date.now() });
      return area;
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  };

  const success = async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    console.log('✅ Location acquired:', { latitude, longitude, accuracy });

    let newLocation: Location = { latitude, longitude, accuracy, areaName: null };
    setLocation(newLocation);
    setLocationEnabled(true);
    setStatus(`✅ Location found (Accuracy: ${Math.round(accuracy)}m)`);

    // Reverse geocoding
    const area = await reverseGeocode(latitude, longitude);
    if (area) {
      newLocation = { ...newLocation, areaName: area };
      setLocation(newLocation);
    }

    if (onLocationUpdate) {
      onLocationUpdate(newLocation);
    }

    // Send location via WebSocket
    if (ws && userId && ws.readyState === 1) {
      try {
        ws.send(
          JSON.stringify({
            type: 'location',
            userId,
            latitude,
            longitude,
            accuracy,
            areaName: newLocation.areaName || null,
          }),
        );
        console.log('📍 Location sent to server');
      } catch (error) {
        console.error('❌ Failed to send location:', error);
      }
    }

    // Update map
    if (map) {
      map.setView([latitude, longitude], 16);

      // Update marker
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude], {
          title: 'Your Location'
        })
          .addTo(map)
          .bindPopup(`📍 You<br/>${newLocation.areaName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}`);
      }

      // Update accuracy circle
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]).setRadius(accuracy);
      } else {
        accuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: 'blue',
          fillColor: '#30b0d0',
          fillOpacity: 0.1,
        }).addTo(map);
      }
    }
  };

  const error = (err: GeolocationPositionError) => {
    const errorMessages: { [key: number]: string } = {
      1: '❌ Permission denied. Please enable location access in browser settings.',
      2: '❌ Position unavailable. Try moving to a location with better signal.',
      3: '❌ Request timed out. Please try again.',
    };
    const message = errorMessages[err.code] || `❌ Error: ${err.message}`;
    console.error('Geolocation error:', message);
    setStatus(message);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('❌ Geolocation not supported');
      return;
    }

    // Initialize map
    if (mapRef.current && !map) {
      const newMap = L.map(mapRef.current).setView([20, 0], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(newMap);
      setMap(newMap);
      console.log('🗺️ Map initialized');
    }

    // Request location
    console.log('📡 Requesting geolocation...');
    navigator.geolocation.getCurrentPosition(
      success,
      error,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      success,
      error,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

  }, [map]);

  // Update markers for other users
  useEffect(() => {
    if (!map) return;

    const currentMarkers = otherMarkersRef.current;
    const seen = new Set<string>();

    allLocations.forEach((entry) => {
      const { userId: uid, userName, location } = entry;
      if (!uid || !location) return;
      if (uid === userId) return; // Skip own marker

      seen.add(uid);

      const lat = location.latitude;
      const lon = location.longitude;

      if (currentMarkers.has(uid)) {
        const m = currentMarkers.get(uid)!;
        m.setLatLng([lat, lon]);
      } else {
        const m = L.marker([lat, lon], {
          icon: L.divIcon({ 
            className: 'custom-marker',
            html: `<div style="padding:6px 8px;border-radius:6px;background:rgba(59,130,246,0.9);color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${userName||'User'}</div>`
          })
        }).addTo(map).bindPopup(`<b>${userName || 'User'}</b><br/>${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
        currentMarkers.set(uid, m);
      }
    });

    // Remove markers for users no longer in list
    Array.from(currentMarkers.keys()).forEach((k) => {
      if (!seen.has(k)) {
        const m = currentMarkers.get(k)!;
        map.removeLayer(m);
        currentMarkers.delete(k);
      }
    });
  }, [allLocations, map, userId]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📍</span>
          <h2 className="text-xl font-bold">Live GPS Location Tracker</h2>
        </div>
        <div className={`text-sm font-semibold ${status.includes('❌') ? 'text-red-300' : 'text-green-300'}`}>
          {status}
        </div>
        {location && (
          <div className="text-xs mt-2 text-cyan-100">
            📌 {location.areaName || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`} (±{Math.round(location.accuracy)}m)
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="flex-1 w-full"
        style={{ height: 'calc(100% - 100px)' }}
      />
    </div>
  );
};

export default LiveLocationTracker;
