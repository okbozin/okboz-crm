
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, MapPin, User, Phone, MessageCircle, Mail, 
  Settings, Navigation, Copy, Edit2, Plus, Trash2, AlertTriangle, Loader2, ArrowRightLeft, ArrowRight,
  Truck, FileText, CheckCircle, ChevronRight, Clock, History, X, Save, Calendar, CalendarCheck, BellRing,
  LayoutDashboard, PlusCircle, Filter, ArrowLeft, Eye, Building2, PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Autocomplete from '../../components/Autocomplete';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee } from '../../types';

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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const VehicleEnquiries: React.FC = () => {
  // View Mode State
  const [viewMode, setViewMode] = useState<'Dashboard' | 'Form'>('Dashboard');
  const [chartMetric, setChartMetric] = useState<'corporate' | 'staff'>('corporate');

  // Dashboard Data State
  const [allEnquiries, setAllEnquiries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  
  // Dashboard Edit State
  const [editingHistoryItem, setEditingHistoryItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ status: '', message: '' });

  // Workflow State
  const [step, setStep] = useState(1);
  const [callerType, setCallerType] = useState<'Customer' | 'Vendor'>('Customer');
  const [enquiryCategory, setEnquiryCategory] = useState<'General' | 'Transport'>('Transport');
  const [generalNote, setGeneralNote] = useState('');
  
  // Assignment State
  const [assignCorporate, setAssignCorporate] = useState('Head Office');
  const [assignBranch, setAssignBranch] = useState('');
  const [assignStaff, setAssignStaff] = useState('');
  const [filteredStaffList, setFilteredStaffList] = useState<Employee[]>([]);
  
  // Lists
  const [corporates, setCorporates] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [allStaffMap, setAllStaffMap] = useState<Record<string, string>>({});

  // History State
  const [lookupHistory, setLookupHistory] = useState<any[]>([]);

  // Notification State
  const [notification, setNotification] = useState<{show: boolean, message: string, type: 'success' | 'reminder'} | null>(null);

  // Schedule State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState({ date: '', time: '' });

  // Transport State
  const [tripType, setTripType] = useState<TripType>('Local');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan'); 
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Coordinate States
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null); 
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null); 

  const getSessionKey = (baseKey: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  // Load Initial Data (Corporates, Branches, Staff Map)
  useEffect(() => {
      try {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);

          const brs = JSON.parse(localStorage.getItem('branches_data') || '[]');
          setBranches(brs);
          
          // Build Staff Map for ID -> Name resolution
          const staffMap: Record<string, string> = {};
          // Admin Staff
          const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
          adminStaff.forEach((s: any) => staffMap[s.id] = s.name);
          // Corporate Staff
          corps.forEach((c: any) => {
             const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
             cStaff.forEach((s: any) => staffMap[s.id] = s.name);
          });
          // Mocks
          MOCK_EMPLOYEES.forEach(s => staffMap[s.id] = s.name);
          
          setAllStaffMap(staffMap);
      } catch (e) {
          console.error("Error loading basic data", e);
      }
  }, []);

  // Filter Staff Logic
  useEffect(() => {
    let staff: Employee[] = [];
    
    // 1. Fetch source based on Corporate Selection
    if (assignCorporate && assignCorporate !== 'Head Office') {
        const corp = corporates.find(c => c.companyName === assignCorporate || c.email === assignCorporate);
        if (corp) {
            const saved = localStorage.getItem(`staff_data_${corp.email}`);
            if (saved) staff = JSON.parse(saved);
        }
    } else {
        // Head Office (Admin)
        const saved = localStorage.getItem('staff_data');
        if (saved) staff = JSON.parse(saved);
        else staff = MOCK_EMPLOYEES;
    }

    // 2. Filter by Branch if selected
    if (assignBranch) {
        staff = staff.filter(e => e.branch === assignBranch);
    }

    setFilteredStaffList(staff);
  }, [assignCorporate, assignBranch, corporates]);

  // Load Dashboard Data
  useEffect(() => {
      if (viewMode === 'Dashboard') {
          const saved = localStorage.getItem('call_enquiries_history');
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  setAllEnquiries(parsed);
              } catch(e) { console.error(e); }
          }
      }
  }, [viewMode]);

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
        script.onerror = () => setMapError("Failed to load Google Maps.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => setIsMapReady(true));
        if (window.google && window.google.maps) setIsMapReady(true);
    }
  }, []);

  // Independent Pricing Rules
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const key = getSessionKey('vehicle_pricing_rules_v2'); 
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  // Independent Rental Packages
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const key = getSessionKey('vehicle_rental_packages_v2');
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return DEFAULT_RENTAL_PACKAGES;
  });

  useEffect(() => {
    localStorage.setItem(getSessionKey('vehicle_pricing_rules_v2'), JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem(getSessionKey('vehicle_rental_packages_v2'), JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  const [customer, setCustomer] = useState({ name: '', phone: '', pickup: '' });
  const [localDetails, setLocalDetails] = useState({ drop: '', estKm: '', waitingMins: '' });
  const [rentalDetails, setRentalDetails] = useState({ packageId: rentalPackages[0]?.id || '' });

  // Phone Lookup Effect
  useEffect(() => {
    if (viewMode !== 'Form') return;

    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length < 5) {
        setLookupHistory([]);
        return;
    }

    const timer = setTimeout(() => {
        let logs: any[] = [];
        let foundName = '';
        let foundType = '';

        // 1. Vendors
        const vendorsStr = localStorage.getItem('vendor_data');
        if (vendorsStr) {
            const vendors = JSON.parse(vendorsStr);
            const vendor = vendors.find((v: any) => v.phone && v.phone.replace(/\D/g, '').includes(cleanPhone));
            if (vendor) {
                foundName = vendor.ownerName;
                foundType = 'Vendor';
                if (vendor.history) logs = [...logs, ...vendor.history.map((h: any) => ({...h, source: 'Vendor Profile'}))];
            }
        }

        // 2. Enquiries
        const enquiriesStr = localStorage.getItem('global_enquiries_data');
        if (enquiriesStr) {
            const enquiries = JSON.parse(enquiriesStr);
            const relevantEnquiries = enquiries.filter((e: any) => e.phone && e.phone.replace(/\D/g, '').includes(cleanPhone));
            relevantEnquiries.forEach((e: any) => {
                if (!foundName) foundName = e.name;
                if (!foundType) foundType = e.type;
                if (e.history) logs = [...logs, ...e.history.map((h: any) => ({...h, source: 'Enquiry Log'}))];
            });
        }

        // 3. Call Enquiries Logs
        const callEnqStr = localStorage.getItem('call_enquiries_history');
        if (callEnqStr) {
            const calls = JSON.parse(callEnqStr);
            const callLogs = calls.filter((c: any) => c.phone && c.phone.replace(/\D/g, '').includes(cleanPhone));
            callLogs.forEach((c: any) => {
                if (!foundName) foundName = c.name;
                logs.push({
                    id: c.id,
                    date: `${c.date} ${c.time}`,
                    type: c.type,
                    message: c.details,
                    outcome: c.status,
                    source: 'Vehicle Enquiry'
                });
            });
        }

        // Sort by date descending
        logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLookupHistory(logs);

        // Auto-fill Name and Type
        if (foundName) {
            setCustomer(prev => (prev.name ? prev : { ...prev, name: foundName }));
        }
        if (foundType) {
            setCallerType(foundType as any);
        }

    }, 500);

    return () => clearTimeout(timer);
  }, [customer.phone, viewMode]);

  useEffect(() => {
      if (!rentalPackages.find(p => p.id === rentalDetails.packageId)) {
          setRentalDetails(prev => ({ ...prev, packageId: rentalPackages[0]?.id || '' }));
      }
  }, [rentalPackages]);

  const [outstationDetails, setOutstationDetails] = useState({ destination: '', days: '1', estTotalKm: '', nights: '0' });
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

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

  // Auto Distance Calculation
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

  useEffect(() => {
    if (enquiryCategory === 'Transport') {
        calculateEstimate();
    }
  }, [tripType, outstationSubType, vehicleType, localDetails, rentalDetails, outstationDetails, pricing, rentalPackages, enquiryCategory]);

  useEffect(() => {
    generateMessage();
  }, [estimate, customer, vehicleType, enquiryCategory, generalNote]);

  const calculateEstimate = () => {
    let base = 0, extraKmCost = 0, waitingCost = 0, driverCost = 0, nightAllowanceCost = 0, total = 0, details = '';
    let chargeableKm = 0;
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
        details = `Base (${currentRules.localBaseKm}km): ₹${base} + Extra: ₹${extraKmCost} + Wait: ₹${waitingCost}`;

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
            extraKmCost = 0; 
            total = base + driverCost + nightAllowanceCost;
            details = `Min ${minTotalKm}km. Charged ${chargeableKm}km @ ₹${currentRules.outstationExtraKmRate}/km.`;
        } else {
            base = currentRules.outstationBaseRate * days; 
            const minCommittedKm = currentRules.outstationMinKmPerDay * days;
            if (totalKm > minCommittedKm) {
                extraKmCost = (totalKm - minCommittedKm) * currentRules.outstationExtraKmRate;
            }
            total = base + extraKmCost + driverCost; 
            details = `Base: ₹${base} + Extra Km: ₹${extraKmCost}`;
        }
    }
    setEstimate({ base, extraKmCost, waitingCost, driverCost, nightAllowanceCost, total, chargeableKm, details });
  };

  const generateMessage = () => {
    const greeting = `Hello ${customer.name || (callerType === 'Vendor' ? 'Partner' : 'Customer')},`;
    const currentRules = pricing[vehicleType];
    
    if (enquiryCategory === 'General') {
        setGeneratedMessage(`${greeting}\n\n${generalNote || 'Thank you for your enquiry. We will get back to you shortly.'}\n\nRegards,\nOK BOZ Team`);
        return;
    }

    let body = '';

    if (tripType === 'Local') {
        body = `
🚖 *Local Vehicle Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${customer.pickup}
📍 Drop: ${localDetails.drop}
🛣 Distance: ~${localDetails.estKm} km
⏳ Waiting Time: ${localDetails.waitingMins} mins

💵 Base Fare: ₹${currentRules.localBaseFare} (Includes ${currentRules.localBaseKm} km)
💰 *Total Estimate: ₹${estimate.total.toLocaleString()}*`;
    } else if (tripType === 'Rental') {
        const pkg = rentalPackages.find(p => p.id === rentalDetails.packageId);
        body = `
🚖 *Rental Package Estimate*
🚘 Vehicle: ${vehicleType}
📦 Package: ${pkg?.name}
📍 Pickup: ${customer.pickup}

💰 *Package Price: ₹${estimate.total.toLocaleString()}*`;
    } else if (tripType === 'Outstation') {
        body = `
🚖 *Outstation Vehicle Estimate (${outstationSubType === 'OneWay' ? 'One Way' : 'Round Trip'})*
🚘 Vehicle: ${vehicleType}
🌍 Destination: ${outstationDetails.destination}
📅 Duration: ${outstationDetails.days} Days
${outstationSubType === 'RoundTrip' ? `🌙 Night Stays: ${outstationDetails.nights}` : ''}
🛣 Est. Total Distance: ${outstationDetails.estTotalKm} km

💰 *Total Estimate: ₹${estimate.total.toLocaleString()}*`;
    }

    const extraNote = `\n\nNote: Tax, Toll and permit will be extra.`;
    const footer = `\n\nBook now with OK BOZ! 🚕`;
    setGeneratedMessage(`${greeting}${body}${extraNote}${footer}`);
  };

  // --- Actions ---
  const handleSaveEnquiry = (statusOverride?: string, reminderInfo?: string) => {
      const finalStatus = statusOverride || 'New';
      
      // Combine generated message with user notes for Transport
      let finalDetails = generatedMessage;
      if (enquiryCategory === 'Transport' && generalNote) {
          finalDetails += `\n\n[User Requirements]: ${generalNote}`;
      } else if (enquiryCategory === 'General') {
          finalDetails = generalNote;
      }

      const newEnquiry = {
          id: `VE-${Date.now()}`,
          name: customer.name || 'Unknown',
          phone: customer.phone,
          type: callerType,
          category: enquiryCategory,
          details: finalDetails,
          status: finalStatus,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleString(),
          assignedTo: assignStaff,
          assignedCorporate: assignCorporate,
          assignedBranch: assignBranch
      };

      // 2. Save to Global Enquiries
      const existingEnquiries = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
      const updatedEnquiries = [newEnquiry, ...existingEnquiries];
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedEnquiries));

      // 3. Save to Call History Logs (for lookup)
      const existingLogs = JSON.parse(localStorage.getItem('call_enquiries_history') || '[]');
      const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0],
          type: `${enquiryCategory} (${callerType})`,
          details: reminderInfo ? `${newEnquiry.details} [Reminder: ${reminderInfo}]` : newEnquiry.details,
          status: finalStatus === 'Booked' ? 'Booked' : (statusOverride === 'Scheduled' ? 'Scheduled' : 'Message Taken'),
          name: newEnquiry.name,
          phone: newEnquiry.phone,
          source: 'Vehicle Enquiry', 
          loggedBy: localStorage.getItem('app_session_id') || 'admin',
          outcome: finalStatus === 'Booked' ? 'Booked' : (statusOverride === 'Scheduled' ? 'Scheduled' : 'Message Taken'),
          assignedTo: assignStaff,
          assignedCorporate: assignCorporate, // Explicitly saving for Dashboard Chart
          assignedBranch: assignBranch
      };
      
      const updatedLogs = [newLog, ...existingLogs];
      localStorage.setItem('call_enquiries_history', JSON.stringify(updatedLogs));

      // 4. Update States
      setAllEnquiries(updatedLogs);

      // 5. Notification Logic
      if (reminderInfo) {
        setNotification({ show: true, message: `Reminder Set: Call ${customer.name}`, type: 'reminder' });
      } else if (finalStatus === 'Booked') {
         setNotification({ show: true, message: `Booking Confirmed for ${customer.name}`, type: 'success' });
      } else {
        setNotification({ show: true, message: `Enquiry Saved`, type: 'success' });
      }

      setTimeout(() => setNotification(null), 5000);
      handleCancel(); // Reset form
      setViewMode('Dashboard'); // Redirect to dashboard
  };

  const handleCancel = () => {
      setStep(1);
      setGeneralNote('');
      setGeneratedMessage('');
      setLocalDetails({ drop: '', estKm: '', waitingMins: '' });
      setOutstationDetails({ destination: '', days: '1', estTotalKm: '', nights: '0' });
      setIsScheduleModalOpen(false);
      setCustomer({ name: '', phone: '', pickup: '' });
      setLookupHistory([]);
      
      // Reset assignments
      setAssignCorporate('Head Office');
      setAssignBranch('');
      setAssignStaff('');
  };

  const handleScheduleConfirm = () => {
     if(!reminderDateTime.date || !reminderDateTime.time) {
        alert("Please select date and time");
        return;
     }
     setIsScheduleModalOpen(false);
     handleSaveEnquiry('Scheduled', `${reminderDateTime.date} ${reminderDateTime.time}`);
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

  // Dashboard Edit Handlers
  const handleOpenEditHistory = (item: any) => {
     setEditingHistoryItem(item);
     setEditForm({ 
         status: item.outcome || item.status || 'Message Taken', 
         message: item.message || item.details || '' 
     });
  };

  const handleSaveHistoryEdit = () => {
     if (!editingHistoryItem) return;
     
     const updatedList = allEnquiries.map(item => {
         if (item.id === editingHistoryItem.id) {
             return { 
                 ...item, 
                 status: editForm.status,
                 outcome: editForm.status, // normalize for table
                 message: editForm.message,
                 details: editForm.message // normalize
             };
         }
         return item;
     });
     
     setAllEnquiries(updatedList);
     localStorage.setItem('call_enquiries_history', JSON.stringify(updatedList));
     setEditingHistoryItem(null);
     setNotification({ show: true, message: 'Record updated successfully', type: 'success' });
     setTimeout(() => setNotification(null), 3000);
  };

  // Dashboard Stats
  const stats = useMemo(() => {
      return {
          total: allEnquiries.length,
          booked: allEnquiries.filter(e => (e.status === 'Booked' || e.outcome === 'Booked')).length,
          scheduled: allEnquiries.filter(e => (e.status === 'Scheduled' || e.outcome === 'Scheduled' || e.details?.includes('Reminder:'))).length,
          pending: allEnquiries.filter(e => (e.status === 'New' || e.status === 'Message Taken' || e.outcome === 'Message Taken')).length
      };
  }, [allEnquiries]);

  // Dashboard Pie Chart Data
  const pieData = useMemo(() => {
      if (chartMetric === 'corporate') {
          // Group by assignedCorporate
          const grouped: Record<string, number> = {};
          allEnquiries.forEach(e => {
              const key = e.assignedCorporate || 'Head Office';
              // Resolve name from corporates list
              let name = 'Head Office';
              if (key !== 'Head Office') {
                 const corp = corporates.find(c => c.email === key || c.companyName === key);
                 name = corp ? corp.companyName : (key.includes('@') ? 'Franchise' : key); 
              }
              grouped[name] = (grouped[name] || 0) + 1;
          });
          return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
      } else {
          // Group by assignedTo (Staff)
          const grouped: Record<string, number> = {};
          allEnquiries.forEach(e => {
              const key = e.assignedTo || 'Unassigned';
              // Resolve name from allStaffMap
              const name = allStaffMap[key] || (key === 'Unassigned' ? 'Unassigned' : 'Unknown Staff');
              grouped[name] = (grouped[name] || 0) + 1;
          });
          return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
      }
  }, [allEnquiries, chartMetric, corporates, allStaffMap]);

  // Dashboard Filter
  const filteredList = allEnquiries.filter(item => {
      const matchSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.phone?.includes(searchQuery);
      const status = item.outcome || item.status;
      const matchStatus = filterStatus === 'All' || status === filterStatus;
      const matchDate = !filterDate || item.date === filterDate;
      return matchSearch && matchStatus && matchDate;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Notification Pop-up */}
      {notification && (
          <div className={`fixed top-20 right-6 z-[100] p-4 rounded-xl shadow-2xl border flex items-start gap-3 max-w-sm animate-in slide-in-from-right duration-300 ${notification.type === 'reminder' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              <div className={`p-2 rounded-full ${notification.type === 'reminder' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {notification.type === 'reminder' ? <BellRing className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              </div>
              <div>
                  <h4 className="font-bold text-sm">{notification.type === 'reminder' ? 'Reminder Set' : 'Success'}</h4>
                  <p className="text-xs opacity-90">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl p-6 w-80 shadow-2xl animate-in zoom-in">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600"/> Schedule Reminder</h3>
              <div className="space-y-3">
                 <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label><input type="date" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setReminderDateTime({...reminderDateTime, date: e.target.value})} /></div>
                 <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label><input type="time" className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setReminderDateTime({...reminderDateTime, time: e.target.value})} /></div>
                 <div className="pt-4 flex gap-2">
                    <button onClick={() => setIsScheduleModalOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                    <button onClick={handleScheduleConfirm} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Set Reminder</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Edit History Modal */}
      {editingHistoryItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in duration-200">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-900 text-lg">Update Enquiry</h3>
                    <button onClick={() => setEditingHistoryItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Customer</label>
                            <div className="font-medium text-gray-800">{editingHistoryItem.name}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                            <div className="font-medium text-gray-800">{editingHistoryItem.phone}</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select 
                            value={editForm.status} 
                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option>Message Taken</option>
                            <option>New</option>
                            <option>Scheduled</option>
                            <option>Booked</option>
                            <option>Closed</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Details & Notes</label>
                        <textarea 
                            rows={6}
                            value={editForm.message}
                            onChange={(e) => setEditForm({...editForm, message: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm leading-relaxed"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingHistoryItem(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSaveHistoryEdit} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">Save Changes</button>
                    </div>
                 </div>
             </div>
          </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Car className="w-8 h-8 text-emerald-600" /> Vehicle Enquiries
          </h2>
          <p className="text-gray-500">Manage vehicle rental enquiries and estimates</p>
        </div>
        <div className="flex gap-3 items-center">
            {viewMode === 'Form' && (
                <>
                    <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Settings className="w-3 h-3" /> {showSettings ? 'Hide Rates' : 'Rates'}
                    </button>
                    <button 
                        onClick={() => setViewMode('Dashboard')}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                </>
            )}
            {viewMode === 'Dashboard' && (
                <button 
                    onClick={() => setViewMode('Form')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 font-bold text-sm transform hover:scale-105 transition-all"
                >
                    <PlusCircle className="w-5 h-5" /> New Enquiry
                </button>
            )}
        </div>
      </div>

      {mapError && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {mapError}</div>}

      {/* SETTINGS UI */}
      {showSettings && viewMode === 'Form' && (
         // ... (Kept existing settings panel code) ...
         <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
             <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>SUV</button>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Local Rules ({settingsVehicleType})</h4>
              <div><label className="text-xs text-gray-500 block mb-1">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Base Km Included</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Waiting Charge (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
            </div>
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Outstation Rules ({settingsVehicleType})</h4>
              <div><label className="text-xs text-gray-500 block mb-1">Min Km / Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Per Km Rate (₹/km)</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Base Rate (One Way Only)</label><input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Driver Allowance (₹/day)</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Driver Night Allowance (₹/night)</label><input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
            </div>
            <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Rental Rules ({settingsVehicleType})</h4>
              <div><label className="text-xs text-gray-500 block mb-1">Extra Hr Rate (₹/hr)</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm" /></div>
              <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-500 italic flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500" /> Note: Toll and permit will be extra.</p></div>
              <div className="pt-4"><button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900">Done</button></div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {viewMode === 'Dashboard' ? (
         <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ... (Existing Stats Cards) ... */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs font-bold text-gray-500 uppercase">Total Enquiries</p><h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3></div>
                    <div className="p-3 bg-gray-100 rounded-lg text-gray-600"><History className="w-5 h-5"/></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs font-bold text-gray-500 uppercase">Scheduled</p><h3 className="text-2xl font-bold text-blue-600">{stats.scheduled}</h3></div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Clock className="w-5 h-5"/></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs font-bold text-gray-500 uppercase">Booked</p><h3 className="text-2xl font-bold text-emerald-600">{stats.booked}</h3></div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle className="w-5 h-5"/></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div><p className="text-xs font-bold text-gray-500 uppercase">Pending</p><h3 className="text-2xl font-bold text-orange-600">{stats.pending}</h3></div>
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><AlertTriangle className="w-5 h-5"/></div>
                </div>
            </div>
            
            {/* Performance Analytics Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <PieChartIcon className="w-5 h-5 text-emerald-600"/> Performance Analytics
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                       <button onClick={() => setChartMetric('corporate')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartMetric === 'corporate' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>By Corporate</button>
                       <button onClick={() => setChartMetric('staff')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartMetric === 'staff' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}>By Staff</button>
                    </div>
                </div>
                <div className="h-64 w-full">
                    {pieData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                {pieData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <Tooltip 
                                contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb'}}
                                itemStyle={{color: '#374151', fontSize: '12px'}}
                             />
                             <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}} />
                          </PieChart>
                       </ResponsiveContainer>
                    ) : (
                       <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                          No data available for analytics
                       </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <input 
                        type="text" 
                        placeholder="Search name or phone..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                      <option value="All">All Status</option>
                      <option>New</option>
                      <option>Message Taken</option>
                      <option>Scheduled</option>
                      <option>Booked</option>
                   </select>
                   <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-gray-500" />
                   <button onClick={() => {setSearchQuery(''); setFilterStatus('All'); setFilterDate('');}} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"><Filter className="w-4 h-4"/></button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                          <tr>
                             <th className="px-6 py-4">Date</th>
                             <th className="px-6 py-4">Customer</th>
                             <th className="px-6 py-4">Type</th>
                             <th className="px-6 py-4 w-1/3">Details</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredList.map((item) => (
                             <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-gray-600">
                                    {item.date} <span className="text-xs text-gray-400 block">{item.time}</span>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="font-bold text-gray-800">{item.name}</div>
                                   <div className="text-xs text-gray-500">{item.phone}</div>
                                </td>
                                <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{item.type}</span></td>
                                <td className="px-6 py-4 text-gray-600 truncate max-w-xs" title={item.message}>{item.message}</td>
                                <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                       (item.outcome === 'Booked' || item.status === 'Booked') ? 'bg-emerald-100 text-emerald-700' :
                                       (item.outcome === 'Scheduled' || item.status === 'Scheduled') ? 'bg-blue-100 text-blue-700' :
                                       'bg-orange-100 text-orange-700'
                                   }`}>
                                      {item.outcome || item.status}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <button 
                                     onClick={() => handleOpenEditHistory(item)}
                                     className="text-gray-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-full transition-colors"
                                     title="View/Edit"
                                   >
                                      <Eye className="w-4 h-4"/>
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {filteredList.length === 0 && (
                              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No enquiries found.</td></tr>
                          )}
                      </tbody>
                   </table>
               </div>
            </div>
         </div>
      ) : (
      // FORM VIEW (Existing Layout)
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* ... (Rest of Form View UI is unchanged) ... */}
        {/* Left Column: Form & Calculator */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Caller Information Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${step === 2 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-500" /> Caller Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                        <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Caller Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                        <input type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="+91..." />
                    </div>
                </div>

                {/* Previous History Log */}
                {lookupHistory.length > 0 && (
                    <div className="mb-6 bg-gray-50 rounded-lg border border-gray-100 p-4 animate-in fade-in slide-in-from-top-1">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <History className="w-3 h-3"/> Previous Interactions
                            </h4>
                            <span className="text-[10px] text-gray-400">{lookupHistory.length} records found</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {lookupHistory.map((log, idx) => (
                                <div key={idx} className="text-xs bg-white p-2.5 rounded border border-gray-100 shadow-sm">
                                    <div className="flex justify-between text-gray-400 mb-1 border-b border-gray-50 pb-1">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {log.date}</span>
                                        <span className="font-medium text-emerald-600">{log.source}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-gray-700">{log.type}</span>
                                        {log.outcome && <span className="bg-gray-100 text-gray-600 px-1.5 rounded text-[10px]">{log.outcome}</span>}
                                    </div>
                                    <div className="text-gray-600 mt-1 italic leading-relaxed">
                                        <span className="font-semibold not-italic text-gray-500 text-[10px] uppercase mr-1">Note:</span>
                                        "{log.message || log.details}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Toggles */}
                    <div className="flex gap-4">
                        <div className="flex-1 bg-gray-100 p-1 rounded-lg flex">
                            <button onClick={() => setCallerType('Customer')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${callerType === 'Customer' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>Customer</button>
                            <button onClick={() => setCallerType('Vendor')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${callerType === 'Vendor' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>Vendor</button>
                        </div>
                        <div className="flex-1 bg-gray-100 p-1 rounded-lg flex">
                            <button onClick={() => setEnquiryCategory('Transport')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'Transport' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Transport Enquiry</button>
                            <button onClick={() => setEnquiryCategory('General')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'General' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>General Enquiry</button>
                        </div>
                    </div>

                    {/* Step Action */}
                    {step === 1 ? (
                        <button 
                            onClick={() => { if(customer.phone) setStep(2); else alert("Enter Phone Number"); }}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            Continue <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="flex justify-between items-center bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                            <span className="text-sm text-green-800 font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Details Locked</span>
                            <button onClick={() => setStep(1)} className="text-xs text-green-600 hover:underline font-bold">Change</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Step 2 Content: Calculator or Note */}
            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {enquiryCategory === 'Transport' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 bg-slate-50 border-b border-slate-200">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pickup Location</label>
                                {!isMapReady ? <div className="p-2 bg-white text-gray-500 text-sm rounded border flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Maps Loading...</div> : 
                                   <Autocomplete placeholder="Search Google Maps for Pickup" onAddressSelect={(addr) => setCustomer(prev => ({ ...prev, pickup: addr }))} setNewPlace={(place) => setPickupCoords(place)} defaultValue={customer.pickup} />
                                }
                            </div>

                            {/* Vehicle & Trip Selection */}
                            <div className="p-6 pb-2">
                                <div className="mb-6 flex gap-4">
                                    <div className="flex-1 bg-gray-50 p-1 rounded-lg border border-gray-200 flex">
                                        {['Local', 'Rental', 'Outstation'].map(type => (
                                            <button key={type} onClick={() => setTripType(type as TripType)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tripType === type ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>{type}</button>
                                        ))}
                                    </div>
                                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                        {['Sedan', 'SUV'].map(type => (
                                            <button key={type} onClick={() => setVehicleType(type as VehicleType)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${vehicleType === type ? 'bg-slate-800 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>{type}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Inputs based on Trip Type */}
                                {tripType === 'Local' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                                                {!isMapReady ? <div className="p-2 bg-gray-50 text-gray-500 text-xs rounded border">Loading...</div> : 
                                                  <Autocomplete placeholder="Search Google Maps for Drop" onAddressSelect={(addr) => setLocalDetails(prev => ({ ...prev, drop: addr }))} setNewPlace={(place) => setDropCoords(place)} defaultValue={localDetails.drop} />
                                                }
                                            </div>
                                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est Distance (Km)</label><input type="number" value={localDetails.estKm} onChange={e => setLocalDetails({...localDetails, estKm: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wait Time (Mins)</label><input type="number" value={localDetails.waitingMins} onChange={e => setLocalDetails({...localDetails, waitingMins: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" /></div>
                                        </div>
                                    </div>
                                )}

                                {tripType === 'Rental' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                           <label className="block text-xs font-bold text-gray-500 uppercase">Select Package</label>
                                           <button onClick={() => setShowAddPackage(true)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"><Plus className="w-3 h-3" /> Custom</button>
                                        </div>
                                        {showAddPackage && (
                                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                                             <div className="grid grid-cols-2 gap-2 mb-2">
                                                <input placeholder="Name" className="p-1.5 text-xs border rounded w-full" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                                                <div className="flex gap-2">
                                                    <input placeholder="Hrs" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                                                    <input placeholder="Km" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <input placeholder="₹ Sedan" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                                                    <input placeholder="₹ SUV" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                                                </div>
                                             </div>
                                             <div className="flex justify-end gap-2">
                                                <button onClick={() => setShowAddPackage(false)} className="text-xs text-gray-500">Cancel</button>
                                                <button onClick={handleAddPackage} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded">Add</button>
                                             </div>
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                                            {rentalPackages.map(pkg => (
                                                <div key={pkg.id} onClick={() => setRentalDetails({...rentalDetails, packageId: pkg.id})} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${rentalDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}>
                                                    <span className="font-bold text-gray-800 block text-sm">{pkg.name}</span>
                                                    <span className="text-xs text-gray-500">{pkg.hours} Hr / {pkg.km} Km</span>
                                                    <div className="text-right mt-1"><span className="text-emerald-600 font-bold text-sm">₹{vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tripType === 'Outstation' && (
                                    <div className="space-y-4">
                                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                            <button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'OneWay' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}><ArrowRight className="w-4 h-4" /> One Way</button>
                                            <button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'RoundTrip' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}><ArrowRightLeft className="w-4 h-4" /> Round Trip</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                                {!isMapReady ? <div className="p-2 bg-gray-50 text-gray-500 text-xs rounded border">Loading...</div> : 
                                                  <Autocomplete placeholder="Search Google Maps for Destination" onAddressSelect={(addr) => setOutstationDetails(prev => ({ ...prev, destination: addr }))} setNewPlace={(place) => setDestCoords(place)} defaultValue={outstationDetails.destination} />
                                                }
                                            </div>
                                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Days)</label><input type="number" value={outstationDetails.days} onChange={e => setOutstationDetails({...outstationDetails, days: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" min="1" /></div>
                                            {outstationSubType === 'RoundTrip' && (
                                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Night Stays</label><input type="number" value={outstationDetails.nights} onChange={e => setOutstationDetails({...outstationDetails, nights: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" min="0" placeholder="0" /></div>
                                            )}
                                            <div className={outstationSubType === 'OneWay' ? "md:col-span-1" : "md:col-span-2"}><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Distance (Km)</label><input type="number" value={outstationDetails.estTotalKm} onChange={e => setOutstationDetails({...outstationDetails, estTotalKm: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Added Requirement Details for Transport */}
                            <div className="px-6 pb-4 border-b border-gray-100 mb-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                                <textarea 
                                    rows={2}
                                    value={generalNote}
                                    onChange={(e) => setGeneralNote(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
                                    placeholder="Special requests, extra luggage, etc..."
                                />
                            </div>
                            
                            {/* ASSIGNMENT DROPDOWNS */}
                            <div className="px-6 pb-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Assign Enquiry To
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Corporate Select */}
                                    <div>
                                        <select 
                                            value={assignCorporate}
                                            onChange={(e) => { setAssignCorporate(e.target.value); setAssignBranch(''); setAssignStaff(''); }}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="Head Office">Head Office</option>
                                            {corporates.map((c, i) => (
                                                <option key={i} value={c.email}>{c.companyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Branch Select */}
                                    <div>
                                        <select 
                                            value={assignBranch}
                                            onChange={(e) => { setAssignBranch(e.target.value); setAssignStaff(''); }}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map((b, i) => (
                                                <option key={i} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Staff Select */}
                                    <div>
                                        <select 
                                            value={assignStaff}
                                            onChange={(e) => setAssignStaff(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="">Select Staff</option>
                                            {filteredStaffList.length > 0 ? (
                                                filteredStaffList.map((s, i) => (
                                                    <option key={i} value={s.id}>{s.name} ({s.role})</option>
                                                ))
                                            ) : (
                                                <option disabled>No staff found</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Action Buttons for Transport */}
                            <div className="px-6 pb-6 pt-2 bg-white space-y-3">
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="flex-1 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Calendar className="w-4 h-4" /> Schedule
                                    </button>
                                    <button 
                                        onClick={() => handleSaveEnquiry('Booked')}
                                        className="flex-1 py-3 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CalendarCheck className="w-4 h-4" /> Book Now
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleCancel}
                                        className="flex-1 py-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X className="w-3 h-3" /> Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleSaveEnquiry('Message Taken')}
                                        className="flex-1 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-3 h-3" /> Save Enquiry
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // General Enquiry Form
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-500" /> Requirement Details</h3>
                            <textarea 
                                value={generalNote}
                                onChange={(e) => setGeneralNote(e.target.value)}
                                rows={8}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-gray-700 leading-relaxed mb-6"
                                placeholder="Enter vehicle enquiry details here (e.g. monthly contract, bus hire, special request)..."
                            />
                            
                            {/* ASSIGNMENT DROPDOWNS (General) */}
                            <div className="mb-6 pb-4 border-b border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Assign Enquiry To
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <select 
                                            value={assignCorporate}
                                            onChange={(e) => { setAssignCorporate(e.target.value); setAssignBranch(''); setAssignStaff(''); }}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="Head Office">Head Office</option>
                                            {corporates.map((c, i) => (
                                                <option key={i} value={c.email}>{c.companyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select 
                                            value={assignBranch}
                                            onChange={(e) => { setAssignBranch(e.target.value); setAssignStaff(''); }}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map((b, i) => (
                                                <option key={i} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <select 
                                            value={assignStaff}
                                            onChange={(e) => setAssignStaff(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="">Select Staff</option>
                                            {filteredStaffList.map((s, i) => (
                                                <option key={i} value={s.id}>{s.name} ({s.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Enhanced Action Buttons for General */}
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="flex-1 py-3 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Calendar className="w-4 h-4" /> Schedule
                                    </button>
                                    <button 
                                        onClick={() => handleSaveEnquiry('Booked')}
                                        className="flex-1 py-3 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CalendarCheck className="w-4 h-4" /> Book Now
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleCancel}
                                        className="flex-1 py-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X className="w-3 h-3" /> Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleSaveEnquiry('Message Taken')}
                                        className="flex-1 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-3 h-3" /> Save Enquiry
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Right Column: Estimate & Actions */}
        <div className="space-y-6">
            {/* Estimate Card - Only Show for Transport Mode */}
            {enquiryCategory === 'Transport' && (
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">Estimated Cost</p>
                        <h3 className="text-4xl font-bold mb-4 flex items-start"><span className="text-xl mt-1 mr-1">₹</span> {estimate.total.toLocaleString()}</h3>
                        <div className="space-y-2 border-t border-slate-700 pt-4 text-sm text-slate-300">
                            <div className="flex justify-between font-bold text-white pt-2 mt-2"><span>Total</span><span>₹{estimate.total}</span></div>
                        </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
                </div>
            )}

            {/* Message & Actions */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-gray-400" /> Client Message</h4>
                    <button onClick={() => { navigator.clipboard.writeText(generatedMessage); alert("Copied!"); }} className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                </div>
                <textarea 
                    className="w-full h-96 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none resize-none mb-4 font-mono leading-relaxed"
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    placeholder="Message preview..."
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
                            const url = `mailto:?subject=${encodeURIComponent('Vehicle Enquiry Estimate')}&body=${encodeURIComponent(generatedMessage)}`;
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
      )}
    </div>
  );
};

export default VehicleEnquiries;
