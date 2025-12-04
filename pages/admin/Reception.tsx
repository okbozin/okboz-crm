
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Autocomplete from '../../components/Autocomplete';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee, Enquiry, HistoryLog } from '../../types';
import { generateGeminiResponse } from '../../services/geminiService';
import {
  Bell, Calculator, CheckCircle, Clock, Copy, Edit2, Loader2, Mail, MessageCircle,
  Phone, PhoneIncoming, PhoneOutgoing, Plus, RefreshCcw, ArrowRight, ArrowRightLeft,
  Save, Trash2, Truck, User, UserPlus, X, Building2, History, AlertCircle
} from 'lucide-react';

interface HistoryItem {
  id: number;
  time: string;
  type: string;
  details: string;
  status: string;
  name?: string; 
  city?: string; 
  assignedTo?: string; 
  date?: string; 
  phone?: string;
  loggedBy?: string;
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

const getExistingVendors = () => {
  const globalData = localStorage.getItem('vendor_data');
  return globalData ? JSON.parse(globalData) : [];
};

export const Reception: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem('global_enquiries_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [vendors] = useState<any[]>(getExistingVendors());
  
  const [corporateAccounts] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('corporate_accounts') || '[]'); } catch (e) { return []; }
  });

  const [recentTransfers, setRecentTransfers] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('reception_recent_transfers');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Load Dynamic Transport Settings ---
  const [pricing, setPricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_pricing_rules_v2' : `transport_pricing_rules_v2_${sessionId}`);
    // Fallback to global admin settings if specific session not found
    if (!saved && !isSuperAdmin) {
        const globalSettings = localStorage.getItem('transport_pricing_rules_v2');
        if (globalSettings) return JSON.parse(globalSettings);
    }
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem(isSuperAdmin ? 'transport_rental_packages_v2' : `transport_rental_packages_v2_${sessionId}`);
    // Fallback to global
    if (!saved && !isSuperAdmin) {
        const globalPkgs = localStorage.getItem('transport_rental_packages_v2');
        if (globalPkgs) return JSON.parse(globalPkgs);
    }
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  // --- Settings UI State ---
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Save history
  useEffect(() => {
    localStorage.setItem('reception_recent_transfers', JSON.stringify(recentTransfers));
  }, [recentTransfers]);

  // Sync enquiries
  useEffect(() => {
    localStorage.setItem('global_enquiries_data', JSON.stringify(enquiries));
  }, [enquiries]);

  // Sync Settings changes
  useEffect(() => {
      const suffix = isSuperAdmin ? '' : `_${sessionId}`;
      localStorage.setItem(`transport_pricing_rules_v2${suffix}`, JSON.stringify(pricing));
      localStorage.setItem(`transport_rental_packages_v2${suffix}`, JSON.stringify(rentalPackages));
  }, [pricing, rentalPackages, isSuperAdmin, sessionId]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'Incoming' | 'Outgoing'>('Incoming');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Lookup State
  const [isChecked, setIsChecked] = useState(false);
  const [lookupResult, setLookupResult] = useState<'New' | 'Existing' | null>(null);
  const [identifiedType, setIdentifiedType] = useState<'Customer' | 'Vendor' | null>(null);
  const [lookupHistory, setLookupHistory] = useState<HistoryItem[]>([]);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formCallerType, setFormCallerType] = useState<'Customer' | 'Vendor'>('Customer');
  // Form state for assignment, will be used in handleLogCall
  const [formLog, setFormLog] = useState({
    assignedTo: ''
  });
  
  // Console Transport Enquiry State
  const [consoleEnquiryType, setConsoleEnquiryType] = useState<'General' | 'Transport'>('General');
  const [consoleTaxiType, setConsoleTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  const [consoleOutstationType, setConsoleOutstationType] = useState<'RoundTrip' | 'OneWay'>('RoundTrip');
  const [consoleVehicleType, setConsoleVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [consoleCalcDetails, setConsoleCalcDetails] = useState({
     pickup: '', drop: '', estKm: '', waitingMins: '', packageId: '', // packageId dynamic
     destination: '', days: '1', estTotalKm: '', nights: '0'
  });
  const [consoleEstimate, setConsoleEstimate] = useState(0);
  
  // Initialize rental package selection
  useEffect(() => {
      if (rentalPackages.length > 0 && !consoleCalcDetails.packageId) {
          setConsoleCalcDetails(prev => ({...prev, packageId: rentalPackages[0].id}));
      }
      if (rentalPackages.length > 0 && !calcDetails.packageId) {
          setCalcDetails(prev => ({...prev, packageId: rentalPackages[0].id}));
      }
  }, [rentalPackages]);

  // Maps Coords State
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    city: '',
    details: '',
    status: '',
    assignedTo: ''
  });
  
  // Transport Calculator State (Edit Modal)
  const [editEnquiryType, setEditEnquiryType] = useState<'General' | 'Transport'>('General');
  const [editTransportService, setEditTransportService] = useState<'Taxi' | 'Load Xpress'>('Taxi');
  const [editTaxiType, setEditTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  const [editOutstationType, setEditOutstationType] = useState<'OneWay' | 'RoundTrip'>('RoundTrip');
  const [editVehicleType, setEditVehicleType] = useState<'Sedan' | 'SUV'>('Sedan'); // Added vehicle type to Edit
  const [calcDetails, setCalcDetails] = useState({
     pickup: '', drop: '', estKm: '', waitingMins: '', packageId: '',
     destination: '', days: '1', estTotalKm: '', nights: '0'
  });
  const [editEstimate, setEditEstimate] = useState(0);
  const [editEstimateMsg, setEditEstimateMsg] = useState('');

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

  useEffect(() => {
    // Basic check for maps
    if (window.google && window.google.maps) {
        setIsMapReady(true);
    }
  }, []);

  // Distance Calculation Effect
  useEffect(() => {
    if (!window.google || !pickupCoords || !consoleTaxiType) return;

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
                        setConsoleCalcDetails(prev => ({ ...prev, estTotalKm: formattedDist }));
                    } else {
                        setConsoleCalcDetails(prev => ({ ...prev, estKm: formattedDist }));
                    }
                }
            }
        );
    };

    if (consoleTaxiType === 'Local' && dropCoords) {
        calculateDistance(dropCoords, false, false);
    } else if (consoleTaxiType === 'Outstation' && destCoords) {
        const isRoundTrip = consoleOutstationType === 'RoundTrip';
        calculateDistance(destCoords, isRoundTrip, true); 
    }

  }, [pickupCoords, dropCoords, destCoords, consoleTaxiType, consoleOutstationType]);

  const handleCheck = () => {
    if (phoneNumber.length < 5) return;
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    let found = false;
    let type: 'Customer' | 'Vendor' | null = null;
    let name = '';
    let city = '';

    // 1. Check Vendors
    const vendor = vendors.find((v: any) => v.phone && v.phone.replace(/\D/g, '').includes(cleanNumber));
    if (vendor) {
        found = true;
        type = 'Vendor';
        name = vendor.ownerName;
        city = vendor.city;
    }

    // 2. Check Enquiries if not found
    if (!found) {
        const prev = enquiries.find(e => e.phone && e.phone.replace(/\D/g, '').includes(cleanNumber));
        if (prev) {
            found = true;
            type = prev.type as any;
            name = prev.name;
            city = prev.city;
        }
    }

    // 3. Get History
    const history = recentTransfers.filter(item => item.phone && item.phone.replace(/\D/g, '').includes(cleanNumber));
    
    if (found) {
        setLookupResult('Existing');
        setIdentifiedType(type);
        setFormName(name);
        setFormCity(city);
        if (type) setFormCallerType(type);
    } else {
        setLookupResult('New');
        setIdentifiedType(null);
        setFormName('');
        setFormCity('');
    }
    
    setLookupHistory(history);
    setIsChecked(true);
    setConsoleEnquiryType('General'); // Reset to general
    setFormNote('');
  };

  const handleLogCall = (status: 'Message Taken' | 'Transferred') => {
    if (!formName || !formCity) {
        alert("Please enter Name and City.");
        return;
    }
    setIsSubmitting(true);

    setTimeout(() => {
        // 1. Create History Log
        const newItem: HistoryItem = {
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toISOString().split('T')[0],
            type: `${activeTab} ${formCallerType} ${consoleEnquiryType === 'Transport' ? '(Taxi)' : ''}`,
            details: formNote || 'No notes',
            status: status,
            name: formName,
            city: formCity,
            assignedTo: formLog.assignedTo, // Using formLog.assignedTo here
            phone: phoneNumber,
            loggedBy: sessionId
        };

        setRecentTransfers(prev => [newItem, ...prev]);

        // 2. Update/Create Enquiry (Avoid Duplicate)
        const existingEnquiryIndex = enquiries.findIndex(e => e.phone === phoneNumber);
        let updatedEnquiries = [...enquiries];

        if (existingEnquiryIndex >= 0) {
            // Update Existing
            const existing = updatedEnquiries[existingEnquiryIndex];
            
            const newHistoryLog = {
                id: Date.now(),
                type: 'Call' as const,
                message: `${activeTab} Call - ${status}. ${formNote}`,
                date: new Date().toLocaleString(),
                outcome: 'Connected'
            };

            updatedEnquiries[existingEnquiryIndex] = {
                ...existing,
                status: 'In Progress',
                details: formNote || existing.details, // Update note logic
                history: [newHistoryLog, ...existing.history]
            };
        } else {
            // Create New
            const newEnquiry: Enquiry = {
                id: `ENQ-${Date.now()}`,
                type: formCallerType,
                initialInteraction: activeTab,
                name: formName,
                phone: phoneNumber,
                city: formCity,
                details: formNote,
                status: 'New',
                createdAt: new Date().toLocaleString(),
                history: [{
                    id: Date.now(),
                    type: 'Call',
                    message: `${activeTab} Call - ${status}`,
                    date: new Date().toLocaleString(),
                    outcome: 'Connected'
                }]
            };
            updatedEnquiries = [newEnquiry, ...updatedEnquiries];
        }
        
        setEnquiries(updatedEnquiries);
        localStorage.setItem('global_enquiries_data', JSON.stringify(updatedEnquiries));
        
        // Reset
        setIsSubmitting(false);
        setIsChecked(false);
        setPhoneNumber('');
        setFormName('');
        setFormCity('');
        setFormNote('');
        setLookupResult(null);
        setLookupHistory([]);
        setConsoleEnquiryType('General');
    }, 600);
  };

  // --- Transport Calculator Logic (Console) ---
  useEffect(() => {
    if (consoleEnquiryType === 'Transport') {
        calculateConsoleEstimate();
    }
  }, [consoleCalcDetails, consoleTaxiType, consoleOutstationType, consoleEnquiryType, consoleVehicleType]);

  const calculateConsoleEstimate = () => {
      let total = 0;
      let msg = '';
      
      const currentRules = pricing[consoleVehicleType];

      if (consoleTaxiType === 'Local') {
          const dist = parseFloat(consoleCalcDetails.estKm) || 0;
          const wait = parseFloat(consoleCalcDetails.waitingMins) || 0;
          
          let extraKmCost = 0;
          if (dist > currentRules.localBaseKm) {
              extraKmCost = (dist - currentRules.localBaseKm) * currentRules.localPerKmRate;
          }
          
          total = currentRules.localBaseFare + extraKmCost + (wait * currentRules.localWaitingRate);
          msg = `Local Trip (${consoleVehicleType}): Pickup ${consoleCalcDetails.pickup} -> Drop ${consoleCalcDetails.drop}, ${dist}km. Est: ₹${total}`;
      } else if (consoleTaxiType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === consoleCalcDetails.packageId);
          if (pkg) {
              total = consoleVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              msg = `Rental Package (${consoleVehicleType} - ${pkg.name}): ₹${total}`;
          } else {
              msg = 'Select a package';
          }
      } else if (consoleTaxiType === 'Outstation') {
          const days = parseFloat(consoleCalcDetails.days) || 1;
          const km = parseFloat(consoleCalcDetails.estTotalKm) || 0;
          const driverCost = currentRules.outstationDriverAllowance * days;
          
          if (consoleOutstationType === 'RoundTrip') {
              const nights = parseFloat(consoleCalcDetails.nights) || 0;
              const nightCost = currentRules.outstationNightAllowance * nights;
              const minKm = days * currentRules.outstationMinKmPerDay;
              const chargeableKm = Math.max(km, minKm);
              
              const kmCost = chargeableKm * currentRules.outstationExtraKmRate;
              total = kmCost + driverCost + nightCost;
              msg = `Outstation Round Trip (${consoleVehicleType}): ${consoleCalcDetails.destination}, ${days} days, ${km} km. Est: ₹${total}`;
          } else {
              // One Way
              const kmCost = km * currentRules.outstationExtraKmRate;
              // Add Base Rate for OneWay if configured
              const base = currentRules.outstationBaseRate || 0;
              total = base + kmCost + driverCost;
              msg = `Outstation One Way (${consoleVehicleType}): ${consoleCalcDetails.destination}, ${km} km. Est: ₹${total}`;
          }
      }
      setConsoleEstimate(total);
      setFormNote(msg); // Auto-populate note
  };

  const handleConsoleSendMessage = (method: 'WA' | 'Email') => {
      if (method === 'WA') {
          const url = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(formNote)}`;
          window.open(url, '_blank');
      } else {
          const url = `mailto:?body=${encodeURIComponent(formNote)}`;
          window.location.href = url;
      }
  };

  // --- Transport Calculator Logic (Edit Modal) ---
  useEffect(() => {
    if (editEnquiryType === 'Transport') {
        calculateTaxiEstimate();
    }
  }, [calcDetails, editTaxiType, editOutstationType, editEnquiryType, editVehicleType]);

  const calculateTaxiEstimate = () => {
      let total = 0;
      let msg = '';
      
      const currentRules = pricing[editVehicleType];

      if (editTaxiType === 'Local') {
          const dist = parseFloat(calcDetails.estKm) || 0;
          const wait = parseFloat(calcDetails.waitingMins) || 0;
          
          let extraKmCost = 0;
          if (dist > currentRules.localBaseKm) {
              extraKmCost = (dist - currentRules.localBaseKm) * currentRules.localPerKmRate;
          }
          
          total = currentRules.localBaseFare + extraKmCost + (wait * currentRules.localWaitingRate);
          msg = `Local Trip (${editVehicleType}): Pickup ${calcDetails.pickup} -> Drop ${calcDetails.drop}, ${dist}km. Est: ₹${total}`;
      } else if (editTaxiType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === calcDetails.packageId);
          if (pkg) {
              total = editVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              msg = `Rental Package (${editVehicleType} - ${pkg.name}): ₹${total}`;
          }
      } else if (editTaxiType === 'Outstation') {
          const days = parseFloat(calcDetails.days) || 1;
          const km = parseFloat(calcDetails.estTotalKm) || 0;
          const driverCost = currentRules.outstationDriverAllowance * days;
          
          if (editOutstationType === 'RoundTrip') {
              const nights = parseFloat(calcDetails.nights) || 0;
              const nightCost = currentRules.outstationNightAllowance * nights;
              const minKm = days * currentRules.outstationMinKmPerDay;
              const chargeableKm = Math.max(km, minKm);
              
              const kmCost = chargeableKm * currentRules.outstationExtraKmRate;
              total = kmCost + driverCost + nightCost;
              msg = `Outstation Round Trip (${editVehicleType}): ${calcDetails.destination}, ${days} days, ${km} km. Est: ₹${total}`;
          } else {
              const kmCost = km * currentRules.outstationExtraKmRate;
              const base = currentRules.outstationBaseRate || 0;
              total = base + kmCost + driverCost;
              msg = `Outstation One Way (${editVehicleType}): ${calcDetails.destination}, ${km} km. Est: ₹${total}`;
          }
      }
      setEditEstimate(total);
      setEditEstimateMsg(msg);
  };

  const handleCopyToDetails = () => {
      if (!editingItem) return;
      setEditingItem({
          ...editingItem,
          details: `${editingItem.details}\n\n[Estimate]: ${editEstimateMsg}`
      });
  };

  // --- Filtered History for Feed ---
  const filteredHistory = useMemo(() => {
      let data = recentTransfers;
      if (!isSuperAdmin) {
          data = data.filter(item => item.loggedBy === sessionId);
      }
      return data.slice(0, 50); // Show last 50
  }, [recentTransfers, isSuperAdmin, sessionId]);

  // Stats
  const stats = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const todaysCalls = recentTransfers.filter(i => i.date === today);
      return {
          total: todaysCalls.length,
          pending: todaysCalls.filter(i => i.status === 'Message Taken').length,
          transferred: todaysCalls.filter(i => i.status === 'Transferred').length
      };
  }, [recentTransfers]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* 1. Header & Stats Row */}
      <div className="space-y-4">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Reception Desk</h2>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <Edit2 className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Calls Today</p>
                  <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
               </div>
               <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><PhoneIncoming className="w-5 h-5"/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Pending Action</p>
                  <h3 className="text-2xl font-bold text-orange-600">{stats.pending}</h3>
               </div>
               <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Clock className="w-5 h-5"/></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Transferred</p>
                  <h3 className="text-2xl font-bold text-blue-600">{stats.transferred}</h3>
               </div>
               <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><ArrowRight className="w-5 h-5"/></div>
            </div>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 rounded-xl text-white shadow-md flex items-center justify-between">
               <div>
                  <p className="text-xs font-bold text-indigo-200 uppercase">System Status</p>
                  <h3 className="text-lg font-bold">Online</h3>
               </div>
               <div className="p-2 bg-white/20 rounded-lg animate-pulse"><Bell className="w-5 h-5"/></div>
            </div>
         </div>
      </div>

      {/* SETTINGS PANEL (Inline Rate Editor) */}
      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 mb-4">
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
              
              {/* Extra Rates */}
              <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Extra Hr (₹)</label>
                    <input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Extra Km (₹)</label>
                    <input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" />
                  </div>
              </div>

              {/* Package List Management */}
              <div className="mt-4 border-t border-gray-100 pt-2">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">Packages</label>
                      <button 
                        onClick={() => setShowAddPackage(!showAddPackage)}
                        className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 flex items-center gap-1 font-bold"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                  </div>
                  
                  {showAddPackage && (
                      <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                          <input placeholder="Pkg Name (e.g. 10hr/100km)" className="w-full p-1.5 text-xs border rounded outline-none focus:ring-1 focus:ring-blue-500" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                          <div className="flex gap-2">
                              <input placeholder="Hrs" type="number" className="w-full p-1.5 text-xs border rounded outline-none" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                              <input placeholder="Km" type="number" className="w-full p-1.5 text-xs border rounded outline-none" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                          </div>
                          <div className="flex gap-2">
                              <input placeholder="Sedan ₹" type="number" className="w-full p-1.5 text-xs border rounded outline-none" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                              <input placeholder="SUV ₹" type="number" className="w-full p-1.5 text-xs border rounded outline-none" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                          </div>
                          <button onClick={handleAddPackage} className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700 transition-colors">Save Package</button>
                      </div>
                  )}

                  <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 group transition-colors">
                              <div>
                                  <div className="text-xs font-bold text-gray-800">{pkg.name}</div>
                                  <div className="text-[10px] text-gray-500">{pkg.hours}hr / {pkg.km}km</div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                  <div className="text-[10px] text-gray-600 font-mono text-right">
                                      <div>S: {pkg.priceSedan}</div>
                                      <div>X: {pkg.priceSuv}</div>
                                  </div>
                                  <button onClick={(e) => removePackage(pkg.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                      <Trash2 className="w-3 h-3" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="pt-4 mt-auto">
                 <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)] min-h-[600px]">
         
         {/* 2. Left Column: Call Console */}
         <div className="lg:col-span-2 space-y-6 flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
               {/* Console Header */}
               <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <Phone className="w-5 h-5 text-indigo-600" /> Call Console
                  </h3>
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                     <button 
                        onClick={() => setActiveTab('Incoming')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'Incoming' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                        Incoming
                     </button>
                     <button 
                        onClick={() => setActiveTab('Outgoing')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'Outgoing' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                        Outgoing
                     </button>
                  </div>
               </div>

               {/* Console Body */}
               <div className="p-8 flex-1 overflow-y-auto">
                  <div className="max-w-xl mx-auto space-y-8">
                     {/* Input Area */}
                     <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
                           Enter Phone Number
                        </label>
                        <div className="flex gap-3">
                           <input 
                              type="tel" 
                              value={phoneNumber}
                              onChange={(e) => { setPhoneNumber(e.target.value); setIsChecked(false); }}
                              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                              className="flex-1 text-3xl font-mono font-medium text-gray-800 placeholder-gray-300 border-b-2 border-gray-200 focus:border-indigo-500 outline-none py-2 transition-colors bg-transparent"
                              placeholder="98765..."
                              autoFocus
                           />
                           <button 
                              onClick={handleCheck}
                              className="px-6 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                           >
                              Check
                           </button>
                        </div>
                        {isChecked && (
                           <div className={`absolute top-full mt-2 left-0 text-sm font-medium flex items-center gap-1.5 ${lookupResult === 'Existing' ? 'text-emerald-600' : 'text-blue-600'}`}>
                              {lookupResult === 'Existing' ? <CheckCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                              {lookupResult === 'Existing' ? `Found Existing ${identifiedType}` : 'New Caller'}
                           </div>
                        )}
                     </div>

                     {/* Action Form (Animated) */}
                     {isChecked && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pt-6 border-t border-gray-100">
                           <div className="grid grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                 <input 
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Caller Name"
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">City / Franchise</label>
                                 <select 
                                    value={formCity}
                                    onChange={(e) => setFormCity(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                 >
                                    <option value="">Select Location</option>
                                    {corporateAccounts.map((c: any) => (
                                       <option key={c.id} value={c.city}>{c.city}</option>
                                    ))}
                                    <option value="Head Office">Head Office</option>
                                 </select>
                              </div>
                           </div>

                           <div className="flex gap-4">
                              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
                                 <input type="radio" name="callerType" checked={formCallerType === 'Customer'} onChange={() => setFormCallerType('Customer')} className="text-indigo-600" />
                                 <User className="w-4 h-4 text-gray-500" />
                                 <span className="font-medium text-gray-700">Customer</span>
                              </label>
                              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
                                 <input type="radio" name="callerType" checked={formCallerType === 'Vendor'} onChange={() => setFormCallerType('Vendor')} className="text-indigo-600" />
                                 <Truck className="w-4 h-4 text-gray-500" />
                                 <span className="font-medium text-gray-700">Vendor</span>
                              </label>
                           </div>

                           {/* Enquiry Type Toggle */}
                           <div>
                              <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                 <button 
                                    onClick={() => setConsoleEnquiryType('General')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${consoleEnquiryType === 'General' ? 'bg-white shadow text-gray-800 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                                 >
                                    General Enquiry
                                 </button>
                                 <button 
                                    onClick={() => setConsoleEnquiryType('Transport')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${consoleEnquiryType === 'Transport' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                                 >
                                    Transport Enquiry
                                 </button>
                              </div>

                              {consoleEnquiryType === 'General' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Note / Requirement</label>
                                    <textarea 
                                        rows={3}
                                        value={formNote}
                                        onChange={(e) => setFormNote(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Type enquiry details here..."
                                    />
                                </div>
                              ) : (
                                <div className="space-y-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Calculator className="w-4 h-4"/> Fare Calculator</h4>
                                        <div className="flex gap-2">
                                            {['Sedan', 'SUV'].map(v => (
                                                <button key={v} onClick={() => setConsoleVehicleType(v as any)} className={`text-[10px] px-2 py-1 rounded border ${consoleVehicleType === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 bg-white p-1 rounded-lg border border-indigo-100 mb-3">
                                        {['Local', 'Rental', 'Outstation'].map(t => (
                                            <button key={t} onClick={() => setConsoleTaxiType(t as any)} className={`flex-1 py-1 text-xs font-medium rounded ${consoleTaxiType === t ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-gray-500'}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {consoleTaxiType === 'Local' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {!isMapReady ? (
                                                <div className="p-2 bg-white border rounded text-xs col-span-2 text-gray-500">Loading Google Maps...</div>
                                            ) : (
                                                <>
                                                    <div className="col-span-1">
                                                        <Autocomplete 
                                                            placeholder="Pickup" 
                                                            setNewPlace={(place) => setPickupCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, pickup: addr}))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <Autocomplete 
                                                            placeholder="Drop" 
                                                            setNewPlace={(place) => setDropCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, drop: addr}))}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <input placeholder="Est Km" type="number" className="p-2 border rounded text-xs" value={consoleCalcDetails.estKm} onChange={e => setConsoleCalcDetails({...consoleCalcDetails, estKm: e.target.value})} />
                                            <input placeholder="Wait Mins" type="number" className="p-2 border rounded text-xs" value={consoleCalcDetails.waitingMins} onChange={e => setConsoleCalcDetails({...consoleCalcDetails, waitingMins: e.target.value})} />
                                        </div>
                                    )}

                                    {consoleTaxiType === 'Rental' && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                                {rentalPackages.map(pkg => (
                                                    <button 
                                                        key={pkg.id}
                                                        onClick={() => setConsoleCalcDetails(prev => ({...prev, packageId: pkg.id}))}
                                                        className={`p-2 rounded border text-xs text-left ${consoleCalcDetails.packageId === pkg.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                                    >
                                                        <div className="font-bold">{pkg.name}</div>
                                                        <div className="opacity-80">₹{consoleVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                                    </button>
                                                ))}
                                            </div>
                                            {!isMapReady ? (
                                                <div className="p-2 bg-white border rounded text-xs text-gray-500">Loading Maps...</div>
                                            ) : (
                                                <Autocomplete 
                                                    placeholder="Pickup Location"
                                                    onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, pickup: addr}))}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {consoleTaxiType === 'Outstation' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-2 justify-center mb-2">
                                                <button onClick={() => setConsoleOutstationType('RoundTrip')} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${consoleOutstationType === 'RoundTrip' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>
                                                    <ArrowRightLeft className="w-3 h-3" /> Round Trip
                                                </button>
                                                <button onClick={() => setConsoleOutstationType('OneWay')} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${consoleOutstationType === 'OneWay' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>
                                                    <ArrowRight className="w-3 h-3" /> One Way
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    {!isMapReady ? <div className="p-2 bg-white text-xs border rounded">Loading Maps...</div> : 
                                                        <Autocomplete 
                                                            placeholder={consoleOutstationType === 'OneWay' ? "Destination (Drop)" : "Destination"}
                                                            setNewPlace={(place) => setDestCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, destination: addr}))}
                                                        />
                                                    }
                                                </div>
                                                {consoleOutstationType === 'OneWay' && isMapReady && (
                                                    <div className="col-span-2">
                                                        <Autocomplete 
                                                            placeholder="Pickup Location"
                                                            setNewPlace={(place) => setPickupCoords(place)}
                                                            onAddressSelect={(addr) => setConsoleCalcDetails(prev => ({...prev, pickup: addr}))}
                                                        />
                                                    </div>
                                                )}
                                                <input placeholder="Days" type="number" className="p-2 border rounded text-xs" value={consoleCalcDetails.days} onChange={e => setConsoleCalcDetails({...consoleCalcDetails, days: e.target.value})} />
                                                {consoleOutstationType === 'RoundTrip' && (
                                                    <input placeholder="Nights" type="number" className="p-2 border rounded text-xs" value={consoleCalcDetails.nights} onChange={e => setConsoleCalcDetails({...consoleCalcDetails, nights: e.target.value})} />
                                                )}
                                                <input placeholder="Total Km" type="number" className="p-2 border rounded text-xs" value={consoleCalcDetails.estTotalKm} onChange={e => setConsoleCalcDetails({...consoleCalcDetails, estTotalKm: e.target.value})} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-3 border-t border-indigo-200 mt-2">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleConsoleSendMessage('WA')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                                            <button onClick={() => handleConsoleSendMessage('Email')} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Email"><Mail className="w-4 h-4" /></button>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-indigo-700 block">Estimated Fare</span>
                                            <span className="text-lg font-bold text-indigo-900">₹{consoleEstimate}</span>
                                        </div>
                                    </div>
                                    
                                    <textarea 
                                        className="w-full p-2 text-xs border border-indigo-200 rounded bg-white text-gray-600 mt-2 h-16 resize-none"
                                        readOnly
                                        value={formNote} 
                                    />
                                </div>
                              )}
                           </div>

                           <div className="flex gap-4 pt-2">
                              <button 
                                 onClick={() => handleLogCall('Message Taken')}
                                 disabled={isSubmitting}
                                 className="flex-1 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors"
                              >
                                 Save Message
                              </button>
                              <button 
                                 onClick={() => handleLogCall('Transferred')}
                                 disabled={isSubmitting}
                                 className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-2"
                              >
                                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <RefreshCcw className="w-5 h-5" />}
                                 Log & Transfer
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* 3. Right Column: Live Feed */}
         <div className="space-y-6 flex flex-col">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <History className="w-4 h-4 text-orange-500" /> Live Activity Feed
                  </h3>
                  <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">Real-time</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {filteredHistory.length === 0 ? (
                     <div className="text-center py-10 text-gray-400">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                     </div>
                  ) : (
                     filteredHistory.map((item) => (
                        <div key={item.id} className="relative pl-4 border-l-2 border-gray-100 py-1 group hover:border-indigo-200 transition-colors">
                           <div className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${item.status === 'Transferred' ? 'bg-indigo-500' : 'bg-orange-400'}`}></div>
                           <div className="flex justify-between items-start">
                              <h4 className="text-sm font-bold text-gray-800">{item.name}</h4>
                              <span className="text-[10px] text-gray-400">{item.time}</span>
                           </div>
                           <p className="text-xs text-gray-500 mb-1">{item.city} • {item.type}</p>
                           <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 line-clamp-2 italic border border-gray-100 group-hover:border-indigo-100">
                              "{item.details}"
                           </div>
                           <div className="flex justify-between items-center mt-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.status === 'Transferred' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                                 {item.status}
                              </span>
                              <button 
                                onClick={() => setEditingItem(item)}
                                className="text-gray-400 hover:text-indigo-600"
                              >
                                 <Edit2 className="w-3 h-3" />
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>

            {/* Franchise Support Widget */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-lg shrink-0">
               <h4 className="font-bold text-sm flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-emerald-400" /> Franchise Support
               </h4>
               <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar-dark">
                  {corporateAccounts.length === 0 && <p className="text-xs text-slate-400">No franchise accounts.</p>}
                  {corporateAccounts.map((corp: any) => (
                     <div key={corp.id} className="flex justify-between items-center bg-white/5 p-2 rounded hover:bg-white/10 transition-colors cursor-pointer">
                        <div>
                           <p className="text-xs font-bold text-slate-200">{corp.city}</p>
                           <p className="text-[10px] text-slate-400">{corp.companyName}</p>
                        </div>
                        <PhoneOutgoing className="w-3 h-3 text-emerald-400" />
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Edit Modal (Includes Transport Calculator) */}
      {editingItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
               <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <div className="flex gap-4 items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Update Record</h3>
                    {/* Toggle for Transport Calculator */}
                    <div className="flex bg-gray-200 rounded-lg p-1">
                       <button onClick={() => setEditEnquiryType('General')} className={`px-3 py-1 text-xs font-bold rounded ${editEnquiryType === 'General' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>General</button>
                       <button onClick={() => setEditEnquiryType('Transport')} className={`px-3 py-1 text-xs font-bold rounded ${editEnquiryType === 'Transport' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Transport</button>
                    </div>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto">
                 {editEnquiryType === 'General' ? (
                    <div className="space-y-4">
                       <p className="text-sm text-gray-500 mb-2">Standard note update for this call record.</p>
                       <textarea 
                          rows={6}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          value={editingItem.details}
                          onChange={(e) => setEditingItem({...editingItem, details: e.target.value})}
                       />
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {/* Transport Calculator */}
                       <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2"><Calculator className="w-4 h-4"/> Fare Estimator</h4>
                             {/* Vehicle Toggle Edit */}
                             <div className="flex gap-2">
                                {['Sedan', 'SUV'].map(v => (
                                    <button key={v} onClick={() => setEditVehicleType(v as any)} className={`text-[10px] px-2 py-1 rounded border ${editVehicleType === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}>
                                        {v}
                                    </button>
                                ))}
                             </div>
                             
                             <div className="flex gap-2">
                                <button onClick={() => setEditTaxiType('Local')} className={`text-xs px-2 py-1 rounded ${editTaxiType === 'Local' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>Local</button>
                                <button onClick={() => setEditTaxiType('Rental')} className={`text-xs px-2 py-1 rounded ${editTaxiType === 'Rental' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>Rental</button>
                                <button onClick={() => setEditTaxiType('Outstation')} className={`text-xs px-2 py-1 rounded ${editTaxiType === 'Outstation' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>Outstation</button>
                             </div>
                          </div>
                          
                          {/* Calculator Inputs */}
                          <div className="space-y-3">
                             {editTaxiType === 'Local' && (
                                <div className="grid grid-cols-2 gap-3">
                                   <input placeholder="Pickup Location" className="p-2 border rounded text-xs" value={calcDetails.pickup} onChange={e => setCalcDetails({...calcDetails, pickup: e.target.value})} />
                                   <input placeholder="Drop Location" className="p-2 border rounded text-xs" value={calcDetails.drop} onChange={e => setCalcDetails({...calcDetails, drop: e.target.value})} />
                                   <input placeholder="Est Km" type="number" className="p-2 border rounded text-xs" value={calcDetails.estKm} onChange={e => setCalcDetails({...calcDetails, estKm: e.target.value})} />
                                   <input placeholder="Wait Mins" type="number" className="p-2 border rounded text-xs" value={calcDetails.waitingMins} onChange={e => setCalcDetails({...calcDetails, waitingMins: e.target.value})} />
                                </div>
                             )}

                             {editTaxiType === 'Rental' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                        {rentalPackages.map(pkg => (
                                            <button 
                                                key={pkg.id}
                                                onClick={() => setCalcDetails({...calcDetails, packageId: pkg.id})}
                                                className={`p-2 rounded border text-xs text-left ${calcDetails.packageId === pkg.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                            >
                                                <div className="font-bold">{pkg.name}</div>
                                                <div className="opacity-80">₹{editVehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <input placeholder="Pickup Location" className="p-2 border rounded text-xs w-full" value={calcDetails.pickup} onChange={e => setCalcDetails({...calcDetails, pickup: e.target.value})} />
                                </div>
                             )}
                             
                             {editTaxiType === 'Outstation' && (
                                <div className="space-y-3">
                                   <div className="flex gap-2 bg-white p-1 rounded border border-indigo-100">
                                      <button onClick={() => setEditOutstationType('RoundTrip')} className={`flex-1 py-1 text-xs rounded ${editOutstationType === 'RoundTrip' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-gray-500'}`}>Round Trip</button>
                                      <button onClick={() => setEditOutstationType('OneWay')} className={`flex-1 py-1 text-xs rounded ${editOutstationType === 'OneWay' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-gray-500'}`}>One Way</button>
                                   </div>
                                   <div className="grid grid-cols-2 gap-3">
                                      <input placeholder="Destination" className="p-2 border rounded text-xs col-span-2" value={calcDetails.destination} onChange={e => setCalcDetails({...calcDetails, destination: e.target.value})} />
                                      {editOutstationType === 'OneWay' && (
                                          <input placeholder="Pickup" className="p-2 border rounded text-xs col-span-2" value={calcDetails.pickup} onChange={e => setCalcDetails({...calcDetails, pickup: e.target.value})} />
                                      )}
                                      <input placeholder="Days" type="number" className="p-2 border rounded text-xs" value={calcDetails.days} onChange={e => setCalcDetails({...calcDetails, days: e.target.value})} />
                                      {editOutstationType === 'RoundTrip' && (
                                          <input placeholder="Nights" type="number" className="p-2 border rounded text-xs" value={calcDetails.nights} onChange={e => setCalcDetails({...calcDetails, nights: e.target.value})} />
                                      )}
                                      <input placeholder="Total Km" type="number" className="p-2 border rounded text-xs" value={calcDetails.estTotalKm} onChange={e => setCalcDetails({...calcDetails, estTotalKm: e.target.value})} />
                                   </div>
                                </div>
                             )}

                             {/* Estimate Result */}
                             <div className="mt-4 pt-4 border-t border-indigo-200 flex justify-between items-center">
                                <div>
                                   <p className="text-xs text-indigo-700 font-medium">Estimated Fare</p>
                                   <p className="text-xl font-bold text-indigo-900">₹{editEstimate}</p>
                                </div>
                                <button 
                                  onClick={handleCopyToDetails}
                                  className="text-xs bg-white border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-50 flex items-center gap-1"
                                >
                                   <Copy className="w-3 h-3" /> Copy to Note
                                </button>
                             </div>
                             <p className="text-[10px] text-indigo-600 mt-1">{editEstimateMsg}</p>
                          </div>
                       </div>
                       
                       <textarea 
                          rows={4}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          value={editingItem.details}
                          onChange={(e) => setEditingItem({...editingItem, details: e.target.value})}
                          placeholder="Final details..."
                       />
                    </div>
                 )}
              </div>
              
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                 <button onClick={() => setEditingItem(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white">Cancel</button>
                 <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">Save Update</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
