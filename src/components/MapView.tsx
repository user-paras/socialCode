import { useEffect, useRef } from 'react';
import { Issue } from '../lib/supabase';

interface MapViewProps {
  issues: Issue[];
  userLocation: [number, number] | null;
  onMapDoubleClick?: (latlng: [number, number]) => void;
}

export default function MapView({ issues, userLocation, onMapDoubleClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current).setView(userLocation || [28.6139, 77.209], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (userLocation) {
      L.marker(userLocation, {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .addTo(map)
        .bindPopup('<strong>Your Location</strong>')
        .openPopup();
    }

    // Add double-click listener for custom location picking
    map.on('dblclick', (e: any) => {
      if (onMapDoubleClick) {
        onMapDoubleClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLocation, onMapDoubleClick]); // Added onMapDoubleClick dependency

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    for (const id in markersRef.current) {
      if (!issues.find((issue) => issue.id === id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    }

    issues.forEach((issue) => {
      if (!markersRef.current[issue.id]) {
        const marker = L.marker([issue.latitude, issue.longitude]).addTo(map);
        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #111;">${issue.title}</h4>
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;"><strong>Category:</strong> ${issue.category}</p>
            ${issue.description ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${issue.description}</p>` : ''}
            ${issue.image_url ? `<img src="${issue.image_url}" alt="${issue.title}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; margin-top: 8px;">` : ''}
          </div>
        `);
        markersRef.current[issue.id] = marker;
      }
    });
  }, [issues]);

  return <div ref={mapRef} className="w-full h-[calc(100vh-280px)] min-h-[500px]" />;
}
