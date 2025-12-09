
import React, { useState, useEffect } from 'react';
import { 
  Car, MapPin, User, Phone, MessageCircle, Mail, 
  Settings, Navigation, Copy, Edit2, Plus, Trash2, AlertTriangle, Loader2, ArrowRightLeft, ArrowRight
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';

interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
}

interface PricingRules {
  // Local
  localBaseFare: number;
  localBaseKm: number;
  localPerKmRate: number;
  localWaitingRate: number;
  // Rental
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  // Outstation
  outstationMinKmPerDay: number;
  outstationBaseRate: number;
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200,
  localBaseKm: 5,
  localPerKmRate: 20,
  localWaitingRate: 2,
  rentalExtraKmRate: 15,
  rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300,
  outstationBaseRate: 0,
  outstationExtraKmRate: 13,
  outstationDriverAllowance: 400,
  outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300,
  localBaseKm: 5,
  localPerKmRate: 25,
  localWaitingRate: 3,
  rentalExtraKmRate: 18,
  rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300,
  outstationBaseRate: 0,
  outstationExtraKmRate: 17,
  outstationDriverAllowance: 500,
  outstationNightAllowance: 400 
};

const Transport: React.FC = () => {
  const [tripType, setTripType] = useState<TripType>('Local');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan'); // For Settings Toggle
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Coordinate States for Distance Calculation
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null); // For Local
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null); // For Outstation

  // Determine Session Context for Namespaced Data
  const getSessionKey = (baseKey: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Map API Error: Check required APIs (Maps JS, Places).");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key missing. Add in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Error: Billing not enabled.");
      if (originalAuthFailure) originalAuthFailure();
    };

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => setMapError("Failed to load Google Maps.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google && window.google.maps) setIsMapReady(true);
    }
  }, []);

  // Load Pricing Rules
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const key = getSessionKey('transport_pricing_rules_v2'); // New key for version 2 structure
    const saved = localStorage.getItem(key);
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        Sedan: DEFAULT_PRICING_SEDAN,
        SUV: DEFAULT_PRICING_SUV
    };
  });

  // Load Rental Packages
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const key = getSessionKey('transport_rental_packages_v2'); // New key
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return DEFAULT_RENTAL_PACKAGES;
  });

  // Persist Settings
  useEffect(() => {
    localStorage.setItem(getSessionKey('transport_pricing_rules_v2'), JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem(getSessionKey('transport_rental_packages_v2'), JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  // Customer Details
  const [customer, setCustomer] = useState({ name: '', phone: '', pickup: '' });
  
  // Local Logic State
  const [localDetails, setLocalDetails] = useState({ drop: '', estKm: '', waitingMins: '' });

  // Rental Logic State
  const [rentalDetails, setRentalDetails] = useState({ packageId: rentalPackages[0]?.id || '' });

  // Sync rental package selection
  useEffect(() => {
      if (!rentalPackages.find(p => p.id === rentalDetails.packageId)) {
          setRentalDetails(prev => ({ ...prev, packageId: rentalPackages[0]?.id || '' }));
      }
  }, [rentalPackages]);

  // Outstation Logic State
  const [outstationDetails, setOutstationDetails] = useState({ destination: '', days: '1', estTotalKm: '', nights: '0' });

  // Add Package State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Result State
  const [estimate, setEstimate] = useState({
    base: 0,
    extraKmCost: 0,
    waitingCost: 0,
    driverCost: 0,
    nightAllowanceCost: 0,
    total: 0,
    chargeableKm: 0,
    details: ''
  });

  const [generatedMessage, setGeneratedMessage] = useState('');

  // --- Auto Distance Calculation Effect ---
  useEffect(() => {
    if (!isMapReady || !window.google || !pickupCoords) return;

    const calculateDistance = (destination: google.maps.LatLngLiteral, isRoundTripCalculation: boolean, isOutstationState: boolean) => {
        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
            {
                origins: [pickupCoords],
                destinations: [destination],
                travelMode: window.google.maps.TravelMode.DRIVING,
                unitSystem: window.google.maps.UnitSystem.METRIC,
            },
            (response: any, status: any) => {
                if (status === "OK" && response.rows[0].elements[0].status === "OK") {
                    const distanceInMeters = response.rows[0].elements[0].distance.value;
                    let distanceInKm = distanceInMeters / 1000;
                    
                    if (isRoundTripCalculation) distanceInKm = distanceInKm * 2; 

                    const formattedDist = distanceInKm.toFixed(1);

                    if (isOutstationState) {
                        setOutstationDetails(prev => ({ ...prev, estTotalKm: formattedDist }));
                    } else {
                        setLocalDetails(prev => ({ ...prev, estKm: formattedDist }));
                    }
                }
            }
        );
    };

    if (tripType === 'Local' && dropCoords) {
        calculateDistance(dropCoords, false, false);
    } else if (tripType === 'Outstation' && destCoords) {
        const isRoundTrip = outstationSubType === 'RoundTrip';
        calculateDistance(destCoords, isRoundTrip, true); 
    }

  }, [pickupCoords, dropCoords, destCoords, isMapReady, tripType, outstationSubType]);


  // Calculation Effect
  useEffect(() => {
    calculateEstimate();
  }, [tripType, outstationSubType, vehicleType, localDetails, rentalDetails, outstationDetails, pricing, rentalPackages]);

  useEffect(() => {
    generateMessage();
  }, [estimate, customer, vehicleType]);

  const calculateEstimate = () => {
    let base = 0, extraKmCost = 0, waitingCost = 0, driverCost = 0, nightAllowanceCost = 0, total = 0, details = '';
    let chargeableKm = 0;

    // Get pricing based on selected vehicle type
    const currentRules = pricing[vehicleType];

    if (tripType === 'Local') {
        const kms = parseFloat(localDetails.estKm) || 0;
        const waitMins = parseFloat(localDetails.waitingMins) || 0;
        
        base = currentRules.localBaseFare; 
        
        if (kms > currentRules.localBaseKm) {
            extraKmCost = (kms - currentRules.localBaseKm) * currentRules.localPerKmRate;
        }
        
        waitingCost = waitMins * currentRules.localWaitingRate;
        total = base + extraKmCost + waitingCost;
        details = `Base (${currentRules.localBaseKm}km): ₹${base.toFixed(2)} + Extra: ₹${extraKmCost.toFixed(2)} + Wait: ₹${waitingCost.toFixed(2)}`;

    } else if (tripType === 'Rental') {
        const pkg = rentalPackages.find(p => p.id === rentalDetails.packageId) || rentalPackages[0];
        if (pkg) {
            base = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
            total = base; 
            details = `Package: ${pkg.name}`;
        }

    } else if (tripType === 'Outstation') {
        const days = parseFloat(outstationDetails.days) || 1;
        const totalKm = parseFloat(outstationDetails.estTotalKm) || 0;
        
        driverCost = currentRules.outstationDriverAllowance * days;
        const nights = outstationSubType === 'RoundTrip' ? (parseFloat(outstationDetails.nights) || 0) : 0;
        nightAllowanceCost = currentRules.outstationNightAllowance * nights;

        if (outstationSubType === 'RoundTrip') {
            const minTotalKm = currentRules.outstationMinKmPerDay * days;
            chargeableKm = Math.max(totalKm, minTotalKm);
            
            base = chargeableKm * currentRules.outstationExtraKmRate;
            extraKmCost = 0; // All Km cost is in 'base' variable for this mode

            total = base + driverCost + nightAllowanceCost;
            details = `Min ${minTotalKm}km. Charged ${chargeableKm}km @ ₹${currentRules.outstationExtraKmRate}/km.`;

        } else {
            base = currentRules.outstationBaseRate * days; 
            const minCommittedKm = currentRules.outstationMinKmPerDay * days;
            
            if (totalKm > minCommittedKm) {
                extraKmCost = (totalKm - minCommittedKm) * currentRules.outstationExtraKmRate;
            }
            total = base + extraKmCost + driverCost; 
            details = `Base: ₹${base.toFixed(2)} + Extra Km: ₹${extraKmCost.toFixed(2)}`;
        }
    }

    // Keep 2 decimal precision
    setEstimate({ 
        base: parseFloat(base.toFixed(2)), 
        extraKmCost: parseFloat(extraKmCost.toFixed(2)), 
        waitingCost: parseFloat(waitingCost.toFixed(2)), 
        driverCost: parseFloat(driverCost.toFixed(2)), 
        nightAllowanceCost: parseFloat(nightAllowanceCost.toFixed(2)), 
        total: parseFloat(total.toFixed(2)), 
        chargeableKm, 
        details 
    });
  };

  const generateMessage = () => {
    const greeting = `Hello ${customer.name || 'Customer'},`;
    const currentRules = pricing[vehicleType];
    let body = '';

    if (tripType === 'Local') {
        body = `
🚖 *Local Trip Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${customer.pickup}
📍 Drop: ${localDetails.drop}
🛣 Distance: ~${localDetails.estKm} km
⏳ Waiting Time: ${localDetails.waitingMins} mins

💰 *Total Estimate: ₹${estimate.total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}*
(Includes Base Fare ₹${currentRules.localBaseFare}, Extra Km Charges & Waiting Fees)`;
    } else if (tripType === 'Rental') {
        const pkg = rentalPackages.find(p => p.id === rentalDetails.packageId);
        body = `
🚖 *Rental Package Estimate*
🚘 Vehicle: ${vehicleType}
📦 Package: ${pkg?.name}
📍 Pickup: ${customer.pickup}

💰 *Package Price: ₹${estimate.total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}*
(Extra charges apply for additional Km/Hrs)`;
    } else if (tripType === 'Outstation') {
        body = `
🚖 *Outstation Trip Estimate (${outstationSubType === 'OneWay' ? 'One Way' : 'Round Trip'})*
🚘 Vehicle: ${vehicleType}
🌍 Destination: ${outstationDetails.destination}
📅 Duration: ${outstationDetails.days} Days
${outstationSubType === 'RoundTrip' ? `🌙 Night Stays: ${outstationDetails.nights}` : ''}
🛣 Est. Total Distance: ${outstationDetails.estTotalKm} km

💰 *Total Estimate: ₹${estimate.total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}*
📝 Breakdown:
${outstationSubType === 'RoundTrip' 
  ? `- Rate: ₹${currentRules.outstationExtraKmRate}/km
- Base Fare (Covers ${estimate.chargeableKm} km): ₹${estimate.base.toFixed(2)}` 
  : `- Min Km / Day: ${currentRules.outstationMinKmPerDay} km
- Base Fare: ₹${estimate.base.toFixed(2)}
- Extra Km Charge: ₹${estimate.extraKmCost.toFixed(2)}`
}
- Driver Allowance: ₹${estimate.driverCost.toFixed(2)}
${outstationSubType === 'RoundTrip' ? `- Night Allowance: ₹${estimate.nightAllowanceCost.toFixed(2)}` : ''}

*Toll and state permit will be extra.*`;
    }

    const footer = `\n\nBook now with OK BOZ Transport! 🚕`;
    setGeneratedMessage(`${greeting}${body}${footer}`);
  };

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.priceSedan) return;
    const pkg: RentalPackage = {
      id: `pkg-${Date.now()}`,
      name: newPackage.name,
      hours: parseFloat(newPackage.hours) || 0,
      km: parseFloat(newPackage.km) || 0,
      priceSedan: parseFloat(newPackage.priceSedan) || 0,
      priceSuv: parseFloat(newPackage.priceSuv) || 0,
    };
    setRentalPackages([...rentalPackages, pkg]);
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
      if (rentalDetails.packageId === id) {
        setRentalDetails(prev => ({ ...prev, packageId: '' }));
      }
    }
  };

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing(prev => ({
      ...prev,
      [settingsVehicleType]: {
        ...prev[settingsVehicleType],
        [name]: parseFloat(value) || 0
      }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Car className="w-8 h-8 text-emerald-600" /> Transport Enquiry
          </h2>
          <p className="text-gray-500">Calculate fares for Local, Rental & Outstation trips</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
        </button>
      </div>

      {/* Error or Loading for Maps */}
      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {mapError}
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
             
             {/* Vehicle Type Toggle for Settings */}
             <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button 
                   onClick={() => setSettingsVehicleType('Sedan')}
                   className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                   Sedan
                </button>
                <button 
                   onClick={() => setSettingsVehicleType('SUV')}
                   className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                   SUV
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Local Settings */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Local Rules ({settingsVehicleType})</h4>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Base Fare (₹)</label>
                <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Base Km Included</label>
                <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label>
                <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Waiting Charge (₹/min)</label>
                <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
            </div>

            {/* Outstation Settings */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Outstation Rules ({settingsVehicleType})</h4>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Min Km / Day</label>
                <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Per Km Rate (₹/km)</label>
                <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Base Rate (One Way Only)</label>
                <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" placeholder="Not used for Round Trip" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Driver Allowance (₹/day)</label>
                <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Driver Night Allowance (₹/night)</label>
                <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
            </div>

            {/* Rental Settings */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Rental Rules ({settingsVehicleType})</h4>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Extra Hr Rate (₹/hr)</label>
                <input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label>
                <input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
              </div>
              <div className="pt-4">
                 <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 space-y-6">
            {/* Customer Info Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" /> Customer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                        <input 
                            type="text" 
                            value={customer.name}
                            onChange={e => setCustomer({...customer, name: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Client Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                        <input 
                            type="tel" 
                            value={customer.phone}
                            onChange={e => setCustomer({...customer, phone: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="+91..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                        {!isMapReady ? (
                           <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps...
                           </div>
                        ) : (
                           <Autocomplete 
                             placeholder="Search Google Maps for Pickup"
                             onAddressSelect={(addr) => setCustomer(prev => ({ ...prev, pickup: addr }))}
                             setNewPlace={(place) => setPickupCoords(place)}
                             defaultValue={customer.pickup}
                           />
                        )}
                    </div>
                </div>
            </div>

            {/* Trip Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    {['Local', 'Rental', 'Outstation'].map(type => (
                        <button
                            key={type}
                            onClick={() => setTripType(type as TripType)}
                            className={`flex-1 py-3 text-sm font-bold transition-colors ${tripType === type ? 'bg-white text-emerald-600 border-t-2 border-t-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Vehicle Type Selection - NOW AVAILABLE FOR ALL TABS */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Vehicle Type</label>
                        <div className="flex gap-3">
                            {['Sedan', 'SUV'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setVehicleType(type as VehicleType)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-all ${vehicleType === type ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LOCAL INPUTS */}
                    {tripType === 'Local' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                                    {!isMapReady ? (
                                       <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                       </div>
                                    ) : (
                                      <Autocomplete 
                                        placeholder="Search Google Maps for Drop"
                                        onAddressSelect={(addr) => setLocalDetails(prev => ({ ...prev, drop: addr }))}
                                        setNewPlace={(place) => setDropCoords(place)}
                                        defaultValue={localDetails.drop}
                                      />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Approx Distance (Km)</label>
                                    <input 
                                        type="number" 
                                        value={localDetails.estKm}
                                        onChange={e => setLocalDetails({...localDetails, estKm: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waiting Time (Mins)</label>
                                    <input 
                                        type="number" 
                                        value={localDetails.waitingMins}
                                        onChange={e => setLocalDetails({...localDetails, waitingMins: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Mins before start"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 border border-blue-100 flex gap-2 items-start">
                                <Settings className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-bold">Current Rules ({vehicleType}):</span> Min {pricing[vehicleType].localBaseKm}km Base ₹{pricing[vehicleType].localBaseFare}. Extra ₹{pricing[vehicleType].localPerKmRate}/km. Wait ₹{pricing[vehicleType].localWaitingRate}/min.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RENTAL INPUTS */}
                    {tripType === 'Rental' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                   <label className="block text-xs font-bold text-gray-500 uppercase">Select Package</label>
                                   <button onClick={() => setShowAddPackage(true)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                                      <Plus className="w-3 h-3" /> Add Custom Package
                                   </button>
                                </div>
                                
                                {/* Add Package Form */}
                                {showAddPackage && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3 animate-in fade-in slide-in-from-top-1">
                                     <div className="grid grid-cols-2 gap-2 mb-2">
                                        <input placeholder="Name" className="p-1.5 text-xs border rounded w-full" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                                        <div className="flex gap-2">
                                            <input placeholder="Hrs" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                                            <input placeholder="Km" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                                        </div>
                                        <div className="flex gap-2">
                                            <input placeholder="Sedan ₹" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                                            <input placeholder="SUV ₹" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                                        </div>
                                     </div>
                                     <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowAddPackage(false)} className="text-xs text-gray-500">Cancel</button>
                                        <button onClick={handleAddPackage} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600">Add</button>
                                     </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                    {rentalPackages.map(pkg => (
                                        <div 
                                            key={pkg.id}
                                            onClick={() => setRentalDetails({...rentalDetails, packageId: pkg.id})}
                                            className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all group ${rentalDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                   <span className="font-bold text-gray-800 block">{pkg.name}</span>
                                                   <span className="text-xs text-gray-500">{pkg.hours} Hr / {pkg.km} Km</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-emerald-600 font-bold block">₹{vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase">{vehicleType}</span>
                                                </div>
                                            </div>
                                            <button 
                                               onClick={(e) => removePackage(pkg.id, e)}
                                               className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                               <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                                * Extra Charges: Hours (₹{pricing[vehicleType].rentalExtraHrRate}/hr) and Km (₹{pricing[vehicleType].rentalExtraKmRate}/km).
                            </div>
                        </div>
                    )}

                    {/* OUTSTATION INPUTS */}
                    {tripType === 'Outstation' && (
                        <div className="space-y-4">
                            {/* Trip Sub-Type Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button 
                                    onClick={() => setOutstationSubType('OneWay')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'OneWay' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
                                >
                                    <ArrowRight className="w-4 h-4" /> One Way
                                </button>
                                <button 
                                    onClick={() => setOutstationSubType('RoundTrip')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
                                >
                                    <ArrowRightLeft className="w-4 h-4" /> Round Trip
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                    {!isMapReady ? (
                                       <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                       </div>
                                    ) : (
                                      <Autocomplete 
                                        placeholder="Search Google Maps for Destination"
                                        onAddressSelect={(addr) => setOutstationDetails(prev => ({ ...prev, destination: addr }))}
                                        setNewPlace={(place) => setDestCoords(place)}
                                        defaultValue={outstationDetails.destination}
                                      />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Days)</label>
                                    <input 
                                        type="number" 
                                        value={outstationDetails.days}
                                        onChange={e => setOutstationDetails({...outstationDetails, days: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        min="1"
                                    />
                                </div>
                                {/* Night Stays - Only for Round Trip */}
                                {outstationSubType === 'RoundTrip' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Night Stays (Nights)</label>
                                        <input 
                                            type="number" 
                                            value={outstationDetails.nights}
                                            onChange={e => setOutstationDetails({...outstationDetails, nights: e.target.value})}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                            min="0"
                                            placeholder="0"
                                        />
                                    </div>
                                )}
                                <div className={outstationSubType === 'OneWay' ? "md:col-span-1" : "md:col-span-2"}>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est. Total Distance (Km)</label>
                                    <input 
                                        type="number" 
                                        value={outstationDetails.estTotalKm}
                                        onChange={e => setOutstationDetails({...outstationDetails, estTotalKm: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 border border-orange-100 flex gap-2 items-start">
                                <Navigation className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-bold">Current Rules ({vehicleType} - {outstationSubType}):</span> Min {pricing[vehicleType].outstationMinKmPerDay}km/day. Rate ₹{pricing[vehicleType].outstationExtraKmRate}/km. Driver ₹{pricing[vehicleType].outstationDriverAllowance}/day. {outstationSubType === 'RoundTrip' ? `Night Allow ₹${pricing[vehicleType].outstationNightAllowance}.` : 'No Night Allowance.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Estimate & Actions */}
        <div className="space-y-6">
            {/* Estimate Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">Estimated Cost</p>
                    <h3 className="text-4xl font-bold mb-4 flex items-start">
                        <span className="text-xl mt-1 mr-1">₹</span> {estimate.total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </h3>
                    
                    <div className="space-y-2 border-t border-slate-700 pt-4 text-sm text-slate-300">
                        {outstationSubType === 'RoundTrip' && tripType === 'Outstation' ? (
                            <div className="flex justify-between">
                                <span>Km Charges ({estimate.chargeableKm} km @ ₹{pricing[vehicleType].outstationExtraKmRate})</span>
                                <span>₹{estimate.base.toFixed(2)}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between">
                                <span>Base Fare</span>
                                <span>₹{estimate.base.toFixed(2)}</span>
                            </div>
                        )}
                        
                        {estimate.extraKmCost > 0 && (
                            <div className="flex justify-between">
                                <span>Extra Km Charges</span>
                                <span>₹{estimate.extraKmCost.toFixed(2)}</span>
                            </div>
                        )}
                        {estimate.waitingCost > 0 && (
                            <div className="flex justify-between">
                                <span>Waiting Charges</span>
                                <span>₹{estimate.waitingCost.toFixed(2)}</span>
                            </div>
                        )}
                        {estimate.driverCost > 0 && (
                            <div className="flex justify-between">
                                <span>Driver Allowance</span>
                                <span>₹{estimate.driverCost.toFixed(2)}</span>
                            </div>
                        )}
                        {estimate.nightAllowanceCost > 0 && (
                            <div className="flex justify-between">
                                <span>Night Allowance</span>
                                <span>₹{estimate.nightAllowanceCost.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-700 mt-2">
                            <span>Total</span>
                            <span>₹{estimate.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
            </div>

            {/* Message & Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-gray-400" /> Client Message
                    </h4>
                    <button onClick={() => { navigator.clipboard.writeText(generatedMessage); alert("Copied!"); }} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                    </button>
                </div>
                <textarea 
                    className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none resize-none mb-4"
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => {
                            const url = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`;
                            window.open(url, '_blank');
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button 
                        onClick={() => {
                            const url = `mailto:?subject=${encodeURIComponent(tripType + ' Estimate')}&body=${encodeURIComponent(generatedMessage)}`;
                            window.location.href = url;
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <Mail className="w-4 h-4" /> Email
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Transport;
