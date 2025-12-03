
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Download, X, Save,
  User, Car, MapPin, DollarSign, Trash2, Edit2, 
  PieChart as PieChartIcon, TrendingUp, Building2, RefreshCcw, Calculator, Filter
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

interface Trip {
  id: string;
  tripId: string;
  date: string;
  branch: string;
  bookingType: string;
  transportType: string;
  tripCategory: string;
  bookingStatus: string;
  cancelBy?: string;
  userName: string;
  userMobile: string;
  driverName?: string;
  driverMobile?: string;
  tripPrice: number;
  adminCommission: number;
  tax: number;
  waitingCharge: number;
  discount: number;
  cancellationCharge: number;
  totalPrice: number;
  remarks?: string;
  ownerId?: string;
  ownerName?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const TripBooking: React.FC = () => {
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

  const [branches, setBranches] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All'); 
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const initialFormState = {
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
    tripPrice: 0,
    adminCommission: 0,
    tax: 0,
    waitingCharge: 0,
    discount: 0,
    cancellationCharge: 0,
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    try {
      const branchKey = isSuperAdmin ? 'branches_data' : `branches_data_${sessionId}`;
      
      let allBranches: any[] = [];
      
      if (isSuperAdmin) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
          allBranches = [...adminBranches];
          const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          corporates.forEach((c: any) => {
             const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
             allBranches = [...allBranches, ...cBranches];
          });
      } else {
          const saved = localStorage.getItem(branchKey);
          if (saved) allBranches = JSON.parse(saved);
      }
      
      const uniqueBranchNames = Array.from(new Set(allBranches.map((b: any) => b.name).filter(Boolean)));
      setBranches(uniqueBranchNames);
    } catch (e) {}
  }, [isSuperAdmin, sessionId]);

  useEffect(() => {
    if (isSuperAdmin) {
        const headOfficeTrips = trips.filter(t => t.ownerId === 'admin');
        const cleanTrips = headOfficeTrips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem('trips_data', JSON.stringify(cleanTrips));
    } else {
        const key = `trips_data_${sessionId}`;
        const cleanTrips = trips.map(({ownerId, ownerName, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(cleanTrips));
    }
  }, [trips, isSuperAdmin, sessionId]);

  // --- Robust Filtering Logic ---
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch = 
        t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userMobile.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'All' || t.bookingStatus === statusFilter;
      const matchesBranch = branchFilter === 'All' || (t.branch && t.branch === branchFilter);
      
      // String comparison for dates (YYYY-MM-DD) matches reliably
      const tripDate = t.date;
      let matchesDate = true;
      if (fromDate && toDate) {
        matchesDate = tripDate >= fromDate && tripDate <= toDate;
      } else if (fromDate) {
        matchesDate = tripDate >= fromDate;
      } else if (toDate) {
        matchesDate = tripDate <= toDate;
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesDate;
    });
  }, [trips, searchTerm, statusFilter, branchFilter, fromDate, toDate]);

  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};
    
    filteredTrips.forEach(t => {
        statusCounts[t.bookingStatus] = (statusCounts[t.bookingStatus] || 0) + 1;
        revenueMap[t.date] = (revenueMap[t.date] || 0) + t.totalPrice;
    });

    const pieData = Object.keys(statusCounts).map((key) => ({ 
        name: key, 
        value: statusCounts[key],
        color: key === 'Completed' ? '#10b981' : key === 'Cancelled' ? '#ef4444' : key === 'Confirmed' ? '#3b82f6' : '#f59e0b'
    }));

    const barData = Object.keys(revenueMap).sort().map(date => ({
        name: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        revenue: revenueMap[date]
    }));

    return { pieData, barData };
  }, [filteredTrips]);

  const totalPrice = useMemo(() => {
    const price = Number(formData.tripPrice) || 0;
    const comm = Number(formData.adminCommission) || 0;
    const tax = Number(formData.tax) || 0;
    const waiting = Number(formData.waitingCharge) || 0;
    const cancel = Number(formData.cancellationCharge) || 0;
    const discount = Number(formData.discount) || 0;

    return price + comm + tax + waiting + cancel - discount; 
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tripId || !formData.date || !formData.userName) {
      alert("Please fill all required fields (*)");
      return;
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
      ownerId: isSuperAdmin ? 'admin' : sessionId,
      ownerName: isSuperAdmin ? 'Head Office' : 'My Branch'
    };

    if (editingId) {
      setTrips(prev => prev.map(t => t.id === editingId ? { ...t, ...tripData, ownerId: t.ownerId, ownerName: t.ownerName } : t));
    } else {
      setTrips(prev => [tripData, ...prev]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setFormData({
      branch: trip.branch,
      tripId: trip.tripId,
      date: trip.date,
      bookingType: trip.bookingType,
      transportType: trip.transportType,
      tripCategory: trip.tripCategory,
      bookingStatus: trip.bookingStatus,
      cancelBy: trip.cancelBy || '',
      userName: trip.userName,
      userMobile: trip.userMobile,
      driverName: trip.driverName || '',
      driverMobile: trip.driverMobile || '',
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
      setFromDate('');
      setToDate('');
  };

  // --- Export Handler ---
  const handleExport = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export.");
      return;
    }
    
    const headers = ["Trip ID", "Date", "Branch", "Customer", "Mobile", "Driver", "Type", "Status", "Price"];
    const rows = filteredTrips.map(t => [
      t.tripId, 
      t.date, 
      t.branch, 
      t.userName, 
      t.userMobile, 
      t.driverName || '-', 
      t.transportType, 
      t.bookingStatus, 
      t.totalPrice
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trips_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trip Booking</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "Manage all trips across Head Office & Agencies" : "Manage your branch trip records"}
          </p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> New Trip
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Total Trips</p>
           <h3 className="text-2xl font-bold text-gray-800">{trips.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Total Revenue</p>
           <h3 className="text-2xl font-bold text-emerald-600">₹{trips.reduce((sum, t) => sum + t.totalPrice, 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
           <h3 className="text-2xl font-bold text-blue-600">{trips.filter(t => t.bookingStatus === 'Completed').length}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
           <p className="text-xs font-bold text-gray-500 uppercase">Cancelled</p>
           <h3 className="text-2xl font-bold text-red-600">{trips.filter(t => t.bookingStatus === 'Cancelled').length}</h3>
        </div>
      </div>

      {/* Analytics Charts */}
      {filteredTrips.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-emerald-500" /> Booking Status (Selected Range)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData.pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" /> Revenue Trend (Selected Range)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.barData} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val) => `₹${val/1000}k`}/>
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Advanced Filter Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col bg-gray-50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
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
                
                {/* Action Buttons */}
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
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>
            
            {/* Collapsible Filters */}
            {showFilters && (
               <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2">
                   <select 
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                   >
                      <option value="All">All Branches</option>
                      {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
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
                   
                   <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-500 font-medium">From:</span>
                      <input 
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="text-sm outline-none bg-transparent text-gray-700"
                      />
                   </div>

                   <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-500 font-medium">To:</span>
                      <input 
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="text-sm outline-none bg-transparent text-gray-700"
                      />
                   </div>

                   {(searchTerm || statusFilter !== 'All' || branchFilter !== 'All' || fromDate || toDate) && (
                       <button 
                          onClick={handleResetFilters}
                          className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ml-auto"
                       >
                          <RefreshCcw className="w-4 h-4" /> Reset
                       </button>
                   )}
               </div>
            )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                 <tr>
                    <th className="px-6 py-4">Trip ID / Date</th>
                    {isSuperAdmin && <th className="px-6 py-4">Agency / Corporate</th>}
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Driver</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {filteredTrips.map(trip => (
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
                          <div className="font-medium text-gray-900">{trip.userName}</div>
                          <div className="text-xs text-gray-500">{trip.userMobile}</div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{trip.driverName || '-'}</div>
                          <div className="text-xs text-gray-500">{trip.driverMobile}</div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                             {trip.tripCategory} • {trip.transportType}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <div className="font-bold text-gray-900">₹{trip.totalPrice.toLocaleString()}</div>
                          <div className="text-xs text-emerald-600">Comm: ₹{trip.adminCommission.toFixed(0)}</div>
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
                 ))}
                 {filteredTrips.length === 0 && (
                    <tr>
                       <td colSpan={isSuperAdmin ? 9 : 8} className="text-center py-12 text-gray-500 bg-gray-50">
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
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Trip' : 'New Trip Booking'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Trip Basic Info */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> Trip Info</h4>
                       
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                          <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm">
                             <option value="">Select Branch</option>
                             {branches.map(b => <option key={b} value={b}>{b}</option>)}
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
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-purple-500"/> Financials</h4>
                       
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trip Price (₹) *</label>
                          <input type="number" name="tripPrice" value={formData.tripPrice || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm font-medium" placeholder="0" />
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Admin Commission</label>
                             <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                <input 
                                    type="number" 
                                    name="adminCommission" 
                                    value={formData.adminCommission || ''} 
                                    onChange={handleInputChange}
                                    className="w-full pl-5 p-2 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="0" 
                                />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tax</label>
                             <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                <input 
                                    type="number" 
                                    name="tax" 
                                    value={formData.tax || ''} 
                                    onChange={handleInputChange}
                                    className="w-full pl-5 p-2 border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="0" 
                                />
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Waiting Chg.</label>
                             <input type="number" name="waitingCharge" value={formData.waitingCharge || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cancel Chg.</label>
                             <input type="number" name="cancellationCharge" value={formData.cancellationCharge || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" placeholder="0" />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount</label>
                          <input type="number" name="discount" value={formData.discount || ''} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm text-red-600" placeholder="0" />
                       </div>

                       <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2">
                          <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Total Price</label>
                          <div className="text-2xl font-bold text-emerald-600">₹{totalPrice.toFixed(2)}</div>
                          <p className="text-[10px] text-emerald-600 mt-1">Includes tax & extras</p>
                       </div>
                    </div>
                 </div>

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

export default TripBooking;
