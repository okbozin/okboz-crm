import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, User, MapPin, Calendar, FileText, CheckCircle, Search, 
  Plus, Filter, RefreshCcw, MessageCircle, Mail, Clock, 
  ArrowRight, History, AlertCircle, X, PhoneIncoming, PhoneOutgoing, UserPlus,
  Pencil, Trash2, Edit2, Car, Building2, Save, Copy, Loader2, ArrowRightLeft
} from 'lucide-react';
import { Enquiry, UserRole, Employee, Branch, CorporateAccount } from '../../types';
import Autocomplete from '../../components/Autocomplete';

interface CustomerCareProps {
  role?: UserRole;
}

// --- CONFIGURATION TYPES & DEFAULTS ---
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
  outstationBaseRate: number; // This one is probably for RoundTrip or deprecated, keeping for now
  outstationBaseRateOneWay: number; // NEW: Explicit field for OneWay base rate
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300,
  outstationBaseRateOneWay: 0 // Default for the new field
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400,
  outstationBaseRateOneWay: 0 // Default for the new field
};

const CustomerCare: React.FC<CustomerCareProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // --- Data Loading ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem('global_enquiries_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [corporates, setCorporates] = useState<CorporateAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('corporate_accounts') || '[]'); } catch { return []; }
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);

  // --- Configuration State ---
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  // NEW: State for Outstation Subtype in Settings Panel
  const [settingsOutstationSubType, setSettingsOutstationSubType] = useState<'RoundTrip' | 'OneWay'>('RoundTrip');
  
  // Configuration Context State (For Editing)
  const [confOwner, setConfOwner] = useState(isSuperAdmin ? 'admin' : sessionId);
  const [confBranch, setConfBranch] = useState('Global'); // 'Global' means applies to all branches under this owner unless overridden

  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  // Initial Load with default or currently stored global settings
  const [pricing, setPricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);

  // Helper to generate the storage key based on selected context
  const getConfigKey = (baseKey: string, owner: string, branch: string) => {
      // Clean branch name for key usage
      const cleanBranch = branch === 'Global' ? '' : `_${branch.replace(/\s+/g, '_')}`;
      return `${baseKey}_${owner}${cleanBranch}`;
  };

  // Effect: Load Settings when Context (Owner/Branch) changes
  useEffect(() => {
      if (!showSettings) return; // Only load when settings panel is open

      const loadConfig = () => {
          const pricingKey = getConfigKey('transport_pricing_rules_v2', confOwner, confBranch);
          const pkgKey = getConfigKey('transport_rental_packages_v2', confOwner, confBranch);

          const savedPricing = localStorage.getItem(pricingKey);
          const savedPkgs = localStorage.getItem(pkgKey);

          if (savedPricing) {
              setPricing(JSON.parse(savedPricing));
          } else {
              // Fallback to Global if Branch specific not found, or Defaults
              if (confBranch !== 'Global') {
                  const globalKey = getConfigKey('transport_pricing_rules_v2', confOwner, 'Global');
                  const globalPricing = localStorage.getItem(globalKey);
                  if (globalPricing) setPricing(JSON.parse(globalPricing));
                  else setPricing({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
              } else {
                  setPricing({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
              }
          }

          if (savedPkgs) {
              setRentalPackages(JSON.parse(savedPkgs));
          } else {
               if (confBranch !== 'Global') {
                  const globalKey = getConfigKey('transport_rental_packages_v2', confOwner, 'Global');
                  const globalPkgs = localStorage.getItem(globalKey);
                  if (globalPkgs) setRentalPackages(JSON.parse(globalPkgs));
                  else setRentalPackages(DEFAULT_RENTAL_PACKAGES);
               } else {
                  setRentalPackages(DEFAULT_RENTAL_PACKAGES);
               }
          }
      };
      loadConfig();
  }, [confOwner, confBranch, showSettings]);

  // Effect: Save Settings when changed
  useEffect(() => {
    if (!showSettings) return; // Prevent overwriting on initial mount before load
    
    const pricingKey = getConfigKey('transport_pricing_rules_v2', confOwner, confBranch);
    const pkgKey = getConfigKey('transport_rental_packages_v2', confOwner, confBranch);

    localStorage.setItem(pricingKey, JSON.stringify(pricing));
    localStorage.setItem(pkgKey, JSON.stringify(rentalPackages));
  }, [pricing, rentalPackages, confOwner, confBranch, showSettings]);

  // Load Branches & Staff (Aggregated)
  useEffect(() => {
    let allBranches: Branch[] = [];
    let allStaff: Employee[] = [];

    if (isSuperAdmin) {
        // Admin Data
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        allBranches = [...adminBranches];
        allStaff = [...allStaff, ...adminStaff]; // Fix: Append to allStaff
        
        // Corp Data
        corporates.forEach(c => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
            allBranches = [...allBranches, ...cBranches];
            allStaff = [...allStaff, ...cStaff];
        });
    } else {
        // Corporate/Employee View
        const keySuffix = role === UserRole.CORPORATE ? sessionId : localStorage.getItem('logged_in_employee_corporate_id') || sessionId;
        allBranches = JSON.parse(localStorage.getItem(`branches_data_${keySuffix}`) || '[]');
        allStaff = JSON.parse(localStorage.getItem(`staff_data_${keySuffix}`) || '[]');
    }
    setBranches(allBranches);
    setStaff(allStaff);
  }, [isSuperAdmin, sessionId, corporates, role]);


  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [activeCorporateFilter, setActiveCorporateFilter] = useState('');
  
  // --- Form State ---
  const initialFormState = {
    phoneNumber: '',
    name: '',
    email: '',
    // Trip Details
    tripType: 'Local' as 'Local' | 'Rental' | 'Outstation',
    outstationSubType: 'RoundTrip' as 'OneWay' | 'RoundTrip', // New State for Subtype
    vehicleType: 'Sedan' as 'Sedan' | 'SUV',
    pickup: '',
    drop: '',
    estKm: '',
    waitMins: '',
    packageId: '', // For Rental
    destination: '', // For Outstation
    days: '1', // For Outstation
    estTotalKm: '', // For Outstation (calculated distance)
    nights: '0', // NEW: For Outstation Round Trip
    requirementDetails: '',
    // Assignment
    assignCorporate: isSuperAdmin ? '' : sessionId, // Default assignment based on role
    assignBranch: '',
    assignStaff: '',
    // Schedule
    followUpDate: new Date().toISOString().split('T')[0],
    followUpTime: '',
    // Meta
    status: 'New'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- Map & Distance State ---
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null); // For Outstation Destination
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Select default package if Rental selected
  useEffect(() => {
     if (formData.tripType === 'Rental' && !formData.packageId && rentalPackages.length > 0) {
         setFormData(prev => ({ ...prev, packageId: rentalPackages[0].id }));
     }
  }, [formData.tripType, rentalPackages]);

  // --- Google Maps Script Loader ---
  useEffect(() => {
    if (window.gm_authFailure_detected) {
      setMapError("Map Error: Billing not enabled OR API Key Invalid.");
      return;
    }
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key missing.");
      return;
    }
    
    // Check if script exists
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
        if (window.google && window.google.maps && window.google.maps.places) setIsMapReady(true);
    }
  }, []);

  // --- Distance Calculation Effect ---
  useEffect(() => {
    if (!isMapReady || !window.google) return;
    
    // Only calculate if not Rental (Rental has fixed packages)
    if (formData.tripType === 'Rental') {
        setFormData(prev => ({...prev, estKm: '', estTotalKm: ''})); // Clear distance for rental
        return;
    }

    const calculateDistance = (origin: google.maps.LatLngLiteral | null, destination: google.maps.LatLngLiteral | null, isRoundTripCalculation: boolean, isOutstationState: boolean) => {
        if (!origin || !destination) {
            setFormData(prev => ({...prev, estKm: '', estTotalKm: ''})); // Clear if points not set
            return;
        }
        try {
            const service = new window.google.maps.DistanceMatrixService();
            service.getDistanceMatrix(
                {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    unitSystem: window.google.maps.UnitSystem.METRIC,
                },
                (response: any, status: any) => {
                    if (status === "OK" && response.rows[0].elements[0].status === "OK") {
                        const distanceInMeters = response.rows[0].elements[0].distance.value;
                        let distanceInKm = distanceInMeters / 1000;
                        
                        if (isRoundTripCalculation) {
                            distanceInKm = distanceInKm * 2; 
                        }

                        const formattedDist = distanceInKm.toFixed(1);
                        if (isOutstationState) {
                            setFormData(prev => ({ ...prev, estTotalKm: formattedDist }));
                        } else {
                            setFormData(prev => ({ ...prev, estKm: formattedDist }));
                        }
                    } else {
                        console.warn("Distance calc failed:", status);
                        setFormData(prev => ({...prev, estKm: '', estTotalKm: ''})); // Clear on error
                    }
                }
            );
        } catch (e) {
            console.error("Error initializing Distance Matrix Service:", e);
            setFormData(prev => ({...prev, estKm: '', estTotalKm: ''})); // Clear on error
        }
    };

    if (formData.tripType === 'Local') {
        calculateDistance(pickupCoords, dropCoords, false, false);
    } else if (formData.tripType === 'Outstation') {
        const isRoundTrip = formData.outstationSubType === 'RoundTrip';
        calculateDistance(pickupCoords, destCoords, isRoundTrip, true); 
    }

  }, [pickupCoords, dropCoords, destCoords, isMapReady, formData.tripType, formData.outstationSubType]);


  // --- Estimate Calculation ---
  // State for the rules message to display in the enquiry form
  const [currentRulesMessage, setCurrentRulesMessage] = useState('');
  
  // The pricing rules that will be used for calculation based on the selected assignment context.
  const [activeEstimatePricing, setActiveEstimatePricing] = useState<Record<'Sedan' | 'SUV', PricingRules>>({ Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV });
  const [activeEstimatePackages, setActiveEstimatePackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);

  // Effect: Fetch specific pricing for the estimation when form changes context
  useEffect(() => {
      // Determine context for estimation
      let owner = 'admin';
      let branch = 'Global'; 

      if (formData.assignCorporate) owner = formData.assignCorporate;
      else if (!isSuperAdmin) owner = sessionId;

      if (formData.assignBranch) {
          const b = branches.find(br => br.id === formData.assignBranch);
          if (b) branch = b.name;
      }

      // Helper to fetch (similar to loadConfig but returns data)
      const fetchContextData = () => {
          const pricingKey = getConfigKey('transport_pricing_rules_v2', owner, branch);
          const pkgKey = getConfigKey('transport_rental_packages_v2', owner, branch);
          
          let pRules = localStorage.getItem(pricingKey);
          let pPkgs = localStorage.getItem(pkgKey);

          // Fallback logic (Order of precedence: Specific Branch > Global for Owner > Default)
          if (!pRules) { // If no specific branch rules found
              const globalKey = getConfigKey('transport_pricing_rules_v2', owner, 'Global');
              pRules = localStorage.getItem(globalKey);
          }
          const finalPricing = pRules ? JSON.parse(pRules) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };

          if (!pPkgs) {
              const globalKey = getConfigKey('transport_rental_packages_v2', owner, 'Global');
              pPkgs = localStorage.getItem(globalKey);
          }
          const finalPkgs = pPkgs ? JSON.parse(pPkgs) : DEFAULT_RENTAL_PACKAGES;

          setActiveEstimatePricing(finalPricing);
          setActiveEstimatePackages(finalPkgs);
      };

      fetchContextData();
  }, [formData.assignCorporate, formData.assignBranch, branches, sessionId, isSuperAdmin, showSettings]); // Re-run if assignment context changes, or if settings are saved/opened.

  const estimate = useMemo(() => {
     const rules = activeEstimatePricing[formData.vehicleType];
     let total = 0;

     if (formData.tripType === 'Local') {
         const km = parseFloat(formData.estKm) || 0;
         const wait = parseFloat(formData.waitMins) || 0;
         
         let extraKmCost = 0;
         if (km > rules.localBaseKm) {
             extraKmCost = (km - rules.localBaseKm) * rules.localPerKmRate;
         }
         total = rules.localBaseFare + extraKmCost + (wait * rules.localWaitingRate);
     } 
     else if (formData.tripType === 'Rental') {
         const pkg = activeEstimatePackages.find(p => p.id === formData.packageId);
         if (pkg) {
             total = formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
         }
     } 
     else if (formData.tripType === 'Outstation') {
         const km = parseFloat(formData.estTotalKm) || 0;
         const days = parseFloat(formData.days) || 1; // Use days from form
         
         const minKm = rules.outstationMinKmPerDay * days;
         const chargeableKm = Math.max(km, minKm);
         const rate = rules.outstationExtraKmRate;
         
         let baseRate = 0;
         if (formData.outstationSubType === 'OneWay') {
             baseRate = rules.outstationBaseRateOneWay || 0;
         }

         // Only apply night allowance if RoundTrip is selected
         const nightsInput = parseFloat(formData.nights) || 0;
         const nightAllowance = formData.outstationSubType === 'RoundTrip' ? (rules.outstationNightAllowance * nightsInput || 0) : 0;

         total = baseRate + (chargeableKm * rate) + (rules.outstationDriverAllowance * days) + nightAllowance;
     }
     
     return Math.round(total);
  }, [formData.tripType, formData.vehicleType, formData.estKm, formData.waitMins, formData.packageId, formData.outstationSubType, formData.destination, formData.days, formData.estTotalKm, formData.nights, activeEstimatePricing, activeEstimatePackages]);

  // Effect to update currentRulesMessage for the form
  useEffect(() => {
    const rules = activeEstimatePricing[formData.vehicleType];
    let message = '';

    if (formData.tripType === 'Local') {
        message = `Min ${rules.localBaseKm}km Base ₹${rules.localBaseFare}. Extra ₹${rules.localPerKmRate}/km. Wait ₹${rules.localWaitingRate}/min.`;
    } else if (formData.tripType === 'Rental') {
        message = `Extra Charges: Hours (₹${rules.rentalExtraHrRate}/hr) and Km (₹${rules.rentalExtraKmRate}/km).`;
    } else if (formData.tripType === 'Outstation') {
        if (formData.outstationSubType === 'RoundTrip') {
            message = `Min ${rules.outstationMinKmPerDay}km/day. Rate ₹${rules.outstationExtraKmRate}/km. Driver ₹${rules.outstationDriverAllowance}/day. Night Allow ₹${rules.outstationNightAllowance}/night.`;
        } else { // OneWay
            message = `Min ${rules.outstationMinKmPerDay}km/day. Rate ₹${rules.outstationExtraKmRate}/km. Base ₹${rules.outstationBaseRateOneWay || 0}. Driver ₹${rules.outstationDriverAllowance}/day. No Night Allowance.`;
        }
    }
    setCurrentRulesMessage(`Current Rules (${formData.vehicleType}${formData.tripType === 'Outstation' ? ` - ${formData.outstationSubType}` : ''}): ${message}`);
}, [formData.tripType, formData.outstationSubType, formData.vehicleType, activeEstimatePricing]);


  const availableBranchesForForm = useMemo(() => {
      let targetOwner = 'admin';
      if (isSuperAdmin) {
          targetOwner = formData.assignCorporate || 'admin';
      } else if (role === UserRole.CORPORATE) {
          targetOwner = sessionId;
      } else if (role === UserRole.EMPLOYEE) {
          targetOwner = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';
      }
      return branches.filter(b => b.owner === targetOwner);
  }, [branches, formData.assignCorporate, isSuperAdmin, role, sessionId]);

  const availableStaffForForm = useMemo(() => {
      let relevantStaff = staff;

      if (isSuperAdmin) {
          const target = formData.assignCorporate || 'admin';
          relevantStaff = staff.filter(s => {
              if (target === 'admin') return !s.corporateId || s.corporateId === 'admin';
              return s.corporateId === target;
          });
      }

      if (formData.assignBranch) {
          const selectedBranch = branches.find(b => b.id === formData.assignBranch);
          if (selectedBranch) {
              relevantStaff = relevantStaff.filter(s => s.branch === selectedBranch.name);
          }
      }

      return relevantStaff;
  }, [staff, branches, formData.assignCorporate, formData.assignBranch, isSuperAdmin]);

  // --- Configuration Handlers ---
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
        // Update existing
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
        // Add new
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

  const handleEditPackage = (pkg: RentalPackage) => {
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

  const removePackage = (id: string) => {
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
    }
  };


  // --- Action Handlers ---

  const handleSave = (action: 'Schedule' | 'Save' | 'Book') => {
      let status: Enquiry['status'] = 'New';
      if (action === 'Schedule') status = 'Scheduled';
      if (action === 'Book') status = 'Booked';
      if (action === 'Save') status = 'In Progress';

      if (!formData.name || !formData.phoneNumber) {
          alert("Name and Phone are required.");
          return;
      }

      // Determine Owner
      let ownerId = 'admin';
      if (formData.assignCorporate) ownerId = formData.assignCorporate;
      else if (role === UserRole.CORPORATE) ownerId = sessionId;
      else if (role === UserRole.EMPLOYEE) ownerId = localStorage.getItem('logged_in_employee_corporate_id') || 'admin';

      const newEnquiry: Enquiry = {
          id: `ENQ-${Date.now()}`,
          type: 'Customer',
          initialInteraction: 'Incoming',
          name: formData.name,
          phone: formData.phoneNumber,
          city: '', 
          email: formData.email,
          details: formData.requirementDetails,
          status: status,
          createdAt: new Date().toISOString(),
          corporateId: ownerId,
          assignedTo: formData.assignStaff,
          nextFollowUp: (formData.followUpDate && formData.followUpTime) ? `${formData.followUpDate} ${formData.followUpTime}` : undefined,
          tripType: formData.tripType,
          vehicleType: formData.vehicleType,
          outstationSubType: formData.outstationSubType, // Save subtype
          estimatedPrice: estimate,
          transportData: {
              pickup: formData.pickup,
              drop: formData.drop || formData.destination, // Use destination for outstation drop
              estKm: formData.estKm,
              waitingMins: formData.waitMins,
              packageId: formData.packageId,
              destination: formData.destination, // Save destination explicitly
              days: formData.days,
              estTotalKm: formData.estTotalKm,
              nights: formData.nights, // Save nights
          },
          history: []
      };

      const updatedEnquiries = [newEnquiry, ...enquiries];
      setEnquiries(updatedEnquiries);
      localStorage.setItem('global_enquiries_data', JSON.stringify(updatedEnquiries));
      
      alert(`Enquiry ${status} Successfully!`);
  };

  const handleEdit = (enq: Enquiry) => {
      setFormData({
          phoneNumber: enq.phone,
          name: enq.name,
          email: enq.email || '',
          tripType: enq.tripType || 'Local',
          outstationSubType: enq.outstationSubType || 'RoundTrip', // Populate subtype
          vehicleType: enq.vehicleType || 'Sedan',
          pickup: enq.transportData?.pickup || '',
          drop: enq.transportData?.drop || '',
          estKm: enq.transportData?.estKm || '',
          waitMins: enq.transportData?.waitingMins || '',
          packageId: enq.transportData?.packageId || '',
          destination: enq.transportData?.destination || '', // Populate destination
          days: enq.transportData?.days || '1', // Populate days
          estTotalKm: enq.transportData?.estTotalKm || '',
          nights: enq.transportData?.nights || '0', // Populate nights
          requirementDetails: enq.details || '',
          assignCorporate: enq.corporateId || '',
          assignBranch: '', 
          assignStaff: enq.assignedTo || '',
          followUpDate: enq.nextFollowUp ? enq.nextFollowUp.split(' ')[0] : '',
          followUpTime: enq.nextFollowUp ? enq.nextFollowUp.split(' ')[1] : '',
          status: enq.status
      });
      const formElement = document.getElementById('enquiry-form-section');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this enquiry?')) {
          const updated = enquiries.filter(e => e.id !== id);
          setEnquiries(updated);
          localStorage.setItem('global_enquiries_data', JSON.stringify(updated));
      }
  };
  
  // Filter Logic
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
        let isVisible = true;
        if (role === UserRole.CORPORATE) isVisible = e.corporateId === sessionId;
        if (role === UserRole.EMPLOYEE) isVisible = e.corporateId === localStorage.getItem('logged_in_employee_corporate_id');
        if (!isVisible) return false;

        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.phone.includes(searchTerm);
        const matchesStatus = activeStatusFilter === 'All' || e.status === activeStatusFilter;
        const matchesCorporate = !activeCorporateFilter || e.corporateId === activeCorporateFilter;
        
        return matchesSearch && matchesStatus && matchesCorporate;
    });
  }, [enquiries, searchTerm, activeStatusFilter, activeCorporateFilter, role, sessionId]);

  const generatedMessage = `
Hello ${formData.name || 'Customer'},
Here is your ${formData.tripType} estimate from OK BOZ! 🚕

*${formData.tripType} Trip Estimate*
🚘 Vehicle: ${formData.vehicleType}
📍 Pickup: ${formData.pickup || 'TBD'}
${formData.tripType === 'Outstation' ? `🌍 Destination: ${formData.destination || '-'}` : (formData.tripType !== 'Rental' ? `📍 Drop: ${formData.drop || '-'}` : '')}
${formData.tripType === 'Rental' ? `📦 Package: ${activeEstimatePackages.find(p=>p.id===formData.packageId)?.name || '-'}` : ''}

${formData.tripType === 'Local' || formData.tripType === 'Outstation' ? `📝 Distance: ${formData.estKm || formData.estTotalKm || '0'}km` : ''}
${formData.tripType === 'Local' ? `⏳ Waiting Time: ${formData.waitMins || '0'} mins` : ''}
${formData.tripType === 'Outstation' ? `📅 Duration: ${formData.days || '1'} Day(s)` : ''}
${formData.tripType === 'Outstation' && formData.outstationSubType === 'RoundTrip' ? `🌙 Nights: ${formData.nights || '0'}` : ''}

💰 *Estimate: ₹${estimate}*
(Toll and Parking Extra)

Book now with OK BOZ Transport! 🚕
  `;

  const handleWhatsApp = () => {
      const url = `https://wa.me/${formData.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`;
      window.open(url, '_blank');
  };

  // Branches used for configuration selection (different from form selection)
  const configAvailableBranches = useMemo(() => {
      const owner = confOwner;
      return branches.filter(b => b.owner === owner);
  }, [branches, confOwner]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <div className="bg-indigo-100 p-2 rounded-lg"><Phone className="w-6 h-6 text-indigo-600" /></div>
             Customer Care
          </h2>
          <p className="text-gray-500">Manage customer enquiries and follow-ups</p>
        </div>
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showSettings ? 'bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-gray-50'}`}
        >
            <Edit2 className="w-4 h-4" /> Fare Configuration
        </button>
      </div>

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          
          {/* Top Bar: Scope Selection & Vehicle Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
             
             <div className="flex items-center gap-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit Rates</h3>
                 
                 {/* Configuration Context Selectors */}
                 <div className="flex gap-2">
                     {isSuperAdmin && (
                         <select 
                            value={confOwner} 
                            onChange={(e) => { setConfOwner(e.target.value); setConfBranch('Global'); }}
                            className="text-xs p-2 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                         >
                             <option value="admin">Head Office</option>
                             {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                         </select>
                     )}
                     
                     <select 
                        value={confBranch} 
                        onChange={(e) => setConfBranch(e.target.value)}
                        className="text-xs p-2 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                     >
                         <option value="Global">All Branches (Global)</option>
                         {configAvailableBranches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                     </select>
                 </div>
             </div>

             <div className="bg-white border border-gray-300 rounded-lg p-1 flex">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'Sedan' ? 'bg-emerald-50 text-white' : 'text-gray-600'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>SUV</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Local Rules */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
               <h4 className="text-sm font-bold text-emerald-600 uppercase border-b pb-2">Local</h4>
               <div><label className="text-xs text-gray-500 block">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div><label className="text-xs text-gray-500 block">Base Km</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div><label className="text-xs text-gray-500 block">Per Km (₹)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div><label className="text-xs text-gray-500 block">Waiting (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
            </div>
            {/* Outstation Rules */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
               <h4 className="text-sm font-bold text-orange-600 uppercase border-b pb-2">Outstation</h4>
               
               {/* Outstation Subtype Toggle for Settings */}
               <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  <button 
                    onClick={() => setSettingsOutstationSubType('RoundTrip')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${settingsOutstationSubType === 'RoundTrip' ? 'bg-white shadow text-orange-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <ArrowRightLeft className="w-3 h-3"/> Round Trip
                  </button>
                  <button 
                    onClick={() => setSettingsOutstationSubType('OneWay')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${settingsOutstationSubType === 'OneWay' ? 'bg-white shadow text-orange-800' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <ArrowRight className="w-3 h-3"/> One Way
                  </button>
               </div>

               <div><label className="text-xs text-gray-500 block">Min Km/Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div><label className="text-xs text-gray-500 block">Per Km (₹)</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               
               {/* Conditional rendering for Base Rate (One Way Only) */}
               {settingsOutstationSubType === 'OneWay' ? (
                   <div>
                       <label className="text-xs text-gray-500 block">Base Rate (One Way Only)</label>
                       <input type="number" name="outstationBaseRateOneWay" value={pricing[settingsVehicleType].outstationBaseRateOneWay} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/>
                   </div>
               ) : (
                   <div className="p-2 bg-gray-50 rounded text-[9px] text-gray-400 flex items-center gap-1">
                       <AlertCircle className="w-3 h-3 flex-shrink-0" />
                       Base Rate (One Way Only) not applicable for Round Trip.
                   </div>
               )}
               
               <div><label className="text-xs text-gray-500 block">Driver Allowance</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               
               {/* Conditional rendering for Driver Night Allowance */}
               {settingsOutstationSubType === 'RoundTrip' ? (
                   <div>
                       <label className="text-xs text-gray-500 block">Driver Night Allowance</label>
                       <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/>
                   </div>
               ) : (
                   <div className="p-2 bg-gray-50 rounded text-[9px] text-gray-400 flex items-center gap-1">
                       <AlertCircle className="w-3 h-3 flex-shrink-0" />
                       Driver Night Allowance not applicable for One Way.
                   </div>
               )}
            </div>
            {/* Rental Rules */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
               <h4 className="text-sm font-bold text-blue-600 uppercase border-b pb-2">Rental</h4>
               <div><label className="text-xs text-gray-500 block">Extra Hr/Rate</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div><label className="text-xs text-gray-500 block">Extra Km/Rate</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-xs"/></div>
               <div className="flex justify-between items-center"><label className="text-xs font-bold">Packages</label>
               <button onClick={() => { 
                   setShowAddPackage(!showAddPackage); 
                   setEditingPackageId(null); 
                   setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' }); 
               }} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200"><Plus className="w-3 h-3 inline"/> {showAddPackage && !editingPackageId ? 'Cancel' : 'New'}</button></div>
               
               {showAddPackage && (
                  <div className="bg-blue-50 p-2 rounded text-xs space-y-2">
                     <input placeholder="Pkg Name" className="w-full p-1 border rounded" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                     <div className="flex gap-1">
                        <input placeholder="Hrs" type="number" className="w-1/2 p-1 border rounded" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} />
                        <input placeholder="Km" type="number" className="w-1/2 p-1 border rounded" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} />
                     </div>
                     <div className="flex gap-1">
                        <input placeholder="Sedan ₹" type="number" className="w-1/2 p-1 border rounded" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} />
                        <input placeholder="SUV ₹" type="number" className="w-1/2 p-1 border rounded" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} />
                     </div>
                     <div className="flex gap-2">
                         <button onClick={handleAddPackage} className="flex-1 bg-blue-600 text-white py-1 rounded font-bold">{editingPackageId ? 'Update' : 'Add'}</button>
                         {editingPackageId && <button onClick={() => { setShowAddPackage(false); setEditingPackageId(null); }} className="px-2 border border-blue-200 text-blue-600 rounded">Cancel</button>}
                     </div>
                  </div>
               )}
               <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {rentalPackages.map(pkg => (
                     <div key={pkg.id} className="flex justify-between p-1.5 bg-gray-50 rounded border border-gray-100">
                        <div>
                            <span className="text-[10px] font-medium block">{pkg.name}</span>
                            <span className="text-[9px] text-gray-500">{pkg.hours}h / {pkg.km}km</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] mr-1">S:{pkg.priceSedan} X:{pkg.priceSuv}</span>
                            <button onClick={() => handleEditPackage(pkg)} className="text-blue-400 hover:text-blue-600"><Edit2 className="w-3 h-3"/></button>
                            <button onClick={() => {if(confirm('Delete?')) setRentalPackages(prev => prev.filter(p => p.id !== pkg.id))}} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search enquiries..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
          </div>
          {isSuperAdmin && (
            <select 
                value={activeCorporateFilter}
                onChange={e => setActiveCorporateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
            >
                <option value="">All Corporates</option>
                <option value="admin">Head Office</option>
                {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
            </select>
          )}
          <select 
            value={activeStatusFilter}
            onChange={e => setActiveStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
          >
              <option value="All">All Status</option>
              <option value="New">New</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Booked">Booked</option>
              <option value="Completed">Completed</option>
          </select>
          <div className="relative">
              <input type="date" className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600" />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"><RefreshCcw className="w-4 h-4" /></button>
      </div>

      {/* ORDER LIST TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4 font-semibold">Customer</th>
                          <th className="px-6 py-4 font-semibold">Trip/Enquiry Info</th>
                          <th className="px-6 py-4 font-semibold">Assigned To</th>
                          {isSuperAdmin && <th className="px-6 py-4 font-semibold">Corporate</th>}
                          <th className="px-6 py-4 font-semibold">Follow-up Date</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredEnquiries.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-10 text-gray-400">No enquiries found.</td></tr>
                      ) : (
                          filteredEnquiries.map(enq => (
                              <tr key={enq.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="font-bold text-gray-900">{enq.name}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">{enq.phone}</div>
                                      <div className="text-[10px] text-gray-400 mt-1 font-mono">{enq.id}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div>
                                          <div className="font-medium text-gray-800">
                                              {enq.tripType || 'General'} ({enq.vehicleType || '-'}) . Est: ₹{enq.estimatedPrice}
                                          </div>
                                          <div className="text-xs text-gray-400 mt-0.5">
                                              {enq.transportData?.pickup || 'No Loc'} → {enq.transportData?.drop || '-'}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600">
                                      {staff.find(s => s.id === enq.assignedTo)?.name || 'Unassigned'}
                                  </td>
                                  {isSuperAdmin && (
                                      <td className="px-6 py-4">
                                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100 font-medium">
                                              {enq.corporateId === 'admin' ? 'Head Office' : corporates.find(c => c.email === enq.corporateId)?.companyName || '-'}
                                          </span>
                                      </td>
                                  )}
                                  <td className="px-6 py-4">
                                      {enq.nextFollowUp ? (
                                          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded text-xs font-medium border border-orange-100">
                                              <Calendar className="w-3 h-3" />
                                              {new Date(enq.nextFollowUp).toLocaleDateString()}
                                          </span>
                                      ) : '-'}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                          enq.status === 'Booked' ? 'bg-green-50 text-green-700 border-green-200' :
                                          enq.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                          enq.status === 'Scheduled' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}>
                                          {enq.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleEdit(enq)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={() => handleDelete(enq.id)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* BOTTOM SECTION: FORM & ESTIMATE */}
      <div id="enquiry-form-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: CUSTOMER INFO FORM */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-gray-500" /> Customer Info
              </h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Name</label>
                      <input 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
                          placeholder="Client Name"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone</label>
                      <input 
                          value={formData.phoneNumber}
                          onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
                          placeholder="+91..."
                      />
                  </div>
              </div>

              {/* Trip Details Section */}
              <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-800 text-sm">Trip Details</h4>
                      <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                          <button onClick={() => setFormData({...formData, vehicleType: 'Sedan'})} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${formData.vehicleType === 'Sedan' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Sedan</button>
                          <button onClick={() => setFormData({...formData, vehicleType: 'SUV'})} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${formData.vehicleType === 'SUV' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>SUV</button>
                      </div>
                  </div>
                  
                  <div className="flex border-b border-gray-200 mb-5">
                      {['Local', 'Rental', 'Outstation'].map(type => (
                          <button 
                            key={type}
                            onClick={() => setFormData({...formData, tripType: type as any})}
                            className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${formData.tripType === type ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                          >
                              {type}
                          </button>
                      ))}
                  </div>

                  <div className="space-y-4">
                      {/* Pickup and Drop/Destination Autocompletes */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className={formData.tripType === 'Outstation' && formData.outstationSubType === 'OneWay' ? 'col-span-2' : ''}>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Pickup Location</label>
                              {!isMapReady ? (
                                  <div className="p-2.5 bg-gray-100 rounded-lg text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading Maps...</div>
                              ) : (
                                  <Autocomplete 
                                    placeholder="Search Pickup"
                                    onAddressSelect={(addr) => setFormData(prev => ({...prev, pickup: addr}))}
                                    setNewPlace={(place) => setPickupCoords(place)}
                                    defaultValue={formData.pickup}
                                  />
                              )}
                          </div>
                          
                          {formData.tripType !== 'Rental' && (
                             <div className={formData.tripType === 'Outstation' ? 'col-span-2' : ''}>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                                    {formData.tripType === 'Outstation' ? 'Destination' : 'Drop Location'}
                                </label>
                                {!isMapReady ? (
                                    <div className="p-2.5 bg-gray-100 rounded-lg text-sm text-gray-500">Loading Maps...</div>
                                ) : (
                                    <Autocomplete 
                                        placeholder={formData.tripType === 'Outstation' ? "Search Destination" : "Search Drop"}
                                        onAddressSelect={(addr) => setFormData(prev => ({...prev, destination: formData.tripType === 'Outstation' ? addr : prev.destination, drop: formData.tripType === 'Local' ? addr : prev.drop}))}
                                        setNewPlace={(place) => formData.tripType === 'Outstation' ? setDestCoords(place) : setDropCoords(place)}
                                        defaultValue={formData.tripType === 'Outstation' ? formData.destination : formData.drop}
                                    />
                                )}
                             </div>
                          )}
                      </div>
                      
                      {/* Outstation Subtype Toggle */}
                      {formData.tripType === 'Outstation' && (
                        <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                           <button 
                             onClick={() => setFormData(prev => ({...prev, outstationSubType: 'RoundTrip'}))}
                             className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${formData.outstationSubType === 'RoundTrip' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                           >
                             <ArrowRightLeft className="w-3 h-3"/> Round Trip
                           </button>
                           <button 
                             onClick={() => setFormData(prev => ({...prev, outstationSubType: 'OneWay'}))}
                             className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${formData.outstationSubType === 'OneWay' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                           >
                             <ArrowRight className="w-3 h-3"/> One Way
                           </button>
                        </div>
                      )}

                      {/* Rental Package Dropdown */}
                      {formData.tripType === 'Rental' && (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Select Package</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
                                    {activeEstimatePackages.map(pkg => (
                                        <button 
                                            key={pkg.id}
                                            onClick={() => setFormData({...formData, packageId: pkg.id})}
                                            className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all group ${formData.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                   <span className="font-bold text-gray-800 block">{pkg.name}</span>
                                                   <span className="text-xs text-gray-500">{pkg.hours} Hr / {pkg.km} Km</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-emerald-600 font-bold block">₹{formData.vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase">{formData.vehicleType}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                          </div>
                      )}
                      
                      {/* Dynamic inputs for Outstation and Local */}
                      {(formData.tripType === 'Local' || formData.tripType === 'Outstation') && (
                          <div className="grid grid-cols-3 gap-4">
                              <div>
                                  <label className="sr-only">Days</label>
                                  <input 
                                      type="number"
                                      value={formData.days}
                                      onChange={e => setFormData({...formData, days: e.target.value})}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                                      placeholder="Days"
                                      min="1"
                                  />
                              </div>
                              <div>
                                  <label className="sr-only">Est. Total Km</label>
                                  <input 
                                      type="number"
                                      value={formData.tripType === 'Local' ? formData.estKm : formData.estTotalKm}
                                      onChange={e => setFormData({...formData, [formData.tripType === 'Local' ? 'estKm' : 'estTotalKm']: e.target.value})}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                                      placeholder={formData.tripType === 'Local' ? "Est Km" : "Est. Total Km"}
                                      readOnly
                                  />
                              </div>
                              {formData.tripType === 'Outstation' && formData.outstationSubType === 'RoundTrip' ? (
                                  <div>
                                      <label className="sr-only">Nights</label>
                                      <input
                                          type="number"
                                          value={formData.nights}
                                          onChange={e => setFormData({...formData, nights: e.target.value})}
                                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                                          placeholder="Nights"
                                          min="0"
                                      />
                                  </div>
                              ) : (formData.tripType === 'Local' ? (
                                <div>
                                    <label className="sr-only">Wait Mins</label>
                                    <input 
                                        type="number"
                                        value={formData.waitMins}
                                        onChange={e => setFormData({...formData, waitMins: e.target.value})}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Wait Mins"
                                    />
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-gray-400 text-xs italic">
                                    No Nights
                                </div>
                              ))}
                          </div>
                      )}


                      {/* Current Rules Display for the form */}
                      {currentRulesMessage && (
                          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-medium">{currentRulesMessage}</span>
                          </div>
                      )}
                  </div>
              </div>

              <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Requirement Details</label>
                  <textarea 
                      rows={3}
                      value={formData.requirementDetails}
                      onChange={e => setFormData({...formData, requirementDetails: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter specific requirements..."
                  />
              </div>

              {/* Assignment & Schedule Section */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h4 className="font-bold text-gray-700 text-xs uppercase mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4"/> Assignment & Actions
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corporate</label>
                          <select 
                              value={formData.assignCorporate}
                              onChange={e => setFormData({...formData, assignCorporate: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                              disabled={!isSuperAdmin}
                          >
                              <option value="">Head Office</option>
                              {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Branch</label>
                          <select 
                              value={formData.assignBranch}
                              onChange={e => setFormData({...formData, assignBranch: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">All Branches</option>
                              {availableBranchesForForm.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Select Staff</label>
                          <select 
                              value={formData.assignStaff}
                              onChange={e => setFormData({...formData, assignStaff: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">Select Staff</option>
                              {availableStaffForForm.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Follow-up Date</label>
                          <input 
                              type="date" 
                              value={formData.followUpDate}
                              onChange={e => setFormData({...formData, followUpDate: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Time</label>
                          <input 
                              type="time" 
                              value={formData.followUpTime}
                              onChange={e => setFormData({...formData, followUpTime: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => handleSave('Schedule')}
                          className="flex-1 py-2.5 bg-white border border-orange-200 text-orange-600 font-bold rounded-lg text-sm hover:bg-orange-50 flex items-center justify-center gap-2 transition-colors"
                      >
                          <Calendar className="w-4 h-4" /> Schedule
                      </button>
                      <button 
                          onClick={() => handleSave('Save')}
                          className="flex-1 py-2.5 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"
                      >
                          <Save className="w-4 h-4" /> Save Enquiry
                      </button>
                      <button 
                          onClick={() => handleSave('Book')}
                          className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
                      >
                          <CheckCircle className="w-4 h-4" /> Book Now
                      </button>
                  </div>
              </div>
          </div>

          {/* RIGHT: ESTIMATE & MESSAGE */}
          <div className="lg:col-span-1 space-y-6">
              {/* Estimated Cost Card */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                  <div className="relative z-10">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Estimated Cost</p>
                      <h3 className="text-5xl font-bold mb-4">₹{estimate}</h3>
                      <div className="border-t border-slate-700 pt-4 text-xs text-slate-400 space-y-1">
                          <p>Includes basic fare calculations.</p>
                          <p>Tolls & Parking extra.</p>
                      </div>
                  </div>
                  {/* Decorative Keypad Graphic */}
                  <div className="absolute bottom-4 right-4 opacity-10">
                      <div className="grid grid-cols-3 gap-1">
                          {[1,2,3,4,5,6,7,8,9].map(n => <div key={n} className="w-2 h-2 bg-white rounded-full"></div>)}
                      </div>
                  </div>
              </div>

              {/* Generated Message */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-emerald-500" /> Generated Message
                      </h4>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(generatedMessage); alert('Copied!');}}
                        className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                      >
                          <Copy className="w-3 h-3" /> Copy
                      </button>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed h-64 overflow-y-auto custom-scrollbar">
                      {generatedMessage}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                        onClick={handleWhatsApp}
                        className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                      <button className="py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
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