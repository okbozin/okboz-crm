
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Download, TrendingUp, DollarSign, 
  Briefcase, ArrowUpRight, Car, MapPin, Activity, CheckSquare, Users, PieChart as PieChartIcon,
  Filter, Calendar, Building2, PhoneIncoming, RefreshCw, CreditCard, CheckCircle, Clock
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, PayrollHistoryRecord, DriverPayment } from '../../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

type ReportTab = 'Finance & Expenses' | 'Driver Payments' | 'Payroll Management' | 'Attendance Management' | 'Trip Earning' | 'Customer Care';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('Finance & Expenses');
  
  // --- Raw Data State ---
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [rawPayroll, setRawPayroll] = useState<PayrollHistoryRecord[]>([]);
  const [rawLeads, setRawLeads] = useState<any[]>([]); // Using leads_data for CRM
  const [rawEnquiries, setRawEnquiries] = useState<any[]>([]); // Using global_enquiries for Customer Care
  const [rawStaff, setRawStaff] = useState<any[]>([]);
  const [rawTrips, setRawTrips] = useState<any[]>([]);
  const [rawDriverPayments, setRawDriverPayments] = useState<any[]>([]); // NEW: Driver Payments
  const [corporatesList, setCorporatesList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);

  // --- Filter State ---
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterDateType, setFilterDateType] = useState<'Monthly' | 'Range'>('Monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- 1. Load Data ---
  useEffect(() => {
    try {
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      setCorporatesList(corporates);

      // Load Branches
      let allBranches: any[] = [];
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          allBranches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
          corporates.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
          });
      } else {
          const key = `branches_data_${sessionId}`;
          const currentCorpBranches = JSON.parse(localStorage.getItem(key) || '[]');
          allBranches = currentCorpBranches.map((b: any) => ({...b, owner: sessionId}));
      }
      setBranchesList(allBranches);

      // Load Expenses
      let allExpenses: any[] = [];
      if (isSuperAdmin) {
          const adminExpenses = JSON.parse(localStorage.getItem('office_expenses') || '[]');
          allExpenses = [...adminExpenses];
          corporates.forEach((c: any) => {
             const d = localStorage.getItem(`office_expenses_${c.email}`);
             if (d) allExpenses = [...allExpenses, ...JSON.parse(d)];
          });
      } else {
          const key = `office_expenses_${sessionId}`;
          const currentCorpExpenses = JSON.parse(localStorage.getItem(key) || '[]');
          allExpenses = [...currentCorpExpenses];
      }
      setRawExpenses(allExpenses);

      // Load Payroll History
      const globalPayrollHistory = JSON.parse(localStorage.getItem('payroll_history') || '[]');
      setRawPayroll(isSuperAdmin ? globalPayrollHistory : globalPayrollHistory.filter((p: PayrollHistoryRecord) => p.ownerId === sessionId));

      // Load Leads & Enquiries
      let allLeads: any[] = [];
      let allEnquiries: any[] = [];
      if (isSuperAdmin) {
          allLeads = JSON.parse(localStorage.getItem('leads_data') || '[]');
          allEnquiries = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
          corporates.forEach((c: any) => {
             const d = localStorage.getItem(`leads_data_${c.email}`);
             if (d) allLeads = [...allLeads, ...JSON.parse(d)];
          });
      } else {
          allLeads = JSON.parse(localStorage.getItem(`leads_data_${sessionId}`) || '[]');
          const globalEnq = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
          allEnquiries = globalEnq.filter((e: any) => e.corporateId === sessionId);
      }
      setRawLeads(allLeads);
      setRawEnquiries(allEnquiries);

      // Load Staff
      let allStaff: any[] = [];
      if (isSuperAdmin) {
          const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
          allStaff = [...adminStaff.map((s:any) => ({...s, owner: 'admin'}))];
          corporates.forEach((c: any) => {
             const d = localStorage.getItem(`staff_data_${c.email}`);
             if (d) allStaff = [...allStaff, ...JSON.parse(d).map((s:any) => ({...s, owner: c.email}))];
          });
      } else {
          const key = `staff_data_${sessionId}`;
          const currentCorpStaff = JSON.parse(localStorage.getItem(key) || '[]');
          allStaff = [...currentCorpStaff.map((s:any) => ({...s, owner: sessionId}))];
      }
      setRawStaff(allStaff.length > 0 ? allStaff : MOCK_EMPLOYEES);

      // Load Trips
      let allTrips: any[] = [];
      if (isSuperAdmin) {
          const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]');
          allTrips = [...adminTrips.map((t:any) => ({...t, ownerId: 'admin'}))];
          corporates.forEach((c: any) => {
              const cData = localStorage.getItem(`trips_data_${c.email}`);
              if (cData) allTrips = [...allTrips, ...JSON.parse(cData).map((t:any) => ({...t, ownerId: c.email}))];
          });
      } else {
          const key = `trips_data_${sessionId}`;
          const currentCorpTrips = JSON.parse(localStorage.getItem(key) || '[]');
          allTrips = [...currentCorpTrips.map((t:any) => ({...t, ownerId: sessionId}))];
      }
      setRawTrips(allTrips);

      // Load Driver Payments (NEW)
      let allDriverPayments: any[] = [];
      if (isSuperAdmin) {
          const adminPayments = JSON.parse(localStorage.getItem('driver_payments_data') || '[]');
          // Inject ownerId = 'admin' for filtering
          allDriverPayments = [...adminPayments.map((p: any) => ({...p, ownerId: 'admin'}))];
          
          corporates.forEach((c: any) => {
             const cPayments = JSON.parse(localStorage.getItem(`driver_payments_data_${c.email}`) || '[]');
             // Inject ownerId = corporate email
             allDriverPayments = [...allDriverPayments, ...cPayments.map((p: any) => ({...p, ownerId: c.email}))];
          });
      } else {
          const key = `driver_payments_data_${sessionId}`;
          const cPayments = JSON.parse(localStorage.getItem(key) || '[]');
          // Inject ownerId = sessionId
          allDriverPayments = [...cPayments.map((p: any) => ({...p, ownerId: sessionId}))];
      }
      setRawDriverPayments(allDriverPayments);


    } catch (e) {
      console.error("Error loading report data", e);
    }
  }, [isSuperAdmin, sessionId]);

  // --- 2. Filter Logic (Derived State) ---
  
  // Helper to check date inclusion
  const isDateInFilter = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false; // Invalid date

      if (filterDateType === 'Monthly') {
          return dateStr.startsWith(selectedMonth);
      } else {
          if (!dateRange.start) return true; // No start date set
          const start = new Date(dateRange.start);
          const end = dateRange.end ? new Date(dateRange.end) : new Date();
          end.setHours(23, 59, 59, 999); // Include end of day
          return d >= start && d <= end;
      }
  };

  // Helper to check corporate/branch inclusion
  // Note: Most data records need an 'ownerId' or 'corporateId' and 'branch' field for this to work perfectly.
  const isContextMatch = (item: any, itemOwnerKey: string = 'ownerId') => {
      // 1. Corporate Filter (Super Admin Only)
      if (isSuperAdmin && filterCorporate !== 'All') {
          // Some items use 'corporateId', some 'ownerId', some 'owner'
          const owner = item[itemOwnerKey] || item.corporateId || item.owner; 
          if (owner !== filterCorporate) return false;
      }

      // 2. Branch Filter
      if (filterBranch !== 'All') {
          if (item.branch !== filterBranch) return false;
      }

      return true;
  };

  const filteredExpenses = useMemo(() => rawExpenses.filter(e => isContextMatch(e, 'franchiseName') && isDateInFilter(e.date)), [rawExpenses, filterCorporate, filterBranch, selectedMonth, dateRange, filterDateType]);
  const filteredTrips = useMemo(() => rawTrips.filter(t => isContextMatch(t, 'ownerId') && isDateInFilter(t.date)), [rawTrips, filterCorporate, filterBranch, selectedMonth, dateRange, filterDateType]);
  const filteredPayroll = useMemo(() => rawPayroll.filter(p => isContextMatch(p, 'ownerId') && isDateInFilter(p.date)), [rawPayroll, filterCorporate, filterBranch, selectedMonth, dateRange, filterDateType]);
  const filteredStaff = useMemo(() => rawStaff.filter(s => isContextMatch(s, 'owner')), [rawStaff, filterCorporate, filterBranch]); // Staff filtering is snapshot based usually
  const filteredEnquiries = useMemo(() => rawEnquiries.filter(e => isContextMatch(e, 'corporateId') && isDateInFilter(e.createdAt)), [rawEnquiries, filterCorporate, filterBranch, selectedMonth, dateRange, filterDateType]);
  const filteredDriverPayments = useMemo(() => rawDriverPayments.filter(p => isContextMatch(p, 'ownerId') && isDateInFilter(p.paymentDate)), [rawDriverPayments, filterCorporate, filterBranch, selectedMonth, dateRange, filterDateType]);

  // --- 3. Statistics Calculation ---

  // Financial Tab Stats
  const financialStats = useMemo(() => {
    const totalExpense = filteredExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const otherIncome = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const tripRevenue = filteredTrips.filter(t => t.bookingStatus === 'Completed').reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    const payrollCost = filteredPayroll.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    // Add Driver Payments (Payouts) to expenses logic
    const driverPayouts = filteredDriverPayments.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalIncome = otherIncome + tripRevenue;
    const netProfit = totalIncome - (totalExpense + payrollCost + driverPayouts);

    // Chart Data (Daily Trend within selected period)
    const trendData: Record<string, any> = {};
    
    // Populate keys based on date filter (last 30 days or selected range)
    // For simplicity, we aggregate existing data points
    filteredExpenses.forEach(e => {
        const day = e.date.split('T')[0];
        if(!trendData[day]) trendData[day] = { name: day, Income: 0, Expense: 0 };
        if(e.type === 'Expense') trendData[day].Expense += (parseFloat(e.amount) || 0);
        else trendData[day].Income += (parseFloat(e.amount) || 0);
    });
    filteredTrips.forEach(t => {
        if(t.bookingStatus === 'Completed') {
            const day = t.date.split('T')[0];
            if(!trendData[day]) trendData[day] = { name: day, Income: 0, Expense: 0 };
            trendData[day].Income += (Number(t.totalPrice) || 0);
        }
    });
    filteredDriverPayments.forEach(p => {
        if(p.paymentStatus === 'Paid') {
            const day = p.paymentDate.split('T')[0];
            if(!trendData[day]) trendData[day] = { name: day, Income: 0, Expense: 0 };
            trendData[day].Expense += (p.amount || 0);
        }
    });
    
    // Sort by date
    const chartData = Object.values(trendData).sort((a: any, b: any) => a.name.localeCompare(b.name));

    return { totalIncome, totalExpense: totalExpense + driverPayouts, payrollCost, netProfit, chartData };
  }, [filteredExpenses, filteredTrips, filteredPayroll, filteredDriverPayments]);

  const expenseCategoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredExpenses.filter(e => e.type === 'Expense').forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    // Add Driver Payments as a category
    const driverPayTotal = filteredDriverPayments.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    if(driverPayTotal > 0) categoryMap['Driver Payments'] = driverPayTotal;

    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })).sort((a,b) => b.value - a.value);
  }, [filteredExpenses, filteredDriverPayments]);

  // Driver Payment Stats
  const driverPaymentStats = useMemo(() => {
     const totalPaid = filteredDriverPayments.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.amount, 0);
     const totalPending = filteredDriverPayments.filter(p => p.paymentStatus === 'Pending').reduce((sum, p) => sum + p.amount, 0);
     
     const emptyKmPaid = filteredDriverPayments.filter(p => p.paymentStatus === 'Paid' && p.paymentType === 'Empty Trip Payment').reduce((sum, p) => sum + p.amount, 0);
     const promoPaid = filteredDriverPayments.filter(p => p.paymentStatus === 'Paid' && p.paymentType === 'Promo Code Payment').reduce((sum, p) => sum + p.amount, 0);

     // Chart Data: Payments per day
     const paymentsByDate: Record<string, number> = {};
     filteredDriverPayments
        .filter(p => p.paymentStatus === 'Paid')
        .forEach(p => {
             const d = new Date(p.paymentDate).toLocaleDateString(undefined, {month:'short', day:'numeric'});
             paymentsByDate[d] = (paymentsByDate[d] || 0) + p.amount;
        });
     const paymentChartData = Object.keys(paymentsByDate).map(key => ({
         name: key,
         amount: paymentsByDate[key]
     }));

     return { totalPaid, totalPending, emptyKmPaid, promoPaid, paymentChartData };
  }, [filteredDriverPayments]);

  // Attendance Tab Stats
  const attendanceStats = useMemo(() => {
    if (filteredStaff.length === 0) return [];
    
    // Generate dates based on selected filter
    const dates = [];
    if (filterDateType === 'Monthly') {
       const [y, m] = selectedMonth.split('-');
       const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
       for(let i=1; i<=daysInMonth; i++) dates.push(`${selectedMonth}-${String(i).padStart(2, '0')}`);
    } else if (dateRange.start && dateRange.end) {
       // Simple range generator (capped at 31 days to avoid heavy calc)
       let curr = new Date(dateRange.start);
       const end = new Date(dateRange.end);
       while(curr <= end && dates.length < 31) {
           dates.push(curr.toISOString().split('T')[0]);
           curr.setDate(curr.getDate() + 1);
       }
    } else {
        // Default to last 7 days
        for(let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
    }

    return dates.map(dateStr => {
        let present = 0, absent = 0, late = 0;
        filteredStaff.forEach(emp => {
            const d = new Date(dateStr);
            const record = getEmployeeAttendance(emp, d.getFullYear(), d.getMonth()).find(r => r.date === dateStr);
            if (record) {
                if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.HALF_DAY) {
                    present++;
                    if (record.isLate) late++;
                } else if (record.status === AttendanceStatus.ABSENT) {
                    absent++;
                }
            }
        });
        return { name: dateStr.slice(5), Present: present, Absent: absent, Late: late, date: dateStr }; // Remove Year for shorter label
    });
  }, [filteredStaff, filterDateType, selectedMonth, dateRange]);

  // Trip Earning Stats
  const transportStats = useMemo(() => {
      const statusCounts: Record<string, number> = {};
      const vehicleCounts: Record<string, number> = {};
      let totalRevenue = 0;
      let completedTrips = 0;

      filteredTrips.forEach(t => {
          statusCounts[t.bookingStatus] = (statusCounts[t.bookingStatus] || 0) + 1;
          vehicleCounts[t.transportType] = (vehicleCounts[t.transportType] || 0) + 1;
          if (t.bookingStatus === 'Completed') {
              totalRevenue += Number(t.totalPrice) || 0;
              completedTrips++;
          }
      });

      const statusData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));
      const vehicleData = Object.keys(vehicleCounts).map(k => ({ name: k, value: vehicleCounts[k] }));

      return { totalRevenue, completedTrips, statusData, vehicleData, totalCount: filteredTrips.length };
  }, [filteredTrips]);

  // Customer Care Stats
  const crmStats = useMemo(() => {
      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      
      filteredEnquiries.forEach(e => {
          statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
          const type = e.tripType || e.enquiryCategory || 'General';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const funnelData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));
      const typeData = Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));

      return { funnelData, typeData, total: filteredEnquiries.length };
  }, [filteredEnquiries]);


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Global Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
              <p className="text-gray-500 text-sm">Performance insights across all modules</p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
                {isSuperAdmin && (
                    <select 
                        value={filterCorporate}
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporatesList.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                )}

                <select 
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                >
                    <option value="All">All Branches</option>
                    {/* Filter branches based on selected corporate if Super Admin */}
                    {branchesList
                        .filter(b => !isSuperAdmin || filterCorporate === 'All' || b.owner === filterCorporate)
                        .map((b, i) => (
                        <option key={i} value={b.name}>{b.name}</option>
                    ))}
                </select>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setFilterDateType('Monthly')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded ${filterDateType === 'Monthly' ? 'bg-white text-emerald-600 shadow' : 'text-gray-500'}`}
                    >
                        Monthly
                    </button>
                    <button 
                        onClick={() => setFilterDateType('Range')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded ${filterDateType === 'Range' ? 'bg-white text-emerald-600 shadow' : 'text-gray-500'}`}
                    >
                        Range
                    </button>
                </div>

                {filterDateType === 'Monthly' ? (
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)} 
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="px-2 py-2 border rounded-lg text-sm" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="px-2 py-2 border rounded-lg text-sm" />
                    </div>
                )}
                
                <button className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                    <Download className="w-4 h-4" />
                </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto border-t border-gray-100 pt-4">
                {[
                    { id: 'Finance & Expenses', icon: DollarSign },
                    { id: 'Driver Payments', icon: CreditCard }, // NEW BUTTON
                    { id: 'Payroll Management', icon: Users },
                    { id: 'Attendance Management', icon: Calendar },
                    { id: 'Trip Earning', icon: Car },
                    { id: 'CustomerCare', icon: PhoneIncoming, label: 'Customer Care' }
                ].map((tab: any) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ReportTab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                            activeTab === tab.id 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                        {tab.label || tab.id}
                    </button>
                ))}
          </div>
      </div>

      {/* 2. Content Area */}
      
      {/* --- FINANCE & EXPENSES TAB --- */}
      {activeTab === 'Finance & Expenses' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total Income</p>
                      <h3 className="text-2xl font-bold text-emerald-600">₹{financialStats.totalIncome.toLocaleString()}</h3>
                      <p className="text-xs text-gray-400 mt-1">Trips + Other Income</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Operating Expense</p>
                      <h3 className="text-2xl font-bold text-red-600">₹{financialStats.totalExpense.toLocaleString()}</h3>
                      <p className="text-xs text-gray-400 mt-1">Excludes Payroll</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Payroll Cost</p>
                      <h3 className="text-2xl font-bold text-orange-600">₹{financialStats.payrollCost.toLocaleString()}</h3>
                      <p className="text-xs text-gray-400 mt-1">Salaries Paid</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Net Profit</p>
                      <h3 className={`text-2xl font-bold ${financialStats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ₹{financialStats.netProfit.toLocaleString()}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Income - (Exp + Payroll)</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" /> Income vs Expense Trend
                      </h3>
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={financialStats.chartData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val) => `₹${val/1000}k`} />
                                  <Tooltip />
                                  <Legend />
                                  <Area type="monotone" dataKey="Income" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                                  <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Expense Breakdown</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={expenseCategoryData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {expenseCategoryData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- DRIVER PAYMENTS TAB (NEW) --- */}
      {activeTab === 'Driver Payments' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total Paid</p>
                      <h3 className="text-2xl font-bold text-emerald-600">₹{driverPaymentStats.totalPaid.toLocaleString()}</h3>
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Settled</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Pending Requests</p>
                      <h3 className="text-2xl font-bold text-red-600">₹{driverPaymentStats.totalPending.toLocaleString()}</h3>
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> To be paid</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Empty Km Payout</p>
                      <h3 className="text-2xl font-bold text-orange-600">₹{driverPaymentStats.emptyKmPaid.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Promo Code Reimb.</p>
                      <h3 className="text-2xl font-bold text-purple-600">₹{driverPaymentStats.promoPaid.toLocaleString()}</h3>
                  </div>
              </div>

              {/* Bar Chart Section */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" /> Payout Trends
                  </h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={driverPaymentStats.paymentChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} />
                              <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']} />
                              <Legend />
                              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Paid Amount" barSize={40} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">Transaction History</h3>
                      <span className="text-sm text-gray-500">Records found: {filteredDriverPayments.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 text-gray-500 font-medium">
                              <tr>
                                  <th className="px-6 py-3">Date</th>
                                  <th className="px-6 py-3">Driver</th>
                                  <th className="px-6 py-3">Type</th>
                                  <th className="px-6 py-3">Details</th>
                                  <th className="px-6 py-3 text-right">Amount</th>
                                  <th className="px-6 py-3 text-center">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredDriverPayments.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-3 text-gray-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                      <td className="px-6 py-3">
                                          <div className="font-medium text-gray-900">{p.driverName}</div>
                                          <div className="text-xs text-gray-500">{p.vehicleNumber}</div>
                                      </td>
                                      <td className="px-6 py-3">
                                          <span className={`px-2 py-1 rounded text-xs font-bold border ${p.paymentType === 'Empty Trip Payment' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                             {p.paymentType === 'Empty Trip Payment' ? 'Empty Km' : 'Promo Code'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3 text-xs text-gray-600">
                                         {p.paymentType === 'Empty Trip Payment' ? (
                                            <span>Pickup: {p.details?.pickupDistanceKm}km | Paid: {p.details?.paidKm}km</span>
                                         ) : (
                                            <span>{p.details?.promoCodeName} ({p.details?.promoDiscountValue}{p.details?.promoDiscountType === 'Percentage' ? '%' : ' Flat'})</span>
                                         )}
                                      </td>
                                      <td className="px-6 py-3 text-right font-bold text-gray-900">₹{p.amount.toLocaleString()}</td>
                                      <td className="px-6 py-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                              {p.paymentStatus}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                              {filteredDriverPayments.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No driver payments found.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- PAYROLL MANAGEMENT TAB --- */}
      {activeTab === 'Payroll Management' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-gray-800">Payroll History</h3>
                      <span className="text-sm text-gray-500">Records found: {filteredPayroll.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-medium">
                              <tr>
                                  <th className="px-4 py-3">Batch Name</th>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">Employees</th>
                                  <th className="px-4 py-3 text-right">Total Payout</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {filteredPayroll.map(p => (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                      <td className="px-4 py-3 text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                                      <td className="px-4 py-3">{p.employeeCount}</td>
                                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{p.totalAmount.toLocaleString()}</td>
                                  </tr>
                              ))}
                              {filteredPayroll.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No payroll records for this period.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- ATTENDANCE MANAGEMENT TAB --- */}
      {activeTab === 'Attendance Management' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Attendance Trends (Daily)</h3>
                  <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendanceStats} barSize={20}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} />
                              <Tooltip cursor={{fill: 'transparent'}} />
                              <Legend />
                              <Bar dataKey="Present" stackId="a" fill="#10b981" />
                              <Bar dataKey="Late" stackId="a" fill="#f59e0b" />
                              <Bar dataKey="Absent" stackId="a" fill="#ef4444" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {/* --- TRIP EARNING TAB --- */}
      {activeTab === 'Trip Earning' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
                      <h3 className="text-2xl font-bold text-indigo-600">₹{transportStats.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Completed Trips</p>
                      <h3 className="text-2xl font-bold text-emerald-600">{transportStats.completedTrips}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total Bookings</p>
                      <h3 className="text-2xl font-bold text-gray-800">{transportStats.totalCount}</h3>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Booking Status</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={transportStats.statusData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {transportStats.statusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Vehicle Type Distribution</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={transportStats.vehicleData} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                  <Tooltip />
                                  <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                      {transportStats.vehicleData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- CUSTOMER CARE TAB --- */}
      {activeTab === 'Customer Care' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Enquiry Status Funnel</h3>
                  <div className="space-y-4">
                      {crmStats.funnelData.map((item, idx) => (
                          <div key={item.name} className="relative">
                              <div className="flex justify-between text-sm mb-1 z-10 relative">
                                  <span className="font-medium text-gray-700">{item.name}</span>
                                  <span className="font-bold text-gray-900">{item.value}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                                  <div 
                                      className="h-full rounded-r-full transition-all duration-1000"
                                      style={{ 
                                          width: `${crmStats.total > 0 ? (item.value / crmStats.total) * 100 : 0}%`,
                                          backgroundColor: COLORS[idx % COLORS.length]
                                      }}
                                  ></div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
                      Total Enquiries Processed: <span className="font-bold text-gray-900">{crmStats.total}</span>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Reports;
