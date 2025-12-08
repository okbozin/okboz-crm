
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headset, Search, Filter, Phone, Mail, MapPin, 
  Calendar, User, ArrowRight, Building2, Calculator, 
  Edit2, Plus, Trash2, Car, Settings, ArrowRightLeft, Loader2, AlertTriangle, Copy,
  X, Save, MessageCircle, Clock, CheckCircle
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
    // We need map ready, pickup coords, and either drop or dest coords
    // Also ensuring user is in Transport mode
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
                            // Automatically update estimated KM for Local trips
                            setFormData(prev => ({ ...prev, estKm: formattedDist }));
                        }
                    } else {
                       console.warn("Distance Matrix Error or Billing issue:", status);
                       if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                           setMapError("Google Maps Billing Error. Manual entry required.");
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
        console.error("Map calculation error:", error);
    }
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
          date: formData.followUpDate || new Date().toISOString().split('T')[0], // Store for scheduling
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
          nextFollowUp: formData.followUpDate, // Add follow up
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
             <Headset className="w-8 h-8 text-indigo-600" /> Customer Care
          </h2>
          <p className="text-gray-500">Manage transport requests, estimates, and general enquiries</p>
        </div>
        
        {role !== UserRole.EMPLOYEE && (
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <Edit2 className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Fire Configuration'}
            </button>
        )}
      </div>

      {/* FARE CONFIGURATION PANEL */}
      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 mb-6 shadow-inner">
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Edit2 className="w-5 h-5 text-indigo-500" /> Fare Configuration</h3>
             
             {/* Vehicle Type Toggle */}
             <div className="bg-white border border-slate-300 rounded-lg p-1 flex shadow-sm">
                <button 
                   onClick={() => setSettingsVehicleType('Sedan')}
                   className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                   Sedan
                </button>
                <button 
                   onClick={() => setSettingsVehicleType('SUV')}
                   className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                   SUV
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Local Rules */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">LOCAL RULES ({settingsVehicleType})</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Base Fare (₹)</label>
                  <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Base Km Included</label>
                  <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Extra Km Rate (₹/km)</label>
                  <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Waiting Charge (₹/min)</label>
                  <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Outstation Rules */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="text-xs font-bold text-orange-600 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">OUTSTATION RULES ({settingsVehicleType})</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Min Km / Day</label>
                        <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Per Km Rate (₹/km)</label>
                        <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Base Rate (One Way Only)</label>
                  <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Not used for Round Trip" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Driver Allowance (₹/day)</label>
                  <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Driver Night Allowance (₹/night)</label>
                  <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Rental Rules */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">RENTAL RULES ({settingsVehicleType})</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Extra Hr (₹)</label>
                    <input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Extra Km (₹)</label>
                    <input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
              </div>

              <div className="flex-1 border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold text-gray-700">Rental Packages</label>
                      <button 
                        onClick={() => setShowAddPackage(!showAddPackage)}
                        className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 flex items-center gap-1 font-bold transition-colors"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                  </div>
                  
                  {showAddPackage && (
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <input placeholder="Pkg Name (e.g. 10hr/100km)" className="w-full p-2 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                          <div className="flex gap-2">
                              <input placeholder="Hrs" type="number" className="w-full p-2 text-xs border rounded-lg outline-none" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                              <input placeholder="Km" type="number" className="w-full p-2 text-xs border rounded-lg outline-none" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                          </div>
                          <div className="flex gap-2">
                              <input placeholder="Sedan ₹" type="number" className="w-full p-2 text-xs border rounded-lg outline-none" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                              <input placeholder="SUV ₹" type="number" className="w-full p-2 text-xs border rounded-lg outline-none" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                          </div>
                          <button onClick={handleAddPackage} className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Save Package</button>
                      </div>
                  )}

                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 group transition-all">
                              <div>
                                  <div className="text-xs font-bold text-gray-800">{pkg.name}</div>
                                  <div className="text-[10px] text-gray-500 font-medium">{pkg.hours}hr / {pkg.km}km</div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                  <div className="text-[10px] text-gray-600 font-mono text-right">
                                      <div><span className="text-gray-400">S:</span> {pkg.priceSedan}</div>
                                      <div><span className="text-gray-400">X:</span> {pkg.priceSuv}</div>
                                  </div>
                                  <button onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Remove package?')) setRentalPackages(prev => prev.filter(p => p.id !== pkg.id));
                                  }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-50">
                                      <Trash2 className="w-3 h-3" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
             <button 
                onClick={() => setShowSettings(false)} 
                className="bg-slate-800 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-900 transition-all shadow-md"
             >
                Close Configuration
             </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: ENQUIRY FORM */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-500" /> Customer Info
                </h3>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Name</label>
                            <input 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="Client Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-500 mb-1">Phone</label>
                            <input 
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="+91..."
                            />
                        </div>
                    </div>

                    {/* Enquiry Type Toggle */}
                    <div className="bg-gray-100 p-1.5 rounded-xl flex gap-1">
                        <button 
                            onClick={() => setFormData({...formData, enquiryCategory: 'Transport'})}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.enquiryCategory === 'Transport' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Car className="w-4 h-4" /> Transport
                        </button>
                        <button 
                            onClick={() => setFormData({...formData, enquiryCategory: 'General'})}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${formData.enquiryCategory === 'General' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            General
                        </button>
                    </div>

                    {/* Transport Specific Inputs */}
                    {formData.enquiryCategory === 'Transport' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                Trip Details
                                <div className="ml-auto flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setFormData({...formData, vehicleType: 'Sedan'})} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${formData.vehicleType === 'Sedan' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500'}`}>Sedan</button>
                                    <button onClick={() => setFormData({...formData, vehicleType: 'SUV'})} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${formData.vehicleType === 'SUV' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500'}`}>SUV</button>
                                </div>
                            </h3>

                            {/* Trip Type Tabs */}
                            <div className="flex border-b border-gray-200">
                                {['Local', 'Rental', 'Outstation'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFormData({...formData, tripType: type as TripType})}
                                        className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${formData.tripType === type ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Pickup Location</label>
                                    <Autocomplete 
                                        placeholder="Search Pickup"
                                        onAddressSelect={(addr) => setFormData(prev => ({...prev, pickup: addr}))}
                                        setNewPlace={(place) => setPickupCoords(place)}
                                        defaultValue={formData.pickup}
                                    />
                                </div>

                                {formData.tripType === 'Local' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 space-y-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Drop Location</label>
                                            <Autocomplete 
                                                placeholder="Search Drop"
                                                onAddressSelect={(addr) => setFormData(prev => ({...prev, drop: addr}))}
                                                setNewPlace={(place) => setDropCoords(place)}
                                                defaultValue={formData.drop}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Est Km</label>
                                            <input type="number" value={formData.estKm} onChange={e => setFormData({...formData, estKm: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="0" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Wait Mins</label>
                                            <input type="number" value={formData.waitingMins} onChange={e => setFormData({...formData, waitingMins: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm" placeholder="0" />
                                        </div>
                                    </div>
                                )}

                                {formData.tripType === 'Rental' && (
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase">Select Package</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {rentalPackages.map(pkg => (
                                                <div 
                                                    key={pkg.id} 
                                                    onClick={() => setFormData({...formData, packageId: pkg.id})}
                                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.packageId === pkg.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}
                                                >
                                                    <div className="text-xs font-bold text-gray-800">{pkg.name}</div>
                                                    <div className="text-[10px] text-gray-500 mt-1">{pkg.hours}hr / {pkg.km}km</div>
                                                    <div className="text-xs font-bold text-indigo-600 mt-2">₹{formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formData.tripType === 'Outstation' && (
                                    <div className="space-y-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button onClick={() => setFormData({...formData, outstationSubType: 'OneWay'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${formData.outstationSubType === 'OneWay' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>One Way</button>
                                            <button onClick={() => setFormData({...formData, outstationSubType: 'RoundTrip'})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${formData.outstationSubType === 'RoundTrip' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Round Trip</button>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Destination</label>
                                            <Autocomplete 
                                                placeholder="Search Destination"
                                                onAddressSelect={(addr) => setFormData(prev => ({...prev, destination: addr}))}
                                                setNewPlace={(place) => setDestCoords(place)}
                                                defaultValue={formData.destination}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Days</label>
                                                <input type="number" value={formData.days} onChange={e => setFormData({...formData, days: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm text-center" />
                                            </div>
                                            {formData.outstationSubType === 'RoundTrip' && (
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Nights</label>
                                                    <input type="number" value={formData.nights} onChange={e => setFormData({...formData, nights: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm text-center" />
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Total Km</label>
                                                <input type="number" value={formData.estTotalKm} onChange={e => setFormData({...formData, estTotalKm: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm text-center" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Requirement / Notes */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase pl-2">Requirement Details</label>
                <textarea 
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                    placeholder={formData.enquiryCategory === 'Transport' ? "Trip details auto-populate here..." : "Enter general requirement details..."}
                />
            </div>

            {/* Assignment & Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-4">
                    <Building2 className="w-4 h-4" /> Assign Enquiry To
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {/* Simplified Assignment UI */}
                    <select 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                        value={formData.assignCorporate}
                        onChange={e => setFormData({...formData, assignCorporate: e.target.value})}
                    >
                        <option value="admin">Head Office</option>
                        {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                    </select>
                    <select 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                        value={formData.assignBranch}
                        onChange={e => setFormData({...formData, assignBranch: e.target.value})}
                    >
                        <option>All Branches</option>
                        {allBranches.filter(b => b.owner === formData.assignCorporate).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <select 
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                        value={formData.assignStaff}
                        onChange={e => setFormData({...formData, assignStaff: e.target.value})}
                    >
                        <option value="">Select Staff</option>
                        {allStaff.filter(s => s.corporateId === (formData.assignCorporate === 'admin' ? 'admin' : formData.assignCorporate)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <button className="py-3 border border-indigo-200 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" /> Schedule
                    </button>
                    <button 
                        onClick={handleSaveEnquiry}
                        className="py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" /> Book Now
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW & TOOLS */}
        <div className="space-y-6">
            
            {/* Estimate Display */}
            {formData.enquiryCategory === 'Transport' && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Estimated Cost</p>
                        <h3 className="text-5xl font-bold mb-6">₹{formData.estimate.toLocaleString()}</h3>
                        <p className="text-slate-400 text-sm border-t border-slate-700 pt-4 mt-4">
                            Includes basic fare calculations. Tolls & Parking extra.
                        </p>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                        <DollarSign size={200} />
                    </div>
                </div>
            )}

            {/* Generated Message Preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Message
                    </h3>
                    <button 
                        onClick={() => {navigator.clipboard.writeText(formData.notes); alert("Copied!");}}
                        className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                        <Copy className="w-3 h-3" /> Copy
                    </button>
                </div>
                <div className="p-6 bg-gray-50/50">
                    <div className="bg-white p-4 rounded-xl rounded-tl-none border border-gray-100 shadow-sm text-sm text-gray-700 leading-relaxed whitespace-pre-wrap relative">
                        <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent"></div>
                        <p className="font-bold text-gray-900 mb-2">Hello {formData.name || 'Customer'},</p>
                        <p>{formData.notes || "Estimate details will appear here..."}</p>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                    <button 
                        onClick={() => window.open(`https://wa.me/${formData.phone.replace(/\D/g,'')}?text=${encodeURIComponent(formData.notes)}`, '_blank')}
                        className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button 
                        onClick={() => window.location.href = `mailto:?body=${encodeURIComponent(formData.notes)}`}
                        className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
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

// Simple Icon Component for Display
const DollarSign = ({ size = 24 }: { size?: number }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
);

export default CustomerCare;
