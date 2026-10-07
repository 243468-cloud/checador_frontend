"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons in Next.js
const customIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerProps {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
}

function LocationMarker({ lat, lng, onLocationChange }: { lat: number, lng: number, onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={[lat, lng]} icon={customIcon} />;
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  initialRadius,
  onLocationChange,
  onRadiusChange
}: LocationPickerProps) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radius, setRadius] = useState(initialRadius);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    onLocationChange(newLat, newLng);
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 50;
    setRadius(val);
    onRadiusChange(val);
  };

  if (!mounted) return <div className="h-64 bg-gray-100 flex items-center justify-center">Cargando mapa...</div>;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-300">
        <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker lat={lat} lng={lng} onLocationChange={handleLocationChange} />
          <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: '#e11d48', fillColor: '#e11d48', fillOpacity: 0.2 }} />
        </MapContainer>
      </div>
      
      <div className="flex flex-col gap-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <p className="text-sm text-gray-600 font-medium">Instrucciones: Haz clic en el mapa para mover el pin de la sucursal.</p>
        <label className="text-sm font-semibold mt-2">Radio permitido para hacer Check-in (metros):</label>
        <div className="flex items-center gap-4">
          <input 
            type="range" 
            min="10" 
            max="1000" 
            step="10" 
            value={radius} 
            onChange={handleRadiusChange}
            className="w-full accent-rose-600"
          />
          <span className="font-bold w-16 text-right">{radius}m</span>
        </div>
      </div>
    </div>
  );
}
