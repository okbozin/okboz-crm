
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, DollarSign, TrendingUp, Calendar, MapPin, 
  Building2, Car, Activity, Briefcase, Clock, FileText, CreditCard, CheckCircle, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Employee, Trip, CorporateAccount, LeaveRequest, SalaryAdvanceRequest, AttendanceStatus } from '../../types';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRequest[]>([]);

  // Load Data
  useEffect(() => {
    try {
      const loadedCorporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((c: any) => c && typeof c === 'object');
      setCorporates(loadedCorporates);

      let allEmployees: Employee[] = [];
      let allTrips: Trip[] = [];
      let allBranches: any[] = [];
      let allLeaves: LeaveRequest[] = [];
      let allAdvances: SalaryAdvanceRequest[] = [];

      if (isSuperAdmin) {
        // Load Admin Data
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]').filter((item: any) => item && typeof item === 'object');
        const adminTrips = JSON.parse(localStorage.getItem('trips_data') || '[]').filter((item: any) => item && typeof item === 'object');
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]').filter((item: any) => item && typeof item === 'object');
        // Note: Global lists like leave_history often store all, but if namespaced:
        const adminLeaves = JSON.parse(localStorage.getItem('leave_history') || '[]'); 
        const adminAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');

        allEmployees = [...adminStaff];
        allTrips = [...adminTrips];
        allBranches = [...adminBranches];
        allLeaves = [...adminLeaves]; // Assuming centralized storage for simplicity in this demo structure
        allAdvances = [...adminAdvances];

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
        
        // Filter global arrays for current session if not separated
        const globalLeaves = JSON.parse(localStorage.getItem('leave_history') || '[]');
        allLeaves = globalLeaves.filter((l: any) => l.corporateId === sessionId);
        
        const globalAdvances = JSON.parse(localStorage.getItem('salary_advances') || '[]');
        allAdvances = globalAdvances.filter((a: any) => a.corporateId === sessionId);
      }

      setEmployees(allEmployees.length ? allEmployees : (isSuperAdmin ? MOCK_EMPLOYEES : []));
      setTrips(allTrips);
      setBranches(allBranches);
      setLeaves(allLeaves);
      setAdvances(allAdvances);

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

  // --- NEW: Pending Requests Logic ---
  const pendingRequests = useMemo(() => {
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').map(l => ({
      id: l.id,
      type: 'Leave',
      title: `${l.type} Request`,
      subtitle: `${l.days} Day(s) • ${l.reason}`,
      date: l.appliedOn,
      personId: l.employeeId,
      link: '/admin/employee-settings' // Redirect to leave approval
    }));

    const pendingAdvances = advances.filter(a => a.status === 'Pending').map(a => ({
      id: a.id,
      type: 'Advance',
      title: 'Salary Advance',
      subtitle: `₹${a.amountRequested} • ${a.reason}`,
      date: a.requestDate,
      personId: a.employeeId,
      link: '/admin/payroll' // Redirect to advance approval
    }));

    // Combine and Sort by newest
    const combined = [...pendingLeaves, ...pendingAdvances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Enrich with Employee Name
    return combined.map(req => {
      const emp = employees.find(e => e.id === req.personId);
      return { ...req, personName: emp ? emp.name : 'Unknown Employee', personAvatar: emp ? emp.avatar : '' };
    }).slice(0, 5); // Top 5
  }, [leaves, advances, employees]);

  // --- NEW: Recent Staff Login Logic ---
  const recentStaffActivity = useMemo(() => {
     // Flatten onlineHistory from all employees
     const activityList: { id: string; name: string; role: string; avatar: string; status: 'online' | 'offline'; time: string; }[] = [];
     
     employees.forEach(emp => {
        if (emp.onlineHistory && emp.onlineHistory.length > 0) {
            // Get the last 3 events for each employee to build a feed
            const events = [...emp.onlineHistory].reverse().slice(0, 3);
            events.forEach(event => {
                activityList.push({
                    id: emp.id + event.timestamp,
                    name: emp.name,
                    role: emp.role,
                    avatar: emp.avatar,
                    status: event.status, // 'online' or 'offline'
                    time: event.timestamp
                });
            });
        }
     });

     // Sort by time descending
     return activityList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
  }, [employees]);

  // --- NEW: Schedule & Booking Logic ---
  const scheduleData = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      // Filter for Today's Scheduled Trips
      const todayTrips = trips.filter(t => t && t.date === todayStr);
      // Filter for Upcoming (Future) Trips
      const upcomingTrips = trips.filter(t => t && t.date > todayStr);
      
      // Sort upcoming by date ascending (soonest first)
      upcomingTrips.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
          todayCount: todayTrips.length,
          upcomingCount: upcomingTrips.length,
          todayList: todayTrips,
          upcomingList: upcomingTrips.slice(0, 5) // Show next 5
      };
  }, [trips]);


  // Stats Calculation
  const stats = useMemo(() => {
    const totalRevenue = filteredTrips.reduce((sum, t) => sum + (Number(t.totalPrice) || 0), 0);
    const totalTrips = filteredTrips.length;
    const completedTrips = filteredTrips.filter(t => t.bookingStatus === 'Completed').length;
    
    const activeStaffList = filteredEmployees.filter(e => e.status !== 'Inactive');
    const activeStaffCount = activeStaffList.length;

    // Calculate Today's Attendance
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const presentToday = activeStaffList.reduce((count, emp) => {
       // Get attendance records for this employee for current month
       // Note: In a real app, optimize this to not read storage inside reduce if possible, 
       // but getEmployeeAttendance is fast for small datasets.
       const attendance = getEmployeeAttendance(emp, today.getFullYear(), today.getMonth());
       const todayRecord = attendance.find(a => a.date === todayStr);
       
       if (todayRecord && (todayRecord.status === AttendanceStatus.PRESENT || todayRecord.status === AttendanceStatus.HALF_DAY)) {
           return count + 1;
       }
       return count;
    }, 0);

    return { totalRevenue, totalTrips, completedTrips, activeStaff: activeStaffCount, presentToday };
  }, [filteredTrips, filteredEmployees]);

  const revenueData = useMemo(() => {
    if (filterType === 'Daily') {
        const typeCounts: Record<string, number> = {};
        filteredTrips.forEach(t => {
            typeCounts[t.transportType] = (typeCounts[t.transportType] || 0) + (Number(t.totalPrice) || 0);
        });
        return Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] }));
    } else {
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
              <p className="text-xs font-bold text-gray-500 uppercase">Staff Attendance</p>
              <h3 className="text-2xl font-bold text-purple-600 flex items-baseline gap-1">
                 {stats.presentToday} <span className="text-sm text-gray-400 font-normal">/ {stats.activeStaff}</span>
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Present Today</p>
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

      {/* QUICK ACCESS & SCHEDULES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Schedule & Bookings Widget */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-500" /> Schedules & Bookings
              </h3>
              <div className="flex gap-2">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                     Today: {scheduleData.todayCount}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">
                     Upcoming: {scheduleData.upcomingCount}
                  </span>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scheduleData.todayList.length === 0 && scheduleData.upcomingList.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                    <Calendar className="w-8 h-8 mb-2 opacity-20" />
                    No scheduled trips found.
                 </div>
              ) : (
                 <>
                    {/* Today's Section */}
                    {scheduleData.todayList.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Today's Schedule</h4>
                            <div className="space-y-2">
                                {scheduleData.todayList.map(t => (
                                    <div key={t.id} className="p-2 border border-emerald-100 bg-emerald-50/50 rounded-lg flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-bold text-gray-800">{t.userName}</p>
                                            <p className="text-xs text-gray-500">{t.pickup} → {t.drop || 'Drop'}</p>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-100">{t.bookingStatus}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Section */}
                    {scheduleData.upcomingList.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">Upcoming</h4>
                            <div className="space-y-2">
                                {scheduleData.upcomingList.map(t => (
                                    <div key={t.id} className="p-2 border border-gray-100 rounded-lg flex justify-between items-center text-sm hover:bg-gray-50">
                                        <div>
                                            <p className="font-bold text-gray-800">{t.userName} <span className="text-gray-400 font-normal text-xs">({new Date(t.date).toLocaleDateString()})</span></p>
                                            <p className="text-xs text-gray-500">{t.tripCategory} - {t.transportType}</p>
                                        </div>
                                        <button onClick={() => navigate('/admin/trip-earning')} className="text-xs text-blue-600 hover:underline">View</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </>
              )}
           </div>
        </div>

        {/* Pending Approvals (Kept from original) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-80">
           <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-orange-500" /> Pending Approvals
              </h3>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                 {pendingRequests.length} New
              </span>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {pendingRequests.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                    <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
                    All caught up! No pending requests.
                 </div>
              ) : (
                 pendingRequests.map(req => (
                    <div key={req.id + req.type} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${req.type === 'Leave' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                             {req.type === 'Leave' ? <FileText className="w-4 h-4"/> : <CreditCard className="w-4 h-4"/>}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-gray-800">{req.personName}</p>
                             <p className="text-xs text-gray-500">{req.title} • {req.subtitle}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => navigate(req.link)}
                         className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
                       >
                         View <ArrowRight className="w-3 h-3" />
                       </button>
                    </div>
                 ))
              )}
           </div>
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
