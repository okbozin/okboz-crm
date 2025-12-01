
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Car, MapPin, User, Phone, MessageCircle, Mail, 
  Settings, Navigation, Copy, Edit2, Plus, Trash2, AlertTriangle, Loader2, ArrowRightLeft, ArrowRight,
  Truck, FileText, CheckCircle, ChevronRight, Clock, History, X, Save, Calendar, CalendarCheck, BellRing,
  LayoutDashboard, PlusCircle, Filter, ArrowLeft, Eye, Building2, PieChart as PieChartIcon, PhoneIncoming, PhoneOutgoing,
  Search, UserPlus
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

// Changed export from default to named
export const VehicleEnquiries: React.FC = () => {
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
  const [initialInteraction, setInitialInteraction] = useState<'Incoming' | 'Outgoing'>('Incoming');
  const [callerType, setCallerType] = useState<'Customer' | 'Vendor'>('Customer');
  const [isNewVendor, setIsNewVendor] = useState(true);
  const [selectedRegisteredVendorId, setSelectedRegisteredVendorId] = useState('');
  const [enquiryCategory, setEnquiryCategory] = useState<'General' | 'Transport'>('Transport');
  const [generalNote, setGeneralNote] = useState('');
  
  // Vendor-specific document notes and reminder
  const [vendorDocumentNotes, setVendorDocumentNotes] = useState('');
  const [vendorDocumentReminderDate, setVendorDocumentReminderDate] = useState('');

  // Assignment State
  const [assignCorporate, setAssignCorporate] = useState('Head Office');
  const [assignBranch, setAssignBranch] = useState('');
  const [assignStaff, setAssignStaff] = useState('');
  const [filteredStaffList, setFilteredStaffList] = useState<Employee[]>([]);
  
  // Lists
  const [corporates, setCorporates] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);

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

  // Form Data
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [formNameValue, setFormNameValue] = useState('');
  const [formCityInput, setFormCityInput] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [newVendorFormData, setNewVendorFormData] = useState({
      ownerName: '',
      email: '',
      phone: '',
      fleetSize: '',
      vehicleTypes: '',
      city: '',
      status: 'Pending'
  });

  // Rental Package Management State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  const getSessionKey = (baseKey: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  // Load Initial Data
  useEffect(() => {
      try {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);
          const brs = JSON.parse(localStorage.getItem('branches_data') || '[]');
          setBranches(brs);
          const vendors = JSON.parse(localStorage.getItem('vendor_data') || '[]');
          setAllVendors(vendors);
      } catch (e) {
          console.error("Error loading basic data", e);
      }
  }, []);

  // Filter Staff Logic
  useEffect(() => {
    let staff: Employee[] = [];
    if (assignCorporate && assignCorporate !== 'Head Office') {
        const corp = corporates.find(c => c.companyName === assignCorporate || c.email === assignCorporate);
        if (corp) {
            const saved = localStorage.getItem(`staff_data_${corp.email}`);
            if (saved) staff = JSON.parse(saved);
        }
    } else {
        const saved = localStorage.getItem('staff_data');
        if (saved) staff = JSON.parse(saved);
        else staff = MOCK_EMPLOYEES;
    }
    if (assignBranch) {
        staff = staff.filter(e => e.branch === assignBranch);
    }
    setFilteredStaffList(staff);
  }, [assignCorporate, assignBranch, corporates]);

  // Load Dashboard Data
  useEffect(() => {
      const saved = localStorage.getItem('call_enquiries_history');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setAllEnquiries(parsed);
          } catch(e) { console.error(e); }
      }
  }, []);

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

  // Load Pricing Rules
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const key = getSessionKey('transport_pricing_rules_v2'); 
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
    const key = getSessionKey('transport_rental_packages_v2');
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return DEFAULT_RENTAL_PACKAGES;
  });

  // Transport Calculation State
  const [transportDetails, setTransportDetails] = useState({
    pickup: '', drop: '', estKm: '', waitingMins: '', packageId: rentalPackages[0]?.id || '',
    destination: '', days: '1', estTotalKm: '', nights: '0'
  });
  const [estimate, setEstimate] = useState({
    base: 0, extraKmCost: 0, waitingCost: 0, driverCost: 0, nightAllowanceCost: 0, total: 0, chargeableKm: 0, details: ''
  });
  const [generatedMessage, setGeneratedMessage] = useState('');

  // Auto Distance Calculation Effect
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
                        setTransportDetails(prev => ({ ...prev, estTotalKm: formattedDist }));
                    } else {
                        setTransportDetails(prev => ({ ...prev, estKm: formattedDist }));
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
  }, [tripType, outstationSubType, vehicleType, transportDetails, pricing, rentalPackages]);

  const calculateEstimate = () => {
    let base = 0, extraKmCost = 0, waitingCost = 0, driverCost = 0, nightAllowanceCost = 0, total = 0, details = '';
    let chargeableKm = 0;

    const currentRules = pricing[vehicleType];

    if (tripType === 'Local') {
        const kms = parseFloat(transportDetails.estKm) || 0;
        const waitMins = parseFloat(transportDetails.waitingMins) || 0;
        
        base = currentRules.localBaseFare; 
        
        if (kms > currentRules.localBaseKm) {
            extraKmCost = (kms - currentRules.localBaseKm) * currentRules.localPerKmRate;
        }
        
        waitingCost = waitMins * currentRules.localWaitingRate;
        total = base + extraKmCost + waitingCost;
        details = `Base (${currentRules.localBaseKm}km): ₹${base} + Extra: ₹${extraKmCost} + Wait: ₹${waitingCost}`;

    } else if (tripType === 'Rental') {
        const pkg = rentalPackages.find(p => p.id === transportDetails.packageId) || rentalPackages[0];
        if (pkg) {
            base = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
            total = base; 
            details = `Package: ${pkg.name}`;
        }

    } else if (tripType === 'Outstation') {
        const days = parseFloat(transportDetails.days) || 1;
        const totalKm = parseFloat(transportDetails.estTotalKm) || 0;
        
        driverCost = currentRules.outstationDriverAllowance * days;
        const nights = outstationSubType === 'RoundTrip' ? (parseFloat(transportDetails.nights) || 0) : 0;
        nightAllowanceCost = currentRules.outstationNightAllowance * nights;

        if (outstationSubType === 'RoundTrip') {
            const minTotalKm = currentRules.outstationMinKmPerDay * days;
            chargeableKm = Math.max(totalKm, minTotalKm);
            
            base = chargeableKm * currentRules.outstationExtraKmRate;
            extraKmCost = 0;

            total = base + driverCost + nightAllowanceCost;
            details = `Min ${minTotalKm}km. Charged ${chargeableKm}km @ ₹${currentRules.outstationExtraKmRate}/km.`;

        } else { // One Way
            base = currentRules.outstationBaseRate;
            extraKmCost = totalKm * currentRules.outstationExtraKmRate;
            total = base + extraKmCost + driverCost; 
            details = `Base: ₹${base} + Km Charge: ₹${extraKmCost}`;
        }
    }

    setEstimate({ base, extraKmCost, waitingCost, driverCost, nightAllowanceCost, total, chargeableKm, details });
  };

  const generateMessage = useCallback(() => {
    const customerNameToUse: string = formNameValue || 'Customer';
    const greeting = `Hello ${customerNameToUse},`;
    const currentRules = pricing[vehicleType];
    let body = '';

    if (callerType === 'Vendor') {
        // Special message for vendor documents
        body = `
Vendor Name: ${formNameValue}
Phone: ${phoneNumberInput}
City: ${formCityInput}
Notes: ${vendorDocumentNotes}
Reminder Date: ${vendorDocumentReminderDate || 'Not set'}`;
        setGeneratedMessage(body); // Do not add greeting/footer for vendor message
        return;
    }

    // Customer related messages below
    if (enquiryCategory === 'General') {
        body = `
Regarding your general enquiry:
${generalNote}

We will get back to you shortly.`;
    } else { // Transport Enquiry
        if (tripType === 'Local') {
            body = `
🚖 *Local Trip Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${transportDetails.pickup}
📍 Drop: ${transportDetails.drop}
🛣 Distance: ~${transportDetails.estKm} km
⏳ Waiting Time: ${transportDetails.waitingMins} mins

💰 *Total Estimate: ₹${estimate.total.toLocaleString()}*
(Includes Base Fare ₹${currentRules.localBaseFare}, Extra Km Charges & Waiting Fees)`;
        } else if (tripType === 'Rental') {
            const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
            body = `
🚖 *Rental Package Estimate*
🚘 Vehicle: ${vehicleType}
📦 Package: ${pkg?.name}
📍 Pickup: ${transportDetails.pickup}

💰 *Package Price: ₹${estimate.total.toLocaleString()}*
(Extra charges apply for additional Km/Hrs)`;
        } else if (tripType === 'Outstation') {
            const roundTripDetails = `- Rate: ₹${currentRules.outstationExtraKmRate}/km
- Base Fare (Covers ${estimate.chargeableKm} km): ₹${estimate.base.toLocaleString()}`;
            
            const oneWayDetails = `- Base Fare: ₹${currentRules.outstationBaseRate.toLocaleString()}
- Extra Km Charge: ₹${estimate.extraKmCost.toLocaleString()}`;

            body = `
🚖 *Outstation Trip Estimate (${outstationSubType === 'OneWay' ? 'One Way' : 'Round Trip'})*
🚘 Vehicle: ${vehicleType}
🌍 Destination: ${transportDetails.destination}
📅 Duration: ${transportDetails.days} Days
${outstationSubType === 'RoundTrip' ? `🌙 Night Stays: ${transportDetails.nights}` : ''}
🛣 Est. Total Distance: ${transportDetails.estTotalKm} km

💰 *Total Estimate: ₹${estimate.total.toLocaleString()}*
📝 Breakdown:
${outstationSubType === 'RoundTrip' ? roundTripDetails : oneWayDetails}
- Driver Allowance: ₹${estimate.driverCost.toLocaleString()}
${outstationSubType === 'RoundTrip' ? `- Night Allowance: ₹${estimate.nightAllowanceCost.toLocaleString()}` : ''}

*Toll and state permit will be extra.*`;
        }
    }

    const footer = `\n\nBook now with OK BOZ Transport! 🚕`;
    setGeneratedMessage(`${greeting}${body}${footer}`);
  }, [
    estimate.total, estimate.base, estimate.extraKmCost, estimate.driverCost, estimate.nightAllowanceCost, estimate.chargeableKm,
    formNameValue, phoneNumberInput, formCityInput, callerType, enquiryCategory, generalNote, 
    vendorDocumentNotes, vendorDocumentReminderDate, vehicleType, pricing, rentalPackages, initialInteraction, 
    outstationSubType, transportDetails
  ]);

  useEffect(() => {
    generateMessage();
  }, [generateMessage]);


  const handlePhoneCheck = () => {
    if (phoneNumberInput.length < 5) return;
    
    const cleanNumber = phoneNumberInput.replace(/\D/g, '');
    let foundExisting = false;
    let identifiedCallerType: 'Customer' | 'Vendor' = 'Customer'; 
    let foundName = '';
    let foundCity = '';

    const vendor = allVendors.find((v: any) => v.phone && v.phone.replace(/\D/g, '').includes(cleanNumber));
    if (vendor) {
        foundExisting = true;
        identifiedCallerType = 'Vendor';
        foundName = vendor.ownerName;
        foundCity = vendor.city;
        setSelectedRegisteredVendorId(vendor.id); 
        setIsNewVendor(false);
    }

    if (!foundExisting) {
        const prevEnquiry = allEnquiries.find(e => e.phone && e.phone.replace(/\D/g, '').includes(cleanNumber));
        if (prevEnquiry) {
            foundExisting = true;
            identifiedCallerType = prevEnquiry.type;
            foundName = prevEnquiry.name;
            foundCity = prevEnquiry.city;
        }
    }

    setFormNameValue(foundName);
    setFormCityInput(foundCity);
    setCallerType(identifiedCallerType); 
    
    setLookupHistory(allEnquiries.filter(item => item.phone && item.phone.replace(/\D/g, '').includes(cleanNumber)));
    
    setStep(2); 
  };

  const handleSaveEnquiry = (status: 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked' | 'Scheduled' | 'Message Taken') => {
    const newEnquiry = {
        id: `ENQ-${Date.now()}`,
        initialInteraction,
        type: callerType,
        name: formNameValue,
        phone: phoneNumberInput,
        city: formCityInput,
        email: formEmail,
        details: callerType === 'Customer' && enquiryCategory === 'General' ? generalNote : generatedMessage,
        status,
        isExistingVendor: callerType === 'Vendor' && !isNewVendor,
        vendorId: callerType === 'Vendor' && !isNewVendor ? selectedRegisteredVendorId : undefined,
        assignedTo: assignStaff,
        createdAt: new Date().toLocaleString(),
        nextFollowUp: (callerType === 'Vendor' && vendorDocumentReminderDate) ? vendorDocumentReminderDate : reminderDateTime.date,
        history: [{
            id: Date.now(),
            type: initialInteraction === 'Incoming' ? 'Call' : 'Outgoing Call',
            message: `New ${callerType} enquiry logged. Status: ${status}.`,
            date: new Date().toLocaleString(),
            outcome: 'Connected'
        }],
        date: new Date().toISOString().split('T')[0],
        vendorDocumentNotes: callerType === 'Vendor' ? vendorDocumentNotes : undefined,
        vendorDocumentReminderDate: callerType === 'Vendor' ? vendorDocumentReminderDate : undefined,
    };

    setAllEnquiries(prev => [newEnquiry, ...prev]);
    setNotification({show: true, message: `Enquiry for ${formNameValue} saved as ${status}!`, type: 'success'});
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setPhoneNumberInput('');
    setFormNameValue('');
    setFormCityInput('');
    setFormEmail('');
    setInitialInteraction('Incoming');
    setCallerType('Customer');
    setIsNewVendor(true);
    setSelectedRegisteredVendorId('');
    setEnquiryCategory('Transport');
    setGeneralNote('');
    setVendorDocumentNotes('');
    setVendorDocumentReminderDate('');
    setAssignCorporate('Head Office');
    setAssignBranch('');
    setAssignStaff('');
    setPickupCoords(null);
    setDropCoords(null);
    setDestCoords(null);
    setTransportDetails({
      pickup: '', drop: '', estKm: '', waitingMins: '', packageId: rentalPackages[0]?.id || '',
      destination: '', days: '1', estTotalKm: '', nights: '0'
    });
    setEstimate({
      base: 0, extraKmCost: 0, waitingCost: 0, driverCost: 0, nightAllowanceCost: 0, total: 0, chargeableKm: 0, details: ''
    });
    setGeneratedMessage('');
    setLookupHistory([]);
    setReminderDateTime({ date: '', time: '' });
  };

  const handleEditEnquiryStatus = () => {
    if (editingHistoryItem && editForm.status) {
      setAllEnquiries(prev => prev.map((enq: any) => 
        enq.id === editingHistoryItem.id 
          ? { ...enq, status: editForm.status, details: editForm.message } 
          : enq
      ));
      setNotification({ show: true, message: `Enquiry for ${editingHistoryItem.name} updated to ${editForm.status}.`, type: 'success' });
      setEditingHistoryItem(null);
    }
  };

  // --- Package Management Handlers ---
  const handleAddPackageHandler = () => {
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

  const handleRemovePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
      if (transportDetails.packageId === id) {
        setTransportDetails(prev => ({ ...prev, packageId: rentalPackages.length > 1 ? rentalPackages[0].id : '' }));
      }
    }
  };

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysEnquiries = allEnquiries.filter((e: any) => e.date === today);

    const total = todaysEnquiries.length;
    const newCount = todaysEnquiries.filter((e: any) => e.status === 'New').length;
    const booked = todaysEnquiries.filter((e: any) => e.status === 'Booked' || e.status === 'Converted').length;
    const pending = todaysEnquiries.filter((e: any) => e.status === 'In Progress' || e.status === 'Message Taken' || e.status === 'Scheduled').length;
    
    const statusDistribution: Record<string, number> = {};
    allEnquiries.forEach((e: any) => {
        statusDistribution[e.status] = (statusDistribution[e.status] || 0) + 1;
    });

    const chartData = Object.keys(statusDistribution).map(status => ({
        name: status,
        value: statusDistribution[status]
    }));

    return { total, newCount, booked, pending, chartData };
  }, [allEnquiries]);

  const filteredDashboardEnquiries = allEnquiries.filter((enq: any) => {
      const matchesSearch = enq.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            enq.phone?.includes(searchQuery) ||
                            enq.city?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || enq.status === filterStatus;
      const matchesDate = !filterDate || enq.date === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Vehicle & Call Enquiries</h2>
          <p className="text-gray-500">Manage customer queries and track vendor interactions</p>
        </div>
      </div>

      {notification && notification.show && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-auto text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Enquiry Form */}
        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-left-10 duration-500">
            {/* Step 1: Caller Type Selection */}
            {step === 1 && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center animate-in zoom-in duration-300">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">New Enquiry</h3>
                    
                    {/* Incoming / Outgoing Buttons */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                        <button 
                            onClick={() => setInitialInteraction('Incoming')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${initialInteraction === 'Incoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <PhoneIncoming className="w-4 h-4" /> Incoming
                        </button>
                        <button 
                            onClick={() => setInitialInteraction('Outgoing')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${initialInteraction === 'Outgoing' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <PhoneOutgoing className="w-4 h-4" /> Outgoing
                        </button>
                    </div>

                    {/* Customer / Vendor Buttons */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                        <button 
                            onClick={() => { setCallerType('Customer'); setPhoneNumberInput(''); setFormNameValue(''); setFormCityInput(''); setIsNewVendor(true); setSelectedRegisteredVendorId(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${callerType === 'Customer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <User className="w-4 h-4" /> Customer
                        </button>
                        <button 
                            onClick={() => { setCallerType('Vendor'); setPhoneNumberInput(''); setFormNameValue(''); setFormCityInput(''); setIsNewVendor(true); setSelectedRegisteredVendorId(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${callerType === 'Vendor' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Truck className="w-4 h-4" /> Vendor
                        </button>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input 
                            type="tel" 
                            required
                            autoFocus
                            placeholder="+91..."
                            value={phoneNumberInput}
                            onChange={(e) => setPhoneNumberInput(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg tracking-wide text-center"
                        />
                    </div>

                    <button 
                        onClick={handlePhoneCheck}
                        disabled={phoneNumberInput.length < 5}
                        className="w-full mt-6 bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        Continue <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Step 2: Details Form */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-10 duration-500">
                    <div className="flex justify-start">
                        <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    </div>
                    {/* Caller Info Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" /> {callerType === 'Customer' ? 'Customer Details' : 'Vendor Details'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {callerType === 'Vendor' && (
                                <div className="md:col-span-2">
                                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                        <button 
                                            onClick={() => setIsNewVendor(true)}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${isNewVendor ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            New Vendor
                                        </button>
                                        <button 
                                            onClick={() => setIsNewVendor(false)}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${!isNewVendor ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Registered Vendor
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={formNameValue} 
                                    onChange={e => setFormNameValue(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder={callerType === 'Customer' ? "Customer Name" : "Vendor Name"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                                <input 
                                    type="tel" 
                                    value={phoneNumberInput} 
                                    onChange={e => setPhoneNumberInput(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="+91..."
                                />
                            </div>
                            {callerType === 'Customer' && ( // ONLY FOR CUSTOMERS
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                                    {!isMapReady ? (
                                    <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps...
                                    </div>
                                    ) : (
                                    <Autocomplete 
                                        placeholder="Search Google Maps for Pickup"
                                        onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, pickup: addr }))}
                                        setNewPlace={(place) => setPickupCoords(place)}
                                        defaultValue={transportDetails.pickup}
                                    />
                                    )}
                                </div>
                            )}
                            {/* New/Registered Vendor Specific Fields */}
                            {callerType === 'Vendor' && isNewVendor && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fleet Size</label>
                                        <input 
                                            type="number" 
                                            value={newVendorFormData.fleetSize} 
                                            onChange={e => setNewVendorFormData(prev => ({...prev, fleetSize: e.target.value}))}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Types (CSV)</label>
                                        <input 
                                            type="text" 
                                            value={newVendorFormData.vehicleTypes} 
                                            onChange={e => setNewVendorFormData(prev => ({...prev, vehicleTypes: e.target.value}))}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Sedan, SUV, etc."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                                        <select 
                                            value={newVendorFormData.city} 
                                            onChange={e => setNewVendorFormData(prev => ({...prev, city: e.target.value}))}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                        >
                                            <option value="">Select City</option>
                                            {corporates.map((c: any) => <option key={c.id} value={c.city}>{c.city}</option>)}
                                            <option value="Head Office">Head Office</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            {callerType === 'Vendor' && !isNewVendor && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Registered Vendor</label>
                                    <select 
                                        value={selectedRegisteredVendorId} 
                                        onChange={e => setSelectedRegisteredVendorId(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                    >
                                        <option value="">Choose Vendor</option>
                                        {allVendors.map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.ownerName} ({v.city})</option>
                                        ))}
                                    </select>
                                    {selectedRegisteredVendorId && (
                                        <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-700">
                                            <p className="font-bold">{allVendors.find(v => v.id === selectedRegisteredVendorId)?.ownerName}</p>
                                            <p>Phone: {allVendors.find(v => v.id === selectedRegisteredVendorId)?.phone}</p>
                                            <p>Vehicle Types: {allVendors.find(v => v.id === selectedRegisteredVendorId)?.vehicleTypes.join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enquiry / Document Section */}
                    {callerType === 'Customer' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                {['General', 'Transport'].map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setEnquiryCategory(category as 'General' | 'Transport')}
                                        className={`flex-1 py-3 text-sm font-bold transition-colors ${enquiryCategory === category ? 'bg-white text-emerald-600 border-t-2 border-t-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {category} Enquiry
                                    </button>
                                ))}
                            </div>
                            <div className="p-6">
                                {enquiryCategory === 'General' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                                        <textarea 
                                            rows={4}
                                            value={generalNote}
                                            onChange={e => setGeneralNote(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                            placeholder="Special requests, extra luggage, etc."
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
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
                                                                    onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, drop: addr }))}
                                                                    setNewPlace={(place) => setDropCoords(place)}
                                                                    defaultValue={transportDetails.drop}
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est Distance (Km)</label>
                                                            <input 
                                                                type="number" 
                                                                value={transportDetails.estKm}
                                                                onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})}
                                                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wait Time (Mins)</label>
                                                            <input 
                                                                type="number" 
                                                                value={transportDetails.waitingMins}
                                                                onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})}
                                                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                                                placeholder="0"
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

                                            {tripType === 'Rental' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="block text-xs font-bold text-gray-500 uppercase">Select Package</label>
                                                            <button onClick={() => setShowSettings(true)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium">
                                                                <Plus className="w-3 h-3" /> Manage Packages
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                                            {rentalPackages.map(pkg => (
                                                                <div 
                                                                    key={pkg.id}
                                                                    onClick={() => setTransportDetails({...transportDetails, packageId: pkg.id})}
                                                                    className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all group ${transportDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}
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
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                                                        * Extra Charges: Hours (₹{pricing[vehicleType].rentalExtraHrRate}/hr) and Km (₹{pricing[vehicleType].rentalExtraKmRate}/km).
                                                    </div>
                                                </div>
                                            )}

                                            {tripType === 'Outstation' && (
                                                <div className="space-y-4">
                                                    <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                                        <button 
                                                            onClick={() => setOutstationSubType('OneWay')}
                                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'OneWay' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                                                        >
                                                            <ArrowRight className="w-4 h-4" /> One Way
                                                        </button>
                                                        <button 
                                                            onClick={() => setOutstationSubType('RoundTrip')}
                                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${outstationSubType === 'RoundTrip' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
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
                                                                    onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, destination: addr }))}
                                                                    setNewPlace={(place) => setDestCoords(place)}
                                                                    defaultValue={transportDetails.destination}
                                                                />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Days)</label>
                                                            <input 
                                                                type="number" 
                                                                value={transportDetails.days}
                                                                onChange={e => setTransportDetails({...transportDetails, days: e.target.value})}
                                                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                                                min="1"
                                                            />
                                                        </div>
                                                        {outstationSubType === 'RoundTrip' && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Night Stays (Nights)</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={transportDetails.nights}
                                                                    onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})}
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
                                                                value={transportDetails.estTotalKm}
                                                                onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})}
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
                                )}
                            </div>
                        </div>
                    ) : (
                        // Vendor Document Reminder & Notes Section
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                               <FileText className="w-4 h-4 text-gray-400" /> Document Reminder & Notes
                           </h3>
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                                   <textarea 
                                       rows={4}
                                       value={vendorDocumentNotes}
                                       onChange={e => setVendorDocumentNotes(e.target.value)}
                                       className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                       placeholder="Any specific documents needed, follow-up actions, etc."
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reminder Date</label>
                                   <input 
                                       type="date" 
                                       value={vendorDocumentReminderDate}
                                       onChange={e => setVendorDocumentReminderDate(e.target.value)}
                                       className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                   />
                               </div>
                           </div>
                       </div>
                    )}


                    {/* Assignment Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-gray-400" /> Assign & Follow-up
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corporate / Franchise</label>
                                <select 
                                    value={assignCorporate}
                                    onChange={e => setAssignCorporate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="Head Office">Head Office</option>
                                    {corporates.map((c: any) => (
                                        <option key={c.id} value={c.email}>{c.companyName} ({c.city})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                                <select 
                                    value={assignBranch}
                                    onChange={e => setAssignBranch(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="">Select Branch</option>
                                    {branches.filter(b => assignCorporate === 'Head Office' ? (b.owner === 'admin' || !b.owner) : b.owner === assignCorporate).map((b: any) => (
                                       <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assigned To</label>
                                <select 
                                    value={assignStaff}
                                    onChange={e => setAssignStaff(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="">Select Staff Member</option>
                                    {filteredStaffList.map(staff => (
                                        <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={resetForm} className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                        {callerType === 'Customer' && (
                            <>
                                <button type="button" onClick={() => handleSaveEnquiry('Scheduled')} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-colors">Schedule</button>
                                <button type="button" onClick={() => handleSaveEnquiry('Booked')} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-colors">Book Now</button>
                            </>
                        )}
                        {callerType === 'Vendor' && (
                            <button type="button" onClick={() => handleSaveEnquiry('Message Taken')} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-colors">Save with Reminder</button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Dashboard & Live Feed */}
        <div className="lg:col-span-1 space-y-6 animate-in slide-in-from-right-10 duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-500 uppercase">Total Enq.</p>
                        <span className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><PhoneIncoming className="w-4 h-4" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{dashboardStats.total}</p>
                    <p className="text-xs text-gray-400 mt-1">Today's total</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-500 uppercase">New Enq.</p>
                        <span className="bg-orange-50 text-orange-600 p-1.5 rounded-lg"><PlusCircle className="w-4 h-4" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{dashboardStats.newCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Unassigned or fresh</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-500 uppercase">Booked/Conv.</p>
                        <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{dashboardStats.booked}</p>
                    <p className="text-xs text-gray-400 mt-1">Converted to leads</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-500 uppercase">Pending</p>
                        <span className="bg-red-50 text-red-600 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{dashboardStats.pending}</p>
                    <p className="text-xs text-gray-400 mt-1">Action or follow-up</p>
                </div>
            </div>

            {/* Status Distribution Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" /> Status Distribution
                </h3>
                <div className="h-48 w-full">
                    {dashboardStats.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dashboardStats.chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {dashboardStats.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data yet</div>
                    )}
                </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <History className="w-4 h-4 text-orange-500" /> Live Activity Feed
                    </h3>
                    <button className="text-sm text-emerald-600 hover:underline">View All</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {filteredDashboardEnquiries.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No recent activity</p>
                        </div>
                    ) : (
                        filteredDashboardEnquiries.map((item) => (
                            <div key={item.id} className="relative pl-4 border-l-2 border-gray-100 py-1 group hover:border-indigo-200 transition-colors">
                                <div className={`absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                                    item.status === 'Booked' || item.status === 'Converted' ? 'bg-emerald-500' : 
                                    item.status === 'New' ? 'bg-red-500' : 'bg-orange-400'
                                }`}></div>
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-gray-800">{item.name}</h4>
                                    <span className="text-[10px] text-gray-400">{item.createdAt.split(',')[1]}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-1">{item.city} • {item.type}</p>
                                <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 line-clamp-2 italic border border-gray-100 group-hover:border-indigo-100">
                                    "{item.details}"
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        item.status === 'Booked' || item.status === 'Converted' ? 'bg-emerald-50 text-emerald-700' :
                                        item.status === 'New' ? 'bg-red-50 text-red-700' :
                                        'bg-orange-50 text-orange-700'
                                    }`}>
                                        {item.status}
                                    </span>
                                    <button 
                                        onClick={() => setEditingHistoryItem(item)}
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
        </div>
      </div>

      {/* Edit History Item Modal */}
      {editingHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-800">Edit Enquiry Record</h3>
              <button onClick={() => setEditingHistoryItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Converted">Converted</option>
                  <option value="Closed">Closed</option>
                  <option value="Booked">Booked</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Message Taken">Message Taken</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details / Message</label>
                <textarea 
                  rows={4}
                  value={editForm.message}
                  onChange={e => setEditForm({...editForm, message: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Update notes or details..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setEditingHistoryItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditEnquiryStatus}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (for Transport Pricing) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
               <div className="flex items-center gap-4">
                  <h3 className="font-bold text-gray-800 text-xl">Fare Configuration</h3>
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
               <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Local Settings */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Local Rules ({settingsVehicleType})</h4>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Base Fare (₹)</label>
                      <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], localBaseFare: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Base Km Included</label>
                      <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], localBaseKm: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label>
                      <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], localPerKmRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Waiting Charge (₹/min)</label>
                      <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], localWaitingRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                  </div>

                  {/* Outstation Settings */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Outstation Rules ({settingsVehicleType})</h4>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Min Km / Day</label>
                      <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], outstationMinKmPerDay: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Per Km Rate (₹/km)</label>
                      <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], outstationExtraKmRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Base Rate (One Way Only)</label>
                      <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], outstationBaseRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" placeholder="Not used for Round Trip" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Driver Allowance (₹/day)</label>
                      <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], outstationDriverAllowance: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Driver Night Allowance (₹/night)</label>
                      <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], outstationNightAllowance: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                  </div>

                  {/* Rental Settings */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">Rental Rules ({settingsVehicleType})</h4>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Extra Hr Rate (₹/hr)</label>
                      <input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], rentalExtraHrRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label>
                      <input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={e => setPricing(prev => ({ ...prev, [settingsVehicleType]: {...prev[settingsVehicleType], rentalExtraKmRate: parseFloat(e.target.value) || 0} }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div className="pt-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Rental Packages</h4>
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 mb-2">
                              <div className="text-sm font-medium text-gray-700">{pkg.name}</div>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Sedan ₹{pkg.priceSedan}</span>
                                  <span className="text-xs text-gray-500">SUV ₹{pkg.priceSuv}</span>
                                  <button onClick={(e) => handleRemovePackage(pkg.id, e)} className="text-gray-400 hover:text-red-500 p-1"><X className="w-3 h-3" /></button>
                              </div>
                          </div>
                      ))}
                      <button onClick={() => setShowAddPackage(true)} className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-2">
                         <Plus className="w-4 h-4" /> Add Package
                      </button>
                      
                      {/* Add Package Form */}
                      {showAddPackage && (
                        <div className="mt-3 bg-gray-100 p-3 rounded-lg space-y-2">
                            <input placeholder="Name (e.g. 10 Hr / 100 Km)" className="w-full p-2 text-sm border rounded" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-2">
                            <input placeholder="Hours" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                            <input placeholder="Km" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                            <input placeholder="Price Sedan" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                            <input placeholder="Price SUV" type="number" className="p-1.5 text-xs border rounded w-1/2" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAddPackage(false)} className="text-sm text-gray-500">Cancel</button>
                            <button type="button" onClick={handleAddPackageHandler} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded">Add</button>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
               <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">Close Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
