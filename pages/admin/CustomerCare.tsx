
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headset, User, MapPin, Calculator, Phone, Mail, MessageCircle, 
  Settings, Save, Calendar, Clock, Edit2, CheckCircle, 
  AlertTriangle, Loader2, Building2, Copy, Send, Plus, Trash2, X, DollarSign, ArrowRight, ArrowRightLeft,
  Navigation, Car, Briefcase, History, RefreshCcw
} from 'lucide-react';
import { Enquiry, Employee, UserRole, Branch, TripType, OutstationSubType, VehicleType, EnquiryCategory } from '../../types';
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

  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    return JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
  });

  // --- Configuration State ---
  const [showRates, setShowRates] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Which profile are we currently editing? (Default to own session)
  const [configTargetId, setConfigTargetId] = useState<string>(sessionId);

  // Pricing Rules State
  const [pricing, setPricing] = useState<{ Sedan: PricingRules; SUV: PricingRules }>({
    Sedan: DEFAULT_PRICING_SEDAN,
    SUV: DEFAULT_PRICING_SUV
  });
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);
  
  // Package Management State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [pkgEditingId, setPkgEditingId] = useState<string | null>(null);
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
    enquiryCategory: 'Transport' as EnquiryCategory,
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
    notes: '',
    assignCorporate: isSuperAdmin ? 'admin' : sessionId,
    assignBranch: 'All Branches',
    assignStaff: '',
    followUpDate: '',
    followUpTime: '',
    priority: 'Warm'
  });

  const [customerHistory, setCustomerHistory] = useState<Enquiry[]>([]);
  const [estimate, setEstimate] = useState(0);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // --- Effects ---

  // Load Settings whenever the Config Target ID Changes
  useEffect(() => {
      // Determine the storage keys suffix based on target
      // If admin is selected (or default), key is base. If corporate selected, key has suffix.
      const suffix = configTargetId === 'admin' ? '' : `_${configTargetId}`;
      
      const savedPricing = localStorage.getItem(`transport_pricing_rules_v2${suffix}`);
      const savedPackages = localStorage.getItem(`transport_rental_packages_v2${suffix}`);

      if (savedPricing) {
          setPricing(JSON.parse(savedPricing));
      } else {
          // If no specific settings found, fall back to defaults (or global defaults if you prefer)
          setPricing({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
      }

      if (savedPackages) {
          setRentalPackages(JSON.parse(savedPackages));
      } else {
          setRentalPackages(DEFAULT_RENTAL_PACKAGES);
      }
  }, [configTargetId]);

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
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsMapReady(true);
        script.onerror = () => setMapError("Map Load Failed");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google) setIsMapReady(true);
    }
  }, []);

  // Sync rental package selection to valid default
  useEffect(() => {
      if (!rentalPackages.find(p => p.id === formData.packageId) && rentalPackages.length > 0) {
          setFormData(prev => ({ ...prev, packageId: rentalPackages[0].id }));
      }
  }, [rentalPackages]);

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

  // Dynamic Rules Text Generation
  const currentRulesText = useMemo(() => {
    const r = pricing[formData.vehicleType];
    if (formData.tripType === 'Local') {
        return `Current Rules (${formData.vehicleType} - Local): Min ${r.localBaseKm}km Base ₹${r.localBaseFare}. Rate ₹${r.localPerKmRate}/km. Wait ₹${r.localWaitingRate}/min.`;
    } else if (formData.tripType === 'Rental') {
        return `Current Rules (${formData.vehicleType} - Rental): Extra ₹${r.rentalExtraHrRate}/hr & ₹${r.rentalExtraKmRate}/km.`;
    } else {
        if (formData.outstationSubType === 'RoundTrip') {
            return `Current Rules (${formData.vehicleType} - RoundTrip): Min ${r.outstationMinKmPerDay}km/day. Rate ₹${r.outstationExtraKmRate}/km. Driver ₹${r.outstationDriverAllowance}/day. Night Allow ₹${r.outstationNightAllowance}.`;
        } else {
            return `Current Rules (${formData.vehicleType} - OneWay): Base ₹${r.outstationBaseRate}. Rate ₹${r.outstationExtraKmRate}/km. Driver ₹${r.outstationDriverAllowance}. No Night Allow.`;
        }
    }
  }, [pricing, formData.vehicleType, formData.tripType, formData.outstationSubType]);

  // Generate Message
  useEffect(() => {
    let msg = `Hello ${formData.name || 'Customer'},\n`;
    
    if (formData.enquiryCategory === 'General') {
        msg += `Here is your Local estimate from OK BOZ! 🚕\n\n*General Enquiry*\nRequirement:\n${formData.notes || 'N/A'}`;
    } else {
        msg += `Here is your Local estimate from OK BOZ! 🚕\n\n*${formData.tripType} Trip Estimate*\n🚘 Vehicle: ${formData.vehicleType}`;
        
        if (formData.tripType === 'Local') {
            msg += `\n📍 Pickup: ${formData.pickup || 'TBD'}\n📍 Drop: ${formData.drop || 'TBD'}\n🛣 Distance: ${formData.estKm} km`;
        } else if (formData.tripType === 'Rental') {
            const pkg = rentalPackages.find(p => p.id === formData.packageId);
            msg += `\n📦 Package: ${pkg?.name || 'Standard'}\n📍 Pickup: ${formData.pickup || 'TBD'}`;
        } else if (formData.tripType === 'Outstation') {
            msg += `\n🌍 Destination: ${formData.destination}\n🔄 Type: ${formData.outstationSubType === 'OneWay' ? 'One Way' : 'Round Trip'}\n📅 Days: ${formData.days}`;
        }
        
        msg += `\n\n💰 *Estimated Cost: ₹${estimate}*`;
        
        // Add Rules and Disclaimer
        msg += `\n\n📋 *Rules:* ${currentRulesText}`;
        msg += `\n\n*Toll and Parking, Permit Extra.*`;
    }
    
    // Add App Promo
    msg += `\n\n🚕 Get moving with OK BOZ TAXI!

Fast, reliable, and just a tap away. Download the app now and book your first trip!

📱 Android: https://play.google.com/store/apps/details?id=com.okboz.user.superapp&hl=en 
🍎 iOS: https://apps.apple.com/us/app/ok-boz-super-app/id6738637246`;

    setGeneratedMessage(msg);
  }, [estimate, formData, currentRulesText, rentalPackages]);

  // --- Handlers ---

  const handleSaveConfiguration = () => {
      const suffix = configTargetId === 'admin' ? '' : `_${configTargetId}`;
      localStorage.setItem(`transport_pricing_rules_v2${suffix}`, JSON.stringify(pricing));
      localStorage.setItem(`transport_rental_packages_v2${suffix}`, JSON.stringify(rentalPackages));
      
      const targetName = configTargetId === 'admin' ? 'Head Office' : (corporates.find(c => c.email === configTargetId)?.companyName || 'Corporate');
      alert(`Configuration saved successfully for ${targetName}!`);
      setShowRates(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneBlur = () => {
      if (formData.phone.length < 5) return;
      // Find history
      const history = enquiries.filter(e => e.phone === formData.phone).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
      setCustomerHistory(history);
      
      // Auto-fill name if found
      if (history.length > 0 && !formData.name) {
          setFormData(prev => ({ ...prev, name: history[0].name }));
      }
  };

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.priceSedan) return;
    
    if (pkgEditingId) {
        // Edit Mode
        setRentalPackages(prev => prev.map(p => p.id === pkgEditingId ? {
            ...p,
            name: newPackage.name,
            hours: parseFloat(newPackage.hours) || 0,
            km: parseFloat(newPackage.km) || 0,
            priceSedan: parseFloat(newPackage.priceSedan) || 0,
            priceSuv: parseFloat(newPackage.priceSuv) || 0,
        } : p));
        setPkgEditingId(null);
    } else {
        // Add Mode
        const pkg: RentalPackage = {
            id: `pkg-${Date.now()}`,
            name: newPackage.name,
            hours: parseFloat(newPackage.hours) || 0,
            km: parseFloat(newPackage.km) || 0,
            priceSedan: parseFloat(newPackage.priceSedan) || 0,
            priceSuv: parseFloat(newPackage.priceSuv) || 0,
        };
        setRentalPackages([...rentalPackages, pkg]);
    }
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const startEditPackage = (pkg: RentalPackage) => {
      setNewPackage({
          name: pkg.name,
          hours: pkg.hours.toString(),
          km: pkg.km.toString(),
          priceSedan: pkg.priceSedan.toString(),
          priceSuv: pkg.priceSuv.toString()
      });
      setPkgEditingId(pkg.id);
      setShowAddPackage(true);
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
      // Reset form partly
      setFormData(prev => ({
          ...prev, 
          name: '', phone: '', pickup: '', drop: '', estKm: '', notes: '', 
          estTotalKm: '', destination: '', days: '1', nights: '0'
      }));
      setCustomerHistory([]);
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
            <Settings className="w-4 h-4" /> {showRates ? 'Hide Rates' : 'Fare Configuration'}
        </button>
      </div>

      {showRates && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            {/* Header: Title and Profile Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-100 pb-4 gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                        <Edit2 className="w-5 h-5 text-indigo-600"/> Fare Configuration
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Set basic tariffs for Local, Rental & Outstation trips.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Admin Profile Selector */}
                    {isSuperAdmin && (
                        <div className="relative">
                            <select 
                                value={configTargetId} 
                                onChange={(e) => setConfigTargetId(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-indigo-200 bg-indigo-50 text-indigo-800 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none min-w-[200px]"
                            >
                                <option value="admin">Head Office (Default)</option>
                                {corporates.map(c => (
                                    <option key={c.email} value={c.email}>{c.companyName} - {c.city}</option>
                                ))}
                            </select>
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                        </div>
                    )}

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>Sedan</button>
                        <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>SUV</button>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Local */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> LOCAL RULES ({settingsVehicleType})</h4>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <div><label className="text-[10px] text-gray-500 block">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Base Km Included</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Extra Km Rate (₹/km)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        <div><label className="text-[10px] text-gray-500 block">Waiting Charge (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                    </div>
                </div>
                {/* Outstation */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-orange-600 uppercase flex items-center gap-1"><Navigation className="w-3 h-3"/> OUTSTATION RULES ({settingsVehicleType})</h4>
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
                    <h4 className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1"><Briefcase className="w-3 h-3"/> RENTAL RULES ({settingsVehicleType})</h4>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1"><label className="text-[10px] text-gray-500 block">Extra Hr (₹)</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                            <div className="flex-1"><label className="text-[10px] text-gray-500 block">Extra Km (₹)</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-sm"/></div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-gray-600">Packages</span>
                                <button onClick={() => { setShowAddPackage(!showAddPackage); setPkgEditingId(null); setNewPackage({name:'', hours:'', km:'', priceSedan:'', priceSuv:''}); }} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100">+ New</button>
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
                                    <button onClick={handleAddPackage} className="w-full bg-blue-600 text-white text-[10px] py-1 rounded">{pkgEditingId ? 'Update' : 'Save'}</button>
                                </div>
                            )}

                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {rentalPackages.map(pkg => (
                                    <div key={pkg.id} className="flex justify-between items-center text-xs p-1 bg-white border rounded group">
                                        <div>
                                            <span className="font-bold">{pkg.name}</span>
                                            <span className="text-[10px] text-gray-500 ml-1">({pkg.hours}h/{pkg.km}km)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono text-gray-500 text-[10px]">S:{pkg.priceSedan} X:{pkg.priceSuv}</span>
                                            <button onClick={() => startEditPackage(pkg)} className="text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 p-1"><Edit2 className="w-3 h-3" /></button>
                                            <button onClick={(e) => removePackage(pkg.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setShowRates(false)} className="px-6 py-2 border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSaveConfiguration} className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 shadow-md flex items-center gap-2 transition-colors">
                    <Save className="w-4 h-4" /> Save Configuration
                </button>
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
                      <input name="phone" value={formData.phone} onChange={handleInputChange} onBlur={handlePhoneBlur} placeholder="Phone" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  
                  {/* Customer History Peek */}
                  {customerHistory.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3"/> Booking History</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                              {customerHistory.map(h => (
                                  <div key={h.id} className="text-xs bg-gray-50 p-2 rounded border border-gray-100 flex justify-between">
                                      <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                                      <span className="font-medium text-emerald-600">{h.tripType || 'General'}</span>
                                      <span className="text-gray-500">{h.status}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>

              {/* Enquiry Category Toggle */}
              <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                  <button onClick={() => setFormData(prev => ({...prev, enquiryCategory: 'Transport'}))} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formData.enquiryCategory === 'Transport' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-gray-500 hover:bg-gray-50'}`}>Transport</button>
                  <button onClick={() => setFormData(prev => ({...prev, enquiryCategory: 'General'}))} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formData.enquiryCategory === 'General' ? 'bg-gray-100 text-gray-800 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>General</button>
              </div>

              {formData.enquiryCategory === 'Transport' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in">
                    <h3 className="font-bold text-gray-800 mb-4">Trip Details</h3>
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

                    {/* DYNAMIC FORM FIELDS */}
                    <div className="space-y-4">
                        {formData.tripType === 'Local' && (
                            <>
                                <label className="block text-xs font-bold text-gray-500 uppercase">PICKUP LOCATION</label>
                                <Autocomplete 
                                    placeholder="Search Pickup" 
                                    onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} 
                                    setNewPlace={setPickupCoords} 
                                    defaultValue={formData.pickup} 
                                />
                                <label className="block text-xs font-bold text-gray-500 uppercase mt-2">DROP LOCATION</label>
                                <Autocomplete 
                                    placeholder="Search Drop" 
                                    onAddressSelect={addr => setFormData(prev => ({...prev, drop: addr}))} 
                                    setNewPlace={setDropCoords} 
                                    defaultValue={formData.drop} 
                                />
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <input type="number" name="estKm" value={formData.estKm} onChange={handleInputChange} placeholder="Est Km" className="p-2 border rounded-lg w-full text-sm" />
                                    <input type="number" name="waitingMins" value={formData.waitingMins} onChange={handleInputChange} placeholder="Wait Mins" className="p-2 border rounded-lg w-full text-sm" />
                                </div>
                            </>
                        )}

                        {formData.tripType === 'Rental' && (
                            <>
                                <label className="block text-xs font-bold text-gray-500 uppercase">PICKUP LOCATION</label>
                                <Autocomplete 
                                    placeholder="Search Pickup" 
                                    onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} 
                                    setNewPlace={setPickupCoords} 
                                    defaultValue={formData.pickup} 
                                />
                                <label className="block text-xs font-bold text-gray-500 uppercase mt-2">SELECT PACKAGE</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {rentalPackages.map(pkg => (
                                        <button key={pkg.id} onClick={() => setFormData(prev => ({...prev, packageId: pkg.id}))} className={`p-2 border rounded text-left text-xs ${formData.packageId === pkg.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-gray-50'}`}>
                                            <div className="font-bold">{pkg.name}</div>
                                            <div className="text-gray-500">₹{formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {formData.tripType === 'Outstation' && (
                            <>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setFormData(prev => ({...prev, outstationSubType: 'OneWay'}))} className={`flex-1 text-xs py-2 rounded font-bold border ${formData.outstationSubType === 'OneWay' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-500 border-gray-200'}`}><ArrowRight className="w-3 h-3 inline mr-1"/> One Way</button>
                                    <button onClick={() => setFormData(prev => ({...prev, outstationSubType: 'RoundTrip'}))} className={`flex-1 text-xs py-2 rounded font-bold border ${formData.outstationSubType === 'RoundTrip' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-500 border-gray-200'}`}><ArrowRightLeft className="w-3 h-3 inline mr-1"/> Round Trip</button>
                                </div>
                                <label className="block text-xs font-bold text-gray-500 uppercase">PICKUP LOCATION</label>
                                <Autocomplete 
                                    placeholder="Search Pickup" 
                                    onAddressSelect={addr => setFormData(prev => ({...prev, pickup: addr}))} 
                                    setNewPlace={setPickupCoords} 
                                    defaultValue={formData.pickup} 
                                />
                                <label className="block text-xs font-bold text-gray-500 uppercase mt-2">DESTINATION</label>
                                <Autocomplete 
                                    placeholder="Search Destination" 
                                    onAddressSelect={addr => setFormData(prev => ({...prev, destination: addr}))} 
                                    setNewPlace={setDestCoords} 
                                    defaultValue={formData.destination} 
                                />
                                <div className="grid grid-cols-3 gap-3 mt-2">
                                    <input type="number" name="days" value={formData.days} onChange={handleInputChange} placeholder="Days" className="p-2 border rounded-lg w-full text-sm" />
                                    <input type="number" name="estTotalKm" value={formData.estTotalKm} onChange={handleInputChange} placeholder="Total Km" className="p-2 border rounded-lg w-full text-sm" />
                                    {formData.outstationSubType === 'RoundTrip' && (
                                        <input type="number" name="nights" value={formData.nights} onChange={handleInputChange} placeholder="Nights" className="p-2 border rounded-lg w-full text-sm" />
                                    )}
                                </div>
                            </>
                        )}
                        
                        {/* CURRENT RULES YELLOW BOX */}
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex gap-2 items-start text-xs text-orange-800 mt-4">
                            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                            <span className="font-medium">{currentRulesText}</span>
                        </div>
                    </div>
                </div>
              )}

              {/* Requirement Details */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">REQUIREMENT DETAILS</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Special requests, extra luggage, etc..." />
              </div>

              {/* Assignment & Schedule */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Building2 className="w-3 h-3"/> ASSIGN ENQUIRY TO</label>
                      <div className="flex gap-2">
                          {isSuperAdmin && (
                              <select name="assignCorporate" value={formData.assignCorporate} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                                  <option value="admin">Head Office</option>
                                  {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                              </select>
                          )}
                          <select name="assignBranch" value={formData.assignBranch} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                              <option>All Branches</option>
                              {allBranches.filter(b => isSuperAdmin ? (formData.assignCorporate === 'admin' ? b.owner === 'admin' : b.owner === formData.assignCorporate) : true).map(b => (
                                  <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                          </select>
                          <select name="assignStaff" value={formData.assignStaff} onChange={handleInputChange} className="flex-1 p-2 border rounded-lg text-sm bg-white">
                              <option value="">Select Staff</option>
                              {allStaff
                                .filter(s => isSuperAdmin ? (formData.assignCorporate === 'admin' ? s.corporateId === 'admin' : s.corporateId === formData.assignCorporate) : true)
                                .filter(s => formData.assignBranch === 'All Branches' || s.branch === formData.assignBranch)
                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                              }
                          </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow-up Date</label>
                          <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                          <select name="priority" value={formData.priority} onChange={handleInputChange as any} className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white">
                              <option>Hot</option>
                              <option>Warm</option>
                              <option>Cold</option>
                          </select>
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button className="flex-1 border border-blue-500 text-blue-600 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"><Calendar className="w-4 h-4"/> Schedule</button>
                      <button onClick={handleSaveEnquiry} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"><ArrowRight className="w-4 h-4"/> Book Now</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                      <button onClick={() => setFormData({...formData, name:'', phone:'', notes:''})} className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center gap-1 py-2"><X className="w-3 h-3"/> Cancel</button>
                      <button onClick={handleSaveEnquiry} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold flex items-center justify-center gap-1 py-2 bg-emerald-50 rounded-lg border border-emerald-100"><Save className="w-3 h-3"/> Save Enquiry</button>
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
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap min-h-[200px]">
                      {generatedMessage}
                  </div>
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
