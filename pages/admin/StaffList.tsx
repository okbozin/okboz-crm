

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { Employee, Branch } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService'; // Import uploadFileToCloud

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
  const getSessionKey = (baseKey: string) => {
     const sessionId = localStorage.getItem('app_session_id') || 'admin';
     return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // 1. Declare foundational states first with initial empty values
  const [allBranchesList, setAllBranchesList] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  
  // 2. Define initialFormState *after* its core dependencies are declared.
  const initialFormState = useMemo(() => ({
    name: '', email: '', phone: '', password: '',
    role: roleOptions[0] || 'Executive', // Use a simple string default
    department: departmentOptions[0] || 'Operations', // Use a simple string default
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '25000', branch: '', // Default branch to empty string, to be filled by useEffect
    status: 'Active',
    workingHours: shifts[0]?.name || 'General Shift', // Use a simple string default
    weekOff: 'Sunday', aadhar: '', pan: '', accountNumber: '', ifsc: '',
    liveTracking: false, allowRemotePunch: true,
    attendanceConfig: { gpsGeofencing: false, qrScan: false, manualPunch: true }, // Default manualPunch to true
    dob: '', gender: '', bloodGroup: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
    homeAddress: '', maritalStatus: '', spouseName: '', children: 0,
    idProof1Url: '', idProof2Url: '',
    corporateId: isSuperAdmin ? (localStorage.getItem('filterCorporate') === 'All' ? 'admin' : localStorage.getItem('filterCorporate') || 'admin') : sessionId
  }), [roleOptions, departmentOptions, shifts, isSuperAdmin, sessionId]);

  // 3. Declare formData using initialFormState. Now initialFormState is ready.
  const [formData, setFormData] = useState<any>(initialFormState);

  // 4. formAvailableBranches can now safely depend on formData.
  const formAvailableBranches = useMemo(() => {
    let list = allBranchesList;
    if (formData.corporateId && formData.corporateId !== 'All') { // Added check for empty string
        list = list.filter(b => b.owner === formData.corporateId);
    }
    return list;
  }, [allBranchesList, formData.corporateId]);

  // 5. employees state can be declared.
  const [employees, setEmployees] = useState<DisplayEmployee[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allData: DisplayEmployee[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                // Explicitly set corporateId to 'admin' for proper filtering
                allData = [...allData, ...parsed.map((e: any) => ({...e, corporateId: 'admin', franchiseName: 'Head Office', franchiseId: 'admin'}))];
            } catch (e) {}
        } else {
            allData = [];
        }

        // 2. Corporate Data
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corporates.forEach((corp: any) => {
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
        const key = getSessionKey('staff_data');
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return JSON.parse(saved).map((e: any) => ({...e, corporateId: sessionId, franchiseName: 'My Branch', franchiseId: sessionId}));
            } catch (e) { console.error(e); }
        }
        return [];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // File Upload States for ID Proofs
  const aadharInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string>('');


  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All'); // Added filterDepartment state
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Settings from EmployeeSettings
  // Note: departmentOptions and roleOptions are now state variables declared above

  // Load Settings (Departments, Roles, Shifts, Branches, Corporates)
  useEffect(() => {
    // 1. Load Corporates (Super Admin Only)
    if (isSuperAdmin) {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(corps);
        } catch(e) {}
    }

    // 2. Load Branches (Aggregated for Super Admin)
    let aggregatedBranches: any[] = [];
    if (isSuperAdmin) {
        // Head Office
        try {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            aggregatedBranches = [...aggregatedBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin', owner: 'admin'}))]; // Ensure owner is set
        } catch(e) {}
        
        // Corporates
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cData = localStorage.getItem(`branches_data_${c.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData);
                        const tagged = parsed.map((b: any) => ({...b, corporateId: c.email, corporateName: c.companyName, owner: c.email})); // Ensure owner is set
                        aggregatedBranches = [...aggregatedBranches, ...tagged];
                    } catch (e) {}
                }
            });
        } catch(e) {}
    } else { // Corporate Admin, only load their own branches
        const key = getSessionKey('branches_data');
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                aggregatedBranches = JSON.parse(saved).map((b: any) => ({...b, corporateId: sessionId, corporateName: 'My Branch', owner: sessionId})); // Ensure owner is set
            }
        } catch(e) {}
    }
    setAllBranchesList(aggregatedBranches);

    // 3. Load Shifts
    try {
        let shiftsKey = getSessionKey('company_shifts');
        let savedShifts = localStorage.getItem(shiftsKey);
        
        if (!savedShifts && !isSuperAdmin) { // If corporate has no custom shifts, try to load admin's default
            savedShifts = localStorage.getItem('company_shifts');
        }

        if (savedShifts) {
            setShifts(JSON.parse(savedShifts));
        } else {
            setShifts([{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);
        }
    } catch(e) {}

    // 4. Load Departments and Roles (from EmployeeSettings)
    try {
        let deptsKey = getSessionKey('company_departments');
        let rolesKey = getSessionKey('company_roles');
        
        let savedDepts = localStorage.getItem(deptsKey);
        let savedRoles = localStorage.getItem(rolesKey);

        if (!savedDepts && !isSuperAdmin) { savedDepts = localStorage.getItem('company_departments'); }
        if (!savedRoles && !isSuperAdmin) { savedRoles = localStorage.getItem('company_roles'); }


        setDepartmentOptions(savedDepts ? JSON.parse(savedDepts) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']);
        setRoleOptions(savedRoles ? JSON.parse(savedRoles) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Driver', 'Associate']);
    } catch (e) {}

  }, [isSuperAdmin, sessionId]);

  // Auto-fill branch if only one available when adding new employee
  useEffect(() => {
    // Only attempt to pre-fill if in create mode and formAvailableBranches is ready and branch is not already set
    if (!editingEmployeeId && formAvailableBranches.length === 1 && !formData.branch) {
        setFormData(prev => ({...prev, branch: formAvailableBranches[0].name}));
    } else if (!editingEmployeeId && formAvailableBranches.length > 0 && !formData.branch) {
        // If multiple branches, default to the first one available
        setFormData(prev => ({...prev, branch: formAvailableBranches[0].name}));
    }
  }, [editingEmployeeId, formAvailableBranches]); // formData.branch is intentionally not a dependency here

  // Handle saving data to appropriate storage key
  useEffect(() => {
    // Super Admin saves segregated data, not one monolithic object
    if (isSuperAdmin) {
        // Save Head Office employees
        const adminEmployees = employees.filter(e => e.corporateId === 'admin');
        const cleanAdmin = adminEmployees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem('staff_data', JSON.stringify(cleanAdmin));

        // Save Corporate Employees (Iterate corporates to find their employees in state)
        // Note: This relies on the branches state being the source of truth. 
        // If a corporate added a branch externally (e.g. diff browser), this overwrite might be risky without sync.
        // But for the requested "Admin sees updates" flow, this state aggregation is the standard react way.
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
             const cEmployees = employees.filter(e => e.corporateId === c.email);
             const cleanC = cEmployees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
             localStorage.setItem(`staff_data_${c.email}`, JSON.stringify(cleanC));
        });
    } else {
        // Normal User Save
        const key = getSessionKey('staff_data');
        const cleanEmployees = employees.map(({corporateId, franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem(key, JSON.stringify(cleanEmployees));
    }
  }, [employees, isSuperAdmin, corporates]); // Added corporates to dependency array


  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Access checked safely by casting
    const checked = (e.target as HTMLInputElement).checked; 
    
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('attendanceConfig.')) {
        const field = name.split('.')[1];
        setFormData(prev => ({
            ...prev,
            attendanceConfig: {
                ...prev.attendanceConfig,
                [field]: checked // Checkbox values for attendance config
            }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
    setPasswordError('');
  };

  const handleAttendanceConfigToggle = (field: keyof typeof formData.attendanceConfig) => {
    const currentConfig = formData.attendanceConfig;
    const isCurrentlyEnabled = currentConfig[field];

    if (isCurrentlyEnabled) {
        // Trying to disable. Check if others are enabled.
        const otherEnabled = Object.keys(currentConfig).some(key =>
            key !== field && currentConfig[key as keyof typeof currentConfig] === true
        );
        if (!otherEnabled) {
            alert("At least one attendance method must be enabled.");
            return;
        }
    }

    setFormData((prev: any) => ({
        ...prev,
        attendanceConfig: {
            ...prev.attendanceConfig,
            [field]: !isCurrentlyEnabled
        }
    }));
  };

  const handleOpenModal = () => {
    setEditingEmployeeId(null);
    setFormData({
        ...initialFormState,
        // Ensure initialFormState is re-evaluated to pick up latest options and corporateId
        role: roleOptions[0] || 'Executive',
        department: departmentOptions[0] || 'Operations',
        workingHours: shifts[0]?.name || 'General Shift',
        branch: formAvailableBranches[0]?.name || '', // Pre-fill with first available branch
        corporateId: isSuperAdmin ? (filterCorporate === 'All' ? 'admin' : filterCorporate) : sessionId,
        idProof1Url: '', // Clear previous file URLs for new entry
        idProof2Url: '',
    });
    setPasswordConfirm('');
    setPasswordError('');
    setIsModalOpen(true);
  };

  const handleEdit = (employee: DisplayEmployee) => {
    setEditingEmployeeId(employee.id);
    setFormData({
        ...employee,
        joiningDate: employee.joiningDate.split('T')[0], // Ensure date format for input
        attendanceConfig: employee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true },
        password: employee.password || '', // Pre-fill password so admin can see/edit it
        corporateId: employee.corporateId || 'admin', // Ensure corporateId is passed to form
        // Ensure branch is valid for formAvailableBranches
        branch: employee.branch && formAvailableBranches.some(b => b.name === employee.branch) ? employee.branch : formAvailableBranches[0]?.name || '',
        dob: employee.dob ? employee.dob.split('T')[0] : '', // Ensure date format for input
    });
    setPasswordConfirm('');
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

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.branch.trim()) {
      setPasswordError("Please fill in all required employee details.");
      return;
    }

    if (!editingEmployeeId) { // Only require password confirmation on creation
      if (!formData.password) {
        setPasswordError("Password is required for new employees.");
        return;
      }
      if (formData.password !== passwordConfirm) {
        setPasswordError("Passwords do not match.");
        return;
      }
      if (formData.password.length < 6) {
        setPasswordError("Password must be at least 6 characters long.");
        return;
      }
    }

    // Determine target corporate for saving
    const targetCorporateId = formData.corporateId;

    if (editingEmployeeId) {
        // Update existing employee
        setEmployees(prev => prev.map(emp => {
            if (emp.id === editingEmployeeId) {
                return {
                    ...emp,
                    ...formData,
                    // If formData.password is changed in edit, use it. If not, the pre-filled value is used.
                    // This handles both explicit change and keeping current.
                    corporateId: targetCorporateId, // Ensure corporateId is updated
                    franchiseName: corporates.find(c => c.email === targetCorporateId)?.companyName || 'Head Office',
                };
            }
            return emp;
        }));
    } else {
        // Create new employee
        // Check for duplicate email
        if (employees.some(e => e.email?.toLowerCase() === formData.email.toLowerCase())) {
            setPasswordError("An employee with this email already exists.");
            return;
        }

        // Generate a simple avatar URL
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`;
        const newEmployee: DisplayEmployee = {
            id: `E${Date.now()}`,
            ...formData,
            avatar,
            corporateId: targetCorporateId,
            franchiseName: corporates.find(c => c.email === targetCorporateId)?.companyName || 'Head Office',
            attendanceLocationStatus: 'idle',
            cameraPermissionStatus: 'idle'
        };
        setEmployees(prev => [newEmployee, ...prev]);
    }
    setIsModalOpen(false);
  };
  
  // File Upload Handlers
  const handleIdProofUpload = async (file: File | null, field: 'idProof1Url' | 'idProof2Url') => {
    if (!file) return;

    const setter = field === 'idProof1Url' ? setUploadingAadhar : setUploadingPan;
    setter(true);

    try {
        const path = `employee_docs/${formData.id || 'new'}/${field}_${file.name}`;
        const url = await uploadFileToCloud(file, path);

        if (url) {
            setFormData((prev: any) => ({ ...prev, [field]: url }));
        } else {
            // Fallback to Base64 if cloud upload fails
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            setFormData((prev: any) => ({ ...prev, [field]: base64 }));
        }
    } catch (error) {
        console.error("Upload failed:", error);
        alert(`Failed to upload ${field.replace('idProof', 'ID Proof ').replace('Url', '')}.`);
    } finally {
        setter(false);
    }
  };

  const handleRemoveIdProof = (field: 'idProof1Url' | 'idProof2Url') => {
    if (!window.confirm("Are you sure you want to remove this document?")) return;
    setFormData((prev: any) => ({ ...prev, [field]: '' }));
  };

  const openFileViewer = (url: string, name: string) => {
    setPreviewDocUrl(url);
    setPreviewDocName(name);
  };

  const closeFileViewer = () => {
    setPreviewDocUrl(null);
    setPreviewDocName('');
  };


  // Filter employees for display
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone?.includes(searchTerm);
    const matchesDepartment = filterDepartment === 'All' || emp.department === filterDepartment;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;
    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    
    // Corporate filter for Super Admin
    const matchesCorporate = isSuperAdmin ? (filterCorporate === 'All' || emp.corporateId === filterCorporate) : (emp.corporateId === sessionId);
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesBranch && matchesCorporate;
  });

  // Unique lists for filters
  const filterAvailableBranches = useMemo(() => {
    let list = allBranchesList;
    if (filterCorporate !== 'All') {
        list = list.filter(b => b.owner === filterCorporate);
    }
    return list;
  }, [allBranchesList, filterCorporate]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">Manage all employees, their roles, and details</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> New Employee
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by name, email, or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          
          {isSuperAdmin && (
              <select 
                  value={filterCorporate}
                  onChange={(e) => {setFilterCorporate(e.target.value); setFilterBranch('All');}}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporates.map((c: any) => (
                      <option key={c.email} value={c.email}>{c.companyName}</option>
                  ))}
              </select>
          )}

          <select 
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Branches</option>
            {filterAvailableBranches.map((b: any) => (
                <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>

          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {(searchTerm || filterCorporate !== 'All' || filterBranch !== 'All' || selectedDepartment !== 'All' || selectedStatus !== 'All') && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterCorporate('All'); setFilterBranch('All'); setSelectedDepartment('All'); setSelectedStatus('All'); }}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" /> Reset Filters
              </button>
          )}
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium">No employees found.</p>
            <p className="text-sm mt-1">Adjust your filters or add a new employee.</p>
          </div>
        ) : (
          <>
            {/* Add New Employee Card - Always visible if there are employees */}
            <div 
                className="group bg-white rounded-xl border border-dashed border-gray-300 shadow-sm flex flex-col items-center justify-center p-6 text-center text-gray-500 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer min-h-[280px]"
                onClick={handleOpenModal}
            >
                <Plus className="w-10 h-10 mb-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                <p className="text-lg font-medium text-gray-700 group-hover:text-emerald-700">Add New Employee</p>
                <p className="text-sm text-gray-400 group-hover:text-emerald-500">Quickly onboard a new team member</p>
            </div>

            {filteredEmployees.map(employee => (
              <div key={employee.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow group relative">
                {/* Corporate Badge for Super Admin */}
                {isSuperAdmin && employee.franchiseName && employee.franchiseName !== 'Head Office' && (
                    <div className="absolute top-3 right-14 bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {employee.franchiseName}
                    </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={employee.avatar} 
                      alt={employee.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" 
                    />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.role} • {employee.department}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" /> {employee.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" /> {employee.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" /> {employee.branch || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" /> Joined {new Date(employee.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    employee.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {employee.status}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(employee)}
                      className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit Employee"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(employee.id)}
                      className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-xl font-bold text-gray-800">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6"> {/* Added space-y-6 for section spacing */}
              {/* Section: Basic Information */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><User className="w-5 h-5 text-blue-500"/> Personal Information</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                       <input 
                          type="text" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleFormChange} 
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                          required 
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                       <input 
                          type="email" 
                          name="email" 
                          value={formData.email} 
                          onChange={handleFormChange} 
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                          required 
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                       <input 
                          type="tel" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleFormChange} 
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                          required 
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingEmployeeId ? '' : '*'}</label>
                       <div className="relative">
                          <input 
                              type={showPassword ? "text" : "password"} 
                              name="password" 
                              value={formData.password} 
                              onChange={handleFormChange} 
                              className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                              placeholder={editingEmployeeId ? "Update password (optional)" : "••••••••"}
                              required={!editingEmployeeId}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                       </div>
                    </div>
                    {!editingEmployeeId && (
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                          <div className="relative">
                             <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                value={passwordConfirm} 
                                onChange={e => setPasswordConfirm(e.target.value)} 
                                className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                required 
                             />
                             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                                 {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                             </button>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {/* Section: Employment Details */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-500"/> Employment Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {isSuperAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Head Office</label>
                            <select 
                              name="corporateId" 
                              value={formData.corporateId} 
                              onChange={handleFormChange} 
                              className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white text-sm"
                            >
                              <option value="admin">Head Office</option>
                              {corporates.map((c: any) => (
                                  <option key={c.email} value={c.email}>{c.companyName} ({c.city})</option>
                              ))}
                            </select>
                        </div>
                    )}
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                       <select name="branch" value={formData.branch} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                          <option value="">Select Branch</option>
                          {formAvailableBranches.map((branch: any) => (
                             <option key={branch.id} value={branch.name}>{branch.name}</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                       <select name="role" value={formData.role} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                          {roleOptions.map(role => (
                             <option key={role} value={role}>{role}</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                       <select name="department" value={formData.department} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                          {departmentOptions.map(dept => (
                             <option key={dept} value={dept}>{dept}</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                       <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" required />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
                       <input type="number" name="salary" value={formData.salary} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours (Shift)</label>
                       <select name="workingHours" value={formData.workingHours} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                          {shifts.map(shift => (
                             <option key={shift.id} value={shift.name}>{shift.name} ({shift.start} - {shift.end})</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off</label>
                       <select name="weekOff" value={formData.weekOff} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                             <option key={day} value={day}>{day}</option>
                          ))}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select name="status" value={formData.status} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                       </select>
                    </div>
                 </div>
              </div>

              {/* Section: Attendance Configuration */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/> Attendance Configuration</h3>
                <div className="space-y-3">
                    <ToggleSwitch 
                        label="Enable GPS Geofencing for punch-in" 
                        checked={formData.attendanceConfig.gpsGeofencing} 
                        onChange={() => handleAttendanceConfigToggle('gpsGeofencing')} 
                    />
                    <ToggleSwitch 
                        label="Enable QR Scan for punch-in" 
                        checked={formData.attendanceConfig.qrScan} 
                        onChange={() => handleAttendanceConfigToggle('qrScan')} 
                    />
                    <ToggleSwitch 
                        label="Allow Manual Punch (Web/Desktop)" 
                        checked={formData.attendanceConfig.manualPunch} 
                        onChange={() => handleAttendanceConfigToggle('manualPunch')} 
                    />
                    <p className="text-xs text-gray-500 mt-2">At least one attendance method should be enabled.</p>
                </div>
              </div>

              {/* Section: Additional Profile Details */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500"/> Additional Profile Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                       <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                       <select name="gender" value={formData.gender} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                       <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                       <select name="maritalStatus" value={formData.maritalStatus} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm">
                          <option value="">Select</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                       </select>
                    </div>
                    {formData.maritalStatus === 'Married' && (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Name</label>
                           <input type="text" name="spouseName" value={formData.spouseName} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                        </div>
                    )}
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                       <input type="number" name="children" value={formData.children} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                    </div>
                    <div className="col-span-full">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                       <textarea name="homeAddress" value={formData.homeAddress} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" rows={2} />
                    </div>
                 </div>
              </div>

              {/* Section: Emergency Contact */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><Phone className="w-5 h-5 text-orange-500"/> Emergency Contact</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                       <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                       <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                       <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                    </div>
                 </div>
              </div>

              {/* Section: KYC & Banking Details */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-800 text-xl mb-6 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500"/> KYC & Banking Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                       <input type="text" name="aadhar" value={formData.aadhar} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                       <input type="text" name="pan" value={formData.pan} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
                       <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                       <input type="text" name="ifsc" value={formData.ifsc} onChange={handleFormChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    </div>
                 </div>

                 <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                    <h4 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <Files className="w-4 h-4 text-gray-500" /> Upload ID Proof Documents
                    </h4>
                    
                    {/* ID Proof 1 (Aadhar) */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <input 
                            type="file" 
                            accept="image/*,.pdf" 
                            className="hidden" 
                            ref={aadharInputRef} 
                            onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof1Url')} 
                            disabled={uploadingAadhar}
                        />
                        <button 
                            type="button"
                            onClick={() => aadharInputRef.current?.click()}
                            disabled={uploadingAadhar}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.idProof1Url ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {uploadingAadhar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {formData.idProof1Url ? 'Change Aadhar/ID 1' : 'Upload Aadhar/ID 1'}
                        </button>
                        {formData.idProof1Url && (
                            <div className="flex gap-1">
                                <button 
                                    type="button"
                                    onClick={() => openFileViewer(formData.idProof1Url!, 'Aadhar Card')}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                    title="View Document"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveIdProof('idProof1Url')}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Remove Document"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    {/* ID Proof 2 (PAN) */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <input 
                            type="file" 
                            accept="image/*,.pdf" 
                            className="hidden" 
                            ref={panInputRef} 
                            onChange={(e) => handleIdProofUpload(e.target.files?.[0] || null, 'idProof2Url')} 
                            disabled={uploadingPan}
                        />
                        <button 
                            type="button"
                            onClick={() => panInputRef.current?.click()}
                            disabled={uploadingPan}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.idProof2Url ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {uploadingPan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {formData.idProof2Url ? 'Change PAN/ID 2' : 'Upload PAN/ID 2'}
                        </button>
                        {formData.idProof2Url && (
                            <div className="flex gap-1">
                                <button 
                                    type="button"
                                    onClick={() => openFileViewer(formData.idProof2Url!, 'PAN Card')}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                                    title="View Document"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveIdProof('idProof2Url')}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Remove Document"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                 </div>
              </div>


              {passwordError && (
                  <div className="col-span-full text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {passwordError}
                  </div>
              )}
            </form>

            {/* Sticky Footer for Buttons */}
            <div className="p-6 border-t border-gray-100 mt-auto flex justify-end gap-3 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors">Cancel</button>
               <button type="submit" onClick={handleSubmit} className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> {editingEmployeeId ? 'Update Employee' : 'Add Employee'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                       {/* Basic icon based on name, could be more robust */}
                       {previewDocName.includes('Aadhar') ? <CreditCard className="w-6 h-6 text-indigo-500" /> : 
                        previewDocName.includes('PAN') ? <CreditCard className="w-6 h-6 text-purple-500" /> :
                        <FileText className="w-6 h-6 text-gray-500" />}
                    </div>
                    <div>
                       <h3 className="font-bold text-gray-900">{previewDocName}</h3>
                       <p className="text-xs text-gray-500">Preview</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => window.open(previewDocUrl, '_blank')}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" 
                        title="Open in new tab"
                    >
                       <ExternalLink className="w-5 h-5" />
                    </button>
                    <button onClick={closeFileViewer} className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500 transition-colors">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-hidden">
                 {/* Basic detection for image vs other. If cloud URL, might need better detection, but often extensions or MIME are missing in simple string URLs. 
                     We'll try to show as image first if data URI or common extension, else iframe. 
                 */}
                 {previewDocUrl.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(previewDocUrl) ? (
                    <img src={previewDocUrl} alt="Document Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />
                 ) : (
                    <iframe src={previewDocUrl} className="w-full h-full rounded-lg border border-gray-200 shadow-lg bg-white" title="Document Preview"></iframe>
                 )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;