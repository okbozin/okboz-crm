
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Headset, Search, Filter, Phone, Mail, MapPin, 
  Calendar, User, ArrowRight, Building2, Calculator, 
  Edit2, Plus, Trash2, Car, Settings, ArrowRightLeft, Loader2, AlertTriangle, Copy,
  X, Save, MessageCircle, Clock, CheckCircle, RefreshCcw
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
  localBaseFare: 100, localBaseKm: 0, localPerKmRate: 0, localWaitingRate: 0,
  rentalExtraKmRate: 0, rentalExtraHrRate: 0,
  outstationMinKmPerDay: 0, outstationBaseRate: 4300, outstationExtraKmRate: 0,
  outstationDriverAllowance: 0, outstationNightAllowance: 0 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 150, localBaseKm: 0, localPerKmRate: 0, localWaitingRate: 0,
  rentalExtraKmRate: 0, rentalExtraHrRate: 0,
  outstationMinKmPerDay: 0, outstationBaseRate: 5500, outstationExtraKmRate: 0,
  outstationDriverAllowance: 0, outstationNightAllowance: 0 
};

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // Ref for scrolling to form
  const formRef = useRef<HTMLDivElement>(null);

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
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // State to track which Corporate's settings we are editing.
  const [settingsTargetId, setSettingsTargetId] = useState(isSuperAdmin ? 'admin' : sessionId);

  const [pricing, setPricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);

  // Load Settings when Target ID changes
  useEffect(() => {
      const loadSettings = () => {
          const suffix = settingsTargetId === 'admin' ? '' : `_${settingsTargetId}`;
          
          const pricingKey = `transport_pricing_rules_v2${suffix}`;
          const pricingSaved = localStorage.getItem(pricingKey);
          
          if (pricingSaved) {
              setPricing(JSON.parse(pricingSaved));
          } else {
              setPricing({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
          }

          const pkgKey = `transport_rental_packages_v2${suffix}`;
          const pkgSaved = localStorage.getItem(pkgKey);
          
          if (pkgSaved) {
              setRentalPackages(JSON.parse(pkgSaved));
          } else {
              setRentalPackages(DEFAULT_RENTAL_PACKAGES);
          }
      };
      loadSettings();
  }, [settingsTargetId]);

  // Save Settings
  useEffect(() => {
      const suffix = settingsTargetId === 'admin' ? '' : `_${settingsTargetId}`;
      localStorage.setItem(`transport_pricing_rules_v2${suffix}`, JSON.stringify(pricing));
      localStorage.setItem(`transport_rental_packages_v2${suffix}`, JSON.stringify(rentalPackages));
  }, [pricing, rentalPackages, settingsTargetId]);


  // --- Form & Calculator State ---
  const [editingEnquiryId, setEditingEnquiryId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    enquiryCategory: 'Transport' as EnquiryCategory,
    
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
    notes: '',
    
    // Assignment
    assignCorporate: isSuperAdmin ? 'admin' : sessionId,
    assignBranch: 'All Branches',
    assignStaff: '',
    followUpDate: '',
    followUpTime: '',
    priority: 'Warm'
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Maps State
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Google Maps Error: Billing is not enabled. Please enable billing in Google Cloud Console.");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Add in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Google Maps Error: Billing not enabled. Please enable billing in Google Cloud Console.");
      if (originalAuthFailure) originalAuthFailure();
    };

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapReady(true);
      return;
    }

    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
              setIsMapReady(true);
            } else {
              setMapError("Google Maps 'places' library failed to load.");
            }
        };
        script.onerror = () => setMapError("Network error: Failed to load Google Maps script.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => {
          if (window.google && window.google.maps && window.google.maps.places) {
            setIsMapReady(true);
          }
        });
        if (window.google && window.google.maps && window.google.maps.places) {
            setIsMapReady(true);
        }
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
      pricing, formData.name, formData.pickup, formData.drop, formData.destination
  ]);

  const calculateEstimate = () => {
      let total = 0;
      let msg = '';
      const currentRules = pricing[formData.vehicleType];
      const customerName = formData.name || 'Customer';
      const pickupLoc = formData.pickup || 'TBD';

      if (formData.tripType === 'Local') {
          const dist = parseFloat(formData.estKm) || 0;
          const wait = parseFloat(formData.waitingMins) || 0;
          const dropLoc = formData.drop || '';
          
          let extraKmCost = 0;
          if (dist > currentRules.localBaseKm) {
              extraKmCost = (dist - currentRules.localBaseKm) * currentRules.localPerKmRate;
          }
          total = currentRules.localBaseFare + extraKmCost + (wait * currentRules.localWaitingRate);
          
          msg = `Hello ${customerName},
Here is your Local estimate from OK BOZ! 🚕

*Local Trip Estimate*
🚘 Vehicle: ${formData.vehicleType}
📍 Pickup: ${pickupLoc}
📍 Drop: ${dropLoc}

📝 Details: Local Trip: ${dist}km
⏳ Waiting Time: ${wait} mins


💰 *Base Fare: ₹${Math.round(total)}*
(Includes Base Fare + Km)

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;

      } 
      else if (formData.tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === formData.packageId);
          if (pkg) {
              total = formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              msg = `Hello ${customerName},
Here is your Rental estimate from OK BOZ! 🚕

*Rental Trip Estimate*
🚘 Vehicle: ${formData.vehicleType}
📍 Pickup: ${pickupLoc}


📝 Details: 

📦 Package: ${pkg.name}

💰 *Base Fare: ₹${Math.round(total)}*
(Includes Package Rate)

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;
          } else {
              msg = 'Select a package';
          }
      } 
      else if (formData.tripType === 'Outstation') {
          const days = parseFloat(formData.days) || 1;
          const km = parseFloat(formData.estTotalKm) || 0;
          const destLoc = formData.destination || '';
          const driverCost = currentRules.outstationDriverAllowance * days;
          
          if (formData.outstationSubType === 'RoundTrip') {
              const nights = parseFloat(formData.nights) || 0;
              const nightCost = currentRules.outstationNightAllowance * nights;
              const minKm = days * currentRules.outstationMinKmPerDay;
              const chargeableKm = Math.max(km, minKm);
              const kmCost = chargeableKm * currentRules.outstationExtraKmRate;
              total = kmCost + driverCost + nightCost;
              
              msg = `Hello ${customerName},
Here is your Outstation estimate from OK BOZ! 🚕

*Outstation Trip Estimate*
🚘 Vehicle: ${formData.vehicleType}
📍 Pickup: ${pickupLoc}

🌍 Destination: ${destLoc}
📝 Details: Round Trip: ${days} days, ${km} km



💰 *Base Fare: ₹${Math.round(total)}*
(Includes Driver Allowance + Km)

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;

          } else {
              const kmCost = km * currentRules.outstationExtraKmRate;
              const base = currentRules.outstationBaseRate || 0;
              total = base + kmCost + driverCost;
              
              msg = `Hello ${customerName},
Here is your Outstation estimate from OK BOZ! 🚕

*Outstation Trip Estimate*
🚘 Vehicle: ${formData.vehicleType}
📍 Pickup: ${pickupLoc}

🌍 Destination: ${destLoc}
📝 Details: One Way: ${km} km



💰 *Base Fare: ₹${Math.round(total)}*
(Includes Driver Allowance + Km)

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;
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

  const handleSaveEnquiry = (targetStatus?: string) => {
      const statusToUse = typeof targetStatus === 'string' ? targetStatus : undefined;

      if (!formData.name || !formData.phone) {
          alert("Name and Phone are required.");
          return;
      }

      if (statusToUse === 'Scheduled' && !formData.followUpDate) {
          alert("Please select a Follow-up Date to schedule.");
          return;
      }

      let updatedEnquiries = [...enquiries];

      if (editingEnquiryId) {
          updatedEnquiries = updatedEnquiries.map(enq => {
              if (enq.id === editingEnquiryId) {
                  return {
                      ...enq,
                      name: formData.name,
                      phone: formData.phone,
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
                      details: formData.notes,
                      assignedTo: formData.assignStaff,
                      nextFollowUp: formData.followUpDate,
                      priority: formData.priority as any,
                      status: statusToUse ? (statusToUse as any) : enq.status
                  };
              }
              return enq;
          });
      } else {
          const newEnquiry: Enquiry = {
              id: `ENQ-${Date.now()}`,
              type: 'Customer',
              initialInteraction: 'Incoming',
              name: formData.name,
              phone: formData.phone,
              city: '',
              details: formData.notes,
              status: statusToUse ? (statusToUse as any) : 'New',
              createdAt: new Date().toLocaleString(),
              date: formData.followUpDate || new Date().toISOString().split('T')[0],
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
              nextFollowUp: formData.followUpDate,
              history: [],
              priority: formData.priority as any
          };
          updatedEnquiries = [newEnquiry, ...updatedEnquiries];
      }

      setEnquiries(updatedEnquiries);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedEnquiries));
      
      // Reset form
      setEditingEnquiryId(null);
      setFormData(prev => ({
          ...prev, 
          name: '', phone: '', pickup: '', drop: '', destination: '', 
          estKm: '', estTotalKm: '', notes: '', estimate: 0,
          assignStaff: '', followUpDate: '', followUpTime: ''
      }));
      alert(editingEnquiryId ? "Enquiry Updated!" : (statusToUse === 'Scheduled' ? "Enquiry Scheduled!" : "Enquiry Created Successfully!"));
  };

  const handleEditEnquiry = (enq: Enquiry) => {
      setEditingEnquiryId(enq.id);
      setFormData(prev => ({
          ...prev,
          name: enq.name,
          phone: enq.phone,
          enquiryCategory: enq.enquiryCategory || 'Transport',
          tripType: enq.tripType || 'Local',
          vehicleType: enq.vehicleType || 'Sedan',
          outstationSubType: enq.outstationSubType || 'RoundTrip',
          pickup: enq.transportData?.pickup || '',
          drop: enq.transportData?.drop || '',
          estKm: enq.transportData?.estKm || '',
          waitingMins: enq.transportData?.waitingMins || '',
          packageId: enq.transportData?.packageId || '',
          destination: enq.transportData?.destination || '',
          days: enq.transportData?.days || '1',
          estTotalKm: enq.transportData?.estTotalKm || '',
          nights: enq.transportData?.nights || '0',
          estimate: enq.estimatedPrice || 0,
          notes: enq.details,
          assignStaff: enq.assignedTo || '',
          followUpDate: enq.nextFollowUp || '',
          priority: enq.priority || 'Warm'
      }));
      // Scroll to form
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateStatus = (id: string, newStatus: string) => {
      const updated = enquiries.map(e => e.id === id ? { ...e, status: newStatus as any } : e);
      setEnquiries(updated);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updated));
  };

  // Filtered List
  const filteredEnquiries = enquiries.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            e.phone.includes(searchTerm) || 
                            e.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      const matchesDate = !dateFilter || e.createdAt.includes(dateFilter); // simplified date check
      
      return matchesSearch && matchesStatus && matchesDate;
  });

  // Available Staff for Assignment
  const availableStaff = useMemo(() => {
      let staff = allStaff.filter(s => s && s.corporateId === (formData.assignCorporate === 'admin' ? 'admin' : formData.assignCorporate));
      if (formData.assignBranch && formData.assignBranch !== 'All Branches') {
          staff = staff.filter(s => s.branch === formData.assignBranch);
      }
      return staff.filter(s => s.status !== 'Inactive');
  }, [allStaff, formData.assignCorporate, formData.assignBranch]);

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
                <Edit2 className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Fare Configuration'}
            </button>
        )}
      </div>

      {/* Map Error Display */}
      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" /> {mapError}
        </div>
      )}

      {/* FARE CONFIGURATION PANEL */}
      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 mb-6 shadow-inner">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-3">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><Edit2 className="w-5 h-5 text-indigo-500" /> Fare Configuration</h3>
                 
                 {/* Corporate Selection for Admin */}
                 {isSuperAdmin ? (
                    <div className="relative">
                        <select 
                            value={settingsTargetId}
                            onChange={(e) => setSettingsTargetId(e.target.value)}
                            className="bg-white border border-indigo-200 text-indigo-800 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="admin">Head Office (Global)</option>
                            {corporates.map((c) => (
                                <option key={c.id} value={c.email}>{c.companyName}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                 ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide font-bold bg-blue-100 text-blue-700 border-blue-200">
                        Franchise Custom
                    </span>
                 )}
             </div>
             
             {/* Vehicle Type Toggle */}
             <div className="bg-white border border-slate-300 rounded-lg p-1 flex shadow-sm">
                <button 
                   onClick={() => setSettingsVehicleType('Sedan')}
                   className={`px-6 py-1.5 text-sm font-bold rounded-md transition-all ${settingsVehicleType === 'Sedan' ? 'bg-emerald-50 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
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

      {/* FILTER & ORDER LIST SECTION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 bg-gray-50/50">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Search Orders (ID, Name, Phone)..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
              </div>
              <div className="flex gap-2">
                  <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none bg-white text-sm"
                  >
                      <option value="All">All Status</option>
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Booked">Booked</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                  </select>
                  <input 
                      type="date" 
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none bg-white text-sm"
                  />
                  <button 
                      onClick={() => {setSearchTerm(''); setStatusFilter('All'); setDateFilter('');}}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                  >
                      <RefreshCcw className="w-4 h-4" />
                  </button>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4">Order ID / Date</th>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Trip/Enquiry Info</th>
                          <th className="px-6 py-4">Assigned To</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredEnquiries.map(enq => {
                          const assignedName = allStaff.find(s => s.id === enq.assignedTo)?.name || 'Unassigned';
                          const tripInfo = enq.enquiryCategory === 'Transport' 
                              ? `${enq.tripType} (${enq.vehicleType})${enq.estimatedPrice ? `. Est: ₹${enq.estimatedPrice}` : ''}`
                              : enq.details.substring(0, 30);
                          
                          return (
                              <tr key={enq.id} className={`hover:bg-gray-50 transition-colors ${editingEnquiryId === enq.id ? 'bg-indigo-50/50' : ''}`}>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-900">{enq.id}</div>
                                      <div className="text-xs text-gray-500">{enq.createdAt ? new Date(enq.createdAt).toLocaleDateString() : '-'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-800">{enq.name}</div>
                                      <div className="text-xs text-gray-500">{enq.phone}</div>
                                  </td>
                                  <td className="px-6 py-4 max-w-xs truncate text-gray-600" title={enq.details}>
                                      {enq.enquiryCategory === 'Transport' ? (
                                          <div>
                                              <span className="font-medium">{tripInfo}</span>
                                              {enq.transportData?.pickup && (
                                                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                                                      {enq.transportData.pickup} &rarr; {enq.transportData.drop || enq.transportData.destination}
                                                  </div>
                                              )}
                                          </div>
                                      ) : (
                                          enq.details || 'No details'
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {assignedName}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                          enq.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          enq.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                          enq.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                          'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}>
                                          {enq.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <button 
                                              onClick={() => handleEditEnquiry(enq)}
                                              className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                                              title="Edit / Assign"
                                          >
                                              <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button 
                                              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded text-xs font-bold transition-colors"
                                              onClick={() => handleEditEnquiry(enq)} // Re-using edit to focus on form for assignment
                                          >
                                              Assign Driver
                                          </button>
                                          <button 
                                              onClick={() => updateStatus(enq.id, 'Completed')}
                                              className="bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded text-xs font-bold transition-colors"
                                          >
                                              Complete
                                          </button>
                                          <button 
                                              onClick={() => updateStatus(enq.id, 'Cancelled')}
                                              className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold transition-colors"
                                          >
                                              Cancel
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredEnquiries.length === 0 && (
                          <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-500">
                                  No enquiries found matching filters.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" ref={formRef}>
        
        {/* LEFT COLUMN: ENQUIRY FORM */}
        <div className="space-y-6">
            <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-colors ${editingEnquiryId ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" /> 
                        {editingEnquiryId ? 'Update Enquiry' : 'Customer Info'}
                    </h3>
                    {editingEnquiryId && (
                        <button 
                            onClick={() => {
                                setEditingEnquiryId(null);
                                setFormData(prev => ({ ...prev, name: '', phone: '', pickup: '', drop: '', destination: '', estKm: '', estTotalKm: '', notes: '', estimate: 0, assignStaff: '' }));
                            }}
                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Cancel Edit
                        </button>
                    )}
                </div>
                
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
                                    {!isMapReady ? (
                                        <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                        </div>
                                    ) : (
                                        <Autocomplete 
                                            placeholder="Search Pickup"
                                            onAddressSelect={(addr) => setFormData(prev => ({...prev, pickup: addr}))}
                                            setNewPlace={(place) => setPickupCoords(place)}
                                            defaultValue={formData.pickup}
                                        />
                                    )}
                                </div>

                                {formData.tripType === 'Local' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 space-y-1">
                                            <label className="block text-xs font-bold text-gray-500 uppercase">Drop Location</label>
                                            {!isMapReady ? (
                                                <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                                </div>
                                            ) : (
                                                <Autocomplete 
                                                    placeholder="Search Drop"
                                                    onAddressSelect={(addr) => setFormData(prev => ({...prev, drop: addr}))}
                                                    setNewPlace={(place) => setDropCoords(place)}
                                                    defaultValue={formData.drop}
                                                />
                                            )}
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
                                            {!isMapReady ? (
                                                <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                                </div>
                                            ) : (
                                                <Autocomplete 
                                                    placeholder="Search Destination"
                                                    onAddressSelect={(addr) => setFormData(prev => ({...prev, destination: addr}))}
                                                    setNewPlace={(place) => setDestCoords(place)}
                                                    defaultValue={formData.destination}
                                                />
                                            )}
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
                        {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* NEW DATE INPUTS */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow-up Date</label>
                        <input 
                            type="date" 
                            value={formData.followUpDate} 
                            onChange={e => setFormData({...formData, followUpDate: e.target.value})} 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                        <input 
                            type="time" 
                            value={formData.followUpTime} 
                            onChange={e => setFormData({...formData, followUpTime: e.target.value})} 
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <button 
                        onClick={() => handleSaveEnquiry('Scheduled')}
                        className="py-3 border border-indigo-200 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-4 h-4" /> Schedule
                    </button>
                    <button 
                        onClick={() => handleSaveEnquiry()}
                        className={`py-3 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 ${editingEnquiryId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                    >
                        {editingEnquiryId ? <RefreshCcw className="w-4 h-4"/> : <CheckCircle className="w-4 h-4" />} 
                        {editingEnquiryId ? 'Update Enquiry' : 'Book Now'}
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
                        <Calculator size={200} />
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

export default CustomerCare;
