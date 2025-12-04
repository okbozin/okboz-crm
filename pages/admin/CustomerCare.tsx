
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  Building2, X, Phone, Truck, DollarSign,
  Calendar, MapPin, Plus, Trash2, Headset,
  Clock, CheckCircle, Filter, Search, ChevronDown, UserCheck, XCircle, AlertCircle, Save, History, PhoneOutgoing, PhoneIncoming
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';
import { Enquiry, HistoryLog, UserRole } from '../../types';
import { sendSystemNotification } from '../../services/cloudService';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type EnquiryCategory = 'Transport' | 'General';
type OrderStatus = 'Scheduled' | 'Order Accepted' | 'Driver Assigned' | 'Completed' | 'Cancelled' | 'New' | 'In Progress' | 'Converted' | 'Closed';

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

const getInitialEnquiries = (): Enquiry[] => {
  const saved = localStorage.getItem('global_enquiries_data');
  return saved ? JSON.parse(saved) : [];
};

interface CustomerCareProps {
  role: UserRole;
}

export const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
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

  const [enquiries, setEnquiries] = useState<Enquiry[]>(getInitialEnquiries);
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

  useEffect(() => {
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto';
      messageTextareaRef.current.style.height = messageTextareaRef.current.scrollHeight + 'px';
    }
  }, [generatedMessage]);


  const saveOrder = async (status: OrderStatus, scheduleInfo?: { date: string, time: string, priority?: 'Hot' | 'Warm' | 'Cold' }) => {
      if (!customerDetails.name || !customerDetails.phone) {
          setTimeout(() => alert("Please enter Customer Name and Phone."), 0);
          return;
      }

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
          detailsText = customerDetails.requirements;
      }
      
      if (!detailsText.trim()) {
        setTimeout(() => alert("Please enter requirements/details for the enquiry."), 0);
        return;
      }

      const historyLog: HistoryLog = {
          id: Date.now(),
          type: 'Note',
          message: `Order Created as ${status}. ${estimatedCost > 0 ? `Est: ₹${estimatedCost}` : ''}`,
          date: new Date().toLocaleString(),
          outcome: 'Completed'
      };

      let updatedEnquiry: Enquiry;
      let newEnquiriesList = [...enquiries];

      if (editingOrderId) {
        updatedEnquiry = {
          ...enquiries.find(e => e.id === editingOrderId)!,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email || '',
          city: 'Coimbatore', 
          details: detailsText,
          status: status,
          assignedTo: assignment.staffId,
          history: [historyLog, ...(enquiries.find(e => e.id === editingOrderId)?.history || [])],
          date: scheduleInfo ? scheduleInfo.date : new Date().toISOString().split('T')[0],
          nextFollowUp: scheduleInfo ? `${scheduleData.date}T${scheduleData.time}` : undefined,
          priority: scheduleInfo?.priority, 
          enquiryCategory: enquiryCategory,
          tripType: tripType,
          vehicleType: vehicleType,
          outstationSubType: tripType === 'Outstation' ? outstationSubType : undefined,
          transportData: enquiryCategory === 'Transport' ? transportDetails : undefined,
          estimatedPrice: enquiryCategory === 'Transport' ? estimatedCost : undefined,
        };
        newEnquiriesList = newEnquiriesList.map(e => e.id === editingOrderId ? updatedEnquiry : e);
        setEditingOrderId(null);
      } else {
        updatedEnquiry = {
          id: `ORD-${Date.now()}`,
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
          date: scheduleInfo ? scheduleInfo.date : new Date().toISOString().split('T')[0],
          nextFollowUp: scheduleInfo ? `${scheduleData.date}T${scheduleData.time}` : undefined,
          priority: scheduleInfo?.priority, 
          enquiryCategory: enquiryCategory,
          tripType: tripType,
          vehicleType: vehicleType,
          outstationSubType: tripType === 'Outstation' ? outstationSubType : undefined,
          transportData: enquiryCategory === 'Transport' ? transportDetails : undefined,
          estimatedPrice: enquiryCategory === 'Transport' ? estimatedCost : undefined,
        };
        newEnquiriesList = [updatedEnquiry, ...newEnquiriesList];

        sendSystemNotification({
            type: 'new_enquiry',
            title: `New Customer Enquiry: ${updatedEnquiry.name}`,
            message: `A new enquiry (ID: ${updatedEnquiry.id}) has been created with status: ${updatedEnquiry.status}.`,
            targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
            corporateId: assignment.corporateId === 'admin' ? undefined : assignment.corporateId,
            link: `/admin/customer-care`
        });

        if (assignment.staffId) {
            const assignedStaffMember = allStaff.find(s => s.id === assignment.staffId);
            if (assignedStaffMember) {
                sendSystemNotification({
                    type: 'task_assigned',
                    title: `New Enquiry Assigned: ${updatedEnquiry.id}`,
                    message: `You have been assigned a new customer enquiry for ${updatedEnquiry.name}.`,
                    targetRoles: [UserRole.EMPLOYEE],
                    employeeId: assignedStaffMember.id,
                    link: `/user/customer-care`
                });
            }
        }
      }

      setEnquiries(newEnquiriesList);
      try {
        localStorage.setItem('global_enquiries_data', JSON.stringify(newEnquiriesList));
      } catch (error) {
        console.error("Error saving enquiries to local storage:", error);
        setTimeout(() => alert("Error saving data. Local storage might be full or corrupted."), 0);
      }

      setTimeout(() => {
          alert(`${enquiryCategory === 'Transport' ? 'Order' : 'Enquiry'} ${status} Successfully!`);
      }, 0);
      
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setIsScheduleModalOpen(false);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');
  };

  const handleBookNow = () => {
      if (!customerDetails.name || !customerDetails.phone) {
          setTimeout(() => alert("Please enter Customer Name and Phone."), 0);
          return;
      }
      saveOrder('Order Accepted');
  };

  const handleOpenSchedule = () => {
      if (!customerDetails.name || !customerDetails.phone) {
          setTimeout(() => alert("Please enter Customer Name and Phone."), 0);
          return;
      }
      setIsScheduleModalOpen(true);
  };

  const confirmSchedule = () => {
      if (!scheduleData.date || !scheduleData.time) {
          setTimeout(() => alert("Please select both Date and Time."), 0);
          return;
      }
      saveOrder('Scheduled', { ...scheduleData, priority: generalFollowUpPriority });
  };

  const handleSaveGeneralFollowUp = () => {
    if (!customerDetails.name || !customerDetails.phone) {
        setTimeout(() => alert("Please enter Customer Name and Phone."), 0);
        return;
    }
    saveOrder('Scheduled', { 
      date: generalFollowUpDate, 
      time: generalFollowUpTime, 
      priority: generalFollowUpPriority 
    });
  };

  const handleCancelForm = () => {
      setCustomerDetails({ name: '', phone: '', email: '', pickup: '', requirements: '' });
      setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
      setGeneratedMessage('');
      setEstimatedCost(0);
      setEditingOrderId(null);
      setIsPhoneChecked(false);
      setPhoneLookupResult(null);
      setExistingEnquiriesForPhone([]);
      setGeneralFollowUpDate(new Date().toISOString().split('T')[0]);
      setGeneralFollowUpTime('10:00');
      setGeneralFollowUpPriority('Warm');

      setTimeout(() => alert("Form cleared."), 0);
  };

  const handleStatusUpdate = async (id: string, newStatus: OrderStatus) => {
    try {
      let updatedEnquiryItem: Enquiry | undefined;

      const updatedList = enquiries.map(e => {
          if (e.id === id) {
              const historyLog: HistoryLog = {
                  id: Date.now(),
                  type: 'Note',
                  message: `Status changed to ${newStatus}`,
                  date: new Date().toLocaleString(),
                  outcome: 'Completed'
              };
              updatedEnquiryItem = { ...e, status: newStatus, history: [historyLog, ...e.history] };
              return updatedEnquiryItem;
          }
          return e;
      });
      
      setEnquiries(updatedList);
      try {
        localStorage.setItem('global_enquiries_data', JSON.stringify(updatedList));
      } catch (error) {
        console.error("Error saving enquiries to local storage on status update:", error);
        setTimeout(() => alert("Error saving data. Local storage might be full or corrupted."), 0);
      }

      if (updatedEnquiryItem) {
          sendSystemNotification({
              type: 'system',
              title: `Order Status Update: ${updatedEnquiryItem.id}`,
              message: `The status of order ${updatedEnquiryItem.id} for ${updatedEnquiryItem.name} has been updated to ${newStatus}.`,
              targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
              corporateId: updatedEnquiryItem.assignedTo ? (allStaff.find(s => s.id === updatedEnquiryItem.assignedTo)?.owner || undefined) : undefined,
              link: `/admin/customer-care`
          });
      }

    } catch (error) {
      console.error("Error in handleStatusUpdate:", error);
      setTimeout(() => alert("An error occurred while updating status. See console for details."), 0);
    }
  };

  const handleEditOrder = (order: Enquiry) => {
    try {
      setEditingOrderId(order.id);

      setCustomerDetails({
        name: order.name,
        phone: order.phone,
        email: order.email || '',
        pickup: (order.details.match(/Pickup:\s*(.*?)(?=(?:\s*->|\s*\.|\s*$))/i)?.[1] || '').trim(),
        requirements: order.enquiryCategory === 'General' ? order.details : (order.details.includes('\nReq: ') ? order.details.split('\nReq: ')[1] : '')
      });

      setEnquiryCategory(order.enquiryCategory || 'General');

      if (order.enquiryCategory === 'Transport' && order.transportData) {
        setTripType(order.tripType || 'Local');
        setVehicleType(order.vehicleType || 'Sedan');
        setOutstationSubType(order.outstationSubType || 'RoundTrip');
        setTransportDetails({
          drop: order.transportData.drop || '',
          estKm: order.transportData.estKm || '',
          waitingMins: order.transportData.waitingMins || '',
          packageId: order.transportData.packageId || '',
          destination: order.transportData.destination || '',
          days: order.transportData.days || '1',
          estTotalKm: order.transportData.estTotalKm || '',
          nights: order.transportData.nights || '0',
        });
        setEstimatedCost(order.estimatedPrice || 0);
      } else {
          setTripType('Local');
          setVehicleType('Sedan');
          setOutstationSubType('RoundTrip');
          setTransportDetails({ drop: '', estKm: '', waitingMins: '', packageId: '', destination: '', days: '1', estTotalKm: '', nights: '0' });
          setEstimatedCost(0);
      }

      setAssignment(prev => ({
          ...prev,
          staffId: order.assignedTo || ''
      }));

      if (order.enquiryCategory === 'General' && order.nextFollowUp) {
          setGeneralFollowUpDate(order.nextFollowUp.split('T')[0]);
          setGeneralFollowUpTime(order.nextFollowUp.split('T')[1]);
          setGeneralFollowUpPriority(order.priority || 'Warm');
      }

      const cleanNumber = order.phone.replace(/\D/g, '');
      const previousEnquiries = enquiries.filter(e => e.phone.replace(/\D/g, '') === cleanNumber && e.id !== order.id);
      setExistingEnquiriesForPhone(previousEnquiries);
      setPhoneLookupResult(previousEnquiries.length > 0 ? 'Existing' : 'New');
      setIsPhoneChecked(true);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error in handleEditOrder:", error);
      setTimeout(() => alert("An error occurred while preparing the form for edit. See console for details."), 0);
    }
  };

  const dashboardStats = useMemo(() => {
      const total = enquiries.length;
      const accepted = enquiries.filter(e => e.status === 'Order Accepted' || e.status === 'Booked').length;
      const assigned = enquiries.filter(e => e.status === 'Driver Assigned').length;
      const completed = enquiries.filter(e => e.status === 'Completed').length;
      const cancelled = enquiries.filter(e => e.status === 'Cancelled').length;
      const scheduled = enquiries.filter(e => e.status === 'Scheduled').length;
      
      return { total, accepted, assigned, completed, cancelled, scheduled };
  }, [enquiries]);

  const filteredOrders = useMemo(() => {
      return enquiries.filter(e => {
          const matchesSearch = e.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                                e.phone.includes(filterSearch) || 
                                e.id.toLowerCase().includes(filterSearch.toLowerCase()) ||
                                e.details.toLowerCase().includes(filterSearch.toLowerCase());
          
          const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
          
          const matchesDate = !filterDate || (e.date === filterDate || e.createdAt.startsWith(filterDate));

          return matchesSearch && matchesStatus && matchesDate;
      });
  }, [enquiries, filterSearch, filterStatus, filterDate]);

  const isEmployee = role === UserRole.EMPLOYEE;

  const handlePhoneInputCheck = () => {
    const cleanNumber = customerDetails.phone.replace(/\D/g, '');
    if (cleanNumber.length < 5) {
        setIsPhoneChecked(false);
        setPhoneLookupResult(null);
        setExistingEnquiriesForPhone([]);
        return;
    }

    let foundEnquiry: Enquiry | undefined;
    let foundVendor: any;

    const previousEnquiries = enquiries.filter(e => e.phone.replace(/\D/g, '') === cleanNumber);
    if (previousEnquiries.length > 0) {
        foundEnquiry = previousEnquiries[0];
        setExistingEnquiriesForPhone(previousEnquiries);
    }

    foundVendor = vendorsData.find(v => v.phone && v.phone.replace(/\D/g, '') === cleanNumber);

    if (foundEnquiry || foundVendor) {
        setPhoneLookupResult('Existing');
        const source = foundEnquiry || foundVendor;
        setCustomerDetails(prev => ({
            ...prev,
            name: source.name || source.ownerName || '',
            email: source.email || '',
        }));
    } else {
        setPhoneLookupResult('New');
        setCustomerDetails(prev => ({
            ...prev,
            name: '',
            email: '',
        }));
        setExistingEnquiriesForPhone([]);
    }
    setIsPhoneChecked(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Headset className="w-8 h-8 text-emerald-600" /> Customer Care (Bookings)
          </h2>
          <p className="text-gray-500">Create bookings and manage order lifecycle</p>
        </div>
        {!isEmployee && ( 
          <div className="flex gap-2">
              <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSettings ? 'bg-slate-800 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                  <Settings className="w-4 h-4" /> {showSettings ? 'Hide Rates' : 'Edit Rates'}
              </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Orders Dashboard</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Total Orders</p>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardStats.total}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Accepted</p>
                  <h3 className="text-2xl font-bold text-emerald-600">{dashboardStats.accepted}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Driver Assigned</p>
                  <h3 className="text-2xl font-bold text-blue-600">{dashboardStats.assigned}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
                  <h3 className="text-2xl font-bold text-purple-600">{dashboardStats.completed}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Scheduled</p>
                  <h3 className="text-2xl font-bold text-orange-600">{dashboardStats.scheduled}</h3>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                      placeholder="Search Orders..." 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                  />
              </div>
              <select 
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white cursor-pointer"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
              >
                  <option value="All">All Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Order Accepted">Order Accepted</option>
                  <option value="Driver Assigned">Driver Assigned</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="New">New Enquiry</option>
                  <option value="In Progress">In Progress Enquiry</option>
                  <option value="Converted">Converted Enquiry</option>
                  <option value="Closed">Closed Enquiry</option>
              </select>
              <input 
                  type="date"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
              />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                          {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-900">{order.id}</div>
                                      <div className="text-xs text-gray-500">
                                        {order.date || order.createdAt.split(',')[0]} 
                                        {order.nextFollowUp ? ` • ${new Date(order.nextFollowUp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-gray-900">{order.name}</div>
                                      <div className="text-xs text-gray-500">{order.phone}</div>
                                  </td>
                                  <td className="px-6 py-4 max-w-xs " title={order.details}>
                                      <p className="truncate">{order.details}</p>
                                      {order.enquiryCategory === 'General' && (
                                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                                              General Enquiry
                                          </span>
                                      )}
                                      {order.priority && order.enquiryCategory === 'General' && (
                                          <span className={`px-1.5 py-0.5 rounded-full mt-1 ml-1 inline-block text-[10px] font-bold ${
                                              order.priority === 'Hot' ? 'bg-red-50 text-red-700' :
                                              order.priority === 'Warm' ? 'bg-yellow-50 text-yellow-700' :
                                              'bg-green-50 text-green-700'
                                          }`}>
                                              {order.priority}
                                          </span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {order.assignedTo || 'Unassigned'}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                          order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                          order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                          order.status === 'Scheduled' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          order.status === 'Order Accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          order.status === 'Driver Assigned' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                          'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}>
                                          {order.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => handleEditOrder(order)}
                                              className="text-gray-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                              title="Edit Order"
                                          >
                                              <Edit2 className="w-4 h-4" />
                                          </button>
                                          {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                              <>
                                                  {order.status !== 'Driver Assigned' && order.enquiryCategory === 'Transport' && (
                                                      <button 
                                                          onClick={() => handleStatusUpdate(order.id, 'Driver Assigned')}
                                                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                                      >
                                                          Assign Driver
                                                      </button>
                                                  )}
                                                  <button 
                                                      onClick={() => handleStatusUpdate(order.id, 'Completed')}
                                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                                                      >
                                                      Complete
                                                  </button>
                                                  <button 
                                                      onClick={() => handleStatusUpdate(order.id, 'Cancelled')}
                                                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                                                  >
                                                      Cancel
                                                  </button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          )) : (
                              <tr>
                                  <td colSpan={6} className="text-center py-10 text-gray-500">
                                      No orders found.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 mb-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Fare Configuration</h3>
             <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>SUV</button>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <div className="mt-4 border-t border-gray-100 pt-2">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">Packages</label>
                      <button 
                        onClick={() => { setShowAddPackage(!showAddPackage); setEditingPackageId(null); setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' }); }}
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
                            {editingPackageId && (
                                <button onClick={handleCancelEditPackage} className="flex-1 bg-white text-gray-600 text-xs font-bold py-1.5 rounded hover:bg-gray-100 transition-colors">Cancel</button>
                            )}
                            <button onClick={handleAddPackage} className={`flex-1 ${editingPackageId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-bold py-1.5 rounded transition-colors`}>
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
                                      <div key={`${pkg.id}-sedan-price`}>S: {pkg.priceSedan}</div>
                                      <div key={`${pkg.id}-suv-price`}>X: {pkg.priceSuv}</div>
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
                 <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <div className="relative">
                          <input 
                              placeholder="Phone" 
                              className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                              value={customerDetails.phone}
                              onChange={e => {
                                  setCustomerDetails({...customerDetails, phone: e.target.value});
                                  setIsPhoneChecked(false);
                                  setPhoneLookupResult(null);
                                  setExistingEnquiriesForPhone([]);
                              }}
                          />
                          <button
                            type="button"
                            onClick={handlePhoneInputCheck}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-emerald-600"
                            title="Check Phone Number"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
                  {isPhoneChecked && (
                      <div className={`text-xs px-2 py-1 rounded-md mb-4 flex items-center gap-1 ${phoneLookupResult === 'Existing' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {phoneLookupResult === 'Existing' ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {phoneLookupResult === 'Existing' ? 'Existing Customer/Vendor' : 'New Customer'}
                      </div>
                  )}
                  
                  {enquiryCategory === 'General' ? (
                      <div className="space-y-4 mt-6 pt-6 border-t border-gray-100">
                          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 italic text-center">
                              Use this for general inquiries. <br/> Switch to Transport for fare calculation.
                          </div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                          <textarea 
                              rows={5}
                              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-sm"
                              placeholder={phoneLookupResult === 'New' ? "New User Requirement Details" : "Enter new general requirements here..."}
                              value={customerDetails.requirements}
                              onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                          />
                          {isPhoneChecked && phoneLookupResult === 'Existing' && existingEnquiriesForPhone.length > 0 && (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                  <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4"/> Past Enquiries for {customerDetails.name}</h4>
                                  {existingEnquiriesForPhone.map((enq, idx) => (
                                      <div key={enq.id} className="p-2 border-t border-blue-100 first:border-t-0">
                                          <p className="font-medium text-xs flex items-center gap-2">
                                            <Calendar className="w-3 h-3"/> {enq.date || enq.createdAt.split('T')[0]} 
                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${enq.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {enq.status}
                                            </span>
                                            {enq.enquiryCategory === 'Transport' && <Car className="w-3 h-3 text-gray-500"/>}
                                          </p>
                                          <p className="text-xs text-blue-700 italic mt-1 line-clamp-2">"{enq.details}"</p>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
                                <Clock className="w-3 h-3" /> Set Follow-up
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                    <input 
                                        type="date" 
                                        value={generalFollowUpDate}
                                        onChange={e => setGeneralFollowUpDate(e.target.value)}
                                        className="w-full p-2 border rounded-lg outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                    <input 
                                        type="time" 
                                        value={generalFollowUpTime}
                                        onChange={e => setGeneralFollowUpTime(e.target.value)}
                                        className="w-full p-2 border rounded-lg outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                                <div className="flex gap-2">
                                    {['Hot', 'Warm', 'Cold'].map(p => (
                                        <button 
                                            key={p}
                                            type="button"
                                            onClick={() => setGeneralFollowUpPriority(p as any)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${generalFollowUpPriority === p ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleCancelForm}
                                    className="py-3 border border-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4"/> Clear
                                </button>
                                <button 
                                    onClick={handleSaveGeneralFollowUp}
                                    className="py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> {editingOrderId ? 'Update Follow-up' : 'Save Follow-up'}
                                </button>
                            </div>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4 mt-6 pt-6 border-t border-gray-100">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <h4 className="text-sm font-bold text-gray-700">Trip Details</h4>
                              <div className="flex gap-2">
                                  {['Sedan', 'SUV'].map(v => (
                                      <button
                                          key={v}
                                          onClick={() => setVehicleType(v as any)}
                                          className={`px-3 py-1 text-xs rounded border transition-colors ${vehicleType === v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200'}`}
                                      >
                                          {v}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="flex border-b border-gray-200">
                              {['Local', 'Rental', 'Outstation'].map(t => (
                                  <button
                                      key={t}
                                      onClick={() => setTripType(t as any)}
                                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${tripType === t ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'}`}
                                  >
                                      {t}
                                  </button>
                              ))}
                              </div>

                              <div className="mb-4">
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

                              {tripType === 'Local' && (
                                  <div className="space-y-3">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                                          {!isMapReady ? <div className="p-2 bg-gray-100 text-xs rounded">Loading...</div> : (
                                              <Autocomplete 
                                                  placeholder="Search Drop Location"
                                                  onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, drop: addr }))}
                                                  setNewPlace={(place) => setDropCoords(place)}
                                                  defaultValue={transportDetails.drop}
                                              />
                                          )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                          <input type="number" placeholder="Est Km" className="p-2 border rounded-lg w-full" value={transportDetails.estKm} onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})} />
                                          <input type="number" placeholder="Wait Mins" className="p-2 border rounded-lg w-full" value={transportDetails.waitingMins} onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})} />
                                      </div>
                                  </div>
                              )}
                              
                              {tripType === 'Rental' && (
                                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                      {rentalPackages.map(pkg => (
                                          <button 
                                              key={pkg.id}
                                              onClick={() => setTransportDetails(prev => ({...prev, packageId: pkg.id}))}
                                              className={`p-2 border rounded-lg text-left text-sm transition-colors ${transportDetails.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                          >
                                              <div className="font-bold">{pkg.name}</div>
                                              <div className="text-gray-500 text-xs">₹{vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</div>
                                          </button>
                                      ))}
                                  </div>
                              )}

                              {tripType === 'Outstation' && (
                                  <div className="space-y-3">
                                      <div className="flex bg-gray-100 p-1 rounded-lg">
                                          <button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-1 text-xs rounded ${outstationSubType === 'RoundTrip' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Round Trip</button>
                                          <button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-1 text-xs rounded ${outstationSubType === 'OneWay' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>One Way</button>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                          {!isMapReady ? <div className="p-2 bg-gray-100 text-xs rounded">Loading...</div> : (
                                              <Autocomplete 
                                                  placeholder="Search Destination"
                                                  onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, destination: addr }))}
                                                  setNewPlace={(place) => setDestCoords(place)}
                                                  defaultValue={transportDetails.destination}
                                              />
                                          )}
                                      </div>
                                      <div className="grid grid-cols-3 gap-3">
                                          <input type="number" placeholder="Days" className="p-2 border rounded-lg w-full" value={transportDetails.days} onChange={e => setTransportDetails({...transportDetails, days: e.target.value})} />
                                          <input type="number" placeholder="Km" className="p-2 border rounded-lg w-full" value={transportDetails.estTotalKm} onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})} />
                                          {outstationSubType === 'RoundTrip' && (
                                              <input type="number" placeholder="Nights" className="p-2 border rounded-lg w-full" value={transportDetails.nights} onChange={e => setTransportDetails({...transportDetails, nights: e.target.value})} />
                                          )}
                                      </div>
                                  </div>
                              )}
                              
                                  <div className="mt-6 pt-6 border-t border-gray-100 space-y-5">
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

                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                              <Building2 className="w-3 h-3" /> Assign To
                                          </label>
                                          <div className="flex gap-2">
                                              {isSuperAdmin && (
                                                  <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" value={assignment.corporateId} onChange={(e) => setAssignment({...assignment, corporateId: e.target.value, branchName: '', staffId: ''})}>
                                                      <option value="admin">Head Office</option>
                                                      {corporates.map((c: any) => (<option key={c.email} value={c.email}>{c.companyName}</option>))}
                                                  </select>
                                              )}
                                              <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" value={assignment.branchName} onChange={(e) => setAssignment({...assignment, branchName: e.target.value, staffId: ''})}>
                                                      <option value="">All Branches</option>
                                                      {filteredBranches.map((b: any) => (<option key={b.id} value={b.name}>{b.name}</option>))}
                                                  </select>
                                                  <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" value={assignment.staffId} onChange={(e) => setAssignment({...assignment, staffId: e.target.value})}>
                                                      <option value="">Select Staff</option>
                                                      {filteredStaff.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                                  </select>
                                          </div>
                                      </div>

                                      <div className="space-y-3 pt-2">
                                          <div className="grid grid-cols-2 gap-3">
                                              <button 
                                                  onClick={handleOpenSchedule}
                                                  className="py-3 border border-blue-200 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                              >
                                                  <Calendar className="w-4 h-4" /> {editingOrderId ? 'Update Schedule' : 'Schedule'}
                                              </button>
                                              <button 
                                                  onClick={handleBookNow}
                                                  className="py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                              >
                                                  <ArrowRight className="w-4 h-4" /> {editingOrderId ? 'Update Now' : 'Book Now'}
                                              </button>
                                          </div>
                                          <div>
                                              <button 
                                                  onClick={handleCancelForm}
                                                  className="w-full py-2 text-gray-400 hover:text-red-500 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 rounded-lg border border-transparent hover:border-gray-200"
                                              >
                                                  <X className="w-3 h-3" /> Clear Form
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                  )}
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Estimated Cost</p>
                      <h3 className="text-4xl font-bold mb-4">₹{estimatedCost.toLocaleString()}</h3>
                      <div className="text-sm text-slate-300 border-t border-slate-700 pt-3">
                          <p>Base calculation only. Tolls & Parking extra.</p>
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
                          onClick={() => {navigator.clipboard.writeText(generatedMessage); setTimeout(() => alert("Copied!"), 0);}}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                          <Copy className="w-3 h-3" /> Copy
                      </button>
                  </div>
                  <textarea 
                      ref={messageTextareaRef}
                      className="w-full min-h-[200px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none overflow-y-hidden resize-none mb-3"
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

      {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800">Schedule Order</h3>
                      <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                          <input 
                              type="date" 
                              className="w-full p-2 border border-gray-300 rounded-lg outline-none"
                              value={scheduleData.date}
                              onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                          <input 
                              type="time" 
                              className="w-full p-2 border border-gray-300 rounded-lg outline-none"
                              value={scheduleData.time}
                              onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                          />
                      </div>
                      <button 
                          onClick={confirmSchedule}
                          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition-colors"
                      >
                          Confirm Schedule
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
