

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  Building2, X, Phone, Truck, DollarSign,
  Calendar, MapPin, Plus, Trash2, Headset,
  Clock, CheckCircle, Filter, Search, ChevronDown, UserCheck, XCircle, AlertCircle, Save, History, PhoneOutgoing, PhoneIncoming, UserPlus
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog, UserRole } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type EnquiryCategory = 'Transport' | 'General';
type OrderStatus = 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled' | 'New' | 'In Progress' | 'Converted' | 'Closed' | 'Booked';

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

const getInitialEnquiries = (role: UserRole, sessionId: string): Enquiry[] => {
  const saved = localStorage.getItem('global_enquiries_data');
  const allEnquiries: Enquiry[] = saved ? JSON.parse(saved) : [];

  if (role === UserRole.CORPORATE) {
    // Filter enquiries by the current corporate's ID (email)
    return allEnquiries.filter(e => e.corporateId === sessionId);
  }
  // Super Admin and Employee roles see all enquiries initially, 
  // then employees filter by assignedTo in Layout/TaskManagement
  return allEnquiries;
};

interface CustomerCareProps {
  role: UserRole;
}

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Enquiry State
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

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);

  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    const saved = localStorage.getItem('transport_rental_packages_v2');
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>(() => {
    const saved = localStorage.getItem('transport_pricing_rules_v2');
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  // Package Management State
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [corporates, setCorporates] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  
  const [assignment, setAssignment] = useState({
    corporateId: '',
    branchName: '',
    staffId: ''
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => getInitialEnquiries(role, sessionId));
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [isPhoneChecked, setIsPhoneChecked] = useState(false);
  const [phoneLookupResult, setPhoneLookupResult] = useState<'New' | 'Existing' | null>(null);
  const [existingEnquiriesForPhone, setExistingEnquiriesForPhone] = useState<Enquiry[]>([]);
  const [vendorsData, setVendorsData] = useState<any[]>([]);

  const [generalFollowUpDate, setGeneralFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalFollowUpTime, setGeneralFollowUpTime] = useState('10:00');
  const [generalFollowUpPriority, setGeneralFollowUpPriority] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');

  useEffect(() => {
    localStorage.setItem('transport_rental_packages_v2', JSON.stringify(rentalPackages));
  }, [rentalPackages]);

  useEffect(() => {
    localStorage.setItem('transport_pricing_rules_v2', JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    try {
      const savedVendors = localStorage.getItem('vendor_data');
      if (savedVendors) {
        setVendorsData(JSON.parse(savedVendors));
      }
    } catch (e) {
      console.error("Failed to load vendor data for phone check", e);
    }
  }, []);

  useEffect(() => {
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
      
      // Filter branches by current session ID if not Super Admin
      if (!isSuperAdmin) {
          branches = branches.filter(b => b.owner === sessionId);
      }
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

  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Map API Error: Check required APIs (Maps JS, Places).");
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
      setMapError("Map Load Error: API Key invalid or APIs not enabled.");
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
              setTimeout(() => setMapError("Google Maps 'places' library failed to load."), 0);
            }
        };
        script.onerror = () => setTimeout(() => setMapError("Network error: Failed to load Google Maps script."), 0);
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

  useEffect(() => {
    if (!isMapReady || !window.google || !window.google.maps.DistanceMatrixService || !pickupCoords) return;

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
    if (!newPackage.name || !newPackage.priceSedan) {
        setTimeout(() => alert("Please fill in package name and Sedan price."), 0);
        return;
    }
    
    if (editingPackageId) {
        const updatedPackages = rentalPackages.map(pkg => 
            pkg.id === editingPackageId ? {
                ...pkg,
                name: newPackage.name,
                hours: parseFloat(newPackage.hours) || 0,
                km: parseFloat(newPackage.km) || 0,
                priceSedan: parseFloat(newPackage.priceSedan) || 0,
                priceSuv: parseFloat(newPackage.priceSuv) || 0,
            } : pkg
        );
        setRentalPackages(updatedPackages);
        setEditingPackageId(null);
        setTimeout(() => alert("Package updated successfully!"), 0);
    } else {
        const pkg: RentalPackage = {
            id: `pkg-${Date.now()}`,
            name: newPackage.name,
            hours: parseFloat(newPackage.hours) || 0,
            km: parseFloat(newPackage.km) || 0,
            priceSedan: parseFloat(newPackage.priceSedan) || 0,
            priceSuv: parseFloat(newPackage.priceSuv) || 0,
        };
        setRentalPackages([...rentalPackages, pkg]);
        setTimeout(() => alert("Package added successfully!"), 0);
    }
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const handleEditPackage = (pkg: RentalPackage) => {
    setEditingPackageId(pkg.id);
    setNewPackage({
        name: pkg.name,
        hours: pkg.hours.toString(),
        km: pkg.km.toString(),
        priceSedan: pkg.priceSedan.toString(),
        priceSuv: pkg.priceSuv.toString(),
    });
    setShowAddPackage(true);
  };

  const handleCancelEditPackage = () => {
    setEditingPackageId(null);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
    setShowAddPackage(false);
  };

  const removePackage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
      if (transportDetails.packageId === id) {
        setTransportDetails(prev => ({ ...prev, packageId: '' }));
      }
      if (editingPackageId === id) {
        setEditingPackageId(null);
        setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
      }
      setTimeout(() => alert("Package removed."), 0);
    }
  };

  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let details = '';

      if (enquiryCategory === 'General') {
          total = 0; 
          details = customerDetails.requirements || "General Enquiry.";
      } else if (tripType === 'Local') {
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

  const handlePhoneCheck = () => {
    if (!customerDetails.phone) {
      alert("Please enter a phone number to check.");
      return;
    }

    setIsPhoneChecked(false); // Reset check state
    setPhoneLookupResult(null);
    setExistingEnquiriesForPhone([]);

    const cleanPhoneNumber = customerDetails.phone.replace(/\D/g, '');

    // Check existing vendors
    const foundVendor = vendorsData.find(v => v.phone && v.phone.replace(/\D/g, '') === cleanPhoneNumber);
    if (foundVendor) {
        setPhoneLookupResult('Existing');
        setCustomerDetails(prev => ({
            ...prev,
            name: foundVendor.ownerName,
            email: foundVendor.email || '',
        }));
        setIsPhoneChecked(true);
        return;
    }

    // Check existing enquiries
    const existingEnqs = enquiries.filter(e => e.phone && e.phone.replace(/\D/g, '') === cleanPhoneNumber);
    if (existingEnqs.length > 0) {
        setPhoneLookupResult('Existing');
        setExistingEnquiriesForPhone(existingEnqs);
        setCustomerDetails(prev => ({
            ...prev,
            name: existingEnqs[0].name || prev.name,
            email: existingEnqs[0].email || prev.email,
            // Assuming the latest city and pickup from one of the enquiries
            pickup: existingEnqs[0].transportData?.pickup || existingEnqs[0].pickup || prev.pickup,
        }));
    } else {
        setPhoneLookupResult('New');
    }
    setIsPhoneChecked(true);
  };

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
      if (action === 'Save') status = 'In Progress'; // Default for saved but not booked/scheduled

      // 3. Create History Log
      const historyLog: HistoryLog = {
          id: Date.now(),
          type: enquiryCategory === 'Transport' ? 'Meeting' : 'Note', // Use Meeting for transport for demo
          message: `Enquiry ${action === 'Book' ? 'Booked' : action === 'Schedule' ? 'Scheduled' : 'Saved'} via CustomerCare Console. ${estimatedCost > 0 ? `Est: ₹${estimatedCost.toLocaleString()}` : ''}`,
          date: new Date().toLocaleString(),
          outcome: 'Completed'
      };

      // Get current corporate ID for this session
      const currentCorporateId = isSuperAdmin ? 'admin' : sessionId;
      const assignedStaff = allStaff.find(s => s.id === assignment.staffId);
      const assignedStaffName = assignedStaff ? assignedStaff.name : 'Unassigned';

      // 4. Create or Update Enquiry Object
      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer', // Always customer in this module
          initialInteraction: 'Incoming', // Default for new, can be changed
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
          city: allBranches.find(b => b.id === assignment.branchName)?.city || 'Coimbatore', // Get city from assigned branch or default
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          createdAt: new Date().toLocaleString(),
          nextFollowUp: enquiryCategory === 'General' ? `${generalFollowUpDate}T${generalFollowUpTime}:00.000Z` : undefined,
          history: [historyLog],
          date: new Date().toISOString().split('T')[0],
          enquiryCategory: enquiryCategory,
          tripType: enquiryCategory === 'Transport' ? tripType : undefined,
          vehicleType: enquiryCategory === 'Transport' ? vehicleType : undefined,
          outstationSubType: enquiryCategory === 'Transport' && tripType === 'Outstation' ? outstationSubType : undefined,
          transportData: enquiryCategory === 'Transport' ? {
              pickup: customerDetails.pickup,
              drop: transportDetails.drop,
              estKm: transportDetails.estKm,
              waitingMins: transportDetails.waitingMins,
              packageId: transportDetails.packageId,
              destination: transportDetails.destination,
              days: transportDetails.days,
              estTotalKm: transportDetails.estTotalKm,
              nights: transportDetails.nights,
          } : undefined,
          estimatedPrice: estimatedCost,
          priority: enquiryCategory === 'General' ? generalFollowUpPriority : undefined,
          corporateId: currentCorporateId, // Link to the corporate account or admin
      };

      // 5. Save/Update Enquiries List
      let updatedList = [...enquiries];
      if (editingOrderId) {
        updatedList = updatedList.map(e => e.id === editingOrderId ? { ...newEnquiry, id: editingOrderId } : e);
        setEditingOrderId(null); // Clear editing state
      } else {
        updatedList = [newEnquiry, ...updatedList];
      }

      setEnquiries(updatedList);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));

      setTimeout(() => alert(`Enquiry ${status} Successfully!`), 0);
      
      // Send notification to assigned staff
      if (assignment.staffId && assignedStaff) {
        sendSystemNotification({
            type: 'task_assigned',
            title: 'New Enquiry Assigned!',
            message: `You have a new enquiry from ${customerDetails.name} (Phone: ${customerDetails.phone}). Status: ${status}.`,
            targetRoles: [UserRole.EMPLOYEE],
            employeeId: assignment.staffId,
            corporateId: currentCorporateId, // So corporate admin can also see
            link: `/user/tasks` // Link to employee's task list (or a specific enquiry view)
        });
      }


      // 6. Reset Form
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setEnquiryCategory('Transport');
      setAssignment(prev => ({ ...prev, staffId: '' })); // Reset assigned staff
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');
  };

  const handleCancel = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setEnquiryCategory('Transport');
      setAssignment(prev => ({ ...prev, staffId: '' }));
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');
      setEditingOrderId(null);
  };

  const handleEditEnquiry = (enquiry: Enquiry) => {
    setEditingOrderId(enquiry.id);
    setCustomerDetails({
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email || '',
        pickup: enquiry.transportData?.pickup || '',
        requirements: enquiry.details,
    });
    setEnquiryCategory(enquiry.enquiryCategory || 'General');
    setTripType(enquiry.tripType || 'Local');
    setVehicleType(enquiry.vehicleType || 'Sedan');
    setOutstationSubType(enquiry.outstationSubType || 'RoundTrip');
    setTransportDetails({
        drop: enquiry.transportData?.drop || '',
        estKm: enquiry.transportData?.estKm || '',
        waitingMins: enquiry.transportData?.waitingMins || '',
        packageId: enquiry.transportData?.packageId || '',
        destination: enquiry.transportData?.destination || '',
        days: enquiry.transportData?.days || '1',
        estTotalKm: enquiry.transportData?.estTotalKm || '',
        nights: enquiry.transportData?.nights || '0',
    });
    setAssignment({
        corporateId: enquiry.corporateId || (isSuperAdmin ? 'admin' : sessionId),
        branchName: allBranches.find(b => b.city === enquiry.city)?.name || '', // Find branch name from city
        staffId: enquiry.assignedTo || '',
    });
    setGeneralFollowUpDate(enquiry.nextFollowUp?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setGeneralFollowUpTime(enquiry.nextFollowUp?.split('T')[1]?.substring(0,5) || '10:00');
    setGeneralFollowUpPriority(enquiry.priority || 'Warm');

    // Trigger initial calculation/message generation
    // This will happen automatically due to useEffect dependencies
    setIsPhoneChecked(true); // Simulate phone check for edit mode
    setPhoneLookupResult('Existing');
  };
  
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
        case 'New':
           return 'bg-yellow-100 text-yellow-700';
        case 'In Progress':
        case 'Scheduled':
        case 'Booked':
        case 'Order Accepted':
        case 'Driver Assigned': return 'bg-blue-100 text-blue-700';
        case 'Converted':
        case 'Completed': return 'bg-green-100 text-green-700';
        case 'Cancelled':
        case 'Closed': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredEnquiriesForList = useMemo(() => {
    return enquiries.filter(enq => {
      // Role-based filtering
      if (role === UserRole.EMPLOYEE && enq.assignedTo !== sessionId) return false;
      if (role === UserRole.CORPORATE && enq.corporateId !== sessionId) return false;

      const matchesSearch = enq.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
                            enq.phone.includes(filterSearch);
      const matchesStatus = filterStatus === 'All' || enq.status === filterStatus;
      const matchesDate = !filterDate || (enq.date || enq.createdAt.split('T')[0]) === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enquiries, filterSearch, filterStatus, filterDate, role, sessionId]);

  const totalRevenue = useMemo(() => {
    return enquiries.filter(e => e.status === 'Booked' || e.status === 'Completed' || e.status === 'Converted')
                    .reduce((sum, e) => sum + (e.estimatedPrice || 0), 0);
  }, [enquiries]);

  const pendingFollowUps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return enquiries.filter(e => 
      (e.status === 'New' || e.status === 'In Progress') && 
      e.nextFollowUp && 
      e.nextFollowUp.split('T')[0] <= today
    ).length;
  }, [enquiries]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care
          </h2>
          <p className="text-gray-500">Manage customer enquiries, generate quotes, and track follow-ups</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
                <Settings className="w-4 h-4" /> Rates
            </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare & Package Configuration</h3>
                 
                 <div className="flex bg-white border border-gray-300 rounded-lg p-1">
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
                            <Plus className="w-3 h-3" /> {showAddPackage && editingPackageId ? 'Edit' : 'New'}
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
                              <div className="flex justify-end gap-2">
                                <button onClick={handleCancelEditPackage} className="text-xs text-gray-500">Cancel</button>
                                <button onClick={handleAddPackage} className="bg-blue-600 text-white text-xs font-bold py-1.5 rounded hover:bg-blue-700 transition-colors">
                                  {editingPackageId ? 'Update Package' : 'Save Package'}
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
                                      <button onClick={(e) => handleEditPackage(pkg)} className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                         <Edit2 className="w-3 h-3" />
                                      </button>
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

      {/* Main Content: Quote Generator & Enquiries List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-14rem)]">
          {/* Left Column: Quote Generator */}
          <div className="space-y-6 flex flex-col">
              {/* Customer Info & Quote Builder */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer & Enquiry Info
                  </h3>
                  
                  {/* Phone Input with Check */}
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                      <div className="flex gap-2">
                          <input 
                              type="tel" 
                              value={customerDetails.phone}
                              onChange={e => {setCustomerDetails({...customerDetails, phone: e.target.value}); setIsPhoneChecked(false);}}
                              className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="+91..."
                          />
                          <button onClick={handlePhoneCheck} className="px-3 bg-emerald-50 text-emerald-700 rounded-lg font-bold hover:bg-emerald-100 transition-colors">
                              Check
                          </button>
                      </div>
                      {isPhoneChecked && phoneLookupResult === 'Existing' && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3"/> Existing Customer/Vendor Found!
                          </p>
                      )}
                       {isPhoneChecked && phoneLookupResult === 'New' && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <UserPlus className="w-3 h-3"/> New Customer
                          </p>
                      )}
                  </div>
                  
                  {/* Existing Enquiries for this phone (if any) */}
                  {existingEnquiriesForPhone.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
                        <p className="text-xs text-blue-800 font-bold mb-2">Previous Enquiries for this number:</p>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {existingEnquiriesForPhone.map(enq => (
                            <div key={enq.id} className="text-xs text-blue-700 flex justify-between items-center">
                              <span>{enq.name} - {enq.details.substring(0, 30)}...</span>
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-white text-blue-600">{enq.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input 
                          placeholder="Customer Name" 
                          className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          value={customerDetails.name}
                          onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})}
                      />
                      <input 
                          placeholder="Email (Optional)" 
                          className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500"
                          value={customerDetails.email}
                          onChange={e => setCustomerDetails({...customerDetails, email: e.target.value})}
                      />
                  </div>
                  
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                      {!isMapReady ? (
                           <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps...
                           </div>
                        ) : (
                           <Autocomplete 
                             placeholder="Search Google Maps for Pickup"
                             onAddressSelect={(addr) => setCustomerDetails(prev => ({ ...prev, pickup: addr }))}
                             setNewPlace={(place) => setPickupCoords(place)}
                             defaultValue={customerDetails.pickup}
                           />
                        )}
                  </div>
                  
                  {/* Enquiry Type Toggle (General vs Transport) */}
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                      <button 
                          onClick={() => setEnquiryCategory('Transport')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'Transport' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                      >
                          <Car className="w-4 h-4 inline mr-2"/>Transport Enquiry
                      </button>
                      <button 
                          onClick={() => setEnquiryCategory('General')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${enquiryCategory === 'General' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                      >
                          <Headset className="w-4 h-4 inline mr-2"/>General Enquiry
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
                                  <option value="">Select Branch</option>
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
                      className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none resize-none mb-3"
                      value={generatedMessage}
                      readOnly
                      ref={messageTextareaRef}
                  />
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => window.open(`https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`, '_blank')}
                          className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button 
                          onClick={() => {
                            const subject = encodeURIComponent(`${enquiryCategory === 'Transport' ? 'Quote' : 'Enquiry'} from OK BOZ`);
                            window.location.href = `mailto:${customerDetails.email}?subject=${subject}&body=${encodeURIComponent(generatedMessage)}`;
                          }}
                          disabled={!customerDetails.email}
                          className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          <Mail className="w-4 h-4" /> Email
                      </button>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2 shrink-0">
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
              </div>
          </div>

          {/* Right Column: Existing Enquiries List */}
          <div className="space-y-6 flex flex-col">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <History className="w-5 h-5 text-gray-400" /> Recent Enquiries
                      </h3>
                      <button className="text-sm text-emerald-600 hover:underline">View All</button>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input 
                              type="text" 
                              placeholder="Search name or phone..." 
                              value={filterSearch}
                              onChange={e => setFilterSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                          />
                      </div>
                      <select 
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                          <option value="All">All Status</option>
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Booked">Booked</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                      </select>
                      <input 
                          type="date" 
                          value={filterDate} 
                          onChange={e => setFilterDate(e.target.value)} 
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-500" 
                      />
                  </div>

                  {/* Enquiry List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {filteredEnquiriesForList.length === 0 ? (
                          <div className="py-10 text-center text-gray-500">
                              <History className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
                              No matching enquiries found.
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {filteredEnquiriesForList.map(enq => (
                                  <div key={enq.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors group relative">
                                      <div className="flex justify-between items-start mb-2">
                                          <div>
                                              <p className="font-bold text-gray-800 text-sm">{enq.name} <span className="text-gray-400 font-normal">({enq.city})</span></p>
                                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3"/> {enq.phone}
                                              </p>
                                          </div>
                                          <div className="text-right">
                                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(enq.status)}`}>
                                                  {enq.status}
                                              </span>
                                              {enq.priority && (
                                                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${enq.priority === 'Hot' ? 'bg-red-50 text-red-600 border-red-100' : enq.priority === 'Warm' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                      {enq.priority}
                                                  </span>
                                              )}
                                              <p className="text-[10px] text-gray-400 mt-1">
                                                  {new Date(enq.createdAt).toLocaleDateString()}
                                              </p>
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-600 italic line-clamp-2">"{enq.details}"</p>
                                      {enq.nextFollowUp && (
                                          <div className="text-[10px] text-blue-600 mt-2 flex items-center gap-1">
                                              <Clock className="w-3 h-3" /> Follow-up: {new Date(enq.nextFollowUp).toLocaleDateString()} {new Date(enq.nextFollowUp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                      )}
                                      <button 
                                          onClick={() => handleEditEnquiry(enq)}
                                          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors opacity-0 group-hover:opacity-100"
                                          title="Edit Enquiry"
                                      >
                                          <Edit2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {pendingFollowUps > 0 && (
                      <div className="bg-orange-50 text-orange-700 p-3 rounded-lg border border-orange-100 mt-auto shrink-0">
                          <AlertCircle className="w-4 h-4 inline-block mr-2" /> <strong>{pendingFollowUps}</strong> pending follow-ups due today.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default CustomerCare;