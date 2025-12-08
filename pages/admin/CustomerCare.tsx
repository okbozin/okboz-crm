
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headset, Search, Filter, Phone, Mail, MapPin, 
  Calendar, User, ArrowRight, Building2, Calculator, 
  Edit2, Plus, Trash2, Car, Settings, ArrowRightLeft, Loader2, AlertTriangle, Copy,
  X, Save, MessageCircle
} from 'lucide-react';
import { 
  Enquiry, Employee, CorporateAccount, UserRole,
  EnquiryCategory, TripType, OutstationSubType, VehicleType 
} from '../../types';
import Autocomplete from '../../components/Autocomplete';

interface CustomerCareProps {
  role: UserRole;
}

// --- Dynamic Transport Config Types & Defaults ---
interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
}

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

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400 
};

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem('global_enquiries_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [allStaff, setAllStaff] = useState<Employee[]>(() => {
    try {
        let staff: Employee[] = [];
        if (isSuperAdmin) {
            const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
            staff = [...adminStaff];
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                staff = [...staff, ...cStaff];
            });
        } else {
            const key = `staff_data_${sessionId}`;
            staff = JSON.parse(localStorage.getItem(key) || '[]');
        }
        return staff;
    } catch (e) { return []; }
  });

  const [allBranches, setAllBranches] = useState<any[]>(() => {
      try {
          let branches: any[] = [];
          if (isSuperAdmin) {
              const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
              branches = [...adminBranches];
              const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
              corps.forEach((c: any) => {
                  const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                  branches = [...branches, ...cBranches];
              });
          } else {
              branches = JSON.parse(localStorage.getItem(`branches_data_${sessionId}`) || '[]');
          }
          return branches;
      } catch (e) { return []; }
  });

  const [corporates, setCorporates] = useState<CorporateAccount[]>(() => {
      try {
          return JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      } catch(e) { return []; }
  });

  // --- Pricing & Settings State ---
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  const [pricing, setPricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_pricing_rules_v2' : `transport_pricing_rules_v2_${sessionId}`);
    if (!saved && !isSuperAdmin) {
        const globalSettings = localStorage.getItem('transport_pricing_rules_v2');
        if (globalSettings) return JSON.parse(globalSettings);
    }
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_rental_packages_v2' : `transport_rental_packages_v2_${sessionId}`);
    if (!saved && !isSuperAdmin) {
        const globalPkgs = localStorage.getItem('transport_rental_packages_v2');
        if (globalPkgs) return JSON.parse(globalPkgs);
    }
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  // Persist Settings
  useEffect(() => {
      const suffix = isSuperAdmin ? '' : `_${sessionId}`;
      localStorage.setItem(`transport_pricing_rules_v2${suffix}`, JSON.stringify(pricing));
      localStorage.setItem(`transport_rental_packages_v2${suffix}`, JSON.stringify(rentalPackages));
  }, [pricing, rentalPackages, isSuperAdmin, sessionId]);


  // --- Form & Calculator State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    enquiryCategory: 'Transport' as EnquiryCategory, // Default to Transport
    
    // Transport Specifics
    tripType: 'Local' as TripType,
    outstationSubType: 'RoundTrip' as OutstationSubType,
    vehicleType: 'Sedan' as VehicleType,
    pickup: '',
    drop: '',
    estKm: '',
    waitingMins: '',
    packageId: '',
    destination: '',
    days: '1',
    estTotalKm: '',
    nights: '0',
    
    // Output
    estimate: 0,
    notes: '', // Auto-generated or Manual
    
    // Assignment
    assignCorporate: isSuperAdmin ? 'admin' : sessionId,
    assignBranch: 'All Branches',
    assignStaff: '',
    followUpDate: '',
    followUpTime: '',
    priority: 'Warm'
  });

  // Maps State
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize Maps
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
    }
  }, []);

  // Distance Calculation Effect
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
                    } else if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                        setMapError("Google Maps Billing Error.");
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
    } catch (error) { console.error(error); }
  }, [pickupCoords, dropCoords, destCoords, formData.tripType, formData.outstationSubType, formData.enquiryCategory]);

  // Pricing Calculation Effect
  useEffect(() => {
    if (formData.enquiryCategory === 'Transport') {
        calculateEstimate();
    }
  }, [
      formData.tripType, formData.outstationSubType, formData.vehicleType, 
      formData.estKm, formData.waitingMins, formData.packageId, 
      formData.days, formData.estTotalKm, formData.nights, 
      pricing // Dependency on pricing rules
  ]);

  const calculateEstimate = () => {
      let total = 0;
      let msg = '';
      const currentRules = pricing[formData.vehicleType];

      if (formData.tripType === 'Local') {
          const dist = parseFloat(formData.estKm) || 0;
          const wait = parseFloat(formData.waitingMins) || 0;
          let extraKmCost = 0;
          if (dist > currentRules.localBaseKm) {
              extraKmCost = (dist - currentRules.localBaseKm) * currentRules.localPerKmRate;
          }
          total = currentRules.localBaseFare + extraKmCost + (wait * currentRules.localWaitingRate);
          msg = `Local Trip (${formData.vehicleType}): Pickup ${formData.pickup} -> Drop ${formData.drop}, ${dist}km. Est: ₹${Math.round(total)}`;
      } 
      else if (formData.tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === formData.packageId);
          if (pkg) {
              total = formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              msg = `Rental Package (${formData.vehicleType} - ${pkg.name}): ₹${Math.round(total)}`;
          } else {
              msg = 'Select a package';
          }
      } 
      else if (formData.tripType === 'Outstation') {
          const days = parseFloat(formData.days) || 1;
          const km = parseFloat(formData.estTotalKm) || 0;
          const driverCost = currentRules.outstationDriverAllowance * days;
          
          if (formData.outstationSubType === 'RoundTrip') {
              const nights = parseFloat(formData.nights) || 0;
              const nightCost = currentRules.outstationNightAllowance * nights;
              const minKm = days * currentRules.outstationMinKmPerDay;
              const chargeableKm = Math.max(km, minKm);
              const kmCost = chargeableKm * currentRules.outstationExtraKmRate;
              total = kmCost + driverCost + nightCost;
              msg = `Outstation Round Trip (${formData.vehicleType}): ${formData.destination}, ${days} days, ${km} km. Est: ₹${Math.round(total)}`;
          } else {
              const kmCost = km * currentRules.outstationExtraKmRate;
              const base = currentRules.outstationBaseRate || 0;
              total = base + kmCost + driverCost;
              msg = `Outstation One Way (${formData.vehicleType}): ${formData.destination}, ${km} km. Est: ₹${Math.round(total)}`;
          }
      }
      setFormData(prev => ({ ...prev, estimate: Math.round(total), notes: msg }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          city: '', // Could derive from assigned branch
          details: formData.notes,
          status: 'New',
          createdAt: new Date().toLocaleString(),
          enquiryCategory: formData.enquiryCategory,
          tripType: formData.tripType,
          vehicleType: formData.vehicleType,
          outstationSubType: formData.outstationSubType,
          transportData: {
              pickup: formData.pickup,
              drop: formData.drop,
              estKm: formData.estKm,
              waitingMins: formData.waitingMins,
              packageId: formData.packageId,
              destination: formData.destination,
              days: formData.days,
              estTotalKm: formData.estTotalKm,
              nights: formData.nights
          },
          estimatedPrice: formData.estimate,
          assignedTo: formData.assignStaff,
          history: [],
          priority: formData.priority as any
      };

      const updatedEnquiries = [newEnquiry, ...enquiries];
      setEnquiries(updatedEnquiries);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedEnquiries));
      
      // Reset critical fields
      setFormData(prev => ({
          ...prev, 
          name: '', phone: '', pickup: '', drop: '', destination: '', 
          estKm: '', estTotalKm: '', notes: '', estimate: 0
      }));
      alert("Enquiry Created Successfully!");
  };

  // Filtered Lists for Assignment
  const availableBranches = useMemo(() => {
      if (formData.assignCorporate === 'admin') return allBranches.filter(b => b && b.owner === 'admin');
      return allBranches.filter(b => b && b.owner === formData.assignCorporate);
  }, [allBranches, formData.assignCorporate]);

  const availableStaff = useMemo(() => {
      let staff = allStaff.filter(s => s && s.corporateId === (formData.assignCorporate === 'admin' ? 'admin' : formData.assignCorporate));
      if (formData.assignBranch && formData.assignBranch !== 'All Branches') {
          staff = staff.filter(s => s.branch === formData.assignBranch);
      }
      return staff.filter(s => s.status !== 'Inactive');
  }, [allStaff, formData.assignCorporate, formData.assignBranch]);

  const filteredEnquiries = enquiries.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care
          </h2>
          <p className="text-gray-500">Manage transport requests, estimates, and general enquiries</p>
        </div>
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
            <Edit2 className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Fare Configuration'}
        </button>
      </div>

      {/* FARE CONFIGURATION PANEL */}
      {showSettings && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
             <div className="bg-gray-100 rounded-lg p-1 flex">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>SUV</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Local Rules */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-emerald-600 uppercase mb-2">Local Rules ({settingsVehicleType})</h4>
              <div className="space-y-2">
                  <div><label className="text-xs text-gray-500">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Base Km Included</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Extra Km Rate (₹/km)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Waiting Charge (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
              </div>
            </div>

            {/* Outstation Rules */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-orange-600 uppercase mb-2">Outstation Rules ({settingsVehicleType})</h4>
              <div className="space-y-2">
                  <div><label className="text-xs text-gray-500">Min Km / Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Per Km Rate (₹/km)</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Base Rate (One Way Only)</label><input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Driver Allowance (₹/day)</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Driver Night Allowance (₹/night)</label><input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
              </div>
            </div>

            {/* Rental Rules */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-blue-600 uppercase mb-2">Rental Rules ({settingsVehicleType})</h4>
              <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-500">Extra Hr (₹)</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
                  <div><label className="text-xs text-gray-500">Extra Km (₹)</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm"/></div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-2">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">Packages</label>
                      <button onClick={() => setShowAddPackage(!showAddPackage)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold">+ New</button>
                  </div>
                  {showAddPackage && (
                      <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2 space-y-2">
                          <input placeholder="Pkg Name" className="w-full p-1.5 text-xs border rounded" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                          <div className="flex gap-2">
                              <input placeholder="S: ₹" type="number" className="w-1/2 p-1.5 text-xs border rounded" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                              <input placeholder="X: ₹" type="number" className="w-1/2 p-1.5 text-xs border rounded" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                          </div>
                          <button onClick={() => { setRentalPackages([...rentalPackages, {...newPackage, id: `pkg-${Date.now()}`} as any]); setShowAddPackage(false); }} className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded">Save</button>
                      </div>
                  )}
                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200">
                              <div className="text-xs">
                                  <div className="font-bold">{pkg.name}</div>
                                  <div className="text-gray-500">{pkg.hours}hr / {pkg.km}km</div>
                              </div>
                              <div className="text-[10px] text-right font-mono">
                                  <div>S: {pkg.priceSedan}</div>
                                  <div>X: {pkg.priceSuv}</div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="pt-4 mt-auto">
                     <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900 transition-colors">Close</button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" /> Customer Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Name" className="p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"/>
                      <input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone" className="p-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>
                  
                  {/* Category Toggle */}
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                      <button onClick={() => setFormData(p => ({...p, enquiryCategory: 'Transport'}))} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${formData.enquiryCategory === 'Transport' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Transport</button>
                      <button onClick={() => setFormData(p => ({...p, enquiryCategory: 'General'}))} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${formData.enquiryCategory === 'General' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>General</button>
                  </div>

                  {formData.enquiryCategory === 'Transport' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-gray-500 uppercase">Trip Details</h4>
                              <div className="flex gap-1">
                                  <button onClick={() => setFormData(p => ({...p, vehicleType: 'Sedan'}))} className={`px-2 py-1 text-xs border rounded ${formData.vehicleType === 'Sedan' ? 'bg-slate-800 text-white' : 'bg-white'}`}>Sedan</button>
                                  <button onClick={() => setFormData(p => ({...p, vehicleType: 'SUV'}))} className={`px-2 py-1 text-xs border rounded ${formData.vehicleType === 'SUV' ? 'bg-slate-800 text-white' : 'bg-white'}`}>SUV</button>
                              </div>
                          </div>

                          <div className="flex border-b border-gray-200">
                              {['Local', 'Rental', 'Outstation'].map(t => (
                                  <button key={t} onClick={() => setFormData(p => ({...p, tripType: t as TripType}))} className={`flex-1 py-2 text-sm font-medium ${formData.tripType === t ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>{t}</button>
                              ))}
                          </div>

                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                              {/* Local Inputs */}
                              {formData.tripType === 'Local' && (
                                  <>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Autocomplete placeholder="Pickup Location" onAddressSelect={(a) => setFormData(p => ({...p, pickup: a}))} setNewPlace={setPickupCoords} defaultValue={formData.pickup} />
                                        <Autocomplete placeholder="Drop Location" onAddressSelect={(a) => setFormData(p => ({...p, drop: a}))} setNewPlace={setDropCoords} defaultValue={formData.drop} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="Est Km" value={formData.estKm} onChange={e => setFormData({...formData, estKm: e.target.value})} className="p-2 border rounded text-sm"/>
                                        <input type="number" placeholder="Wait Mins" value={formData.waitingMins} onChange={e => setFormData({...formData, waitingMins: e.target.value})} className="p-2 border rounded text-sm"/>
                                    </div>
                                  </>
                              )}

                              {/* Rental Inputs */}
                              {formData.tripType === 'Rental' && (
                                  <>
                                    <Autocomplete placeholder="Pickup Location" onAddressSelect={(a) => setFormData(p => ({...p, pickup: a}))} defaultValue={formData.pickup} />
                                    <select value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} className="w-full p-2 border rounded text-sm bg-white">
                                        <option value="">Select Package</option>
                                        {rentalPackages.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{formData.vehicleType === 'Sedan' ? p.priceSedan : p.priceSuv}</option>)}
                                    </select>
                                  </>
                              )}

                              {/* Outstation Inputs */}
                              {formData.tripType === 'Outstation' && (
                                  <>
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setFormData(p => ({...p, outstationSubType: 'RoundTrip'}))} className={`flex-1 py-1 text-xs rounded border ${formData.outstationSubType === 'RoundTrip' ? 'bg-emerald-500 text-white' : 'bg-white'}`}>Round Trip</button>
                                        <button onClick={() => setFormData(p => ({...p, outstationSubType: 'OneWay'}))} className={`flex-1 py-1 text-xs rounded border ${formData.outstationSubType === 'OneWay' ? 'bg-emerald-500 text-white' : 'bg-white'}`}>One Way</button>
                                    </div>
                                    <Autocomplete placeholder="Destination" onAddressSelect={(a) => setFormData(p => ({...p, destination: a}))} setNewPlace={setDestCoords} defaultValue={formData.destination} />
                                    {formData.outstationSubType === 'OneWay' && (
                                        <Autocomplete placeholder="Pickup Location" onAddressSelect={(a) => setFormData(p => ({...p, pickup: a}))} setNewPlace={setPickupCoords} defaultValue={formData.pickup} />
                                    )}
                                    <div className="grid grid-cols-3 gap-2">
                                        <input placeholder="Days" type="number" value={formData.days} onChange={e => setFormData({...formData, days: e.target.value})} className="p-2 border rounded text-sm"/>
                                        <input placeholder="Km" type="number" value={formData.estTotalKm} onChange={e => setFormData({...formData, estTotalKm: e.target.value})} className="p-2 border rounded text-sm"/>
                                        {formData.outstationSubType === 'RoundTrip' && (
                                            <input placeholder="Nights" type="number" value={formData.nights} onChange={e => setFormData({...formData, nights: e.target.value})} className="p-2 border rounded text-sm"/>
                                        )}
                                    </div>
                                  </>
                              )}
                              
                              {mapError && <div className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {mapError}</div>}
                          </div>

                          <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                              <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">ESTIMATED COST</p>
                                  <h3 className="text-2xl font-bold">₹{formData.estimate}</h3>
                              </div>
                              <Calculator className="w-8 h-8 text-slate-600" />
                          </div>
                          
                          <p className="text-xs text-gray-500 italic">Includes basic fare calculations. Tolls & Parking extra.</p>
                      </div>
                  )}

                  {formData.enquiryCategory === 'General' && (
                      <textarea 
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          placeholder="Enter general enquiry details..."
                          rows={4}
                          className="w-full p-3 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                  )}
              </div>
              
              {/* Assignment Section */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Building2 className="w-3 h-3"/> ASSIGN ENQUIRY TO</label>
                      <div className="flex gap-2">
                          <select name="assignBranch" value={formData.assignBranch} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white outline-none">
                              <option>All Branches</option>
                              {allBranches.filter(b => b.owner === (formData.assignCorporate === 'admin' ? 'admin' : formData.assignCorporate)).map(b => (
                                  <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                          </select>
                          <select name="assignStaff" value={formData.assignStaff} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white outline-none">
                              <option value="">Select Staff</option>
                              {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <button className="flex-1 bg-white border border-blue-500 text-blue-600 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 flex items-center justify-center gap-2">
                          <Calendar className="w-4 h-4" /> Schedule
                      </button>
                      <button onClick={handleSaveEnquiry} className="flex-[2] bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-2">
                          <ArrowRight className="w-4 h-4" /> Book Now
                      </button>
                  </div>
                  
                  <div className="flex justify-between mt-4">
                      <button className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3"/> Cancel</button>
                      <button onClick={handleSaveEnquiry} className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"><Save className="w-3 h-3"/> Save Enquiry</button>
                  </div>
              </div>
          </div>

          {/* Right Column: Generated Message Preview (Sticky) */}
          <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Message
                      </h3>
                      <button 
                        onClick={() => navigator.clipboard.writeText(formData.notes)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                          <Copy className="w-3 h-3" /> Copy
                      </button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap font-sans min-h-[200px]">
                      {formData.enquiryCategory === 'Transport' ? (
                          <>
Hello {formData.name || 'Customer'},
Here is your {formData.tripType} estimate from OK BOZ! 🚕

*Trip Estimate*
🚘 Vehicle: {formData.vehicleType}
{formData.tripType === 'Local' && `📍 Pickup: ${formData.pickup || 'TBD'}\n📍 Drop: ${formData.drop || 'TBD'}`}
{formData.tripType === 'Rental' && `📦 Package: ${rentalPackages.find(p => p.id === formData.packageId)?.name || '-'}\n📍 Pickup: ${formData.pickup || 'TBD'}`}
{formData.tripType === 'Outstation' && `🌍 Destination: ${formData.destination}\n📅 Duration: ${formData.days} Days`}

💰 Total Est: ₹{formData.estimate}
                          </>
                      ) : (
                          formData.notes || 'Enter details to generate message...'
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2">
                          <Mail className="w-4 h-4" /> Email
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CustomerCare;