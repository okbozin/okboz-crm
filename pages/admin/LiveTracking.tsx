
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Settings, Users, RefreshCw, Map as MapIcon, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
    gm_authFailure_detected?: boolean;
  }
}

const LiveTracking: React.FC = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]); // Keep track of marker instances
  
  // Determine Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // Center of Coimbatore for default view
  const center = { lat: 11.0168, lng: 76.9558 };

  // Staff Locations state
  const [staffLocations, setStaffLocations] = useState<any[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Function to load staff data
  const refreshLocations = () => {
      let allStaff: any[] = [];

      if (isSuperAdmin) {
         // Load from all sources
         try {
            const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
            allStaff = [...adminStaff];
            
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                allStaff = [...allStaff, ...cStaff];
            });
         } catch(e) { console.error("Error loading staff", e); }
      } else {
         const key = `staff_data_${sessionId}`;
         try {
            allStaff = JSON.parse(localStorage.getItem(key) || '[]');
         } catch(e) { console.error("Error loading staff", e); }
      }

      // Filter for those with location data
      const activeStaff = allStaff.filter((s: any) => s.currentLocation && s.currentLocation.lat).map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          lat: s.currentLocation.lat,
          lng: s.currentLocation.lng,
          lastUpdate: 'Live'
      }));
      
      // If no active staff with location, generate MOCKS for demo purposes
      if (activeStaff.length === 0) {
          setIsDemoMode(true);
          const MOCK_LOCATIONS = [
              { id: 'm1', name: 'Rajesh (Driver)', role: 'Driver', lat: 11.0168 + 0.01, lng: 76.9558 + 0.01, lastUpdate: 'Just now' },
              { id: 'm2', name: 'Suresh (Sales)', role: 'Sales Exec', lat: 11.0168 - 0.01, lng: 76.9558 - 0.005, lastUpdate: '2m ago' },
              { id: 'm3', name: 'Priya (Field)', role: 'Field Officer', lat: 11.0168 + 0.005, lng: 76.9558 - 0.015, lastUpdate: '5m ago' },
          ];
          setStaffLocations(MOCK_LOCATIONS);
      } else {
          setIsDemoMode(false);
          setStaffLocations(activeStaff);
      }
  };

  useEffect(() => {
    refreshLocations();
    // 1. Check global failure flag
    if (window.gm_authFailure_detected) {
      setMapError("Google Cloud Billing is disabled. Maps cannot load.");
      return;
    }

    // 2. Handle Missing API Key - Explicitly check LocalStorage only
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings.");
      return;
    }

    // 3. Global Auth Failure Handler
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Google Cloud Billing is disabled. Maps cannot load.");
      if (originalAuthFailure) originalAuthFailure();
    };

    // 4. Validate Existing Script
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
       const src = script.getAttribute('src') || '';
       if (!src.includes(`key=${apiKey}`)) {
          script.remove();
          if (window.google) {
             window.location.reload();
             return;
          }
       }
    }

    // 5. Check if script is already fully loaded
    if (window.google && window.google.maps) {
      setIsMapReady(true);
      return;
    }

    // 6. Load Script if needed
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => setMapError("Failed to load Google Maps script (Network error).");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google && window.google.maps) setIsMapReady(true);
    }
  }, []);

  // Initialize Map & Markers
  useEffect(() => {
    if (mapError || !isMapReady || !mapRef.current || !window.google) return;

    try {
      let map = mapInstance;
      if (!map) {
          map = new window.google.maps.Map(mapRef.current, {
            center: center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          setMapInstance(map);
      }

      // Clear existing markers
      markers.forEach(m => m.setMap(null));
      const newMarkers: any[] = [];

      // Add Markers
      staffLocations.forEach(emp => {
        const marker = new window.google.maps.Marker({
          position: { lat: emp.lat, lng: emp.lng },
          map: map,
          title: emp.name,
          label: {
             text: emp.name.charAt(0),
             color: 'white',
             fontSize: '12px',
             fontWeight: 'bold'
          },
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 5px;">
                <h3 style="margin:0; font-weight:bold; font-size: 14px;">${emp.name}</h3>
                <p style="margin:2px 0; font-size:12px; color:gray;">${emp.role}</p>
                <p style="margin:0; font-size:10px; color: green;">● ${emp.lastUpdate}</p>
              </div>
            `
        });

        marker.addListener("click", () => {
            infoWindow.open(map, marker);
        });
        
        newMarkers.push(marker);
      });
      
      setMarkers(newMarkers);

    } catch (e: any) {
      console.error(e);
      if (e.name === 'BillingNotEnabledMapError' || e.message?.includes('Billing')) {
         setMapError("Google Cloud Billing is disabled.");
      } else {
         setMapError("Error initializing map interface.");
      }
    }
  }, [isMapReady, mapError, staffLocations]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Live Staff Tracking</h2>
           <p className="text-gray-500">Real-time location of your field force</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={refreshLocations}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
                <RefreshCw className="w-4 h-4 text-gray-500" /> Refresh
            </button>
            <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full shadow-sm border ${staffLocations.length > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${staffLocations.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                {staffLocations.length > 0 ? `${staffLocations.length} Active` : 'No active devices'}
            </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative shadow-sm">
         {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 p-6 text-center z-10">
              <div className="flex flex-col items-center gap-3 max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <div className="p-3 bg-red-50 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Map Unavailable</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                    {mapError}<br/>
                    <span className="text-xs mt-2 block opacity-75">
                        Google Maps requires a billing account to be linked in the Cloud Console, even for the free tier.
                    </span>
                </p>
                <div className="flex gap-2 w-full">
                    <a 
                      href="https://console.cloud.google.com/project/_/billing/enable"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 mt-2 text-sm font-medium flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Enable Billing
                    </a>
                    <button 
                      onClick={() => navigate('/admin/settings')} 
                      className="flex-1 mt-2 text-sm font-medium flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                </div>
              </div>
            </div>
         ) : (
            <>
               {!isMapReady && (
                 <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="flex flex-col items-center gap-2">
                       <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                       <span className="text-gray-500 font-medium">Connecting to satellites...</span>
                    </div>
                 </div>
               )}
               <div ref={mapRef} className="w-full h-full" />
               
               {/* Overlay Legend */}
               {isMapReady && staffLocations.length > 0 && (
                 <div className="absolute bottom-6 left-6 bg-white p-3 rounded-lg shadow-lg max-w-xs border border-gray-100 hidden md:block z-10">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                        Active Staff
                        {isDemoMode && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 rounded">DEMO MODE</span>}
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                       {staffLocations.map((emp, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                                mapInstance?.panTo({lat: emp.lat, lng: emp.lng});
                                mapInstance?.setZoom(15);
                            }}
                            className="flex items-center justify-between text-sm gap-4 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="font-medium text-gray-700">{emp.name}</span>
                             </div>
                             <span className="text-[10px] text-gray-400">{emp.lastUpdate}</span>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </>
         )}
      </div>
    </div>
  );
};

export default LiveTracking;
