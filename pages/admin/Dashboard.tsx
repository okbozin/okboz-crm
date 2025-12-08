import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, TrendingUp, Calendar, MapPin, 
  Building2, Car, Activity, Briefcase
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Employee, Trip, CorporateAccount } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // State for Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterType, setFilterType] = useState<'Daily' | 'Monthly'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Load Data
  useEffect(() => {
    try {
      const loadedCorporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((c: any) => c && typeof c === 'object');
      setCorporates(loadedCorporates);

      let allEmployees: Employee[] = [];
      let allTrips: Trip[] = [];
      let allBranches: any[] = [];

      if (isSuperAdmin) {
        // Load Admin Data
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]').filter((item: any) => item && typeof item === 'object');
        const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]').filter((item: any) => item && typeof item === 'object');
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]').filter((item: any) => item && typeof item === 'object');

        allEmployees = [...adminStaff];
        allTrips = [...adminTrips];
        allBranches = [...adminBranches];

        // Load Corporate Data
        loadedCorporates.forEach((c: any) => {
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
          const cTrips = JSON.parse(localStorage.getItem(`trips_data_${c.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
          const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]').filter((item: any) => item && typeof item === 'object');

          allEmployees = [...allEmployees, ...cStaff.map((s: any) => ({ ...s, corporateId: c.email }))];
          allTrips = [...allTrips, ...cTrips.map((t: any) => ({ ...t, ownerId: c.email }))];
          allBranches = [...allBranches, ...cBranches.map((b: any) => ({ ...b, owner: c.email }))];
        });
      } else {
        const keySuffix = `_${sessionId}`;
        allEmployees = JSON.parse(localStorage.getItem(`staff_data${keySuffix}`) || '[]').filter((item: any) => item && typeof item === 'object');
        allTrips = JSON.parse(localStorage.getItem(`trips_data${keySuffix}`) || '[]').filter((item: any) => item && typeof item === 'object');
        allBranches = JSON.parse(localStorage.getItem(`branches_data${keySuffix}`) || '[]').filter((item: any) => item && typeof item === 'object');
      }

      setEmployees(allEmployees.length ? allEmployees : (isSuperAdmin ? MOCK_EMPLOYEES : []));
      setTrips(allTrips);
      setBranches(allBranches);

    } catch (e) {
      console.error("Error loading dashboard data", e);
    }
  }, [isSuperAdmin, sessionId]);

  // Filtered Data Sets
  const filteredEmployees = useMemo(() => {
      return employees.filter(e => {
          if (!e) return false;
          const matchCorp = filterCorporate === 'All' || e.corporateId === filterCorporate;
          const matchBranch = filterBranch === 'All' || (e.branch && e.branch === filterBranch);
          return matchCorp && matchBranch;
      });
  }, [employees, filterCorporate, filterBranch]);

  const filteredTrips = useMemo(() => {
      return trips.filter(t => {
          if (!t) return false;
          const matchCorp = filterCorporate === 'All' || t.ownerId === filterCorporate || (filterCorporate === 'admin' && t.ownerId === 'admin');
          const matchBranch = filterBranch === 'All' || (t.branch && t.branch === filterBranch);
          
          let matchDate = true;
          if (filterType === 'Daily') {
              matchDate = t.date === selectedDate;
          } else {
              matchDate = t.date.startsWith(selectedMonth);
          }
          return matchCorp && matchBranch && matchDate;
      });
  }, [trips, filterCorporate, filterBranch, filterType, selectedDate, selectedMonth]);

  // Stats Calculation
  const stats = useMemo(() => {
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    const totalTrips = filteredTrips.length;
    const completedTrips = filteredTrips.filter(t => t.bookingStatus === 'Completed').length;
    const activeStaff = filteredEmployees.filter(e => e.status !== 'Inactive').length;

    return { totalRevenue, totalTrips, completedTrips, activeStaff };
  }, [filteredTrips, filteredEmployees]);

  const revenueData = useMemo(() => {
    // Group by day for the selected month or just show the selected day
    if (filterType === 'Daily') {
        // For Daily view, breakdown by transport type
        const typeCounts: Record<string, number> = {};
        filteredTrips.forEach(t => {
            typeCounts[t.transportType] = (typeCounts[t.transportType] || 0) + (Number(t.totalPrice) || 0);
        });
        return Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));
    } else {
        // Monthly view: Group by day
        const daysInMonth = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
        const data = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
            const dailyRevenue = filteredTrips
                .filter(t => t.date === dateStr)
                .reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
            data.push({ name: String(i), value: dailyRevenue });
        }
        return data;
    }
  }, [filteredTrips, filterType, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm">Overview of performance and metrics</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
           {isSuperAdmin && (
             <select 
               value={filterCorporate} 
               onChange={(e) => setFilterCorporate(e.target.value)}
               className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
             >
               <option value="All">All Corporates</option>
               <option value="admin">Head Office</option>
               {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
             </select>
           )}
           
           <select 
             value={filterBranch} 
             onChange={(e) => setFilterBranch(e.target.value)}
             className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
           >
             <option value="All">All Branches</option>
             {branches.map((b: any, i) => <option key={i} value={b.name}>{b.name}</option>)}
           </select>

           <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setFilterType('Daily')} 
                className={`px-3 py-1.5 text-xs font-bold rounded ${filterType === 'Daily' ? 'bg-white text-emerald-600 shadow' : 'text-gray-500'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setFilterType('Monthly')} 
                className={`px-3 py-1.5 text-xs font-bold rounded ${filterType === 'Monthly' ? 'bg-white text-emerald-600 shadow' : 'text-gray-500'}`}
              >
                Monthly
              </button>
           </div>

           {filterType === 'Daily' ? (
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm bg-white" />
           ) : (
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm bg-white" />
           )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
              <h3 className="text-2xl font-bold text-emerald-600">₹{stats.totalRevenue.toLocaleString()}</h3>
           </div>
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-6 h-6"/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Total Trips</p>
              <h3 className="text-2xl font-bold text-blue-600">{stats.totalTrips}</h3>
           </div>
           <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Car className="w-6 h-6"/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Active Staff</p>
              <h3 className="text-2xl font-bold text-purple-600">{stats.activeStaff}</h3>
           </div>
           <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Users className="w-6 h-6"/></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Completion Rate</p>
              <h3 className="text-2xl font-bold text-orange-600">
                {stats.totalTrips > 0 ? Math.round((stats.completedTrips / stats.totalTrips) * 100) : 0}%
              </h3>
           </div>
           <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Activity className="w-6 h-6"/></div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-emerald-600" /> Revenue Trend
            </h3>
            <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  {filterType === 'Monthly' ? (
                    <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                    </BarChart>
                  ) : (
                    <PieChart>
                        <Pie
                            data={revenueData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {revenueData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                  )}
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Building2 className="w-5 h-5 text-blue-600" /> Recent Activity
            </h3>
            <div className="space-y-4">
               {filteredTrips.slice(0, 5).map(trip => (
                  <div key={trip.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                     <div>
                        <p className="font-bold text-gray-800">{trip.customerName || trip.userName || 'Customer'}</p>
                        <p className="text-xs text-gray-500">{trip.tripCategory} - {trip.transportType}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{trip.totalPrice}</p>
                        <p className="text-[10px] text-gray-400">{new Date(trip.date).toLocaleDateString()}</p>
                     </div>
                  </div>
               ))}
               {filteredTrips.length === 0 && <p className="text-center text-gray-400 text-sm">No recent activity.</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;