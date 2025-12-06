
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle, Loader2, ExternalLink, Clock, Shield } from 'lucide-react';
import { Employee, Branch } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService';

interface Shift {
    id: number;
    name: string;
    start: string;
    end: string;
}

// Extended interface for UI display
interface DisplayEmployee extends Employee {
    franchiseName?: string;
    franchiseId?: string;
}

// Reusable ToggleSwitch component
const ToggleSwitch = ({ label, checked, onChange, disabled = false }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
        <span className="font-medium text-gray-700 text-sm">{label}</span>
        <button 
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const StaffList: React.FC = () => {
  // Determine Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // 1. Declare foundational states
  const [allBranchesList, setAllBranchesList] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  
  // 2. Load Employees Logic
  const loadEmployees = useCallback(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allData: DisplayEmployee[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                allData = [...allData, ...parsed.map((e: any) => ({...e, corporateId: 'admin', franchiseName: 'Head Office', franchiseId: 'admin'}))];
            } catch (e) {}
        }

        // 2. Corporate Data
        const savedCorporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        savedCorporates.forEach((corp: any) => {
            const cData = localStorage.getItem(`staff_data_${corp.email}`);
            if (cData) {
                try {
                    const parsed = JSON.parse(cData);
                    const tagged = parsed.map((e: any) => ({...e, corporateId: corp.email, franchiseName: corp.companyName, franchiseId: corp.email }));
                    allData = [...allData, ...tagged];
                } catch (e) {}
            }
        });
        return allData;
    } else {
        // --- REGULAR FRANCHISE LOGIC ---
        const key = `staff_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved).map((e: any) => ({...e, corporateId: sessionId, franchiseName: 'My Branch', franchiseId: sessionId}));
            } catch (e) { console.error(e); }
        }
        return [];
    }
  }, [isSuperAdmin, sessionId]);

  const [employees, setEmployees] = useState<DisplayEmployee[]>(loadEmployees);

  // Listen for external updates (e.g. employee changing password)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        // Refresh if staff data changes (including password updates from SecurityAccount page)
        if (e.key && e.key.includes('staff_data')) {
            setEmployees(loadEmployees());
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadEmployees]);

  // Initial Form State
  const initialFormState = {
    name: '', email: '', phone: '', password: '',
    role: '', department: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '25000', branch: '', 
    status: 'Active',
    workingHours: '', 
    weekOff: 'Sunday', aadhar: '', pan: '', accountNumber: '', ifsc: '',
    liveTracking: false, allowRemotePunch: true,
    attendanceConfig: { gpsGeofencing: false, qrScan: false, manualPunch: true },
    allowedModules: [] as string[],
    dob: '', gender: '', bloodGroup: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
    homeAddress: '', maritalStatus: '', spouseName: '', children: 0,
    idProof1Url: '', idProof2Url: '',
    corporateId: isSuperAdmin ? 'admin' : sessionId
  };

  const [formData, setFormData] = useState<any>(initialFormState);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // File Upload States
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Load Settings
  useEffect(() => {
    // 1. Corporates
    if (isSuperAdmin) {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(corps);
        } catch(e) {}
    }

    // 2. Branches
    let aggregatedBranches: any[] = [];
    if (isSuperAdmin) {
        try {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            aggregatedBranches = [...aggregatedBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin', owner: 'admin'}))];
        } catch(e) {}
        
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cData = localStorage.getItem(`branches_data_${c.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData);
                        aggregatedBranches = [...aggregatedBranches, ...parsed.map((b: any) => ({...b, corporateId: c.email, corporateName: c.companyName, owner: c.email}))];
                    } catch (e) {}
                }
            });
        } catch(e) {}
    } else {
        const key = `branches_data_${sessionId}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                aggregatedBranches = JSON.parse(saved).map((b: any) => ({...b, corporateId: sessionId, corporateName: 'My Branch', owner: sessionId}));
            }
        } catch(e) {}
    }
    setAllBranchesList(aggregatedBranches);

    // 3. Settings (Shifts, Depts, Roles)
    try {
        const suffix = isSuperAdmin ? '' : `_${sessionId}`;
        
        // Shifts
        let savedShifts = localStorage.getItem(`company_shifts${suffix}`);
        if (!savedShifts && !isSuperAdmin) savedShifts = localStorage.getItem('company_shifts');
        setShifts(savedShifts ? JSON.parse(savedShifts) : [{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);

        // Departments
        let savedDepts = localStorage.getItem(`company_departments${suffix}`);
        if (!savedDepts && !isSuperAdmin) savedDepts = localStorage.getItem('company_departments');
        setDepartmentOptions(savedDepts ? JSON.parse(savedDepts) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']);

        // Roles
        let savedRoles = localStorage.getItem(`company_roles${suffix}`);
        if (!savedRoles && !isSuperAdmin) savedRoles = localStorage.getItem('company_roles');
        setRoleOptions(savedRoles ? JSON.parse(savedRoles) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Driver']);

    } catch(e) {}

  }, [isSuperAdmin, sessionId]);

  // Derived state for available branches in form
  const formAvailableBranches = useMemo(() => {
    let list = allBranchesList;
    const targetOwner = formData.corporateId || (isSuperAdmin ? 'admin' : sessionId);
    if (targetOwner !== 'All') {
        list = list.filter(b => b.owner === targetOwner);
    }
    return list;
  }, [allBranchesList, formData.corporateId, isSuperAdmin, sessionId]);

  // Persist Logic
  useEffect(() => {
    if (isSuperAdmin) {
        // Segregated save for Admin
        const adminEmployees = employees.filter(e => e.corporateId === 'admin');
        const cleanAdmin = adminEmployees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem('staff_data', JSON.stringify(cleanAdmin));

        // Save Corporate Employees
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
             const cEmployees = employees.filter(e => e.corporateId === c.email);
             const cleanC = cEmployees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
             localStorage.setItem(`staff_data_${c.email}`, JSON.stringify(cleanC));
        });
    } else {
        // Simple save for Corporate
        const key = `staff_data_${sessionId}`;
        const cleanEmployees = employees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(cleanEmployees));
    }
  }, [employees, isSuperAdmin, corporates]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Access checked safely
    const checked = (e.target as HTMLInputElement).checked; 
    
    if (type === 'checkbox') {
        setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('attendanceConfig.')) {
        const field = name.split('.')[1];
        setFormData((prev: any) => ({
            ...prev,
            attendanceConfig: {
                ...prev.attendanceConfig,
                [field]: checked
            }
        }));
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
    setPasswordError('');
  };

  const handleModuleToggle = (module: string) => {
    setFormData((prev: any) => {
        const currentModules = prev.allowedModules || [];
        if (currentModules.includes(module)) {
            return { ...prev, allowedModules: currentModules.filter((m: string) => m !== module) };
        } else {
            return { ...prev, allowedModules: [...currentModules, module] };
        }
    });
  };

  const handleOpenModal = () => {
    setEditingEmployeeId(null);
    setFormData({
        ...initialFormState,
        role: roleOptions[0] || 'Executive',
        department: departmentOptions[0] || 'Operations',
        workingHours: shifts[0]?.name || 'General Shift',
        branch: formAvailableBranches[0]?.name || '',
        corporateId: isSuperAdmin ? (filterCorporate === 'All' ? 'admin' : filterCorporate) : sessionId,
    });
    setPasswordConfirm('');
    setPasswordError('');
    setIsModalOpen(true);
  };

  const handleEdit = (employee: DisplayEmployee) => {
    setEditingEmployeeId(employee.id);
    setFormData({
        ...employee,
        joiningDate: employee.joiningDate.split('T')[0],
        attendanceConfig: employee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true },
        allowedModules: employee.allowedModules || [],
        password: employee.password || '', // Pre-fill password so admin can view/edit
        corporateId: employee.corporateId || (isSuperAdmin ? 'admin' : sessionId),
        branch: employee.branch && formAvailableBranches.some(b => b.name === employee.branch) ? employee.branch : (formAvailableBranches[0]?.name || ''),
        dob: employee.dob ? employee.dob.split('T')[0] : '',
    });
    setPasswordConfirm(employee.password || '');
    setPasswordError('');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setEmployees(employees.filter(emp => emp.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setPasswordError("Please fill in required fields (Name, Email, Phone).");
      return;
    }

    if (!editingEmployeeId) {
      if (!formData.password) {
        setPasswordError("Password is required for new employees.");
        return;
      }
      if (formData.password !== passwordConfirm) {
        setPasswordError("Passwords do not match.");
        return;
      }
    } else {
        // If editing and password was changed
        if (formData.password && formData.password !== passwordConfirm) {
             setPasswordError("Passwords do not match.");
             return;
        }
    }

    const targetCorporateId = formData.corporateId;

    if (editingEmployeeId) {
        setEmployees(prev => prev.map(emp => {
            if (emp.id === editingEmployeeId) {
                return {
                    ...emp,
                    ...formData,
                    corporateId: targetCorporateId,
                    franchiseName: corporates.find((c: any) => c.email === targetCorporateId)?.companyName || 'Head Office',
                };
            }
            return emp;
        }));
    } else {
        if (employees.some(e => e.email?.toLowerCase() === formData.email.toLowerCase())) {
            setPasswordError("An employee with this email already exists.");
            return;
        }

        const newEmployee: DisplayEmployee = {
            id: `E${Date.now()}`,
            ...formData,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
            corporateId: targetCorporateId,
            franchiseName: corporates.find((c: any) => c.email === targetCorporateId)?.companyName || 'Head Office',
            attendanceLocationStatus: 'idle',
            cameraPermissionStatus: 'idle'
        };
        setEmployees(prev => [newEmployee, ...prev]);
    }
    setIsModalOpen(false);
  };

  // Filter Logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone?.includes(searchTerm);
    const matchesDepartment = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : true;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesBranch && matchesCorporate;
  });

  // Filter available branches for the Filter Bar
  const filterAvailableBranches = useMemo(() => {
    let list = allBranchesList;
    if (filterCorporate !== 'All' && isSuperAdmin) {
        list = list.filter(b => b.owner === filterCorporate);
    }
    return list;
  }, [allBranchesList, filterCorporate, isSuperAdmin]);

  // ID Proof Upload
  const handleIdProofUpload = async (file: File | null, field: 'idProof1Url' | 'idProof2Url') => {
    if (!file) return;
    const setter = field === 'idProof1Url' ? setUploadingAadhar : setUploadingPan;
    setter(true);
    try {
        const path = `employee_docs/${editingEmployeeId || 'new'}/${field}_${file.name}`;
        const url = await uploadFileToCloud(file, path);
        const finalUrl = url || await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        setFormData((prev: any) => ({ ...prev, [field]: finalUrl }));
    } catch (error) {
        console.error("Upload failed", error);
    } finally {
        setter(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">Manage employees, roles, permissions and access.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> New Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {isSuperAdmin && (
              <select 
                value={filterCorporate} 
                onChange={(e) => setFilterCorporate(e.target.value)} 
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm"
              >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
              </select>
          )}

          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm">
              <option value="All">All Branches</option>
              {filterAvailableBranches.map((b: any, i) => <option key={i} value={b.name}>{b.name}</option>)}
          </select>

          <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm">
              <option value="All">All Departments</option>
              {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
      </div>

      {/* Staff List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Role & Dept</th>
                        {isSuperAdmin && <th className="px-6 py-4">Corporate</th>}
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <img src={emp.avatar} alt="" className="w-9 h-9 rounded-full border border-gray-200" />
                                    <div>
                                        <div className="font-bold text-gray-900">{emp.name}</div>
                                        <div className="text-xs text-gray-500">{emp.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-800 font-medium">{emp.role}</div>
                                <div className="text-xs text-gray-500">{emp.department}</div>
                            </td>
                            {isSuperAdmin && (
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                        {emp.franchiseName}
                                    </span>
                                </td>
                            )}
                            <td className="px-6 py-4 text-gray-600">{emp.branch}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {emp.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEdit(emp)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(emp.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">No employees found.</td></tr>
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
                 <h3 className="font-bold text-gray-800 text-lg">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                 <form id="staffForm" onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input required name="name" value={formData.name} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input required type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                            <input required name="phone" value={formData.phone} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingEmployeeId ? '(Edit to change)' : '*'}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleFormChange} 
                                    className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    placeholder={editingEmployeeId ? "••••••" : "Create password"}
                                />
                                <input 
                                    type="text" 
                                    value={passwordConfirm} 
                                    onChange={(e) => setPasswordConfirm(e.target.value)} 
                                    className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    placeholder="Confirm password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Work Details */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Briefcase className="w-3 h-3"/> Work Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Owner</label>
                                    <select name="corporateId" value={formData.corporateId} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-sm">
                                        <option value="admin">Head Office</option>
                                        {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <select name="branch" value={formData.branch} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-sm">
                                    <option value="">Select Branch</option>
                                    {formAvailableBranches.map((b: any, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select name="department" value={formData.department} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-sm">
                                    {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select name="role" value={formData.role} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-sm">
                                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salary (CTC)</label>
                                <input type="number" name="salary" value={formData.salary} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                                <select name="workingHours" value={formData.workingHours} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white outline-none text-sm">
                                    {shifts.map(s => <option key={s.id} value={s.name}>{s.name} ({s.start}-{s.end})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Extra Permissions & Attendance Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-2"><Shield className="w-3 h-3"/> Extra Access Permissions</h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100 hover:border-blue-300 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.allowedModules?.includes('expenses')} 
                                        onChange={() => handleModuleToggle('expenses')}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Expenses Module</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-blue-100 hover:border-blue-300 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.allowedModules?.includes('documents')} 
                                        onChange={() => handleModuleToggle('documents')}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Documents Module</span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h4 className="text-xs font-bold text-orange-700 uppercase mb-3 flex items-center gap-2"><ScanLine className="w-3 h-3"/> Attendance Config</h4>
                            <div className="space-y-2">
                                <ToggleSwitch label="GPS Geofencing" checked={formData.attendanceConfig.gpsGeofencing} onChange={() => setFormData({...formData, attendanceConfig: {...formData.attendanceConfig, gpsGeofencing: !formData.attendanceConfig.gpsGeofencing}})} />
                                <ToggleSwitch label="QR Scan" checked={formData.attendanceConfig.qrScan} onChange={() => setFormData({...formData, attendanceConfig: {...formData.attendanceConfig, qrScan: !formData.attendanceConfig.qrScan}})} />
                                <ToggleSwitch label="Manual Punch (Web)" checked={formData.attendanceConfig.manualPunch} onChange={() => setFormData({...formData, attendanceConfig: {...formData.attendanceConfig, manualPunch: !formData.attendanceConfig.manualPunch}})} />
                            </div>
                        </div>
                    </div>

                    {/* ID Proofs */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">ID Proofs (Aadhar / PAN)</label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input type="file" ref={aadharInputRef} className="hidden" onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof1Url')} />
                                <button type="button" onClick={() => aadharInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
                                    {uploadingAadhar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} 
                                    {formData.idProof1Url ? 'Update ID Proof 1' : 'Upload ID Proof 1'}
                                </button>
                            </div>
                            <div className="flex-1">
                                <input type="file" ref={panInputRef} className="hidden" onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof2Url')} />
                                <button type="button" onClick={() => panInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
                                    {uploadingPan ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} 
                                    {formData.idProof2Url ? 'Update ID Proof 2' : 'Upload ID Proof 2'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {passwordError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4"/> {passwordError}
                        </div>
                    )}
                 </form>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors">Cancel</button>
                 <button type="submit" form="staffForm" className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                    {editingEmployeeId ? 'Update Employee' : 'Create Employee'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
