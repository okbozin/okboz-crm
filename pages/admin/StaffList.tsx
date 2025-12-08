import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Filter, Edit2, Trash2, 
  MapPin, Phone, Mail, UserCheck, UserX, Building2,
  MoreVertical, CheckCircle
} from 'lucide-react';
import { Employee, CorporateAccount } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

// --- Helpers ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';

const getRandomColor = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const StaffList: React.FC = () => {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Data Loading Helper
  const getListFromStorage = (key: string, defaultValue: any[] = []) => {
      try {
          const saved = localStorage.getItem(key);
          if (!saved) return defaultValue;
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
              return parsed.filter((item: any) => item && typeof item === 'object');
          }
          return defaultValue;
      } catch (e) {
          console.error(`Error parsing ${key}`, e);
          return defaultValue;
      }
  };

  // Load Data
  useEffect(() => {
    try {
      // Load Corporates
      const loadedCorporates = getListFromStorage('corporate_accounts');
      setCorporates(loadedCorporates);

      // Load Branches
      let allBranchesList: any[] = [];
      if (isSuperAdmin()) {
          const adminBranches = getListFromStorage('branches_data');
          allBranchesList = [...adminBranches];
          loadedCorporates.forEach((c: any) => {
             const cBranches = getListFromStorage(`branches_data_${c.email}`);
             allBranchesList = [...allBranchesList, ...cBranches];
          });
      } else {
          const key = `branches_data_${getSessionId()}`;
          allBranchesList = getListFromStorage(key);
      }
      setBranches(allBranchesList);

      // Load Employees
      const loadEmployees = () => {
          let allEmployees: Employee[] = [];
          if (isSuperAdmin()) {
              const adminStaff = getListFromStorage('staff_data');
              allEmployees = [...adminStaff];
              loadedCorporates.forEach((c: any) => {
                 const cStaff = getListFromStorage(`staff_data_${c.email}`);
                 allEmployees = [...allEmployees, ...cStaff.map((s: any) => ({ ...s, corporateId: c.email, corporateName: c.companyName }))];
              });
          } else {
              const key = `staff_data_${getSessionId()}`;
              allEmployees = getListFromStorage(key);
          }
          setEmployees(allEmployees.length ? allEmployees : (isSuperAdmin() ? MOCK_EMPLOYEES : []));
      };

      loadEmployees();
      
      // Listen for storage changes to auto-refresh
      window.addEventListener('storage', loadEmployees);
      return () => window.removeEventListener('storage', loadEmployees);

    } catch (e) {
      console.error("Error loading staff data", e);
    }
  }, []);

  // Filtered employees for display
  const filteredEmployees = useMemo(() => {
    let list = employees;

    // Corporate Filter
    if (isSuperAdmin() && filterCorporate !== 'All') {
        list = list.filter(emp => emp && emp.corporateId === filterCorporate);
    } 

    // Branch Filter
    if (filterBranch !== 'All') {
        list = list.filter(emp => emp && emp.branch === filterBranch);
    }

    // Status Filter
    if (filterStatus !== 'All') {
        list = list.filter(emp => emp && emp.status === filterStatus);
    }

    // Search Term Filter
    if (searchTerm) {
      list = list.filter(emp => 
        emp && (
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (emp.phone && emp.phone.includes(searchTerm))
        )
      );
    }
    return list;
  }, [employees, filterCorporate, filterBranch, filterStatus, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="w-8 h-8 text-emerald-600" /> Staff Management
          </h2>
          <p className="text-gray-500">Manage your team members and access.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
               type="text" 
               placeholder="Search by name, email, or phone..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {isSuperAdmin() && (
               <select 
                  value={filterCorporate} 
                  onChange={(e) => setFilterCorporate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[150px]"
               >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
               </select>
            )}
            
            <select 
               value={filterBranch} 
               onChange={(e) => setFilterBranch(e.target.value)}
               className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[130px]"
            >
               <option value="All">All Branches</option>
               {branches.map((b: any, i: number) => <option key={i} value={b.name}>{b.name}</option>)}
            </select>

            <select 
               value={filterStatus} 
               onChange={(e) => setFilterStatus(e.target.value)}
               className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]"
            >
               <option value="All">All Status</option>
               <option value="Active">Active</option>
               <option value="Inactive">Inactive</option>
            </select>
         </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredEmployees.map(emp => {
            if (!emp) return null;
            const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const avatarColor = getRandomColor(emp.name);

            return (
              <div key={emp.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
                 
                 {/* Card Header: Avatar & Actions */}
                 <div className="flex justify-between items-start mb-3">
                    <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                       {initials}
                    </div>
                    <div className="flex gap-1">
                        <button className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Edit">
                           <Edit2 className="w-4 h-4"/>
                        </button>
                        <button className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" title="Delete">
                           <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                 </div>

                 {/* Identity */}
                 <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{emp.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 font-medium">{emp.role} • {emp.department}</p>
                 </div>

                 {/* Contact & Location Details */}
                 <div className="space-y-2.5 text-sm text-gray-600 mb-4 flex-1">
                    <div className="flex items-center gap-2">
                       <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                       <span className="truncate" title={emp.email}>{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                       <span>{emp.phone}</span>
                    </div>
                    {emp.branch && (
                        <div className="flex items-center gap-2">
                           <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                           <span className="truncate" title={emp.branch}>{emp.branch}</span>
                        </div>
                    )}
                    
                    {/* Branch/Location Pill */}
                    {emp.branch && (
                        <div className="mt-2">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-100 uppercase tracking-wide">
                                <Building2 className="w-3 h-3" />
                                {emp.branch}
                            </span>
                        </div>
                    )}
                 </div>

                 {/* Footer: Status & Indicator */}
                 <div className="pt-4 mt-auto border-t border-gray-100 flex justify-between items-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                       emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                       {emp.status}
                    </span>
                    
                    {/* Online/Offline Indicator or simple dot */}
                    <div className="relative">
                        {emp.isOnline ? (
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full block" title="Online"></span>
                        ) : (
                            <span className="w-2.5 h-2.5 bg-red-400 rounded-full block" title="Offline"></span>
                        )}
                        {emp.isOnline && <span className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75"></span>}
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

      {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
             <div className="flex flex-col items-center">
                 <Users className="w-12 h-12 text-gray-300 mb-3" />
                 <p className="text-lg font-medium text-gray-600">No employees found</p>
                 <p className="text-sm">Try adjusting your filters or search query.</p>
             </div>
          </div>
      )}
      
      {/* Modal Placeholder (Simplified for fix) */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
               <h3 className="text-xl font-bold mb-4">Add Employee</h3>
               <p className="text-gray-500 mb-6">This feature requires full modal implementation. This is a placeholder to resolve compilation.</p>
               <div className="flex justify-end">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffList;