
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Download, X, Save,
  User, Car, MapPin, DollarSign, Trash2, Edit2, 
  PieChart as PieChartIcon, TrendingUp, Building2, RefreshCcw, Calculator, Filter,
  Loader2, AlertTriangle, ReceiptIndianRupee, Printer
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import Autocomplete from '../../components/Autocomplete';
import { Trip } from '../../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const TripEarning: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  const [trips, setTrips] = useState<Trip[]>(() => {
    if (isSuperAdmin) {
        let allTrips: Trip[] = [];
        
        try {
            const adminData = JSON.parse(localStorage.getItem('trips_data') || '[]');
            allTrips = [...allTrips, ...adminData.map((t: any) => ({...t, ownerId: 'admin', ownerName: 'Head Office'}))];
        } catch(e) {}

        try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((c: any) => {
                const cData = localStorage.getItem(`trips_data_${c.email}`);
                if (cData) {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((t: any) => ({...t, ownerId: c.email, ownerName: c.companyName}));
                    allTrips = [...allTrips, ...tagged];
                }
            });
        } catch(e) {}
        
        return allTrips;
    } else {
        const key = `trips_data_${sessionId}`;
        try {
            const saved = localStorage.getItem(key);
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.map((t: any) => ({...t, ownerId: sessionId, ownerName: 'My Branch'}));
        } catch (e) { return []; }
    }
  });

  const [allBranches, setAllBranches] = useState<any[]>([]); 
  const [corporates, setCorporates] = useState<any[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [corporateFilter, setCorporateFilter] = useState('All');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('All');
  const [transportTypeFilter, setTransportTypeFilter] = useState('All');
  const [tripCategoryFilter, setTripCategoryFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Map state
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Financial Calc State
  const [taxPercentage, setTaxPercentage] = useState<string>('5'); 
  const [adminCommissionPercentage, setAdminCommissionPercentage] = useState<string>('10'); 

  const initialFormState = {
    ownerId: isSuperAdmin ? 'admin' : sessionId,
    branch: '',
    tripId: '',
    date: new Date().toISOString().split('T')[0],
    bookingType: 'Online',
    transportType: 'Sedan',
    tripCategory: 'Local',
    bookingStatus: 'Confirmed',
    cancelBy: '',
    userName: '',
    userMobile: '',
    driverName: '',
    driverMobile: '',
    pickup: '', // Added Pickup
    tripPrice: 0,
    adminCommission: 0,
    tax: 0,
    waitingCharge: 0,
    discount: 0,
    cancellationCharge: 0,
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

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
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Error: Billing not enabled.");
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
        script.onerror = () => setMapError("Network error.");
        document.head.appendChild(script);
    } else {
        script.addEventListener('load', () => {
          if (window.google && window.google.maps && window.google.maps.places) setIsMapReady(true);
        });
        if (window.google && window.google.maps && window.google.maps.places) setIsMapReady(true);
    }
  }, []);

  // Load Branches and Corporates
  useEffect(() => {
    try {
      const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporates(corps);

      let loadedBranches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          loadedBranches = [...adminBranches.map((b: any) => ({...b, owner: 'admin', ownerName: 'Head Office'}))]; 
          
          corps.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             loadedBranches = [...loadedBranches, ...cBranches.map((b: any) => ({...b, owner: c.email, ownerName: c.companyName}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              const parsed = JSON.parse(saved);
              loadedBranches = parsed.map((b: any) => ({...b, owner: sessionId}));
          }
      }
      if (!isSuperAdmin) {
          loadedBranches = loadedBranches.filter(b => b.owner === sessionId);
      }
      setAllBranches(loadedBranches);
    } catch (e) {}
  }, [isSuperAdmin, sessionId]);

  // Sync Trips to Storage
  useEffect(() => {
    if (isSuperAdmin) {
        // 1. Save Head Office Trips
        const headOfficeTrips = trips.filter(t => t.ownerId === 'admin');
        const cleanAdminTrips = headOfficeTrips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem('trips_data', JSON.stringify(cleanAdminTrips));

        // 2. Save Corporate Trips (Distribute updates/deletes)
        if (corporates.length > 0) {
            corporates.forEach((corp: any) => {
                const corpTrips = trips.filter(t => t.ownerId === corp.email);
                const cleanCorpTrips = corpTrips.map(({ownerId, ownerName, ...rest}) => rest);
                localStorage.setItem(`trips_data_${corp.email}`, JSON.stringify(cleanCorpTrips));
            });
        }
    } else {
        const key = `trips_data_${sessionId}`;
        const cleanTrips = trips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(cleanTrips));
    }
  }, [trips, isSuperAdmin, sessionId, corporates]);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch = 
        t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.userName && t.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.userMobile && t.userMobile.includes(searchTerm));
      
      const matchesStatus = statusFilter === 'All' || t.bookingStatus === statusFilter;
      const matchesBranch = branchFilter === 'All' || (t.branch && t.branch === branchFilter);
      const matchesCorporate = corporateFilter === 'All' || (t.ownerId === corporateFilter);
      
      const matchesBookingType = bookingTypeFilter === 'All' || t.bookingType === bookingTypeFilter;
      const matchesTransportType = transportTypeFilter === 'All' || t.transportType === transportTypeFilter;
      const matchesTripCategory = tripCategoryFilter === 'All' || t.tripCategory === tripCategoryFilter;

      const tripDate = t.date;
      let matchesDate = true;
      if (fromDate && toDate) {
        matchesDate = tripDate >= fromDate && tripDate <= toDate;
      } else if (fromDate) {
        matchesDate = tripDate >= fromDate;
      } else if (toDate) {
        matchesDate = tripDate <= toDate;
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesCorporate && matchesBookingType && matchesTransportType && matchesTripCategory && matchesDate;
    });
  }, [trips, searchTerm, statusFilter, branchFilter, corporateFilter, bookingTypeFilter, transportTypeFilter, tripCategoryFilter, fromDate, toDate]);

  // --- Chart Data Logic ---
  const bookingTypeData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTrips.forEach(t => { counts[t.bookingType] = (counts[t.bookingType] || 0) + 1; });
      return Object.keys(counts).map((key, idx) => ({ name: key, value: counts[key], color: COLORS[idx % COLORS.length] }));
  }, [filteredTrips]);

  const transportTypeData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTrips.forEach(t => { counts[t.transportType] = (counts[t.transportType] || 0) + 1; });
      return Object.keys(counts).map((key, idx) => ({ name: key, value: counts[key], color: COLORS[idx % COLORS.length] }));
  }, [filteredTrips]);

  const tripCategoryData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTrips.forEach(t => { counts[t.tripCategory] = (counts[t.tripCategory] || 0) + 1; });
      return Object.keys(counts).map((key, idx) => ({ name: key, value: counts[key], color: COLORS[idx % COLORS.length] }));
  }, [filteredTrips]);

  const commissionData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTrips.forEach(t => { 
          counts[t.tripCategory] = (counts[t.tripCategory] || 0) + (t.adminCommission || 0); 
      });
      return Object.keys(counts).map((key, idx) => ({ 
          name: key, 
          value: counts[key], 
          color: COLORS[idx % COLORS.length] 
      }));
  }, [filteredTrips]);


  const totalPrice = useMemo(() => {
    const price = Number(formData.tripPrice) || 0;
    const tax = Number(formData.tax) || 0;
    const waiting = Number(formData.waitingCharge) || 0;
    const cancel = Number(formData.cancellationCharge) || 0;
    const discount = Number(formData.discount) || 0;
    return price + tax + waiting + cancel - discount; 
  }, [formData]);

  // Auto-calculate Admin Commission
  useEffect(() => {
    const price = Number(formData.tripPrice) || 0;
    const waiting = Number(formData.waitingCharge) || 0;
    const cancel = Number(formData.cancellationCharge) || 0;
    const percent = parseFloat(adminCommissionPercentage) || 0;
    
    // Formula: X% of (Trip + Wait) + 100% of Cancel
    const commission = ((price + waiting) * (percent / 100)) + cancel;
    
    setFormData(prev => {
        if (prev.adminCommission === commission) return prev;
        return { ...prev, adminCommission: commission };
    });
  }, [formData.tripPrice, formData.waitingCharge, formData.cancellationCharge, adminCommissionPercentage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formAvailableBranches = useMemo(() => {
      const targetOwner = formData.ownerId;
      return allBranches.filter(b => b.owner === targetOwner);
  }, [allBranches, formData.ownerId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tripId || !formData.date) {
      alert("Please fill required fields (*)");
      return;
    }

    let ownerName = 'My Branch';
    if (isSuperAdmin) {
        if (formData.ownerId === 'admin') ownerName = 'Head Office';
        else {
            const corp = corporates.find(c => c.email === formData.ownerId);
            ownerName = corp ? corp.companyName : 'Corporate';
        }
    }

    const tripData: Trip = {
      id: editingId || Date.now().toString(),
      ...formData,
      tripPrice: Number(formData.tripPrice),
      adminCommission: Number(formData.adminCommission),
      tax: Number(formData.tax),
      waitingCharge: Number(formData.waitingCharge),
      discount: Number(formData.discount),
      cancellationCharge: Number(formData.cancellationCharge),
      totalPrice: totalPrice,
      ownerId: formData.ownerId, 
      ownerName: ownerName
    };

    if (editingId) {
      setTrips(prev => prev.map(t => t.id === editingId ? { ...t, ...tripData } : t));
    } else {
      setTrips(prev => [tripData, ...prev]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setTaxPercentage('5');
    setAdminCommissionPercentage('10');
  };

  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    const impliedTax = (trip.tax && trip.tripPrice) ? ((trip.tax / trip.tripPrice) * 100).toFixed(2) : '5';
    setTaxPercentage(parseFloat(impliedTax).toString());

    // Calculate implied commission percentage
    const baseForComm = (trip.tripPrice || 0) + (trip.waitingCharge || 0);
    const commFromBase = (trip.adminCommission || 0) - (trip.cancellationCharge || 0);
    const impliedCommPercent = baseForComm > 0 ? (commFromBase / baseForComm) * 100 : 10;
    setAdminCommissionPercentage(impliedCommPercent.toFixed(2));

    setFormData({
      ownerId: trip.ownerId || 'admin',
      branch: trip.branch,
      tripId: trip.tripId,
      date: trip.date,
      bookingType: trip.bookingType,
      transportType: trip.transportType,
      tripCategory: trip.tripCategory,
      bookingStatus: trip.bookingStatus,
      cancelBy: trip.cancelBy || '',
      userName: trip.userName || '',
      userMobile: trip.userMobile || '',
      driverName: trip.driverName || '',
      driverMobile: trip.driverMobile || '',
      pickup: trip.pickup || '',
      tripPrice: trip.tripPrice,
      adminCommission: trip.adminCommission,
      tax: trip.tax,
      waitingCharge: trip.waitingCharge,
      discount: trip.discount,
      cancellationCharge: trip.cancellationCharge,
      remarks: trip.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this trip record?")) {
      setTrips(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setStatusFilter('All');
      setBranchFilter('All');
      setCorporateFilter('All');
      setBookingTypeFilter('All');
      setTransportTypeFilter('All');
      setTripCategoryFilter('All');
      setFromDate('');
      setToDate('');
  };

  const handleExport = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export.");
      return;
    }
    const headers = ["Trip ID", "Date", "Owner", "Branch", "Booking Type", "Customer", "Driver", "Transport", "Comm %", "Comm Amt", "Total", "Status"];
    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };
    const rows = filteredTrips.map(t => {
        // Calculate Comm % for Export
        const base = (t.tripPrice || 0) + (t.waitingCharge || 0);
        const commBase = (t.adminCommission || 0) - (t.cancellationCharge || 0);
        const percent = base > 0 ? (commBase / base) * 100 : 0;
        
        return [
            t.tripId, t.date, t.ownerName || '-', t.branch, t.bookingType, t.userName, t.driverName || '-', 
            `${t.tripCategory} - ${t.transportType}`, `${percent.toFixed(1)}%`, t.adminCommission, t.totalPrice, t.bookingStatus
        ].map(escapeCsv);
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trips_earning_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ReceiptIndianRupee className="w-8 h-8 text-emerald-600" /> Trip Earning
          </h2>
          <p className="text-gray-500">
             Financial analytics and booking management
          </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" /> New Trip Entry
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Search Trip ID, Name or Mobile..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showFilters ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                      <Filter className="w-4 h-4" /> Filters
                  </button>
                  <button 
                      onClick={handleExport}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                  >
                      <Download className="w-4 h-4" /> Export CSV
                  </button>
                  <button 
                      onClick={handlePrint}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                  >
                      <Printer className="w-4 h-4" /> Print / PDF
                  </button>
              </div>
          </div>
          
          {showFilters && (
             <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2">
                 
                 {isSuperAdmin && (
                     <select 
                        value={corporateFilter}
                        onChange={(e) => setCorporateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
                     >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporates.map((c: any) => (
                           <option key={c.email} value={c.email}>{c.companyName}</option>
                        ))}
                     </select>
                 )}

                 <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                 >
                    <option value="All">All Branches</option>
                    {Array.from(new Set(allBranches.map((b: any) => b.name))).map((name: string) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                 </select>

                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px]"
                 >
                    <option value="All">All Status</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Pending">Pending</option>
                 </select>

                 <select 
                    value={bookingTypeFilter}
                    onChange={(e) => setBookingTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                 >
                    <option value="All">All Booking Types</option>
                    {Array.from(new Set(trips.map(t => t.bookingType))).map((type: string) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                 </select>

                 <select 
                    value={transportTypeFilter}
                    onChange={(e) => setTransportTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                 >
                    <option value="All">All Transport Types</option>
                    {Array.from(new Set(trips.map(t => t.transportType))).map((type: string) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                 </select>

                 <select 
                    value={tripCategoryFilter}
                    onChange={(e) => setTripCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                 >
                    <option value="All">All Trip Categories</option>
                    {Array.from(new Set(trips.map(t => t.tripCategory))).map((category: string) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                 </select>
                 
                 <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-500 font-medium">From:</span>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="text-sm outline-none bg-transparent text-gray-700" />
                 </div>

                 <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-500 font-medium">To:</span>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="text-sm outline-none bg-transparent text-gray-700" />
                 </div>

                 <button onClick={handleResetFilters} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ml-auto">
                    <RefreshCcw className="w-4 h-4" /> Reset
                 </button>
             </div>
          )}
      </div>


      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Total Trips</p>
           <h3 className="text-2xl font-bold text-gray-800">{filteredTrips.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
           <h3 className="text-2xl font-bold text-emerald-600">₹{filteredTrips.reduce((sum, t) => sum + t.totalPrice, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
           <h3 className="text-2xl font-bold text-blue-600">{filteredTrips.filter(t => t.bookingStatus === 'Completed').length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Cancelled</p>
           <h3 className="text-2xl font-bold text-red-600">{filteredTrips.filter(t => t.bookingStatus === 'Cancelled').length}</h3>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-blue-500" /> Booking Type
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={bookingTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {bookingTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-red-500" /> Transport Type
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={transportTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {transportTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" /> Trip Category
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={tripCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {tripCategoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" /> Admin Commission
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={commissionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {commissionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₹${value.toFixed(0)}`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                 <tr>
                    <th className="px-6 py-4">Trip ID / Date</th>
                    {isSuperAdmin && <th className="px-6 py-4">Agency / Corporate</th>}
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Booking Type</th>
                    <th className="px-6 py-4">Transport</th>
                    <th className="px-6 py-4 text-right">Comm %</th>
                    <th className="px-6 py-4 text-right">Comm Amt</th>
                    <th className="px-6 py-4 text-right">Total Price</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {filteredTrips.map(trip => {
                    // Calculate percentage for display
                    const baseForComm = (trip.tripPrice || 0) + (trip.waitingCharge || 0);
                    const commAmt = (trip.adminCommission || 0) - (trip.cancellationCharge || 0);
                    const commPercent = baseForComm > 0 ? (commAmt / baseForComm) * 100 : 0;

                    return (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{trip.tripId}</div>
                          <div className="text-xs text-gray-500">{trip.date}</div>
                       </td>
                       {isSuperAdmin && (
                           <td className="px-6 py-4">
                               <div className="flex items-center gap-1.5">
                                   <Building2 className="w-3 h-3 text-indigo-500" />
                                   <span className="text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                       {trip.ownerName || 'Head Office'}
                                   </span>
                               </div>
                           </td>
                       )}
                       <td className="px-6 py-4 text-gray-600">{trip.branch}</td>
                       <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{trip.userName || '-'}</div>
                          <div className="text-xs text-gray-500">{trip.userMobile || '-'}</div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-gray-700 text-xs font-semibold bg-gray-100 px-2 py-1 rounded">
                             {trip.bookingType}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                             {trip.tripCategory} • {trip.transportType}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right text-gray-500 text-xs">
                          {commPercent.toFixed(1)}%
                       </td>
                       <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                          ₹{trip.adminCommission.toFixed(0)}
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="font-bold text-gray-900">₹{trip.totalPrice.toLocaleString()}</div>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                             trip.bookingStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                             trip.bookingStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                             'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                             {trip.bookingStatus}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleEdit(trip)} className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50"><Edit2 className="w-4 h-4"/></button>
                             <button onClick={() => handleDelete(trip.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       </td>
                    </tr>
                 )})}
                 {filteredTrips.length === 0 && (
                    <tr>
                       <td colSpan={isSuperAdmin ? 11 : 10} className="text-center py-12 text-gray-500 bg-gray-50">
                          <div className="flex flex-col items-center">
                              <Search className="w-10 h-10 text-gray-300 mb-2" />
                              <p>No trips found matching the selected filters.</p>
                          </div>
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Trip' : 'New Trip Entry'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Trip Basic Info */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> Trip Info</h4>
                       
                       {/* Super Admin: Select Owner first */}
                       {isSuperAdmin && (
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to (Corporate/HO)</label>
                               <select 
                                   name="ownerId" 
                                   value={formData.ownerId} 
                                   onChange={(e) => setFormData({...formData, ownerId: e.target.value, branch: ''})} 
                                   className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                               >
                                   <option value="admin">Head Office</option>
                                   {corporates.map((c: any) => (
                                       <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                                   ))}
                               </select>
                           </div>
                       )}

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                          <select 
                              name="branch" 
                              value={formData.branch} 
                              onChange={handleInputChange} 
                              className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                          >
                             <option value="">Select Branch</option>
                             {formAvailableBranches.map((b: any) => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                             ))}
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip ID *</label>
                             <input 
                                type="text" 
                                name="tripId" 
                                value={formData.tripId} 
                                onChange={handleInputChange} 
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm font-mono focus:ring-2 focus:ring-emerald-500" 
                                placeholder="Enter ID"
                                required 
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date *</label>
                             <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" required />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Booking Type *</label>
                             <select name="bookingType" value={formData.bookingType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Online</option>
                                <option>Offline</option>
                                <option>Call</option>
                                <option>WhatsApp</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transport Type *</label>
                             <select name="transportType" value={formData.transportType} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Sedan</option>
                                <option>SUV</option>
                                <option>Van</option>
                                <option>Mini Bus</option>
                             </select>
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip Category *</label>
                          <select name="tripCategory" value={formData.tripCategory} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                             <option>Local</option>
                             <option>Rental</option>
                             <option>Outstation</option>
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status *</label>
                             <select name="bookingStatus" value={formData.bookingStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                                <option>Pending</option>
                                <option>Confirmed</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancel By</label>
                             <select 
                               name="cancelBy" 
                               value={formData.cancelBy} 
                               onChange={handleInputChange} 
                               className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                               disabled={formData.bookingStatus !== 'Cancelled'}
                             >
                                <option value="">-</option>
                                <option>Head Office Admin</option>
                                <option>Branch Admin</option>
                                <option>User</option>
                                <option>Driver</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    {/* Column 2: People Info */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User className="w-4 h-4 text-blue-500"/> People</h4>
                       
                       <div className="space-y-3">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Name *</label>
                             <input type="text" name="userName" value={formData.userName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="Customer Name" required />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Mobile *</label>
                             <input type="tel" name="userMobile" value={formData.userMobile} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="+91..." required />
                          </div>
                          {/* Pickup Location - Added to Form */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Location</label>
                              {!isMapReady ? (
                                <div className="p-2 bg-gray-100 text-gray-500 text-sm rounded flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Map Loading...
                                </div>
                              ) : (
                                <Autocomplete 
                                    placeholder="Search Pickup Location"
                                    onAddressSelect={(addr) => setFormData(prev => ({ ...prev, pickup: addr }))}
                                    defaultValue={formData.pickup}
                                />
                              )}
                              {mapError && <p className="text-xs text-red-500 mt-1">{mapError}</p>}
                          </div>
                       </div>

                       <div className="pt-2 space-y-3">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Name</label>
                             <input type="text" name="driverName" value={formData.driverName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="Driver Name" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Driver Mobile</label>
                             <input type="tel" name="driverMobile" value={formData.driverMobile} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="+91..." />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                          <textarea name="remarks" rows={3} value={formData.remarks} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm resize-none" placeholder="Any special notes..." />
                       </div>
                    </div>

                    {/* Column 3: Financials */}
                    <div className="space-y-4 md:col-span-2">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-purple-500"/> Financials</h4>
                       
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{formData.bookingStatus === 'Cancelled' ? 'Cancellation Fee (Trip Price Field)' : 'Trip Price (₹) *'}</label>
                              <input type="number" name="tripPrice" value={formData.tripPrice || ''} onChange={(e) => {
                                  const price = parseFloat(e.target.value) || 0;
                                  // Only auto-calc tax if NOT cancelled
                                  const taxAmt = formData.bookingStatus !== 'Cancelled' ? (price * parseFloat(taxPercentage)) / 100 : 0;
                                  setFormData(prev => ({ ...prev, tripPrice: price, tax: taxAmt }));
                              }} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm font-medium" placeholder="0" />
                           </div>

                           {/* Conditional Rendering based on Status */}
                           {formData.bookingStatus !== 'Cancelled' && (
                               <>
                               <div>
                                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax %</label>
                                     <input 
                                         type="number" 
                                         value={taxPercentage} 
                                         onChange={(e) => {
                                             const percent = parseFloat(e.target.value) || 0;
                                             setTaxPercentage(e.target.value);
                                             const taxAmt = (formData.tripPrice * percent) / 100;
                                             setFormData(prev => ({ ...prev, tax: taxAmt }));
                                         }}
                                         className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500" 
                                         placeholder="%" 
                                     />
                                  </div>
                                  <div>
                                     <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax Amt</label>
                                     <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                        <input 
                                            type="number" 
                                            name="tax" 
                                            value={formData.tax || ''} 
                                            readOnly 
                                            className="w-full pl-5 p-2 border border-gray-300 rounded-lg outline-none text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500" 
                                            placeholder="0" 
                                        />
                                     </div>
                                  </div>
                               </>
                           )}
                           
                           {/* Fields visible when Cancelled */}
                           {formData.bookingStatus === 'Cancelled' && (
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancellation Charge (Addt'l)</label>
                                   <input type="number" name="cancellationCharge" value={formData.cancellationCharge || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0" />
                               </div>
                           )}

                           {formData.bookingStatus !== 'Cancelled' && (
                               <>
                               <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waiting Chg.</label>
                                 <input type="number" name="waitingCharge" value={formData.waitingCharge || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0" />
                               </div>
                               <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancel Chg.</label>
                                 <input type="number" name="cancellationCharge" value={formData.cancellationCharge || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0" />
                               </div>
                               <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount</label>
                                  <input type="number" name="discount" value={formData.discount || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm text-red-600" placeholder="0" />
                               </div>
                               </>
                           )}
                       </div>

                       <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2">
                          <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Total Price</label>
                          <div className="text-2xl font-bold text-emerald-600">
                              ₹{(
                                  (Number(formData.tripPrice) || 0) + 
                                  (Number(formData.tax) || 0) + 
                                  (Number(formData.waitingCharge) || 0) + 
                                  (Number(formData.cancellationCharge) || 0) - 
                                  (Number(formData.discount) || 0)
                              ).toFixed(2)}
                          </div>
                          <p className="text-[10px] text-emerald-600 mt-1">Trip + Tax + Wait + Cancel - Disc</p>
                       </div>

                       {formData.bookingStatus !== 'Cancelled' && (
                           <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                              <div>
                                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Admin Comm %</label>
                                 <input 
                                     type="number" 
                                     value={adminCommissionPercentage} 
                                     onChange={(e) => setAdminCommissionPercentage(e.target.value)}
                                     className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500" 
                                     placeholder="%" 
                                 />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Admin Comm Amt</label>
                                 <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                    <input 
                                        type="number" 
                                        name="adminCommission" 
                                        value={formData.adminCommission || ''} 
                                        readOnly 
                                        className="w-full pl-5 p-2 border border-gray-300 rounded-lg outline-none text-sm bg-gray-100 text-gray-600 font-medium cursor-not-allowed" 
                                        placeholder="0" 
                                    />
                                 </div>
                              </div>
                           </div>
                       )}
                       
                       {formData.bookingStatus === 'Cancelled' && (
                           <div className="mt-2 text-xs text-gray-500 italic">
                               * Admin Commission is 100% of Total Cancellation Fee.
                           </div>
                       )}
                       
                       <p className="text-[10px] text-gray-400 mt-1">Calculated on (Trip + Wait) + Cancel</p>
                    </div>
                 </div>

                 {mapError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 mt-4 text-sm border border-red-200">
                        <AlertTriangle className="w-4 h-4" /> {mapError}
                    </div>
                 )}

                 <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2">
                       <Save className="w-4 h-4" /> Save Trip
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TripEarning;
