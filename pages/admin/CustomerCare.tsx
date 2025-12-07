
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headset, User, MapPin, Calculator, Phone, Mail, MessageCircle, 
  Settings, Save, Calendar, Clock, Edit2, CheckCircle, 
  AlertTriangle, Loader2, Building2, Copy, Send, Plus, Trash2, X, DollarSign, ArrowRight, ArrowRightLeft,
  Navigation
} from 'lucide-react';
import { Enquiry, Employee, UserRole, Branch } from '../../types';
import Autocomplete from '../../components/Autocomplete';

interface CustomerCareProps {
  role: UserRole;
}

// Pricing Interface
interface PricingRules {
  localBaseFare: number;
  localBaseKm: number;
  localPerKmRate: number;
  localWaitingRate: number;
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  outstationMinKmPerDay: number;
  outstationBaseRate: number;
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}

interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
}

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 100, localBaseKm: 2.5, localPerKmRate: 22, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 150, localBaseKm: 2.5, localPerKmRate: 28, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400 
};

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [allStaff, setAllStaff] = useState<Employee[]>(() => {
    let staff: Employee[] = [];
    if (isSuperAdmin) {
       const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
       staff = [...adminStaff.map((s:any) => ({...s, corporateId: 'admin'}))];
       try {
         const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
         corps.forEach((c: any) => {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            staff = [...staff, ...cStaff.map((s:any) => ({...s, corporateId: c.email}))];
         });
       } catch(e) {}
    } else {
       const key = `staff_data_${sessionId}`;
       const saved = localStorage.getItem(key);
       if (saved) staff = JSON.parse(saved).map((s:any) => ({...s, corporateId: sessionId}));
    }
    return staff;
  });

  const [corporates] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('corporate_accounts') || '[]'); } catch (e) { return []; }
  });

  const [allBranches, setAllBranches] = useState<any[]>(() => {
      let branches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          branches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corps.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             branches = [...branches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) branches = JSON.parse(saved).map((b: any) => ({...b, owner: sessionId}));
      }
      return branches;
  });

  // --- State ---
  const [showRates, setShowRates] = useState(false); // Default Hidden
  const [settingsVehicleType, setSettingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  
  // Pricing Rules
  const [pricing, setPricing] = useState<{ Sedan: PricingRules; SUV: PricingRules }>({
    Sedan: DEFAULT_PRICING_SEDAN,
    SUV: DEFAULT_PRICING_SUV
  });
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);
  
  // Package Management State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Map State
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    enquiryCategory: 'Transport' as 'Transport' | 'General',
    tripType: 'Local' as 'Local' | 'Rental' | 'Outstation',
    outstationSubType: 'RoundTrip' as 'OneWay' | 'RoundTrip',
    vehicleType: 'Sedan' as 'Sedan' | 'SUV',
    pickup: '',
    drop: '',
    estKm: '',
    waitingMins: '',
    packageId: '',
    destination: '',
    days: '1',
    estTotalKm: '',
    nights: '0',
    notes: '',
    assignCorporate: isSuperAdmin ? 'admin' : sessionId,
    assignBranch: 'All Branches',
    assignStaff: '',
    followUpDate: '',
    followUpTime: '',
    priority: 'Warm'
  });

  const [estimate, setEstimate] = useState(0);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // --- Effects ---

  // Google Maps Loader
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Google Maps Error: Billing not enabled.");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key missing. Check Settings.");
      return;
    }
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }
    // Logic handled by main App loader mostly, but safety check here
    setTimeout(() => {
        if (window.google) setIsMapReady(true);
    }, 1000);
  }, []);

  // Distance Calculation
  useEffect(() => {
    if (!window.google || !pickupCoords || formData.enquiryCategory !== 'Transport') return;

    try {
        const calculateDistance = (destination: google.maps.LatLngLiteral, isRoundTrip: boolean, isOutstation: boolean) => {
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
                        if (isRoundTrip) distanceInKm = distanceInKm * 2; 
                        const formattedDist = distanceInKm.toFixed(1);

                        if (isOutstation) {
                            setFormData(prev => ({ ...prev, estTotalKm: formattedDist }));
                        } else {
                            setFormData(prev => ({ ...prev, estKm: formattedDist }));
                        }
                    }
                }
            );
        };

        if (formData.tripType === 'Local' && dropCoords) {
            calculateDistance(dropCoords, false, false);
        } else if (formData.tripType === 'Outstation' && destCoords) {
            const isRoundTrip = formData.outstationSubType === 'RoundTrip';
            calculateDistance(destCoords, isRoundTrip, true); 
        }
    } catch (error) {
        console.error("Map Distance Error", error);
    }
  }, [pickupCoords, dropCoords, destCoords, formData.tripType, formData.outstationSubType, formData.enquiryCategory]);

  // Calculate Estimate
  useEffect(() => {
    let total = 0;
    const rules = pricing[formData.vehicleType];

    if (formData.tripType === 'Local') {
        const km = parseFloat(formData.estKm) || 0;
        const wait = parseFloat(formData.waitingMins) || 0;
        let extraKmCost = 0;
        if (km > rules.localBaseKm) {
            extraKmCost = (km - rules.localBaseKm) * rules.localPerKmRate;
        }
        total = rules.localBaseFare + extraKmCost + (wait * rules.localWaitingRate);
    } else if (formData.tripType === 'Rental') {
        const pkg = rentalPackages.find(p => p.id === formData.packageId);
        if (pkg) {
            total = formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
        }
    } else if (formData.tripType === 'Outstation') {
        const days = parseFloat(formData.days) || 1;
        const km = parseFloat(formData.estTotalKm) || 0;
        const driver = days * rules.outstationDriverAllowance;
        
        if (formData.outstationSubType === 'RoundTrip') {
            const minKm = days * rules.outstationMinKmPerDay;
            const chargeableKm = Math.max(km, minKm);
            const kmCost = chargeableKm * rules.outstationExtraKmRate;
            const night = (parseFloat(formData.nights) || 0) * rules.outstationNightAllowance;
            total = kmCost + driver + night;
        } else {
            // One Way
            const kmCost = km * rules.outstationExtraKmRate;
            const base = rules.outstationBaseRate || 0;
            total = base + kmCost + driver;
        }
    }

    setEstimate(Math.round(total));
  }, [formData, pricing, rentalPackages]);

  // Generate Message
  useEffect(() => {
    let msg = `Hello ${formData.name || 'Customer'},\n`;
    
    if (formData.enquiryCategory === 'General') {
        msg += `Thank you for your enquiry.\n\nRequirement:\n${formData.notes || 'N/A'}`;
    } else {
        msg += `Here is your ${formData.tripType} estimate from OK BOZ! 🚕\n\n*${formData.tripType} Trip Estimate*\n🚘 Vehicle: ${formData.vehicleType}`;
        
        if (formData.tripType === 'Local') {
            msg += `\n📍 Pickup: ${formData.pickup}\n📍 Drop: ${formData.drop}`;
        } else if (formData.tripType === 'Outstation') {
            msg += `\n🌍 Destination: ${formData.destination}\n🔄 Type: ${formData.outstationSubType === 'OneWay' ? 'One Way' : 'Round Trip'}\n📅 Days: ${formData.days}`;
        }
        
        msg += `\n\n💰 *Estimated Cost: ₹${estimate}*`;
        if (formData.tripType === 'Outstation') msg += `\n(Tolls & Parking extra)`;
    }
    setGeneratedMessage(msg);
  }, [estimate, formData]);

  // --- Handlers ---

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    }
  };

  const handleSaveEnquiry = () => {
      if (!formData.name || !formData.phone) {
          alert("Name and Phone are required.");
          return;
      }

      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: formData.name,
          phone: formData.phone,
          city: formData.pickup || 'Unknown',
          details: formData.enquiryCategory === 'Transport' 
            ? `Transport: ${formData.tripType} (${formData.vehicleType}). Est: ₹${estimate}\nNotes: ${formData.notes}`
            : formData.notes,
          status: 'New',
          createdAt: new Date().toLocaleString(),
          assignedTo: formData.assignStaff,
          corporateId: formData.assignCorporate === 'admin' ? undefined : formData.assignCorporate,
          history: [],
          enquiryCategory: formData.enquiryCategory,
          tripType: formData.tripType,
          vehicleType: formData.vehicleType,
          outstationSubType: formData.outstationSubType,
          estimatedPrice: estimate,
          priority: formData.priority as any,
          nextFollowUp: formData.followUpDate ? `${formData.followUpDate} ${formData.followUpTime}` : undefined,
          transportData: formData.enquiryCategory === 'Transport' ? {
              pickup: formData.pickup,
              drop: formData.drop,
              destination: formData.destination,
              estKm: formData.estKm,
              estTotalKm: formData.estTotalKm,
              packageId: formData.packageId,
              days: formData.days,
              nights: formData.nights
          } : undefined
      };

      const saved = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
      localStorage.setItem('global_enquiries_data', JSON.stringify([newEnquiry, ...saved]));
      
      alert("Enquiry Saved Successfully!");
      setFormData(prev => ({...prev, name: '', phone: '', pickup: '', drop: '', estKm: '', notes: ''}));
  };

  // Filtered Lists for Assignment
  const availableBranches = useMemo(() => {
      if (formData.assignCorporate === 'admin') return allBranches.filter(b => b.owner === 'admin');
      return allBranches.filter(b => b.owner === formData.assignCorporate);
  }, [allBranches, formData.assignCorporate]);

  const availableStaff = useMemo(() => {
      let staff = allStaff.filter(s => s.corporateId === (formData.assignCorporate === 'admin' ? 'admin' : formData.assignCorporate));
      if (formData.assignBranch && formData.assignBranch !== 'All Branches') {
          staff = staff.filter(s => s.branch === formData.assignBranch);
      }
      return staff.filter(s => s.status !== 'Inactive');
  }, [allStaff, formData.assignCorporate, formData.assignBranch]);

  // Current Rules Text
  const currentRulesText = useMemo(() => {
      const r = pricing[formData.vehicleType];
      if (formData.tripType === 'Local') {
          return `Min ${r.localBaseKm}km Base ₹${r.localBaseFare}. Rate ₹${r.localPerKmRate}/km. Wait ₹${r.localWaitingRate}/min.`;
      } else if (formData.tripType === 'Rental') {
          return `Extra: ₹${r.rentalExtraHrRate}/hr & ₹${r.rentalExtraKmRate}/km.`;
      } else {
          // Outstation
          if (formData.outstationSubType === 'RoundTrip') {
              return `Min ${r.outstationMinKmPerDay}km/day. Rate ₹${r.outstationExtraKmRate}/km. Driver ₹${r.outstationDriverAllowance}/day. Night Allow ₹${r.outstationNightAllowance}.`;
          } else {
              return `Base ₹${r.outstationBaseRate}. Rate ₹${r.outstationExtraKmRate}/km. Driver ₹${r.outstationDriverAllowance}. No Night Allow.`;
          }
      }
  }, [pricing, formData.vehicleType, formData.tripType, formData.outstationSubType]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care
          </h2>
          <p className="text-gray-500">Manage transport requests, estimates, and general enquiries</p>
        </div>
        <button 
            onClick={() => setShowRates(!showRates)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
        >
            <Settings className="w-4 h-4" /> {showRates ? 'Hide Rates' : 'Show Rates'}
        </button>
      </div>

      {showRates && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4"/> Fare Configuration</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 rounded text-xs font-bold ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>Sedan</button>
                    <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 rounded text-xs font-bold ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>SUV</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Local */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase">Local Rules ({settingsVehicleType})</h4>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <div><label className="text-[10px] text-gray-500 block">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Base Km Included</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Extra Km Rate (₹/km)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Waiting Charge (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                    </div>
                </div>
                {/* Outstation */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-orange-600 uppercase">Outstation Rules ({settingsVehicleType})</h4>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <div><label className="text-[10px] text-gray-500 block">Min Km / Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Per Km Rate (₹/km)</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Base Rate (One Way Only)</label><input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Driver Allowance (₹/day)</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Driver Night Allowance (₹/night)</label><input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                    </div>
                </div>
                {/* Rental */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-blue-600 uppercase">Rental Rules ({settingsVehicleType})</h4>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="text-[10px] text-gray-500 block">Extra Hr (₹)</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                            <div className="flex-1"><label className="text-[10px] text-gray-500 block">Extra Km (₹)</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-gray-600">Packages</span>
                                <button onClick={() => setShowAddPackage(!showAddPackage)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100">+ New</button>
                            </div>
                            
                            {showAddPackage && (
                                <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2 space-y-1 animate-in fade-in zoom-in">
                                    <input placeholder="Pkg Name" className="w-full p-1 text-[10px] border rounded" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                                    <div className="flex gap-1">
                                        <input placeholder="Hrs" className="w-1/2 p-1 text-[10px] border rounded" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                                        <input placeholder="Km" className="w-1/2 p-1 text-[10px] border rounded" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                                    </div>
                                    <div className="flex gap-1">
                                        <input placeholder="₹ Sedan" className="w-1/2 p-1 text-[10px] border rounded" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                                        <input placeholder="₹ SUV" className="w-1/2 p-1 text-[10px] border rounded" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                                    </div>
                                    <button onClick={handleAddPackage} className="w-full bg-blue-600 text-white text-[10px] py-1 rounded">Save</button>
                                </div>
                            )}

                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {rentalPackages.map(pkg => (
                                    <div key={pkg.id} className="flex justify-between items-center text-xs p-1 bg-white border rounded group">
                                        <div>
                                            <span className="font-bold">{pkg.name}</span>
                                            <span className="text-[10px] text-gray-500 ml-1">({pkg.hours}h/{pkg.km}km)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-500 text-[10px]">S:{pkg.priceSedan} X:{pkg.priceSuv}</span>
                                            <button onClick={(e) => removePackage(pkg.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowRates(false)} className="w-full mt-2 bg-slate-800 text-white text-xs font-bold py-2 rounded">Close</button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="w-4 h-4"/> Customer Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Name" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                      <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4">Trip Details</h3>
                  
                  {/* Transport / General Toggle */}
                  <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setFormData(prev => ({...prev, enquiryCategory: 'Transport'}))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.enquiryCategory === 'Transport' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-gray-500'}`}>Transport</button>
                      <button onClick={() => setFormData(prev => ({...prev, enquiryCategory: 'General'}))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.enquiryCategory === 'General' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-gray-500'}`}>General</button>
                  </div>

                  {formData.enquiryCategory === 'Transport' && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex gap-4 border-b border-gray-200 pb-1">
                                {['Local', 'Rental', 'Outstation'].map(t => (
                                    <button 
                                        key={t} 
                                        onClick={() => setFormData(prev => ({...prev, tripType: t as any}))} 
                                        className={`pb-2 text-sm font-medium transition-all ${formData.tripType === t ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1 bg-slate-100 p-1 rounded">
                                <button onClick={() => setFormData(prev => ({...prev, vehicleType: 'Sedan'}))} className={`px-3 py-1 text-xs rounded ${formData.vehicleType === 'Sedan' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>Sedan</button>
                                <button onClick={() => setFormData(prev => ({...prev, vehicleType: 'SUV'}))} className={`px-3 py-1 text-xs rounded ${formData.vehicleType === 'SUV' ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>SUV</button>
                            </div>
                        </div>

                        {formData.tripType === 'Local' && (
                            <div className="space-y-3">
                                <div className="relative">
                                    <Autocomplete placeholder="Search Pickup Location" onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} setNewPlace={setPickupCoords} defaultValue={formData.pickup} />
                                </div>
                                <div className="relative">
                                    <Autocomplete placeholder="Search Drop Location" onAddressSelect={addr => setFormData(prev => ({...prev, drop: addr}))} setNewPlace={setDropCoords} defaultValue={formData.drop} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" name="estKm" value={formData.estKm} onChange={handleInputChange} placeholder="Est Km" className="p-2 border rounded-lg w-full" />
                                    <input type="number" name="waitingMins" value={formData.waitingMins} onChange={handleInputChange} placeholder="Wait Mins" className="p-2 border rounded-lg w-full" />
                                </div>
                            </div>
                        )}

                        {formData.tripType === 'Rental' && (
                            <div className="space-y-3">
                                <Autocomplete placeholder="Pickup Location" onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} defaultValue={formData.pickup} />
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                    {rentalPackages.map(pkg => (
                                        <button key={pkg.id} onClick={() => setFormData(prev => ({...prev, packageId: pkg.id}))} className={`p-2 border rounded text-left text-xs ${formData.packageId === pkg.id ? 'bg-emerald-50 border-emerald-500' : 'hover:bg-gray-50'}`}>
                                            <div className="font-bold">{pkg.name}</div>
                                            <div className="text-gray-500">₹{formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.tripType === 'Outstation' && (
                            <div className="space-y-3">
                                <div className="flex gap-2 bg-orange-50 p-1 rounded border border-orange-100">
                                    <button onClick={() => setFormData(prev => ({...prev, outstationSubType: 'RoundTrip'}))} className={`flex-1 text-xs py-1.5 rounded ${formData.outstationSubType === 'RoundTrip' ? 'bg-white shadow text-orange-700 font-bold' : 'text-orange-600'}`}>
                                        <ArrowRightLeft className="w-3 h-3 inline mr-1"/> Round Trip
                                    </button>
                                    <button onClick={() => setFormData(prev => ({...prev, outstationSubType: 'OneWay'}))} className={`flex-1 text-xs py-1.5 rounded ${formData.outstationSubType === 'OneWay' ? 'bg-white shadow text-orange-700 font-bold' : 'text-orange-600'}`}>
                                        <ArrowRight className="w-3 h-3 inline mr-1"/> One Way
                                    </button>
                                </div>

                                <Autocomplete placeholder={formData.outstationSubType === 'OneWay' ? "Pickup Location" : "Start Location"} onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} setNewPlace={setPickupCoords} defaultValue={formData.pickup} />
                                <Autocomplete placeholder="Destination" onAddressSelect={addr => setFormData(prev => ({...prev, destination: addr}))} setNewPlace={setDestCoords} defaultValue={formData.destination} />
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="number" name="days" value={formData.days} onChange={handleInputChange} placeholder="Days" className="p-2 border rounded-lg w-full" />
                                    <input type="number" name="estTotalKm" value={formData.estTotalKm} onChange={handleInputChange} placeholder="Total Km" className="p-2 border rounded-lg w-full" />
                                    {formData.outstationSubType === 'RoundTrip' && (
                                        <input type="number" name="nights" value={formData.nights} onChange={handleInputChange} placeholder="Nights" className="p-2 border rounded-lg w-full" />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg flex gap-2 items-start text-xs text-orange-800">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div><span className="font-bold">Current Rules:</span> {currentRulesText}</div>
                        </div>
                    </>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Requirement Details</label>
                      <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Special requests, extra luggage, etc..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow-up Date</label>
                          <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                          <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                  </div>
                  
                  <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                      <div className="flex gap-2">
                          {['Hot', 'Warm', 'Cold'].map(p => (
                              <button key={p} onClick={() => setFormData(prev => ({...prev, priority: p}))} className={`flex-1 py-1.5 rounded text-sm border ${formData.priority === p ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300'}`}>{p}</button>
                          ))}
                      </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><User className="w-4 h-4"/> ASSIGN ENQUIRY TO</h4>
                      <div className="flex gap-2">
                          {isSuperAdmin && (
                              <select name="assignCorporate" value={formData.assignCorporate} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                                  <option value="admin">Head Office</option>
                                  {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                              </select>
                          )}
                          <select name="assignBranch" value={formData.assignBranch} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                              <option>All Branches</option>
                              {availableBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                          </select>
                          <select name="assignStaff" value={formData.assignStaff} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                              <option value="">Select Staff</option>
                              {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                          </select>
                      </div>
                      <div className="flex gap-3 mt-4">
                          <button className="flex-1 border border-blue-500 text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"><Calendar className="w-4 h-4"/> Schedule</button>
                          <button className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"><ArrowRight className="w-4 h-4"/> Book Now</button>
                      </div>
                      <div className="flex justify-end gap-3 mt-3">
                          <button onClick={() => setFormData({...formData, name:'', phone:''})} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"><X className="w-3 h-3"/> Cancel</button>
                          <button onClick={handleSaveEnquiry} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold flex items-center gap-1"><Save className="w-3 h-3"/> Save Enquiry</button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Column: Estimate & Preview */}
          <div className="space-y-6">
              {formData.enquiryCategory === 'Transport' && (
                  <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ESTIMATED COST</p>
                          <h3 className="text-5xl font-bold">₹{estimate}</h3>
                          <p className="text-slate-400 text-sm mt-4 border-t border-slate-700 pt-2">Includes basic fare calculations. Tolls & Parking extra.</p>
                      </div>
                      <DollarSign className="absolute -bottom-6 -right-6 w-40 h-40 text-slate-800 opacity-50" />
                  </div>
              )}

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Generated Message</h3>
                      <button onClick={() => navigator.clipboard.writeText(generatedMessage)} className="text-blue-600 text-xs hover:underline flex items-center gap-1"><Copy className="w-3 h-3"/> Copy</button>
                  </div>
                  <textarea value={generatedMessage} readOnly className="w-full h-48 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 resize-none outline-none" />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                        onClick={() => window.open(`https://wa.me/${formData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                          <MessageCircle className="w-4 h-4"/> WhatsApp
                      </button>
                      <button 
                        onClick={() => window.location.href = `mailto:?body=${encodeURIComponent(generatedMessage)}`}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                          <Mail className="w-4 h-4"/> Email
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CustomerCare;
