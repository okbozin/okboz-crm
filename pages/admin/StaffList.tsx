
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, 
  Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, 
  Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, 
  ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, 
  Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle, 
  Loader2, ExternalLink, Clock, Shield, Users, Check, LayoutGrid, Hash
} from 'lucide-react';
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

// Permissions List
const PERMISSIONS = [
    { id: 'customer_care', label: 'Customer Care' },
    { id: 'trip_booking', label: 'Trip Booking' },
    { id: 'live_tracking', label: 'Live Tracking' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'attendance', label: 'Attendance (Admin View)' },
    { id: 'branches', label: 'Branches' },
    { id: 'staff_management', label: 'Staff Management' },
    { id: 'documents', label: 'Documents' },
    { id: 'vendor_attachment', label: 'Vendor Attachment' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'finance_expenses', label: 'Finance & Expenses' },
];

// Reusable ToggleSwitch component
const ToggleSwitch = ({ label, checked, onChange, disabled = false }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <div 
        onClick={!disabled ? onChange : undefined}
        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span className={`font-medium text-sm ${checked ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</span>
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
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
    // Professional
    name: '', email: '', phone: '', password: '',
    role: '', department: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '25000', branch: '', 
    status: 'Active',
    workingHours: '', 
    weekOff: 'Sunday', 
    liveTracking: false, allowRemotePunch: true,
    attendanceConfig: { gpsGeofencing: false, qrScan: false, manualPunch: true },
    allowedModules: [] as string[],
    
    // Personal & KYC
    dob: '', gender: '', bloodGroup: '',
    maritalStatus: '', spouseName: '', children: 0,
    homeAddress: '',
    aadhar: '', pan: '', 
    
    // Emergency
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
    
    // Banking
    accountNumber: '', ifsc: '', upiId: '',

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
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
    setPasswordError('');
  };

  // Specific Handlers for Permissions & Config
  const handleModuleToggle = (moduleId: string) => {
    setFormData((prev: any) => {
        const current = prev.allowedModules || [];
        return {
            ...prev,
            allowedModules: current.includes(moduleId) 
                ? current.filter((m: string) => m !== moduleId)
                : [...current, moduleId]
        };
    });
  };

  const handleAttendanceConfigChange = (key: string) => {
    setFormData((prev: any) => ({
        ...prev,
        attendanceConfig: {
            ...prev.attendanceConfig,
            [key]: !prev.attendanceConfig?.[key]
        }
    }));
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
        dob: employee.dob ? employee.dob.split('T')[0] : '',
        attendanceConfig: employee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true },
        allowedModules: employee.allowedModules || [],
        password: employee.password || '', 
        corporateId: employee.corporateId || (isSuperAdmin ? 'admin' : sessionId),
        branch: employee.branch && formAvailableBranches.some(b => b.name === employee.branch) ? employee.branch : (formAvailableBranches[0]?.name || ''),
        // Ensure new fields are initialized even if undefined in old records
        maritalStatus: employee.maritalStatus || '',
        children: employee.children || 0,
        spouseName: employee.spouseName || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        emergencyContactRelationship: employee.emergencyContactRelationship || '',
        accountNumber: employee.accountNumber || '',
        ifsc: employee.ifsc || '',
        upiId: employee.upiId || '',
        bloodGroup: employee.bloodGroup || '',
        gender: employee.gender || '',
        homeAddress: employee.homeAddress || ''
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
                    children: Number(formData.children), // Ensure number
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
            children: Number(formData.children), // Ensure number
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
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> New Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-semibold text-gray-500 mb-1">Total Employees</p>
               <h3 className="text-3xl font-bold text-gray-900">{filteredEmployees.length}</h3>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
               <Users className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-semibold text-gray-500 mb-1">Active Staff</p>
               <h3 className="text-3xl font-bold text-emerald-600">{filteredEmployees.filter(e => e.status === 'Active').length}</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
               <CheckCircle className="w-6 h-6" />
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-semibold text-gray-500 mb-1">Departments</p>
               <h3 className="text-3xl font-bold text-purple-600">{departmentOptions.length}</h3>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-purple-600">
               <Briefcase className="w-6 h-6" />
            </div>
         </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          {isSuperAdmin && (
              <select 
                value={filterCorporate} 
                onChange={(e) => setFilterCorporate(e.target.value)} 
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm focus:ring-2 focus:ring-emerald-500"
              >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
              </select>
          )}

          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm focus:ring-2 focus:ring-emerald-500">
              <option value="All">All Branches</option>
              {filterAvailableBranches.map((b: any, i) => <option key={i} value={b.name}>{b.name}</option>)}
          </select>

          <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white text-sm focus:ring-2 focus:ring-emerald-500">
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
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                                    <div>
                                        <div className="font-bold text-gray-900">{emp.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3"/> {emp.phone}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-800 font-medium">{emp.role}</div>
                                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">{emp.department}</div>
                            </td>
                            {isSuperAdmin && (
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                        {emp.franchiseName}
                                    </span>
                                </td>
                            )}
                            <td className="px-6 py-4 text-gray-600">
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4 text-gray-400" /> {emp.branch}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {emp.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(emp)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(emp.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredEmployees.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-500 bg-gray-50">
                                <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No employees found matching your filters.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add/Edit Modal - Redesigned */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                 <div>
                    <h3 className="font-bold text-gray-900 text-xl">{editingEmployeeId ? 'Edit Employee Profile' : 'Add New Employee'}</h3>
                    <p className="text-sm text-gray-500">Fill in the details to {editingEmployeeId ? 'update' : 'create'} an employee account.</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6"/></button>
              </div>
              
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* 1. Professional Details Card */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Briefcase className="w-4 h-4" /></div> Professional Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input required name="name" value={formData.name} onChange={handleFormChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="John Doe" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input required type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="john@company.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input required name="phone" value={formData.phone} onChange={handleFormChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="+91 98765 43210" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Branch</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <select name="branch" value={formData.branch} onChange={handleFormChange} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none">
                                            <option value="">Select Branch</option>
                                            {formAvailableBranches.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input 
                                            type="password" 
                                            name="password" 
                                            value={formData.password} 
                                            onChange={(e) => {handleFormChange(e); setPasswordError('');}} 
                                            placeholder={editingEmployeeId ? "Leave blank to keep" : "Min 6 chars"} 
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                                        />
                                    </div>
                                </div>
                                {(!editingEmployeeId || formData.password) && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input 
                                                type="password" 
                                                value={passwordConfirm} 
                                                onChange={(e) => setPasswordConfirm(e.target.value)} 
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                                                placeholder="Confirm password"
                                            />
                                        </div>
                                    </div>
                                )}
                                {passwordError && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {passwordError}</p>}
                            </div>

                            {/* Row 2 */}
                            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Department</label>
                                    <select name="department" value={formData.department} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                        {departmentOptions.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Role</label>
                                    <select name="role" value={formData.role} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                        {roleOptions.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Monthly Salary (₹)</label>
                                    <input type="number" name="salary" value={formData.salary} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Shift</label>
                                    <select name="workingHours" value={formData.workingHours} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                        {shifts.map(s => <option key={s.id} value={s.name}>{s.name} ({s.start}-{s.end})</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Super Admin Corporate Select */}
                            {isSuperAdmin && (
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Assign Corporate</label>
                                    <select 
                                        name="corporateId" 
                                        value={formData.corporateId} 
                                        onChange={handleFormChange} 
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="admin">Head Office</option>
                                        {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Access & Configuration Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Permissions */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Shield className="w-4 h-4" /></div> Access Permissions
                            </h4>
                            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
                                {PERMISSIONS.map((perm) => (
                                    <label key={perm.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.allowedModules?.includes(perm.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.allowedModules?.includes(perm.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                            {formData.allowedModules?.includes(perm.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={formData.allowedModules?.includes(perm.id) || false} 
                                            onChange={() => handleModuleToggle(perm.id)} 
                                        />
                                        <span className="text-sm font-medium text-gray-700">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Attendance Config */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><ScanLine className="w-4 h-4" /></div> Attendance Config
                            </h4>
                            <div className="space-y-4 flex-1">
                                <ToggleSwitch 
                                    label="GPS Geofencing" 
                                    checked={formData.attendanceConfig?.gpsGeofencing || false} 
                                    onChange={() => handleAttendanceConfigChange('gpsGeofencing')} 
                                />
                                <ToggleSwitch 
                                    label="QR Scan" 
                                    checked={formData.attendanceConfig?.qrScan || false} 
                                    onChange={() => handleAttendanceConfigChange('qrScan')} 
                                />
                                <ToggleSwitch 
                                    label="Manual Punch (Web)" 
                                    checked={formData.attendanceConfig?.manualPunch || false} 
                                    onChange={() => handleAttendanceConfigChange('manualPunch')} 
                                />
                                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100 text-xs text-orange-800">
                                    <p className="font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Note:</p>
                                    Geofencing requires branch location to be set. QR Scan uses camera.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Personal & Emergency Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Details */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><User className="w-4 h-4" /></div> Personal Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">Select</option>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Blood Group</label>
                                    <input name="bloodGroup" value={formData.bloodGroup} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. O+" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Marital Status</label>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">Select</option>
                                        <option>Single</option>
                                        <option>Married</option>
                                        <option>Divorced</option>
                                        <option>Widowed</option>
                                    </select>
                                </div>
                                {formData.maritalStatus === 'Married' && (
                                    <>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Spouse Name</label>
                                            <input name="spouseName" value={formData.spouseName} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">No. of Children</label>
                                            <input type="number" name="children" value={formData.children} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                        </div>
                                    </>
                                )}
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Home Address</label>
                                    <textarea name="homeAddress" value={formData.homeAddress} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20" placeholder="Full address..." />
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Heart className="w-4 h-4" /></div> Emergency Contact
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Contact Name</label>
                                    <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Contact Phone</label>
                                    <input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Relationship</label>
                                    <input name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. Father, Spouse" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Banking & KYC */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg"><CreditCard className="w-4 h-4" /></div> Banking & KYC
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Bank Account No.</label>
                                <input name="accountNumber" value={formData.accountNumber} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">IFSC Code</label>
                                <input name="ifsc" value={formData.ifsc} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">UPI ID</label>
                                <input name="upiId" value={formData.upiId} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="name@upi" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Aadhar Number</label>
                                <input name="aadhar" value={formData.aadhar} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">PAN Number</label>
                                <input name="pan" value={formData.pan} onChange={handleFormChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                        </div>
                    </div>

                 </form>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                 <button onClick={handleSubmit} type="button" className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform active:scale-95 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Save Employee
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
