
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  MapPin, Phone, Mail, Building2,
  X, Save, Briefcase, Shield, User, CreditCard, Lock, Eye, EyeOff, AlertCircle
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

// IDs must match exactly with what is checked in Layout.tsx
const MODULE_PERMISSIONS = [
  { id: 'attendance', label: 'Attendance (Admin View)' },
  { id: 'staff_management', label: 'Staff Management' },
  { id: 'vendor_attachment', label: 'Vendor Attachment' },
  { id: 'branches', label: 'Branches' },
  { id: 'documents', label: 'Documents' },
  { id: 'payroll', label: 'Payroll' },
];

const StaffList: React.FC = () => {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  const initialFormState: Partial<Employee> = {
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    department: '',
    branch: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    status: 'Active',
    corporateId: isSuperAdmin() ? '' : getSessionId(),
    // Personal
    dob: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    homeAddress: '',
    // Emergency
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    // Banking
    accountNumber: '',
    ifsc: '',
    aadhar: '',
    pan: '',
    upiId: '',
    // Config
    allowedModules: [],
    attendanceConfig: {
      gpsGeofencing: false,
      qrScan: false,
      manualPunch: true,
      manualPunchMode: 'Anywhere' // Default to Anywhere
    },
    workingHours: '' // Shift ID
  };

  const [formData, setFormData] = useState<Partial<Employee>>(initialFormState);
  const [confirmPassword, setConfirmPassword] = useState('');

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
  const loadEmployees = () => {
      let allEmployees: Employee[] = [];
      if (isSuperAdmin()) {
          const adminStaff = getListFromStorage('staff_data');
          allEmployees = [...adminStaff];
          const loadedCorps = getListFromStorage('corporate_accounts');
          loadedCorps.forEach((c: any) => {
             const cStaff = getListFromStorage(`staff_data_${c.email}`);
             allEmployees = [...allEmployees, ...cStaff.map((s: any) => ({ ...s, corporateId: c.email, corporateName: c.companyName }))];
          });
      } else {
          const key = `staff_data_${getSessionId()}`;
          allEmployees = getListFromStorage(key);
      }
      setEmployees(allEmployees.length ? allEmployees : (isSuperAdmin() ? MOCK_EMPLOYEES : []));
  };

  useEffect(() => {
    try {
      // Load Corporates
      const loadedCorporates = getListFromStorage('corporate_accounts');
      setCorporates(loadedCorporates);

      // Load Branches
      let allBranchesList: any[] = [];
      if (isSuperAdmin()) {
          const adminBranches = getListFromStorage('branches_data');
          allBranchesList = [...adminBranches.map((b:any) => ({...b, owner: 'admin'}))];
          loadedCorporates.forEach((c: any) => {
             const cBranches = getListFromStorage(`branches_data_${c.email}`);
             allBranchesList = [...allBranchesList, ...cBranches.map((b:any) => ({...b, owner: c.email}))];
          });
      } else {
          const key = `branches_data_${getSessionId()}`;
          allBranchesList = getListFromStorage(key).map((b:any) => ({...b, owner: getSessionId()}));
      }
      setBranches(allBranchesList);

      // Load Shifts
      const loadedShifts = getListFromStorage(isSuperAdmin() ? 'company_shifts' : `company_shifts_${getSessionId()}`);
      setShifts(loadedShifts.length ? loadedShifts : [{name: 'General Shift (09:30-18:30)'}]);

      loadEmployees();
      
      window.addEventListener('storage', loadEmployees);
      return () => window.removeEventListener('storage', loadEmployees);

    } catch (e) {
      console.error("Error loading staff data", e);
    }
  }, []);

  // Filtered employees for display
  const filteredEmployees = useMemo(() => {
    let list = employees;

    if (isSuperAdmin() && filterCorporate !== 'All') {
        list = list.filter(emp => emp && emp.corporateId === filterCorporate);
    } 

    if (filterBranch !== 'All') {
        list = list.filter(emp => emp && emp.branch === filterBranch);
    }

    if (filterStatus !== 'All') {
        list = list.filter(emp => emp && emp.status === filterStatus);
    }

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

  // Form Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModuleToggle = (moduleId: string) => {
      const currentModules = formData.allowedModules || [];
      if (currentModules.includes(moduleId)) {
          setFormData(prev => ({ ...prev, allowedModules: currentModules.filter(id => id !== moduleId) }));
      } else {
          setFormData(prev => ({ ...prev, allowedModules: [...currentModules, moduleId] }));
      }
  };

  const handleAttendanceConfigChange = (key: keyof typeof initialFormState.attendanceConfig) => {
      setFormData(prev => ({
          ...prev,
          attendanceConfig: {
              ...prev.attendanceConfig!,
              [key]: !prev.attendanceConfig![key]
          }
      }));
  };

  const handleManualPunchModeChange = (mode: 'Anywhere' | 'BranchRadius') => {
      setFormData(prev => ({
          ...prev,
          attendanceConfig: {
              ...prev.attendanceConfig!,
              manualPunchMode: mode
          }
      }));
  };

  const handleOpenAdd = () => {
      setEditingId(null);
      setFormData(initialFormState);
      setConfirmPassword('');
      setIsModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({
          ...initialFormState, // Ensure structure
          ...emp,
          // Ensure nested objects exist and have default values if legacy data missing
          attendanceConfig: { 
              gpsGeofencing: false, 
              qrScan: false, 
              manualPunch: true,
              manualPunchMode: 'Anywhere', // Default if missing
              ...emp.attendanceConfig
          },
          allowedModules: emp.allowedModules || []
      });
      setConfirmPassword(emp.password || '');
      setIsModalOpen(true);
  };

  const handleDelete = (id: string, corporateId?: string) => {
      if(!window.confirm("Delete this employee?")) return;

      const targetCorpId = corporateId || 'admin';
      const storageKey = targetCorpId === 'admin' ? 'staff_data' : `staff_data_${targetCorpId}`;
      
      const currentList = getListFromStorage(storageKey);
      const updatedList = currentList.filter((e: any) => e.id !== id);
      
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      loadEmployees();
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name || !formData.phone) {
          alert("Name and Phone are required.");
          return;
      }

      if (formData.password && formData.password !== confirmPassword) {
          alert("Passwords do not match.");
          return;
      }

      let ownerId = 'admin';
      if (isSuperAdmin()) {
          if (formData.corporateId && formData.corporateId !== 'admin') {
              ownerId = formData.corporateId;
          }
      } else {
          ownerId = getSessionId();
      }

      const storageKey = ownerId === 'admin' ? 'staff_data' : `staff_data_${ownerId}`;
      const currentList = getListFromStorage(storageKey);

      if (editingId) {
          const updatedList = currentList.map((emp: any) => emp.id === editingId ? { ...emp, ...formData } : emp);
          localStorage.setItem(storageKey, JSON.stringify(updatedList));
      } else {
          const newEmployee: Employee = {
              id: `EMP-${Date.now()}`,
              name: formData.name || '',
              role: formData.role || 'Staff',
              department: formData.department || 'General',
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random`,
              joiningDate: formData.joiningDate || new Date().toISOString(),
              ...formData
          } as Employee;
          
          localStorage.setItem(storageKey, JSON.stringify([...currentList, newEmployee]));
      }
      
      setIsModalOpen(false);
      loadEmployees();
  };

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
          onClick={handleOpenAdd}
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
              <div key={emp.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col ${emp.status === 'Inactive' ? 'border-red-100 opacity-75' : 'border-gray-200'}`}>
                 
                 {/* Card Header: Avatar & Actions */}
                 <div className="flex justify-between items-start mb-3">
                    <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                       {initials}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleEdit(emp)} className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Edit">
                           <Edit2 className="w-4 h-4"/>
                        </button>
                        <button onClick={() => handleDelete(emp.id, emp.corporateId)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" title="Delete">
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
                       emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                       {emp.status}
                    </span>
                    
                    {/* Online/Offline Indicator */}
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

      {/* COMPREHENSIVE ADD/EDIT MODAL */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200 overflow-hidden">
               {/* Header */}
               <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                  <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                  <div className="flex items-center gap-4">
                      {/* Active/Inactive Toggle - Prominent in Header */}
                      <div className="flex bg-gray-200 rounded-lg p-1">
                         <button 
                            type="button" 
                            onClick={() => setFormData(p => ({...p, status: 'Active'}))} 
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.status === 'Active' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                            Active
                         </button>
                         <button 
                            type="button" 
                            onClick={() => setFormData(p => ({...p, status: 'Inactive'}))} 
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.status === 'Inactive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                            Inactive
                         </button>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                  </div>
               </div>
               
               {/* Scrollable Form Content */}
               <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white custom-scrollbar">
                   
                   {/* 1. Professional Details */}
                   <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                           <Briefcase className="w-4 h-4 text-emerald-600"/> Professional Details
                       </h4>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Full Name</label>
                               <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Email</label>
                               <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Phone</label>
                               <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                           </div>
                           
                           {/* Password Field */}
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Password</label>
                               <div className="relative">
                                   <input 
                                     name="password" 
                                     type={showPassword ? "text" : "password"} 
                                     value={formData.password} 
                                     onChange={handleInputChange} 
                                     className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                                     placeholder={editingId ? "Leave blank to keep current" : "Min 6 chars"}
                                   />
                                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                       {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                   </button>
                               </div>
                           </div>

                           {/* Confirm Password - Only show if password field has value */}
                           {formData.password && (
                               <div className="space-y-1 md:col-span-2">
                                   <label className="text-xs font-bold text-gray-500">Confirm Password</label>
                                   <input 
                                     type="password" 
                                     value={confirmPassword} 
                                     onChange={(e) => setConfirmPassword(e.target.value)} 
                                     className={`w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 ${confirmPassword && formData.password !== confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} 
                                     placeholder="Re-enter password"
                                   />
                                   {confirmPassword && formData.password !== confirmPassword && (
                                       <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Passwords do not match</p>
                                   )}
                               </div>
                           )}

                           {isSuperAdmin() && (
                               <div className="space-y-1 md:col-span-2">
                                   <label className="text-xs font-bold text-gray-500">Assign Corporate</label>
                                   <div className="relative">
                                       <select name="corporateId" value={formData.corporateId || 'admin'} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none">
                                           <option value="admin">Head Office</option>
                                           {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                                       </select>
                                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><Building2 className="w-4 h-4"/></div>
                                   </div>
                               </div>
                           )}

                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Branch</label>
                               <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select Branch</option>
                                   {branches.filter(b => b.owner === (formData.corporateId || 'admin')).map((b: any, i:number) => <option key={i} value={b.name}>{b.name}</option>)}
                               </select>
                           </div>

                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Department</label>
                               <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select</option>
                                   <option>Sales</option><option>HR</option><option>IT</option><option>Operations</option>
                               </select>
                           </div>

                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Role</label>
                               <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select</option>
                                   <option>Manager</option><option>Team Lead</option><option>Staff</option><option>Driver</option>
                               </select>
                           </div>

                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Monthly Salary (₹)</label>
                               <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                           </div>

                           <div className="space-y-1 md:col-span-2">
                               <label className="text-xs font-bold text-gray-500">Shift</label>
                               <select name="workingHours" value={formData.workingHours} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select Shift</option>
                                   {shifts.map((s: any, i: number) => (
                                       <option key={i} value={s.name}>{s.name} {s.start ? `(${s.start}-${s.end})` : ''}</option>
                                   ))}
                               </select>
                           </div>
                       </div>
                   </div>

                   {/* 2. Access & Configuration */}
                   <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600"/> Access & Configuration</h4>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                           
                           {/* Permissions */}
                           <div>
                               <label className="text-xs font-bold text-blue-600 uppercase mb-4 block flex items-center gap-2"><Lock className="w-3 h-3"/> Extra Access Permissions</label>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {MODULE_PERMISSIONS.map(mod => (
                                       <label key={mod.id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                                           <input 
                                             type="checkbox" 
                                             checked={(formData.allowedModules || []).includes(mod.id)} 
                                             onChange={() => handleModuleToggle(mod.id)}
                                             className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                           />
                                           <span className="truncate" title={mod.label}>{mod.label}</span>
                                       </label>
                                   ))}
                               </div>
                           </div>

                           {/* Attendance Config */}
                           <div className="lg:border-l lg:border-blue-200 lg:pl-8">
                               <label className="text-xs font-bold text-orange-600 uppercase mb-4 block flex items-center gap-2"><MapPin className="w-3 h-3"/> Attendance Config</label>
                               <div className="space-y-4">
                                   <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                       <span className="text-sm text-gray-700 font-medium">GPS Geofencing</span>
                                       <div 
                                         className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${formData.attendanceConfig?.gpsGeofencing ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                         onClick={() => handleAttendanceConfigChange('gpsGeofencing')}
                                       >
                                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.attendanceConfig?.gpsGeofencing ? 'translate-x-6' : 'translate-x-1'}`} />
                                       </div>
                                   </div>
                                   <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                       <span className="text-sm text-gray-700 font-medium">QR Scan</span>
                                       <div 
                                         className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${formData.attendanceConfig?.qrScan ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                         onClick={() => handleAttendanceConfigChange('qrScan')}
                                       >
                                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.attendanceConfig?.qrScan ? 'translate-x-6' : 'translate-x-1'}`} />
                                       </div>
                                   </div>
                                   {/* Manual Punch with Location Option */}
                                   <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                       <div className="flex items-center justify-between">
                                           <span className="text-sm text-gray-700 font-medium">Manual Punch (Web)</span>
                                           <div 
                                             className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${formData.attendanceConfig?.manualPunch ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                             onClick={() => handleAttendanceConfigChange('manualPunch')}
                                           >
                                               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.attendanceConfig?.manualPunch ? 'translate-x-6' : 'translate-x-1'}`} />
                                           </div>
                                       </div>
                                       
                                       {/* Sub-option: Location Restriction for Manual Punch */}
                                       {formData.attendanceConfig?.manualPunch && (
                                           <div className="pl-2 pt-2 border-t border-gray-100 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                                               <label className="text-xs font-bold text-gray-500">Allowed Location</label>
                                               <div className="flex gap-4">
                                                   <label className="flex items-center gap-2 cursor-pointer">
                                                       <input 
                                                           type="radio" 
                                                           name="manualPunchMode" 
                                                           checked={formData.attendanceConfig?.manualPunchMode === 'Anywhere'} 
                                                           onChange={() => handleManualPunchModeChange('Anywhere')}
                                                           className="text-emerald-600 focus:ring-emerald-500"
                                                       />
                                                       <span className="text-sm text-gray-600">Anywhere</span>
                                                   </label>
                                                   <label className="flex items-center gap-2 cursor-pointer">
                                                       <input 
                                                           type="radio" 
                                                           name="manualPunchMode" 
                                                           checked={formData.attendanceConfig?.manualPunchMode === 'BranchRadius'} 
                                                           onChange={() => handleManualPunchModeChange('BranchRadius')}
                                                           className="text-emerald-600 focus:ring-emerald-500"
                                                       />
                                                       <span className="text-sm text-gray-600">Branch Radius</span>
                                                   </label>
                                               </div>
                                               {formData.attendanceConfig?.manualPunchMode === 'BranchRadius' && (
                                                   <p className="text-[10px] text-orange-600 bg-orange-50 p-1.5 rounded flex items-center gap-1">
                                                       <AlertCircle className="w-3 h-3" /> Must be within branch range to punch.
                                                   </p>
                                               )}
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* 3. Personal Details */}
                   <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User className="w-4 h-4 text-purple-600"/> Personal Details</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Date of Birth</label>
                               <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Gender</label>
                               <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                               </select>
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Blood Group</label>
                               <input name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. O+" />
                           </div>
                           <div className="space-y-1 md:col-span-3">
                               <label className="text-xs font-bold text-gray-500">Marital Status</label>
                               <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select</option><option>Single</option><option>Married</option>
                               </select>
                           </div>
                           <div className="space-y-1 md:col-span-3">
                               <label className="text-xs font-bold text-gray-500">Home Address</label>
                               <textarea name="homeAddress" value={formData.homeAddress} onChange={handleInputChange} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                       </div>
                   </div>

                   {/* 4. Emergency Contact */}
                   <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-red-500"/> Emergency Contact</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Contact Name</label>
                               <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Contact Phone</label>
                               <input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Relationship</label>
                               <input name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Spouse, Father" />
                           </div>
                       </div>
                   </div>

                   {/* 5. Banking & KYC */}
                   <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500"/> Banking & KYC</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Aadhar Number</label>
                               <input name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">PAN Number</label>
                               <input name="pan" value={formData.pan} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none uppercase focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">Bank Account No.</label>
                               <input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-500">IFSC Code</label>
                               <input name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none uppercase focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div className="space-y-1 md:col-span-2">
                               <label className="text-xs font-bold text-gray-500">UPI ID</label>
                               <input name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. name@upi" />
                           </div>
                       </div>
                   </div>

               </form>

               {/* Footer */}
               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                   <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-white transition-colors">Cancel</button>
                   <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2">
                       <Save className="w-4 h-4" /> Save Employee
                   </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffList;
