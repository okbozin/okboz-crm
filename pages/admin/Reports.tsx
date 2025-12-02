
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, Users, DollarSign, 
  Briefcase, ArrowUpRight, Car, MapPin, Activity, CheckSquare
} from 'lucide-react';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus } from '../../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Financial' | 'Attendance' | 'CRM' | 'Transport'>('Financial');
  
  // Data State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Load Data
  useEffect(() => {
    try {
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');

      // 1. Load Expenses
      const expenseData = JSON.parse(localStorage.getItem('office_expenses') || '[]');
      const corpExpenses = corporates.flatMap((c: any) => {
         const d = localStorage.getItem(`office_expenses_${c.email}`);
         return d ? JSON.parse(d) : [];
      });
      setExpenses([...expenseData, ...corpExpenses]);

      // 2. Load Payroll History
      const payrollData = JSON.parse(localStorage.getItem('payroll_history') || '[]');
      setPayroll(payrollData);

      // 3. Load Leads
      const leadsData = JSON.parse(localStorage.getItem('leads_data') || '[]');
      setLeads(leadsData);

      // 4. Load Staff
      const staffData = JSON.parse(localStorage.getItem('staff_data') || '[]');
      const corpStaff = corporates.flatMap((c: any) => {
         const d = localStorage.getItem(`staff_data_${c.email}`);
         return d ? JSON.parse(d) : [];
      });
      setStaff(staffData.length + corpStaff.length > 0 ? [...staffData, ...corpStaff] : MOCK_EMPLOYEES);

      // 5. Load Trips
      let allTrips: any[] = [];
      const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]');
      allTrips = [...adminTrips];
      corporates.forEach((c: any) => {
          const cData = localStorage.getItem(`trips_data_${c.email}`);
          if (cData) allTrips = [...allTrips, ...JSON.parse(cData)];
      });
      setTrips(allTrips);

    } catch (e) {
      console.error("Error loading report data", e);
    }
  }, []);

  // --- Financial Stats ---
  const financialStats = useMemo(() => {
    const stats = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      // Income Sources
      const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(monthStr));
      const otherIncome = monthExpenses.filter(e => e.type === 'Income').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      
      // Trip Revenue (Only Completed)
      const tripRevenue = trips
        .filter(t => t.date.startsWith(monthStr) && t.bookingStatus === 'Completed')
        .reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);

      const totalIncome = otherIncome + tripRevenue;

      // Expenses
      const expense = monthExpenses.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const monthPayroll = payroll.filter(p => p.date && p.date.startsWith(monthStr)).reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      stats.push({
        name: label,
        Income: totalIncome,
        Expense: expense,
        Payroll: monthPayroll,
        Profit: totalIncome - (expense + monthPayroll)
      });
    }
    return stats;
  }, [expenses, payroll, trips]);

  const expenseCategoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    expenses.filter(e => e.type === 'Expense').forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [expenses]);

  // --- Attendance Stats ---
  const attendanceStats = useMemo(() => {
    if (staff.length === 0) return [];
    const stats = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

        let present = 0;
        let absent = 0;
        let late = 0;

        staff.forEach(emp => {
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
        stats.push({ name: dayLabel, Present: present, Absent: absent, Late: late });
    }
    return stats;
  }, [staff]);

  // --- CRM Stats ---
  const crmStats = useMemo(() => {
      const statusCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};
      
      leads.forEach(l => {
          statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
          sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
      });

      const funnelData = [
          { name: 'New', value: statusCounts['New'] || 0 },
          { name: 'Contacted', value: statusCounts['Contacted'] || 0 },
          { name: 'Qualified', value: statusCounts['Qualified'] || 0 },
          { name: 'Converted', value: statusCounts['Converted'] || 0 },
      ];

      const sourceData = Object.keys(sourceCounts).map(k => ({ name: k, value: sourceCounts[k] }));
      return { funnelData, sourceData };
  }, [leads]);

  // --- Transport Stats ---
  const transportStats = useMemo(() => {
      const vehicleCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};
      let totalRevenue = 0;
      let completedTrips = 0;

      trips.forEach(t => {
          // Vehicle Type
          vehicleCounts[t.transportType] = (vehicleCounts[t.transportType] || 0) + 1;
          // Status
          statusCounts[t.bookingStatus] = (statusCounts[t.bookingStatus] || 0) + 1;
          
          if (t.bookingStatus === 'Completed') {
              totalRevenue += Number(t.totalPrice) || 0;
              completedTrips++;
          }
      });

      const vehicleData = Object.keys(vehicleCounts).map(k => ({ name: k, value: vehicleCounts[k] }));
      const statusData = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

      // Revenue Trend (Daily for last 7 days)
      const revenueTrend = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-US', { weekday: 'short' });
          
          const dailyRev = trips
            .filter(t => t.date === dateStr && t.bookingStatus === 'Completed')
            .reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
            
          revenueTrend.push({ name: label, value: dailyRev });
      }

      return { vehicleData, statusData, revenueTrend, totalRevenue, completedTrips };
  }, [trips]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-gray-500">Insights into your company performance</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center gap-2 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('Financial')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'Financial' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Financial
                </button>
                <button 
                    onClick={() => setActiveTab('Attendance')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'Attendance' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Attendance
                </button>
                <button 
                    onClick={() => setActiveTab('CRM')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'CRM' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    CRM
                </button>
                <button 
                    onClick={() => setActiveTab('Transport')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'Transport' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    Transport
                </button>
            </div>
            <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm whitespace-nowrap">
                <Download className="w-4 h-4" /> Export
            </button>
        </div>
      </div>

      {/* FINANCIAL REPORT */}
      {activeTab === 'Financial' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue (6m)</p>
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                          ₹{financialStats.reduce((sum, item) => sum + item.Income, 0).toLocaleString()}
                      </h3>
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight className="w-3 h-3"/> +12% vs prev</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Total Expenses</p>
                          <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingUp className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                          ₹{financialStats.reduce((sum, item) => sum + item.Expense + item.Payroll, 0).toLocaleString()}
                      </h3>
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium"><ArrowUpRight className="w-3 h-3"/> +5% vs prev</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Net Profit</p>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                          ₹{financialStats.reduce((sum, item) => sum + item.Profit, 0).toLocaleString()}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Margin: {Math.round((financialStats.reduce((sum, item) => sum + item.Profit, 0) / (financialStats.reduce((sum, item) => sum + item.Income, 0) || 1)) * 100)}%</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Payroll Cost</p>
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                          ₹{financialStats.reduce((sum, item) => sum + item.Payroll, 0).toLocaleString()}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Avg ₹{(financialStats.reduce((sum, item) => sum + item.Payroll, 0) / 6).toFixed(0)}/mo</p>
                  </div>
              </div>

              {/* Main Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800">Financial Performance</h3>
                          <select className="text-xs border-gray-300 border rounded-lg p-1 outline-none">
                              <option>Last 6 Months</option>
                              <option>This Year</option>
                          </select>
                      </div>
                      <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={financialStats}>
                                  <defs>
                                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val) => `₹${val/1000}k`} />
                                  <Tooltip 
                                      contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}
                                      formatter={(val: number) => `₹${val.toLocaleString()}`}
                                  />
                                  <Legend />
                                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                  <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Expense Breakdown</h3>
                      <div className="h-60">
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
                                  <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-3">
                          {expenseCategoryData.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                      <span className="text-gray-600">{item.name}</span>
                                  </div>
                                  <span className="font-medium text-gray-900">₹{item.value.toLocaleString()}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ATTENDANCE REPORT */}
      {activeTab === 'Attendance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-gray-800">Attendance Trends (Last 7 Days)</h3>
                      <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Present</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Absent</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Late</div>
                      </div>
                  </div>
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendanceStats} barSize={40}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} />
                              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}} />
                              <Bar dataKey="Present" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                              <Bar dataKey="Late" stackId="a" fill="#f59e0b" />
                              <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4">Punctuality Score</h3>
                      <div className="flex items-center justify-center h-48">
                          {/* Mock Gauge */}
                          <div className="relative w-40 h-40">
                              <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="15" fill="none" />
                                  <circle cx="80" cy="80" r="70" stroke="#10b981" strokeWidth="15" fill="none" strokeDasharray="440" strokeDashoffset="66" strokeLinecap="round" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-3xl font-bold text-gray-800">85%</span>
                                  <span className="text-xs text-gray-500">On Time</span>
                              </div>
                          </div>
                      </div>
                      <p className="text-center text-sm text-gray-500">Most employees arrive by 9:45 AM.</p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4">Top Absentees (This Month)</h3>
                      <div className="space-y-4">
                          {[1,2,3].map((_, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                      <div>
                                          <p className="text-sm font-bold text-gray-900">Employee {i+1}</p>
                                          <p className="text-xs text-gray-500">Sales Dept</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-sm font-bold text-red-600">{4-i} Days</p>
                                      <p className="text-xs text-gray-400">Absent</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CRM REPORT */}
      {activeTab === 'CRM' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Lead Conversion Funnel</h3>
                      <div className="space-y-4">
                          {crmStats.funnelData.map((item, idx) => (
                              <div key={item.name} className="relative">
                                  <div className="flex justify-between text-sm mb-1 z-10 relative">
                                      <span className="font-medium text-gray-700">{item.name}</span>
                                      <span className="font-bold text-gray-900">{item.value}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                      <div 
                                          className="h-full rounded-r-full flex items-center justify-end pr-3 text-xs text-white font-bold transition-all duration-1000"
                                          style={{ 
                                              width: `${(item.value / (crmStats.funnelData[0].value || 1)) * 100}%`,
                                              backgroundColor: COLORS[idx % COLORS.length]
                                          }}
                                      >
                                          {Math.round((item.value / (crmStats.funnelData[0].value || 1)) * 100)}%
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6">Leads by Source</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={crmStats.sourceData}
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  >
                                      {crmStats.sourceData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* TRANSPORT REPORT (NEW) */}
      {activeTab === 'Transport' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Trip KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Completed Trips</p>
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckSquare className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{transportStats.completedTrips}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">₹{transportStats.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Active Fleet</p>
                          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Car className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{transportStats.vehicleData.length}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-gray-500 uppercase">Top Route</p>
                          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MapPin className="w-4 h-4"/></div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 truncate">Local Trips</h3>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Trend Line Chart */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-500" /> Daily Revenue Trend
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={transportStats.revenueTrend}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val) => `₹${val/1000}k`} />
                                  <Tooltip 
                                      contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}
                                      formatter={(val: number) => `₹${val.toLocaleString()}`}
                                  />
                                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Vehicle Distribution Pie */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Car className="w-5 h-5 text-blue-500" /> Trip Distribution by Vehicle
                      </h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={transportStats.vehicleData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {transportStats.vehicleData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Reports;
