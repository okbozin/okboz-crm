
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Maximize, Crosshair, Loader2, AlertTriangle, Building, Trash2, Settings, Building2, Pencil, X, QrCode, Download } from 'lucide-react';
import { Branch } from '../types';
import { useNavigate } from 'react-router-dom';
import Autocomplete from './Autocomplete'; // Import the new Autocomplete component

const BranchForm: React.FC = () => {
  const navigate = useNavigate();
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('100');
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'branches_data' : `branches_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // --- Corporate Selection State (Super Admin Only) ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('admin'); // Default to admin/head office

  useEffect(() => {
    if (isSuperAdmin) {
       const savedCorps = localStorage.getItem('corporate_accounts');
       if (savedCorps) {
          try { setCorporates(JSON.parse(savedCorps)); } catch(e) {}
       }
       setSelectedOwner('admin');
    } else {
       // For franchise users, the owner is always themselves
       setSelectedOwner(localStorage.getItem('app_session_id') || '');
    }
  }, [isSuperAdmin]);

  // Branch List State with No Mock Data
  const [branches, setBranches] = useState<Branch[]>(() => {
    const key = getSessionKey();
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    
    return [];
  });
  
  // Save to namespaced localStorage whenever branches state changes
  useEffect(() => {
    const key = getSessionKey();
    localStorage.setItem(key, JSON.stringify(branches));
  }, [branches]);
  
  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [location, setLocation] = useState<google.maps.LatLngLiteral>({ lat: 28.6139, lng: 77.2090 }); // Default: New Delhi
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Callback from Autocomplete component when a place is selected
  const handleNewPlaceSelected = (newPos: google.maps.LatLngLiteral) => {
    setLocation(newPos);
    if (mapInstance && markerInstance) {
      mapInstance.panTo(newPos);
      markerInstance.setPosition(newPos);
      mapInstance.setZoom(17);
    }
    // Also fetch address for the selected place
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          console.warn("Geocoding failed for new place:", status);
        }
      });
    }
  };


  // Load Google Maps Script
  useEffect(() => {
    // 1. Check global failure flag first
    if (window.gm_authFailure_detected) {
      setMapError("Map API Error: Please check required APIs in Google Cloud.");
      return;
    }

    // 2. Handle Missing API Key - Explicitly check LocalStorage only
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }

    // 3. Define global auth failure handler
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Load Error: API Key invalid or APIs not enabled (Maps JS, Places, Geocoding).");
      if (originalAuthFailure) originalAuthFailure();
    };

    // 4. Validate Existing Script
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
       const src = script.getAttribute('src') || '';
       // CRITICAL FIX: If script exists but key doesn't match the current one in storage,
       // force a reload to clear the old google object and load the new one.
       if (!src.includes(`key=${apiKey}`)) {
          script.remove();
          if (window.google) {
             // We can't safely un-load the Google Maps object, so we must reload the page.
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

    // 6. Inject Script if not present
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsMapReady(true);
      };
      
      script.onerror = () => {
        setMapError("Network error: Failed to load Google Maps script.");
      };

      document.head.appendChild(script);
    } else {
        // Script exists and is correct, just wait for load if not ready
        script.addEventListener('load', () => setIsMapReady(true));
    }

    return () => {
      // Cleanup listeners if needed, though usually harmless to leave
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapError) return;

    if (isMapReady && mapRef.current && !mapInstance && window.google) {
      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        const marker = new window.google.maps.Marker({
          position: location,
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        marker.addListener("dragend", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setLocation(newPos);
          map.panTo(newPos);
        });

        map.addListener("click", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(newPos);
          setLocation(newPos);
          map.panTo(newPos);
        });

        setMapInstance(map);
        setMarkerInstance(marker);

      } catch (e) {
        console.error("Error initializing map:", e);
        setMapError("Error initializing map interface. Check Settings.");
      }
    }
  }, [isMapReady, mapError, location]);

  const handleGetAddress = () => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder || mapError) {
      alert("Map services are currently unavailable. Please enter address manually.");
      return;
    }
    
    setLoadingAddress(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location }, (results: any, status: any) => {
        setLoadingAddress(false);
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          console.warn("Geocoding failed:", status);
          alert("Could not fetch address. Please enable 'Geocoding API' in Google Cloud Console.");
        }
      });
    } catch (e) {
      setLoadingAddress(false);
      alert("Error accessing Geocoding service.");
    }
  };

  const handleCurrentLocation = () => {
    if (mapError) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos);
          if (mapInstance && markerInstance) {
            mapInstance.setCenter(pos);
            markerInstance.setPosition(pos);
            mapInstance.setZoom(17);
          }
        },
        () => {
          alert("Error: The Geolocation service failed or is disabled.");
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingId(branch.id);
    setBranchName(branch.name);
    setAddress(branch.address);
    setRadius(branch.radius.toString());
    
    const newLoc = { lat: branch.lat, lng: branch.lng };
    setLocation(newLoc);
    
    // Switch dropdown back to 'admin' (Head Office) so the user doesn't get confused about which list they are editing
    // The current view shows the user's list, so editing implies modifying the user's data.
    if(isSuperAdmin) setSelectedOwner('admin');

    if (mapInstance && markerInstance) {
        mapInstance.panTo(newLoc);
        markerInstance.setPosition(newLoc);
        mapInstance.setZoom(17);
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setBranchName('');
    setAddress('');
    setRadius('100');
    // We keep the map location as is or could reset it, but keeping it is fine.
  };

  const handleSaveBranch = () => {
    if (!branchName.trim() || !address.trim()) {
      alert("Please enter both branch name and address.");
      return;
    }

    const currentSession = localStorage.getItem('app_session_id') || 'admin';

    // Check Limit for Franchise Users (Only if adding new)
    if (!isSuperAdmin && !editingId && branches.length >= 2) {
        alert("Franchise Plan Limit: You can only create a maximum of 2 branches. Please contact Super Admin to upgrade.");
        return;
    }

    if (editingId) {
        // UPDATE EXISTING BRANCH
        const updatedBranches = branches.map(b => {
            if (b.id === editingId) {
                return {
                    ...b,
                    name: branchName,
                    address: address,
                    radius: parseInt(radius) || 100,
                    lat: location.lat,
                    lng: location.lng
                };
            }
            return b;
        });
        
        setBranches(updatedBranches);
        // Note: UseEffect handles the persistence to localStorage for the current list.
        
        handleCancelEdit();
        alert("Branch updated successfully!");

    } else {
        // CREATE NEW BRANCH
        const newBranch: Branch = {
          id: `B${Date.now()}`,
          name: branchName,
          address: address,
          radius: parseInt(radius) || 100,
          lat: location.lat,
          lng: location.lng
        };

        // Handle Saving Logic
        if (selectedOwner === currentSession) {
            // Standard save to current session's branch list (via state -> useEffect)
            setBranches([...branches, newBranch]);
            alert("Branch added successfully!");
        } else {
            // Admin saving to a Franchise account (Cross-save)
            const targetKey = `branches_data_${selectedOwner}`;
            try {
                const existingStr = localStorage.getItem(targetKey);
                const existingBranches = existingStr ? JSON.parse(existingStr) : [];
                const updated = [...existingBranches, newBranch];
                localStorage.setItem(targetKey, JSON.stringify(updated));
                
                const corpName = corporates.find(c => c.email === selectedOwner)?.companyName || selectedOwner;
                alert(`Branch added to ${corpName} successfully!`);
            } catch(e) {
                console.error(e);
                alert("Error saving to corporate account.");
            }
        }

        setBranchName('');
        setAddress('');
        setRadius('100');
    }
  };

  const handleDeleteBranch = (id: string) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      setBranches(branches.filter(b => b.id !== id));
      if (editingId === id) handleCancelEdit();
    }
  };

  // Generate QR Code URL based on branch name
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`OK BOZ - ${branchName || 'BRANCH'}`)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-medium text-gray-800">{editingId ? 'Edit Branch' : 'Create New Branch'}</h2>
            {!isSuperAdmin && !editingId && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${branches.length >= 2 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {branches.length} / 2 Branches Used
                </span>
            )}
        </div>
        
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                {/* Corporate Selection (Super Admin Only) - Hidden when editing to prevent confusion */}
                {isSuperAdmin && !editingId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Corporate</label>
                        <div className="relative">
                            <select 
                                value={selectedOwner} 
                                onChange={(e) => setSelectedOwner(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white appearance-none"
                            >
                                <option value="admin">Head Office (My Branches)</option>
                                {corporates.map(corp => (
                                    <option key={corp.id} value={corp.email}>{corp.companyName} ({corp.city})</option>
                                ))}
                            </select>
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        </div>
                        {selectedOwner !== 'admin' && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3" /> Branch will be added to the selected Franchise account.
                            </p>
                        )}
                    </div>
                )}

                {/* Branch Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                    <input 
                    type="text" 
                    placeholder="Enter Branch Name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                {/* Branch Address */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
                    <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={mapError ? "Enter address manually" : "Select location on map or enter manually"}
                        className={`flex-1 border border-gray-300 rounded-md px-4 py-3 transition-colors ${mapError ? 'bg-white' : 'bg-gray-50 focus:bg-white'}`}
                    />
                    <button 
                        onClick={handleGetAddress}
                        disabled={loadingAddress || !isMapReady || !!mapError}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
                    >
                        {loadingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                        Get Address
                    </button>
                    </div>
                    {mapError && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Map services unavailable. Please enter address manually.
                    </p>
                    )}
                </div>
            </div>

            {/* QR Code Section */}
            <div className="md:col-span-1">
                {branchName ? (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center h-full justify-center">
                        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-emerald-600" /> Attendance QR
                        </h4>
                        <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-inner mb-3">
                            <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain" />
                        </div>
                        <p className="text-xs text-gray-500 mb-3 px-2">
                            Scan to mark attendance at <br/><span className="font-semibold text-gray-800">{branchName}</span>
                        </p>
                        <button 
                            type="button"
                            onClick={() => window.open(qrCodeUrl, '_blank')}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:underline border border-blue-100 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            <Download className="w-3 h-3" /> Print QR
                        </button>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 h-full flex flex-col items-center justify-center text-gray-400 text-center min-h-[200px]">
                        <QrCode className="w-10 h-10 mb-2 opacity-30" />
                        <p className="text-xs font-medium">Enter Branch Name<br/>to generate QR Code</p>
                    </div>
                )}
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (in metre)</label>
            <input 
              type="number" 
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Pin Location on Map</label>
            
            {/* Autocomplete Search - Moved OUTSIDE overflow-hidden container to fix clipping */}
            {!mapError && isMapReady && (
              <div className="relative z-20"> 
                <Autocomplete setNewPlace={handleNewPlaceSelected} />
              </div>
            )}
            
            {/* Map Container */}
            <div className={`border border-gray-300 rounded-lg overflow-hidden shadow-sm ${mapError ? 'bg-gray-50' : ''} relative h-96 w-full`}>
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 p-6 text-center z-10">
                  <div className="flex flex-col items-center gap-3 max-w-sm">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                    <h3 className="font-medium text-gray-900">Map Loading Failed</h3>
                    <p className="text-sm text-gray-600">{mapError}</p>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded text-xs text-amber-800 mt-2 text-left w-full">
                       <strong>Troubleshooting "ApiNotActivated":</strong>
                       <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Enable "Maps JavaScript API"</li>
                          <li>Enable "Places API"</li>
                          <li>Enable "Geocoding API"</li>
                       </ul>
                    </div>
                    <button 
                      onClick={() => navigate('/admin/settings')} 
                      className="mt-2 text-xs flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-3 h-3" /> Configure in Settings
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!isMapReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span>Loading Google Maps...</span>
                      </div>
                    </div>
                  )}
                  <div ref={mapRef} className="w-full h-full" />
                  
                  {isMapReady && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                        <button 
                          onClick={handleCurrentLocation}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Use Current Location"
                        >
                          <Crosshair className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => mapInstance?.setZoom(mapInstance.getZoom() + 1)}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Zoom In"
                        >
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
              {editingId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
              )}
              <button 
                onClick={handleSaveBranch}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md font-medium shadow-md transition-all flex items-center gap-2"
              >
                {editingId ? 'Update Branch' : 'Save Branch'}
              </button>
          </div>
        </div>
      </div>

      {/* Branch List Section - Always shows CURRENT USER'S branches */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Existing Branches {isSuperAdmin ? '(Head Office)' : ''}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(branch => (
                <div key={branch.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Building className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">{branch.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3 flex items-start gap-2 leading-relaxed">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                            {branch.address}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium border border-gray-200">
                            Geofence Radius: {branch.radius}m
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleEditBranch(branch)}
                            className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit Branch"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => handleDeleteBranch(branch.id)}
                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete Branch"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
            
            {branches.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    No branches added yet. Create one above.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
