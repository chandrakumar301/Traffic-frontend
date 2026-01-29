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
  const [status, setStatus] = useState('Waiting for location permission...');
  const [location, setLocation] = useState<Location | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  const markerRef = React.useRef<L.Marker | null>(null);
  const accuracyCircleRef = React.useRef<L.Circle | null>(null);
  const otherMarkersRef = React.useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }

    // Initialize map
    if (mapRef.current && !map) {
      const newMap = L.map(mapRef.current).setView([20, 0], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(newMap);
      setMap(newMap);
    }

    // Get location
    navigator.geolocation.getCurrentPosition(
      success,
      error,
      { enableHighAccuracy: true }
    );

    // Watch position for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      success,
      error,
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Simple in-memory cache for reverse geocoding results to reduce external requests.
  // Key is rounded lat|lon to 4 decimals (~11m precision). TTL defaults to 24h.
  const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const geocodeCache: Map<string, { area: string | null; ts: number }> = (globalThis as any).__geocodeCache || new Map();
  // persist map across HMR reloads in dev
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
          'User-Agent': 'Traffic-Control-App/1.0 (your-email@example.com)'
        },
      });
      if (!res.ok) {
        // store negative cache to avoid repeated failing calls
        geocodeCache.set(key, { area: null, ts: Date.now() });
        return null;
      }
      const data = await res.json();
      const addr = data.address || {};
      const area = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || data.display_name || null;

      geocodeCache.set(key, { area, ts: Date.now() });
      return area;
    } catch (e) {
      return null;
    }
  };

  const success = async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;

    let newLocation: Location = { latitude, longitude, accuracy, areaName: null };
    setLocation(newLocation);
    setStatus(
      `Location found (Accuracy: ${Math.round(accuracy)}m). Sharing location...`
    );

    // Try reverse geocoding (best-effort)
    const area = await reverseGeocode(latitude, longitude);
    if (area) {
      newLocation = { ...newLocation, areaName: area };
      setLocation(newLocation);
    }

    if (onLocationUpdate) {
      onLocationUpdate(newLocation);
    }

    // Send location to server via WebSocket if available
    try {
      if (ws && userId) {
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
      }
    } catch (e) {
      // ignore send errors
    }

    if (map) {
      map.setView([latitude, longitude], 16);

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.setPopupContent(`📍 You\n${newLocation.areaName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}`);
      } else {
        markerRef.current = L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup(`📍 You\n${newLocation.areaName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}`)
          .openPopup();
      }

      // Add or update accuracy circle
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(accuracy);
      } else {
        accuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#93c5fd',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
      }
    }
  };

  const error = () => {
    setStatus('Location access denied. Please turn ON GPS.');
  };

  // Update markers for other users when allLocations prop changes
  useEffect(() => {
    if (!map) return;

    const currentMarkers = otherMarkersRef.current;
    const seen = new Set<string>();

    allLocations.forEach((entry) => {
      const { userId: uid, userName, location } = entry;
      if (!uid || !location) return;
      // skip own marker
      if (uid === userId) return;

      seen.add(uid);

      const lat = location.latitude;
      const lon = location.longitude;

      if (currentMarkers.has(uid)) {
        const m = currentMarkers.get(uid)!;
        m.setLatLng([lat, lon]);
      } else {
        const m = L.marker([lat, lon], {
          icon: L.divIcon({ className: 'bg-white/80 text-sm p-1 rounded shadow', html: `<div style="padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.9);">${userName||'User'}</div>` })
        }).addTo(map).bindPopup(`${userName || 'User'}`);
        currentMarkers.set(uid, m);
      }
    });

    // remove markers for users not in the latest list
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
        <div
          className={`text-sm font-semibold ${
            status.includes('denied')
              ? 'text-red-200'
              : status.includes('found')
              ? 'text-green-200'
              : 'text-cyan-200'
          }`}
        >
          {status}
        </div>
        {location && (
          <div className="text-xs text-cyan-100 mt-2">
            <span>Lat: {location.latitude.toFixed(6)}</span>
            <span className="mx-2">•</span>
            <span>Lon: {location.longitude.toFixed(6)}</span>
            <span className="mx-2">•</span>
            <span>Accuracy: {Math.round(location.accuracy)}m</span>
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
