
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Filter, Download, Car, 
  MapPin, Tag, IndianRupee, Save, X, Calendar, 
  User, Phone, Truck, CheckCircle, Clock, Settings, Edit2, AlertCircle
} from 'lucide-react';
import { DriverPayment } from '../../types';

const DriverPayments: React.FC = () => {
  // 1. Identify Current User Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  
  // Storage Keys (Scoped to the user)
  const DATA_KEY = isSuperAdmin ? 'driver_payments_data' : `driver_payments_data_${sessionId}`;
  const SETTINGS_KEY = `driver_payment_settings_${sessionId}`;

  // 2. State for Data
  const [payments, setPayments] = useState<DriverPayment[]>(() => {
    // If Super Admin, load ALL payments (from main key + corporate keys if needed, 
    // but for simplicity in this demo, Admin sees their own or we aggregate. 
    // Let's assume Admin manages their own fleet here, or we aggregate).
    // For now, simple scoped storage:
    const saved = localStorage.getItem(DATA_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // 3. State for Settings (Rules)
  const [showSettings, setShowSettings] = useState(false);
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const defaults = {
      freeKm: 5,
      ratePerKm: 10,
      maxDistanceCap: 15,
      promoMaxCap: 500 // Default max reimbursement for promo
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const initialFormState = {
    driverName: '',
    driverPhoneNumber: '',
    vehicleNumber: '',
    paymentType: 'Empty Trip Payment' as 'Empty Trip Payment' | 'Promo Code Payment',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid' as 'Paid' | 'Pending',
    remarks: '',
    // Empty Km Fields
    pickupDistanceKm: '',
    // Promo Fields
    promoCodeName: '',
    promoOriginalFare: '',
    promoDiscountType: 'Flat Amount' as 'Flat Amount' | 'Percentage',
    promoDiscountValue: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [calculatedPaidKm, setCalculatedPaidKm] = useState(0);
  const [isCapApplied, setIsCapApplied] = useState(false);

  // --- Effects ---

  // Persist Data
  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(payments));
  }, [payments, DATA_KEY]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(rules));
  }, [rules, SETTINGS_KEY]);

  // Listen for storage changes to sync settings if updated elsewhere (e.g. Settings page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SETTINGS_KEY && e.newValue) {
            try {
                setRules(JSON.parse(e.newValue));
            } catch (err) {
                console.error("Error syncing rules", err);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [SETTINGS_KEY]);

  // Dynamic Calculation Logic
  useEffect(() => {
    let amt = 0;
    let paidKm = 0;
    let capHit = false;

    if (formData.paymentType === 'Empty Trip Payment') {
      const dist = parseFloat(formData.pickupDistanceKm) || 0;
      
      // Rule: Deduct Free Km first
      const chargeableDist = Math.max(0, dist - rules.freeKm);
      
      // Rule: Cap the chargeable distance
      // If we pay for MAX 10km, and driver drove 20km (minus 5 free = 15), we only pay for 10.
      paidKm = Math.min(chargeableDist, rules.maxDistanceCap);
      
      amt = paidKm * rules.ratePerKm;
    } else {
      // Promo Code Logic
      const originalFare = parseFloat(formData.promoOriginalFare) || 0;
      const discountVal = parseFloat(formData.promoDiscountValue) || 0;
      
      if (formData.promoDiscountType === 'Flat Amount') {
        amt = discountVal;
      } else {
        amt = (originalFare * discountVal) / 100;
      }

      // Rule: Max Promo Cap
      if (rules.promoMaxCap && rules.promoMaxCap > 0 && amt > rules.promoMaxCap) {
          amt = rules.promoMaxCap;
          capHit = true;
      }
    }
    
    setCalculatedPaidKm(parseFloat(paidKm.toFixed(2)));
    setCalculatedAmount(Math.round(amt));
    setIsCapApplied(capHit);
  }, [
    formData.paymentType, 
    formData.pickupDistanceKm, 
    formData.promoOriginalFare, 
    formData.promoDiscountType, 
    formData.promoDiscountValue,
    rules // Recalculate if rules change
  ]);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRules((prev: any) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.driverName || !formData.vehicleNumber) {
        alert("Please fill driver details.");
        return;
    }

    const newPayment: DriverPayment = {
      id: `PAY-${Date.now()}`,
      driverName: formData.driverName,
      driverPhoneNumber: formData.driverPhoneNumber,
      vehicleNumber: formData.vehicleNumber,
      paymentType: formData.paymentType,
      amount: calculatedAmount,
      paymentDate: formData.paymentDate,
      paymentStatus: formData.paymentStatus,
      remarks: formData.remarks + (isCapApplied ? ` (Capped at ₹${rules.promoMaxCap})` : ''),
      details: {
        pickupDistanceKm: parseFloat(formData.pickupDistanceKm) || 0,
        paidKm: calculatedPaidKm,
        promoCodeName: formData.promoCodeName,
        promoOriginalFare: parseFloat(formData.promoOriginalFare) || 0,
        promoDiscountType: formData.promoDiscountType,
        promoDiscountValue: parseFloat(formData.promoDiscountValue) || 0,
      },
      createdAt: new Date().toISOString()
    };

    setPayments([newPayment, ...payments]);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  // Stats
  const stats = useMemo(() => {
    const emptyKmTotal = payments.filter(p => p.paymentType === 'Empty Trip Payment' && p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const promoTotal = payments.filter(p => p.paymentType === 'Promo Code Payment' && p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = emptyKmTotal + promoTotal;
    const pendingCount = payments.filter(p => p.paymentStatus === 'Pending').length;
    return { emptyKmTotal, promoTotal, totalPaid, pendingCount };
  }, [payments]);

  // Filtered List
  const filteredPayments = payments.filter(p => {
      const matchesSearch = p.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.driverPhoneNumber.includes(searchTerm) || 
                            p.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
  });

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
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${showSettings ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                <Settings className="w-5 h-5" /> Payment Rules
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Log New Payment
            </button>
        </div>
      </div>

      {/* Settings Panel (Conditional Render) */}
      {showSettings && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> Configure Payment Rules
                  </h3>
                  <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">
                      {isSuperAdmin ? 'Head Office Config' : 'My Franchise Config'}
                  </span>
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
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none font-bold text-slate-700"
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
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none font-bold text-slate-700"
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
                              className="w-full pl-6 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 outline-none font-bold text-emerald-600"
                          />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Amount paid for eligible km.</p>
                  </div>

                  {/* Promo Rules - ADDED */}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p>
             <h3 className="text-2xl font-bold text-gray-800">₹{stats.totalPaid.toLocaleString()}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Empty Km Paid</p>
             <h3 className="text-2xl font-bold text-orange-600">₹{stats.emptyKmTotal.toLocaleString()}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Promo Reimbursement</p>
             <h3 className="text-2xl font-bold text-purple-600">₹{stats.promoTotal.toLocaleString()}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-xs font-bold text-gray-500 uppercase">Pending Payments</p>
             <h3 className="text-2xl font-bold text-red-600">{stats.pendingCount}</h3>
          </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50">
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search by driver, phone or vehicle..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
             </div>
             <div className="flex gap-2">
                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 >
                     <option value="All">All Status</option>
                     <option value="Paid">Paid</option>
                     <option value="Pending">Pending</option>
                 </select>
                 <button className="px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                 </button>
                 <button className="px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4" />
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
                                 <div className="text-xs text-gray-500">{p.vehicleNumber} • {p.driverPhoneNumber}</div>
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
                                        <div>Orig Fare: ₹{p.details.promoOriginalFare}</div>
                                        <div>Disc: {p.details.promoDiscountValue}{p.details.promoDiscountType === 'Percentage' ? '%' : ' Flat'}</div>
                                     </>
                                 )}
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
                         </tr>
                     ))}
                     {filteredPayments.length === 0 && (
                         <tr><td colSpan={6} className="py-10 text-center text-gray-400">No payment records found.</td></tr>
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
                      <h3 className="font-bold text-gray-800 text-lg">Log Driver Payment</h3>
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
                          <input 
                            required
                            name="vehicleNumber"
                            value={formData.vehicleNumber}
                            onChange={handleInputChange}
                            placeholder="Vehicle Number (e.g. TN 38 ...)" 
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
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
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Original Fare</label>
                                         <input 
                                            type="number"
                                            name="promoOriginalFare"
                                            value={formData.promoOriginalFare}
                                            onChange={handleInputChange}
                                            placeholder="₹" 
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount Value</label>
                                         <input 
                                            type="number"
                                            name="promoDiscountValue"
                                            value={formData.promoDiscountValue}
                                            onChange={handleInputChange}
                                            placeholder={formData.promoDiscountType === 'Percentage' ? '%' : '₹'}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                         />
                                     </div>
                                 </div>
                                 <div className="flex gap-4">
                                     <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                         <input 
                                            type="radio" 
                                            name="promoDiscountType" 
                                            value="Flat Amount"
                                            checked={formData.promoDiscountType === 'Flat Amount'}
                                            onChange={handleInputChange}
                                         /> Flat Amount
                                     </label>
                                     <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                         <input 
                                            type="radio" 
                                            name="promoDiscountType" 
                                            value="Percentage"
                                            checked={formData.promoDiscountType === 'Percentage'}
                                            onChange={handleInputChange}
                                         /> Percentage
                                     </label>
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
                      
                      <textarea 
                          name="remarks"
                          rows={2}
                          value={formData.remarks}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                          placeholder="Remarks (Optional)..."
                      />

                      <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors">
                          Save Payment
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default DriverPayments;
