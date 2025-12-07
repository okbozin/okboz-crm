
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck, AlertTriangle, DollarSign,
  Calendar, MapPin, Briefcase, Clock, PhoneMissed, Plus, Trash2
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog, UserRole } from '../../types';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type CallerType = 'Customer' | 'Vendor';
type EnquiryCategory = 'Transport' | 'General';

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

interface CustomerCareProps {
  role: UserRole;
}

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Enquiry State
  const [callerType, setCallerType] = useState<CallerType>('Customer');
  const [enquiryCategory, setEnquiryCategory] = useState<EnquiryCategory>('Transport');

  const [tripType, setTripType] = useState<TripType>('Local');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  
  const [transportDetails, setTransportDetails] = useState({
    drop: '', estKm: '', waitingMins: '', packageId: '',
    destination: '', days: '1', estTotalKm: '', nights: '0'
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', pickup: '', requirements: ''
  });

  // General Enquiry State
  const [generalFollowUpDate, setGeneralFollowUpDate] = useState('');
  const [generalFollowUpTime, setGeneralFollowUpTime] = useState('');
  const [generalFollowUpPriority, setGeneralFollowUpPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);

  // Helper for Session Context
  const getSessionKey = (baseKey: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const key = getSessionKey('transport_pricing_rules_v2'); 
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const key = getSessionKey('transport_rental_packages_v2');
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    return DEFAULT_RENTAL_PACKAGES;
  });

  // Settings UI State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem(getSessionKey('transport_pricing_rules_v2'), JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem(getSessionKey('transport_rental_packages_v2'), JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  // --- Assignment Data ---
  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const [assignment, setAssignment] = useState({
    corporateId: '',
    branchName: '',
    staffId: ''
  });

  // --- Enquiry List Management ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
      const saved = localStorage.getItem('global_enquiries_data');
      return saved ? JSON.parse(saved) : [];
  });

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  useEffect(() => {
      // 1. Load Data for Assignment Dropdowns
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
      let branches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
      
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      let staff = [...adminStaff.map((s: any) => ({...s, owner: 'admin'}))];

      corps.forEach((c: any) => {
          const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
          branches = [...branches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
          
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
          staff = [...staff, ...cStaff.map((s: any) => ({...s, owner: c.email}))];
      });

      setAllBranches(branches);
      setAllStaff(staff);
      
      setAssignment(prev => ({ ...prev, corporateId: isSuperAdmin ? 'admin' : sessionId }));
  }, [isSuperAdmin, sessionId]);

  const filteredBranches = useMemo(() => {
      return allBranches.filter(b => 
        assignment.corporateId === 'admin' ? b.owner === 'admin' : b.owner === assignment.corporateId
      );
  }, [allBranches, assignment.corporateId]);
  
  const filteredStaff = useMemo(() => {
      return allStaff.filter(s => 
        (assignment.corporateId === 'admin' ? s.owner === 'admin' : s.owner === assignment.corporateId) &&
        (assignment.branchName === '' || s.branch === assignment.branchName)
      );
  }, [allStaff, assignment.corporateId, assignment.branchName]);

  // Customer History Lookup
  const customerHistory = useMemo(() => {
      if (!customerDetails.phone || customerDetails.phone.length < 5) return [];
      const cleanPhone = customerDetails.phone.replace(/\D/g, '');
      return enquiries.filter(e => e.phone.replace(/\D/g, '').includes(cleanPhone)).slice(0, 3);
  }, [customerDetails.phone, enquiries]);


  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Map Error: Google Cloud Billing is not enabled. Please enable billing in the Google Cloud Console.");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Error: Google Cloud Billing is not enabled. Please enable billing in the Google Cloud Console.");
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

  // --- Auto Distance Calculation Effect ---
  useEffect(() => {
    if (!isMapReady || !window.google || !window.google.maps.DistanceMatrixService || !pickupCoords) return;

    try {
        const service = new window.google.maps.DistanceMatrixService();

        const calculateDistance = (destination: google.maps.LatLngLiteral, isRoundTripCalculation: boolean, isOutstationState: boolean) => {
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

                        setTransportDetails(prev => ({ 
                            ...prev, 
                            [isOutstationState ? 'estTotalKm' : 'estKm']: formattedDist 
                        }));
                    } else {
                        console.error("Error calculating distance:", status, response);
                        if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                            setMapError("Map Error: Google Cloud Billing is not enabled. Please enable billing in the Google Cloud Console.");
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
    } catch (error: any) {
        console.error("Failed to initialize Distance Matrix Service:", error);
        setMapError("Map Error: Google Cloud Billing is not enabled. Please enable billing in the Google Cloud Console.");
    }

  }, [pickupCoords, dropCoords, destCoords, isMapReady, tripType, outstationSubType]);

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
    
    if (editingPackageId) {
        // Update existing package
        setRentalPackages(prev => prev.map(p => p.id === editingPackageId ? {
            ...p,
            name: newPackage.name,
            hours: parseFloat(newPackage.hours) || 0,
            km: parseFloat(newPackage.km) || 0,
            priceSedan: parseFloat(newPackage.priceSedan) || 0,
            priceSuv: parseFloat(newPackage.priceSuv) || 0,
        } : p));
        setEditingPackageId(null);
    } else {
        // Add new package
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

  const handleEditPackage = (pkg: RentalPackage, e: React.MouseEvent) => {
      e.stopPropagation();
      setNewPackage({
          name: pkg.name,
          hours: pkg.hours.toString(),
          km: pkg.km.toString(),
          priceSedan: pkg.priceSedan.toString(),
          priceSuv: pkg.priceSuv.toString()
      });
      setEditingPackageId(pkg.id);
      setShowAddPackage(true);
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  // Calculation Logic
  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let details = '';

      if (tripType === 'Local') {
          const base = rules.localBaseFare;
          const km = parseFloat(transportDetails.estKm) || 0;
          const extraKm = Math.max(0, km - rules.localBaseKm) * rules.localPerKmRate;
          const wait = (parseFloat(transportDetails.waitingMins) || 0) * rules.localWaitingRate;
          total = base + extraKm + wait;
          details = `Local Trip: ${km}km`;
      } else if (tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          if (pkg) {
              total = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              details = `Rental: ${pkg.name}`;
          }
      } else {
          // Outstation
          const days = parseFloat(transportDetails.days) || 1;
          const km = parseFloat(transportDetails.estTotalKm) || 0;
          const driver = rules.outstationDriverAllowance * days;
          
          if (outstationSubType === 'RoundTrip') {
              const minKm = days * rules.outstationMinKmPerDay;
              const chargeKm = Math.max(km, minKm);
              total = (chargeKm * rules.outstationExtraKmRate) + driver;
              const nights = (parseFloat(transportDetails.nights) || 0) * rules.outstationNightAllowance;
              total += nights;
              details = `Round Trip: ${days} days, ${km} km`;
          } else {
              total = rules.outstationBaseRate + (km * rules.outstationExtraKmRate) + driver;
              details = `One Way: ${km} km`;
          }
      }

      setEstimatedCost(total);

      // Generate Message Based on Enquiry Type
      let msg = '';

      if (enquiryCategory === 'General') {
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},
Thank you for contacting OK BOZ. 

Regarding your enquiry:
"${customerDetails.requirements || 'General Requirement'}"

We have received your request and our team will get back to you shortly with more details.

For immediate assistance, feel free to call us.

Regards,
OK BOZ Support Team`;
      } else {
          // Transport Estimate Message
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          msg = `Hello ${customerDetails.name || 'Customer'},
Here is your ${tripType} estimate from OK BOZ! 🚕

*${tripType} Trip Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${customerDetails.pickup || 'TBD'}
${tripType === 'Local' ? `📍 Drop: ${transportDetails.drop}` : ''}
${tripType === 'Outstation' ? `🌍 Destination: ${transportDetails.destination}` : ''}
📝 Details: ${details}
${tripType === 'Local' ? `⏳ Waiting Time: ${transportDetails.waitingMins} mins` : ''}
${tripType === 'Rental' ? `📦 Package: ${pkg?.name || 'Custom'}` : ''}

💰 *Base Fare: ₹${total.toFixed(0)}*
(Includes ${tripType === 'Local' ? 'Base Fare + Km' : tripType === 'Rental' ? 'Package Rate' : 'Driver Allowance + Km'})

*Toll and Parking Extra.*

Book now with OK BOZ Transport!`;
      }

      setGeneratedMessage(msg);
  }, [estimatedCost, customerDetails, transportDetails, tripType, vehicleType, pricing, rentalPackages, enquiryCategory, outstationSubType]);

  const handleEnquiryAction = (action: 'Schedule' | 'Book' | 'Save') => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }

      // 1. Construct Details String
      let detailsText = '';
      if (enquiryCategory === 'Transport') {
          detailsText = `[${vehicleType} - ${tripType}] `;
          if (tripType === 'Local') detailsText += `Pickup: ${customerDetails.pickup} -> Drop: ${transportDetails.drop}. Dist: ${transportDetails.estKm}km.`;
          if (tripType === 'Rental') {
              const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
              detailsText += `Package: ${pkg?.name}. Pickup: ${customerDetails.pickup}.`;
          }
          if (tripType === 'Outstation') detailsText += `Dest: ${transportDetails.destination}. ${transportDetails.days} Days. Pickup: ${customerDetails.pickup}.`;
          detailsText += ` Estimate: ₹${estimatedCost}`;
      } else {
          detailsText = "General Enquiry. ";
      }
      
      if (customerDetails.requirements) detailsText += `\nReq: ${customerDetails.requirements}`;

      // 2. Determine Status
      let status: Enquiry['status'] = 'New';
      if (action === 'Book') status = 'Booked';
      if (action === 'Schedule') status = 'Scheduled';

      // 3. Create History Log
      const historyLog: HistoryLog = {
          id: Date.now(),
          type: 'Note',
          message: `Enquiry ${action === 'Book' ? 'Booked' : action === 'Schedule' ? 'Scheduled' : 'Saved'} via Vehicle Console. ${estimatedCost > 0 ? `Est: ₹${estimatedCost}` : ''}`,
          date: new Date().toLocaleString(),
          outcome: 'Completed'
      };

      // 4. Create Object
      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: 'Coimbatore', // Default if not parsed
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          createdAt: new Date().toLocaleString(),
          history: [historyLog],
          date: new Date().toISOString().split('T')[0],
          nextFollowUp: generalFollowUpDate && generalFollowUpTime ? `${generalFollowUpDate}T${generalFollowUpTime}` : undefined,
          priority: generalFollowUpPriority
      };

      // 5. Save
      const updatedList = [newEnquiry, ...enquiries];
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));

      alert(`Enquiry ${status} Successfully!`);
      
      // 6. Reset
      handleCancel();
  };

  const handleGeneralAction = (action: 'NoAnswer' | 'FollowUp' | 'Complete') => {
      if (!customerDetails.name || !customerDetails.phone) {
          alert("Please enter Customer Name and Phone.");
          return;
      }

      let status: Enquiry['status'] = 'New';
      let logMessage = '';

      if (action === 'NoAnswer') {
          status = 'New';
          logMessage = 'Call Attempted - No Answer';
      } else if (action === 'FollowUp') {
          status = 'In Progress';
          logMessage = `Follow-up Scheduled. Priority: ${generalFollowUpPriority}`;
      } else if (action === 'Complete') {
          status = 'Closed';
          logMessage = 'Task Completed / Resolved.';
      }

      const detailsText = `General Enquiry: ${customerDetails.requirements || 'No details provided'}`;

      const historyLog: HistoryLog = {
          id: Date.now(),
          type: action === 'NoAnswer' ? 'Call' : 'Note',
          message: logMessage,
          date: new Date().toLocaleString(),
          outcome: action === 'NoAnswer' ? 'Missed' : 'Completed'
      };

      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: 'Coimbatore', 
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          createdAt: new Date().toLocaleString(),
          history: [historyLog],
          date: new Date().toISOString().split('T')[0],
          nextFollowUp: generalFollowUpDate && generalFollowUpTime ? `${generalFollowUpDate}T${generalFollowUpTime}` : undefined,
          priority: generalFollowUpPriority
      };

      const updatedList = [newEnquiry, ...enquiries];
      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));

      alert(`Action Recorded: ${logMessage}`);
      handleCancel();
  };

  const handleCancel = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneralFollowUpDate('');
      setGeneralFollowUpTime('');
      setGeneralFollowUpPriority('Warm');
      setEstimatedCost(0);
      setGeneratedMessage('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Truck className="w-8 h-8 text-emerald-600" /> Customer Care
          </h2>
          <p className="text-gray-500">Manage transport requests, estimates, and general enquiries</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
            </button>
        </div>
      </div>

      {/* Settings Panel */}
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
                        onClick={() => {
                            setShowAddPackage(!showAddPackage);
                            setEditingPackageId(null);
                            setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
                        }}
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
                          <div className="flex gap-2">
                              <button onClick={() => setShowAddPackage(false)} className="flex-1 text-xs text-gray-500 border border-gray-300 bg-white py-1.5 rounded">Cancel</button>
                              <button onClick={handleAddPackage} className="flex-1 bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700 transition-colors">
                                  {editingPackageId ? 'Update' : 'Add'}
                              </button>
                          </div>
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
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => handleEditPackage(pkg, e)} className="text-gray-300 hover:text-blue-500 p-1">
                                          <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={(e) => removePackage(pkg.id, e)} className="text-gray-300 hover:text-red-500 p-1">
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                  </div>
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

      {/* Map Error Display */}
      {mapError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" /> {mapError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input 
                          placeholder="Name" 
                          className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          value={customerDetails.name}
                          onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
                      />
                      <input 
                          placeholder="Phone" 
                          className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          value={customerDetails.phone}
                          onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})}
                      />
                  </div>
                  
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                      <button 
                          onClick={() => setEnquiryCategory('Transport')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'Transport' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                      >
                          Transport
                      </button>
                      <button 
                          onClick={() => setEnquiryCategory('General')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'General' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                      >
                          General
                      </button>
                  </div>

                  {enquiryCategory === 'General' ? (
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                              <textarea 
                                  rows={3}
                                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                                  placeholder="What is the customer asking for?"
                                  value={customerDetails.requirements}
                                  onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                              />
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Follow-up Schedule</label>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                  <input 
                                      type="date" 
                                      value={generalFollowUpDate} 
                                      onChange={e => setGeneralFollowUpDate(e.target.value)}
                                      className="p-2 border rounded-lg w-full text-sm"
                                  />
                                  <input 
                                      type="time" 
                                      value={generalFollowUpTime} 
                                      onChange={e => setGeneralFollowUpTime(e.target.value)}
                                      className="p-2 border rounded-lg w-full text-sm"
                                  />
                              </div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                              <select 
                                  value={generalFollowUpPriority} 
                                  onChange={e => setGeneralFollowUpPriority(e.target.value as 'Hot' | 'Warm' | 'Cold')}
                                  className="p-2 border rounded-lg w-full text-sm bg-white"
                              >
                                  <option value="Hot">Hot</option>
                                  <option value="Warm">Warm</option>
                                  <option value="Cold">Cold</option>
                              </select>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          
                          {/* Trip Details Header */}
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <h4 className="text-sm font-bold text-gray-700">Trip Details</h4>
                              {/* Vehicle Selection */}
                              <div className="flex gap-2">
                                  {['Sedan', 'SUV'].map(v => (
                                      <button
                                          key={v}
                                          onClick={() => setVehicleType(v as VehicleType)}
                                          className={`px-3 py-1 text-xs rounded border transition-colors ${vehicleType === v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200'}`}
                                      >
                                          {v}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Trip Type Tabs */}
                          <div className="flex border-b border-gray-200">
                              {['Local', 'Rental', 'Outstation'].map(t => (
                                  <button
                                      key={t}
                                      onClick={() => setTripType(t as TripType)}
                                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${tripType === t ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                          </div>

                          {/* Pickup Location - Moved here for Transport */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                              {!isMapReady ? (
                                      <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps...
                                      </div>
                                  ) : (
                                      <Autocomplete 
                                          placeholder="Search Pickup Location"
                                          onAddressSelect={(addr) => setCustomerDetails(prev => ({ ...prev, pickup: addr }))}
                                          setNewPlace={(place) => setPickupCoords(place)}
                                          defaultValue={customerDetails.pickup}
                                      />
                                  )}
                          </div>

                          {/* Dynamic Inputs based on Trip Type */}
                          {tripType === 'Local' && (
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                                      {!isMapReady ? (
                                         <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                         </div>
                                      ) : (
                                          <Autocomplete 
                                              placeholder="Search Drop Location"
                                              onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, drop: addr }))}
                                              setNewPlace={(place) => setDropCoords(place)}
                                              defaultValue={transportDetails.drop}
                                          />
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <input 
                                          type="number" 
                                          placeholder="Est Km" 
                                          className="p-2 border rounded-lg w-full"
                                          value={transportDetails.estKm}
                                          onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})}
                                      />
                                      <input 
                                          type="number" 
                                          placeholder="Wait Mins" 
                                          className="p-2 border rounded-lg w-full"
                                          value={transportDetails.waitingMins}
                                          onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})}
                                      />
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
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Package</label>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
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
                                  <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                                    * Extra Charges: Hours (₹{pricing[vehicleType].rentalExtraHrRate}/hr) and Km (₹{pricing[vehicleType].rentalExtraKmRate}/km).
                                  </div>
                              </div>
                          )}

                          {tripType === 'Outstation' && (
                              <div className="space-y-3">
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

                                  <div>
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                      {!isMapReady ? (
                                         <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                         </div>
                                      ) : (
                                          <Autocomplete 
                                              placeholder="Search Destination"
                                              onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, destination: addr }))}
                                              setNewPlace={(place) => setDestCoords(place)}
                                              defaultValue={transportDetails.destination}
                                          />
                                      )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                      <input 
                                          type="number" 
                                          placeholder="Days" 
                                          className="p-2 border rounded-lg w-full"
                                          value={transportDetails.days}
                                          onChange={e => setTransportDetails({...transportDetails, days: e.target.value})}
                                      />
                                      <input 
                                          type="number" 
                                          placeholder="Km" 
                                          className="p-2 border rounded-lg w-full"
                                          value={transportDetails.estTotalKm}
                                          onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})}
                                      />
                                      {outstationSubType === 'RoundTrip' && (
                                          <input 
                                              type="number" 
                                              placeholder="Nights" 
                                              className="p-2 border rounded-lg w-full"
                                              value={transportDetails.nights}
                                              onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})}
                                          />
                                      )}
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-800 border border-orange-100 flex gap-2 items-start">
                                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                      <div>
                                          <span className="font-bold">Current Rules ({vehicleType} - {outstationSubType}):</span> Min {pricing[vehicleType].outstationMinKmPerDay}km/day. Rate ₹{pricing[vehicleType].outstationExtraKmRate}/km. Driver ₹{pricing[vehicleType].outstationDriverAllowance}/day. {outstationSubType === 'RoundTrip' ? `Night Allow ₹${pricing[vehicleType].outstationNightAllowance}.` : 'No Night Allowance.'}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  {/* New Sections: Requirement Details & Assignments */}
                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-5">
                      {/* 1. Requirement Details */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                          <textarea 
                              rows={2}
                              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                              placeholder="Special requests, extra luggage, etc..."
                              value={customerDetails.requirements}
                              onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                          />
                      </div>

                      {/* 2. Assign Enquiry To */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Assign Enquiry To
                          </label>
                          <div className="flex gap-2">
                              {/* Corporate Selection (Super Admin Only) */}
                              {isSuperAdmin && (
                                  <select 
                                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                                      value={assignment.corporateId}
                                      onChange={(e) => setAssignment({...assignment, corporateId: e.target.value, branchName: '', staffId: ''})}
                                  >
                                      <option value="admin">Head Office</option>
                                      {corporates.map((c: any) => (
                                          <option key={c.email} value={c.email}>{c.companyName}</option>
                                      ))}
                                  </select>
                              )}
                              
                              <select 
                                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                                  value={assignment.branchName}
                                  onChange={(e) => setAssignment({...assignment, branchName: e.target.value, staffId: ''})}
                              >
                                  <option value="">All Branches</option>
                                  {filteredBranches.map((b: any) => (
                                      <option key={b.id} value={b.name}>{b.name}</option>
                                  ))}
                              </select>

                              <select 
                                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                                  value={assignment.staffId}
                                  onChange={(e) => setAssignment({...assignment, staffId: e.target.value})}
                              >
                                  <option value="">Select Staff</option>
                                  {filteredStaff.map((s: any) => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      {/* 3. Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                          {enquiryCategory === 'Transport' ? (
                              <>
                                  <button 
                                      onClick={() => handleEnquiryAction('Schedule')}
                                      className="py-2.5 border border-blue-200 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Calendar className="w-4 h-4" /> Schedule
                                  </button>
                                  <button 
                                      onClick={() => handleEnquiryAction('Book')}
                                      className="py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                  >
                                      <ArrowRight className="w-4 h-4" /> Book Now
                                  </button>
                                  
                                  <button 
                                      onClick={handleCancel}
                                      className="py-2.5 text-gray-500 hover:text-red-500 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                                  >
                                      <X className="w-4 h-4" /> Cancel
                                  </button>
                                  <button 
                                      onClick={() => handleEnquiryAction('Save')}
                                      className="py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Save className="w-4 h-4" /> Save Enquiry
                                  </button>
                              </>
                          ) : (
                              <>
                                  {/* General Enquiry Actions */}
                                  <button 
                                      onClick={() => handleGeneralAction('NoAnswer')}
                                      className="py-2.5 border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <PhoneMissed className="w-4 h-4" /> No Answer
                                  </button>
                                  <button 
                                      onClick={() => handleGeneralAction('FollowUp')}
                                      className="py-2.5 border border-blue-200 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Clock className="w-4 h-4" /> Follow-up
                                  </button>
                                  <button 
                                      onClick={() => handleGeneralAction('Complete')}
                                      className="col-span-2 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <CheckCircle className="w-4 h-4" /> Resolved / Closed
                                  </button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Estimated Cost</p>
                      <h3 className="text-4xl font-bold mb-4">₹{estimatedCost.toLocaleString()}</h3>
                      <div className="text-sm text-slate-300 border-t border-slate-700 pt-3">
                          {enquiryCategory === 'Transport' ? (
                              <p>Includes basic fare calculations. Tolls & Parking extra.</p>
                          ) : (
                              <p>Standard Enquiry. No cost calculated.</p>
                          )}
                      </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                      <DollarSign className="w-32 h-32 text-white" />
                  </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Message
                      </h4>
                      <button 
                          onClick={() => {navigator.clipboard.writeText(generatedMessage); alert("Copied!")}}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                          <Copy className="w-3 h-3" /> Copy
                      </button>
                  </div>
                  <textarea 
                      className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none resize-none mb-3"
                      value={generatedMessage}
                      readOnly
                  />
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                          className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button 
                          className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
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
