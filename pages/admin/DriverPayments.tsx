
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Filter, Download, Car, 
  MapPin, Tag, IndianRupee, Save, X, Calendar, 
  User, Phone, Truck, CheckCircle, Clock, Settings, Edit2, AlertCircle, Building2, Trash2, RefreshCcw, 
  CreditCard, Upload, Loader2, Link as LinkIcon
} from 'lucide-react';
import { DriverPayment, CorporateAccount } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService';

const DriverPayments: React.FC = () => {
  // 1. Identify Current User Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State for Context (Super Admin can switch views) ---
  // Default to 'admin' (Head Office) or the specific user's ID
  const [viewContext, setViewContext] = useState<string>(sessionId); 
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);

  // 2. State for Data
  const [payments, setPayments] = useState<DriverPayment[]>([]);

  // 3. State for Settings (Rules)
  const [showSettings, setShowSettings] = useState(false);
  const [rules, setRules] = useState({
    freeKm: 5,
    ratePerKm: 10,
    maxDistanceCap: 15,
    promoMaxCap: 500
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Date Filtering State
  const [filterDateType, setFilterDateType] = useState<'All' | 'Date' | 'Month'>('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    driverName: '',
    driverPhoneNumber: '',
    vehicleNumber: '',
    orderId: '', // Added Order ID
    paymentType: 'Empty Trip Payment' as 'Empty Trip Payment' | 'Promo Code Payment',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid' as 'Paid' | 'Pending',
    paymentMode: 'Cash' as 'Cash' | 'UPI' | 'Online' | 'OK BOZ Wallet', // Default Payment Mode
    receiptUrl: '',
    remarks: '',
    pickupDistanceKm: '',
    promoCodeName: '',
    promoDiscountType: 'Flat Amount' as 'Flat Amount' | 'Percentage', // Defaulting to Flat Amount
    promoDiscountValue: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [calculatedPaidKm, setCalculatedPaidKm] = useState(0);
  const [isCapApplied, setIsCapApplied] = useState(false);

  // --- Load Initial Resources (Corporates) ---
  useEffect(() => {
    if (isSuperAdmin) {
        try {
            const savedCorps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(savedCorps);
        } catch (e) { console.error("Error loading corporates", e); }
    }
  }, [isSuperAdmin]);

  // --- Load Data & Rules based on View Context ---
  useEffect(() => {
      const loadDataAndRules = () => {
          let loadedPayments: DriverPayment[] = [];
          
          if (viewContext === 'All') {
              // AGGREGATE MODE (Super Admin Only)
              // 1. Head Office
              const adminData = JSON.parse(localStorage.getItem('driver_payments_data') || '[]');
              loadedPayments = [...adminData];
              
              // 2. All Corporates
              corporates.forEach(corp => {
                  const corpData = JSON.parse(localStorage.getItem(`driver_payments_data_${corp.email}`) || '[]');
                  loadedPayments = [...loadedPayments, ...corpData];
              });

              // In 'All' mode, we can't really edit rules meaningfully, so we might use default or disable the button
              setRules({ freeKm: 5, ratePerKm: 10, maxDistanceCap: 15, promoMaxCap: 500 });
          } else {
              // SPECIFIC CONTEXT MODE
              const dataKey = viewContext === 'admin' ? 'driver_payments_data' : `driver_payments_data_${viewContext}`;
              const settingsKey = viewContext === 'admin' ? 'driver_payment_settings' : `driver_payment_settings_${viewContext}`;

              // Load Payments
              loadedPayments = JSON.parse(localStorage.getItem(dataKey) || '[]');
              
              // Load Rules
              const savedRules = localStorage.getItem(settingsKey);
              if (savedRules) {
                  setRules(JSON.parse(savedRules));
              } else {
                  // Defaults
                  setRules({ freeKm: 5, ratePerKm: 10, maxDistanceCap: 15, promoMaxCap: 500 });
              }
          }
          
          setPayments(loadedPayments);
      };

      loadDataAndRules();
  }, [viewContext, corporates]); // Re-run when context switches or corporate list loads

  // --- Save Data (CRUD) ---
  const saveData = (newPayments: DriverPayment[]) => {
      const targetContext = viewContext === 'All' ? 'admin' : viewContext;
      const dataKey = targetContext === 'admin' ? 'driver_payments_data' : `driver_payments_data_${targetContext}`;
      
      localStorage.setItem(dataKey, JSON.stringify(newPayments));
      setPayments(newPayments);
  };

  // --- Save Rules ---
  const saveRules = (newRules: typeof rules) => {
      if (viewContext === 'All') return; // Cannot save rules for 'All'
      const settingsKey = viewContext === 'admin' ? 'driver_payment_settings' : `driver_payment_settings_${viewContext}`;
      localStorage.setItem(settingsKey, JSON.stringify(newRules));
      setRules(newRules);
  };

  // --- Dynamic Calculation Logic ---
  useEffect(() => {
    let amt = 0;
    let paidKm = 0;
    let capHit = false;

    if (formData.paymentType === 'Empty Trip Payment') {
      const dist = parseFloat(formData.pickupDistanceKm) || 0;
      const chargeableDist = Math.max(0, dist - rules.freeKm);
      paidKm = Math.min(chargeableDist, rules.maxDistanceCap);
      amt = paidKm * rules.ratePerKm;
    } else {
      // Promo Code Logic - ALWAYS FLAT AMOUNT
      const discountVal = parseFloat(formData.promoDiscountValue) || 0;
      
      // Fixed to Flat Amount logic
      amt = discountVal;

      if (rules.promoMaxCap && rules.promoMaxCap > 0 && amt > rules.promoMaxCap) {
          amt = rules.promoMaxCap;
          capHit = true;
      }
    }
    
    setCalculatedPaidKm(parseFloat(paidKm.toFixed(2)));
    setCalculatedAmount(Math.round(amt));
    setIsCapApplied(capHit);
  }, [formData, rules]);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newRules = { ...rules, [name]: parseFloat(value) || 0 };
    saveRules(newRules); // Auto-save rules on change
  };

  const handleEdit = (payment: DriverPayment) => {
      setEditingId(payment.id);
      setFormData({
          driverName: payment.driverName,
          driverPhoneNumber: payment.driverPhoneNumber,
          vehicleNumber: payment.vehicleNumber,
          orderId: payment.orderId || '',
          paymentType: payment.paymentType,
          paymentDate: payment.paymentDate,
          paymentStatus: payment.paymentStatus,
          paymentMode: payment.paymentMode as any || 'Cash',
          receiptUrl: payment.receiptUrl || '',
          remarks: payment.remarks || '',
          pickupDistanceKm: payment.details.pickupDistanceKm?.toString() || '',
          promoCodeName: payment.details.promoCodeName || '',
          promoDiscountType: 'Flat Amount', // Force Flat Amount
          promoDiscountValue: payment.details.promoDiscountValue?.toString() || ''
      });
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to delete this payment record?")) {
          const updated = payments.filter(p => p.id !== id);
          saveData(updated);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewContext === 'All') {
        alert("Please select a specific Franchise or Head Office to add/edit payments.");
        return;
    }

    // Validation: Driver Name and Order ID are Mandatory
    if (!formData.driverName || !formData.orderId) {
        alert("Please fill Driver Name and Order ID.");
        return;
    }

    // --- CHECK FOR DUPLICATE ORDER ID ---
    // Check if the order ID already exists in the current list, excluding the item currently being edited
    const isDuplicate = payments.some(p => 
        p.orderId && formData.orderId && 
        p.orderId.trim().toLowerCase() === formData.orderId.trim().toLowerCase() && 
        p.id !== editingId
    );

    if (isDuplicate) {
        alert(`WARNING: The Order/Trip ID "${formData.orderId}" is already used in a payment record. Please use a unique ID.`);
        return; // STOP execution of save
    }

    setIsUploading(true);
    let receiptUrl = formData.receiptUrl;

    // Handle File Upload if selected
    if (fileInputRef.current?.files?.[0]) {
        try {
            const file = fileInputRef.current.files[0];
            const path = `receipts/${formData.paymentDate}_${Date.now()}_${file.name}`;
            const cloudUrl = await uploadFileToCloud(file, path);
            
            if (cloudUrl) {
                receiptUrl = cloudUrl;
            } else {
                // Fallback to Base64 for local demo if cloud fails
                receiptUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }
        } catch (error) {
            console.error("Receipt upload failed", error);
        }
    }

    const newPayment: DriverPayment = {
      id: editingId || `PAY-${Date.now()}`,
      driverName: formData.driverName,
      driverPhoneNumber: formData.driverPhoneNumber,
      vehicleNumber: formData.vehicleNumber || 'N/A', // Default if optional
      orderId: formData.orderId,
      paymentType: formData.paymentType,
      amount: calculatedAmount,
      paymentDate: formData.paymentDate,
      paymentStatus: formData.paymentStatus,
      paymentMode: formData.paymentStatus === 'Paid' ? formData.paymentMode : undefined,
      receiptUrl: receiptUrl,
      remarks: formData.remarks + (isCapApplied ? ` (Capped at ₹${rules.promoMaxCap})` : ''),
      details: {
        pickupDistanceKm: parseFloat(formData.pickupDistanceKm) || 0,
        paidKm: calculatedPaidKm,
        promoCodeName: formData.promoCodeName,
        promoDiscountType: 'Flat Amount', // Force Flat Amount
        promoDiscountValue: parseFloat(formData.promoDiscountValue) || 0,
      },
      createdAt: editingId ? (payments.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editingId) {
        saveData(payments.map(p => p.id === editingId ? newPayment : p));
    } else {
        saveData([newPayment, ...payments]);
    }

    setIsUploading(false);
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setStatusFilter('All');
      setFilterDateType('All');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedMonth(new Date().toISOString().slice(0, 7));
  };

  // Filtered List
  const filteredPayments = payments.filter(p => {
      const matchesSearch = p.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.driverPhoneNumber.includes(searchTerm) || 
                            p.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.orderId && p.orderId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || p.paymentStatus === statusFilter;
      
      let matchesDate = true;
      if (filterDateType === 'Date') {
          matchesDate = p.paymentDate === selectedDate;
      } else if (filterDateType === 'Month') {
          matchesDate = p.paymentDate.startsWith(selectedMonth);
      }

      return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats
  const stats = useMemo(() => {
    // 1. Paid Totals (Breakdown)
    const emptyKmPaid = filteredPayments.filter(p => p.paymentType === 'Empty Trip Payment' && p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const promoPaid = filteredPayments.filter(p => p.paymentType === 'Promo Code Payment' && p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = emptyKmPaid + promoPaid;

    // 2. Pending Totals (Amount & Count)
    const pendingAmount = filteredPayments.filter(p => p.paymentStatus === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = filteredPayments.filter(p => p.paymentStatus === 'Pending').length;

    // 3. Grand Total (Total Pay = Paid + Pending)
    const totalPay = totalPaid + pendingAmount;

    return { emptyKmPaid, promoPaid, totalPaid, pendingAmount, pendingCount, totalPay };
  }, [filteredPayments]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Car className="w-8 h-8 text-emerald-600" /> Driver Payments
          </h2>
          <p className="text-gray-500">Manage empty kilometer compensations and promo code reimbursements</p>
        </div>
        
        <div className="flex gap-3">
            {/* View Context Selector for Super Admin */}
            {isSuperAdmin && (
                <div className="relative">
                    <select
                        value={viewContext}
                        onChange={(e) => { setViewContext(e.target.value); setShowSettings(false); }}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg font-medium outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm hover:bg-gray-50"
                    >
                        <option value="admin">Head Office (My Payments)</option>
                        <option value="All">All Franchises (View Only)</option>
                        {corporates.map(c => (
                            <option key={c.email} value={c.email}>{c.companyName}</option>
                        ))}
                    </select>
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            )}

            <button 
              onClick={() => setShowSettings(!showSettings)}
              disabled={viewContext === 'All'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${showSettings ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} ${viewContext === 'All' ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={viewContext === 'All' ? "Select a specific franchise to edit rules" : "Configure Rules"}
            >
                <Settings className="w-5 h-5" /> Rules
            </button>
            <button 
              onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData(initialFormState); }}
              disabled={viewContext === 'All'}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2 ${viewContext === 'All' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-5 h-5" /> Log Payment
            </button>
        </div>
      </div>

      {/* Settings Panel (Conditional Render) */}
      {showSettings && viewContext !== 'All' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> Configure Rules for: <span className="text-emerald-600">{isSuperAdmin ? (viewContext === 'admin' ? 'Head Office' : corporates.find(c => c.email === viewContext)?.companyName) : 'My Branch'}</span>
                  </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Empty Km Rules */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Free Limit (Km)</label>
                      <div className="relative">
                          <input 
                              type="number" 
                              name="freeKm"
                              value={rules.freeKm} 
                              onChange={handleRuleChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                          />
                          <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">KM</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Distance up to this limit is NOT paid.</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Payable Cap</label>
                      <div className="relative">
                          <input 
                              type="number" 
                              name="maxDistanceCap"
                              value={rules.maxDistanceCap} 
                              onChange={handleRuleChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                          />
                          <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">KM</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Max distance paid per trip.</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate Per Km</label>
                      <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                              type="number" 
                              name="ratePerKm"
                              value={rules.ratePerKm} 
                              onChange={handleRuleChange}
                              className="w-full pl-6 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600"
                          />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Amount paid for eligible km.</p>
                  </div>

                  {/* Promo Rules */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Promo Reimb.</label>
                      <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                              type="number" 
                              name="promoMaxCap"
                              value={rules.promoMaxCap || ''} 
                              onChange={handleRuleChange}
                              className="w-full pl-6 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none font-bold text-purple-700"
                              placeholder="No Limit"
                          />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Max payout cap for promo codes.</p>
                  </div>
              </div>
          </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Total Pay</p>
             <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalPay.toLocaleString()}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Paid + Pending</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p>
             <h3 className="text-2xl font-bold text-emerald-600">₹{stats.totalPaid.toLocaleString()}</h3>
             <p className="text-[10px] text-emerald-600/70 mt-1 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Settled</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Pending</p>
             <h3 className="text-2xl font-bold text-red-600">₹{stats.pendingAmount.toLocaleString()}</h3>
             <p className="text-[10px] text-red-400 mt-1">{stats.pendingCount} Requests</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Empty Km</p>
             <h3 className="text-2xl font-bold text-orange-600">₹{stats.emptyKmPaid.toLocaleString()}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Paid Only</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Promo</p>
             <h3 className="text-2xl font-bold text-purple-600">₹{stats.promoPaid.toLocaleString()}</h3>
             <p className="text-[10px] text-gray-400 mt-1">Paid Only</p>
          </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 justify-between bg-gray-50 items-center">
             <div className="relative flex-1 w-full xl:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search by driver, phone or vehicle..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
             </div>
             
             <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                 {/* Date Filter Controls */}
                 <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                    <button 
                        onClick={() => setFilterDateType('All')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterDateType === 'All' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Time
                    </button>
                    <button 
                        onClick={() => setFilterDateType('Date')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterDateType === 'Date' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Date
                    </button>
                    <button 
                        onClick={() => setFilterDateType('Month')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterDateType === 'Month' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Month
                    </button>
                 </div>
                 
                 {filterDateType === 'Date' && (
                     <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                     />
                 )}
                 
                 {filterDateType === 'Month' && (
                     <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                     />
                 )}

                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 >
                     <option value="All">All Status</option>
                     <option value="Paid">Paid</option>
                     <option value="Pending">Pending</option>
                 </select>
                 
                 <button onClick={handleResetFilters} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200" title="Reset Filters">
                    <RefreshCcw className="w-4 h-4" />
                 </button>
                 <button className="px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
                 </button>
             </div>
         </div>

         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                     <tr>
                         <th className="px-6 py-4">Date</th>
                         <th className="px-6 py-4">Driver Details</th>
                         <th className="px-6 py-4">Payment Type</th>
                         <th className="px-6 py-4">Details</th>
                         <th className="px-6 py-4">Amount</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Receipt</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {filteredPayments.map((p) => (
                         <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-4 text-gray-500">
                                 {new Date(p.paymentDate).toLocaleDateString()}
                             </td>
                             <td className="px-6 py-4">
                                 <div className="font-bold text-gray-900">{p.driverName}</div>
                                 <div className="text-xs text-gray-500">
                                     {p.vehicleNumber} • {p.driverPhoneNumber}
                                     {p.orderId && <span className="block text-indigo-600">Ref: {p.orderId}</span>}
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-xs font-bold border ${p.paymentType === 'Empty Trip Payment' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                     {p.paymentType === 'Empty Trip Payment' ? 'Empty Km' : 'Promo Code'}
                                 </span>
                             </td>
                             <td className="px-6 py-4 text-xs text-gray-600">
                                 {p.paymentType === 'Empty Trip Payment' ? (
                                     <>
                                        <div>Pickup Dist: {p.details.pickupDistanceKm} km</div>
                                        <div className="text-emerald-600 font-medium">Paid Dist: {p.details.paidKm} km</div>
                                     </>
                                 ) : (
                                     <>
                                        <div className="font-medium text-purple-700">{p.details.promoCodeName}</div>
                                        <div>Disc: ₹{p.details.promoDiscountValue}</div>
                                     </>
                                 )}
                                 {p.paymentMode && <div className="mt-1 text-gray-400 font-medium">Via: {p.paymentMode}</div>}
                             </td>
                             <td className="px-6 py-4 font-bold text-gray-900">
                                 ₹{p.amount.toLocaleString()}
                             </td>
                             <td className="px-6 py-4">
                                 {p.paymentStatus === 'Paid' ? (
                                     <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                         <CheckCircle className="w-3 h-3" /> Paid
                                     </span>
                                 ) : (
                                     <span className="flex items-center gap-1 text-amber-600 font-bold text-xs">
                                         <Clock className="w-3 h-3" /> Pending
                                     </span>
                                 )}
                             </td>
                             <td className="px-6 py-4">
                                  {p.receiptUrl ? (
                                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 text-xs">
                                          <LinkIcon className="w-3 h-3" /> View Receipt
                                      </a>
                                  ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                  )}
                             </td>
                             <td className="px-6 py-4 text-right">
                                {viewContext !== 'All' && (
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                                       <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                )}
                             </td>
                         </tr>
                     ))}
                     {filteredPayments.length === 0 && (
                         <tr><td colSpan={8} className="py-10 text-center text-gray-400">No payment records found.</td></tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* Log Payment Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Payment' : 'Log Driver Payment'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Driver Details */}
                      <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><User className="w-3 h-3"/> Driver Details</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                required
                                name="driverName"
                                value={formData.driverName}
                                onChange={handleInputChange}
                                placeholder="Driver Name" 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <input 
                                required
                                name="driverPhoneNumber"
                                value={formData.driverPhoneNumber}
                                onChange={handleInputChange}
                                placeholder="Phone Number" 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                name="vehicleNumber"
                                value={formData.vehicleNumber}
                                onChange={handleInputChange}
                                placeholder="Vehicle Number (Optional)" 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                              <input 
                                required
                                name="orderId"
                                value={formData.orderId}
                                onChange={handleInputChange}
                                placeholder="Order/Trip ID" 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                          </div>
                      </div>

                      {/* Payment Type Selection */}
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({...prev, paymentType: 'Empty Trip Payment'}))}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.paymentType === 'Empty Trip Payment' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                          >
                             Empty Km
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({...prev, paymentType: 'Promo Code Payment'}))}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.paymentType === 'Promo Code Payment' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                          >
                             Promo Code
                          </button>
                      </div>

                      {/* Conditional Fields */}
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                          {formData.paymentType === 'Empty Trip Payment' ? (
                              <>
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pickup Distance (Km)</label>
                                     <input 
                                        type="number" 
                                        name="pickupDistanceKm"
                                        value={formData.pickupDistanceKm}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 8" 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                     />
                                     
                                     {/* Dynamic Rule Summary */}
                                     <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100 flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                        <div>
                                            Current Rule: First <strong>{rules.freeKm}km</strong> free. 
                                            Paid up to <strong>{rules.maxDistanceCap}km</strong>. 
                                            Rate: <strong>₹{rules.ratePerKm}/km</strong>.
                                        </div>
                                     </div>
                                     
                                     <div className="flex justify-between items-center mt-2 text-xs font-medium text-gray-600 px-1">
                                         <span>Eligible Paid Km:</span>
                                         <span className="text-emerald-600 font-bold">{calculatedPaidKm} km</span>
                                     </div>
                                 </div>
                              </>
                          ) : (
                              <>
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Promo Code Name</label>
                                     <input 
                                        name="promoCodeName"
                                        value={formData.promoCodeName}
                                        onChange={handleInputChange}
                                        placeholder="e.g. DIWALI10" 
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount Amount (₹)</label>
                                     <input 
                                        type="number"
                                        name="promoDiscountValue"
                                        value={formData.promoDiscountValue}
                                        onChange={handleInputChange}
                                        placeholder="₹"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                     />
                                 </div>
                                 
                                 {isCapApplied && (
                                     <div className="mt-2 p-2 bg-purple-50 text-purple-800 text-[10px] rounded border border-purple-100 flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <strong>Note:</strong> Reimbursement capped at <strong>₹{rules.promoMaxCap}</strong> per policy.
                                        </div>
                                     </div>
                                 )}
                              </>
                          )}
                          
                          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-600">Calculated Payable:</span>
                              <span className="text-xl font-bold text-emerald-600">₹{calculatedAmount}</span>
                          </div>
                      </div>

                      {/* Common Fields */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                              <input 
                                  type="date" 
                                  name="paymentDate"
                                  value={formData.paymentDate}
                                  onChange={handleInputChange}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                              <select 
                                  name="paymentStatus"
                                  value={formData.paymentStatus}
                                  onChange={handleInputChange}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                              >
                                  <option value="Paid">Paid</option>
                                  <option value="Pending">Pending</option>
                              </select>
                          </div>
                      </div>
                      
                      {/* Payment Mode Selection (Only if Paid) */}
                      {formData.paymentStatus === 'Paid' && (
                          <div className="animate-in fade-in slide-in-from-top-1">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Mode</label>
                              <div className="relative">
                                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                  <select 
                                      name="paymentMode"
                                      value={formData.paymentMode}
                                      onChange={handleInputChange}
                                      className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white appearance-none"
                                  >
                                      <option value="Cash">Cash</option>
                                      <option value="UPI">UPI</option>
                                      <option value="Online">Online</option>
                                      <option value="OK BOZ Wallet">OK BOZ Wallet</option>
                                  </select>
                              </div>
                          </div>
                      )}

                      {/* Receipt Upload */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attach Receipt</label>
                          <div className="flex items-center gap-2">
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" 
                                accept="image/*,.pdf"
                                disabled={isUploading}
                             />
                          </div>
                      </div>

                      <textarea 
                          name="remarks"
                          rows={2}
                          value={formData.remarks}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                          placeholder="Remarks (Optional)..."
                      />

                      <button type="submit" disabled={isUploading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? 'Update Payment' : 'Save Payment')}
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default DriverPayments;
