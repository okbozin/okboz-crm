
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Employee, Branch } from '../../types';

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

const StaffList: React.FC = () => {
  // Determine Session Context
  const getSessionKey = (baseKey: string) => {
     const sessionId = localStorage.getItem('app_session_id') || 'admin';
     return sessionId === 'admin' ? baseKey : `${baseKey}_${sessionId}`;
  };

  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // 1. Declare foundational states first with initial empty values
  const [allBranchesList, setAllBranchesList] = useState<any[]>([]); // Ensure this is declared early
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  
  // 2. Define initialFormState *after* its dependencies are declared.
  //    Avoid direct dependency on `formAvailableBranches` in the initial `branch` value.
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
    attendanceConfig: { gpsGeofencing: true, qrScan: false, manualPunch: false },
    dob: '', gender: '', bloodGroup: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
    homeAddress: '', maritalStatus: '', spouseName: '', children: 0,
    idProof1Url: '', idProof2Url: '',
    corporateId: isSuperAdmin ? (localStorage.getItem('filterCorporate') === 'All' ? 'admin' : localStorage.getItem('filterCorporate') || 'admin') : sessionId
  }), [roleOptions, departmentOptions, shifts, isSuperAdmin, sessionId]);

  // 3. Declare formData using initialFormState
  const [formData, setFormData] = useState<any>(initialFormState);

  // 4. Define formAvailableBranches *after* formData and allBranchesList
  const formAvailableBranches = useMemo(() => {
    let list = allBranchesList;
    if (formData.corporateId && formData.corporateId !== 'All') { // Added check for empty string
        list = list.filter(b => b.owner === formData.corporateId);
    }
    return list;
  }, [allBranchesList, formData.corporateId]);

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
    const { name, value, type, checked } = e.target;
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

  const handleOpenModal = () => {
    setEditingEmployeeId(null);
    setFormData({
        ...initialFormState,
        // Ensure initialFormState is re-evaluated to pick up latest options and corporateId
        role: roleOptions[0] || 'Executive',
        department: departmentOptions[0] || 'Operations',
        workingHours: shifts[0]?.name || 'General Shift',
        branch: formAvailableBranches[0]?.name || '', // Pre-fill with first available branch
        corporateId: isSuperAdmin ? (filterCorporate === 'All' ? 'admin' : filterCorporate) : sessionId
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
        attendanceConfig: employee.attendanceConfig || { gpsGeofencing: true, qrScan: false, manualPunch: false },
        password: '', // Never pre-fill password for security
        corporateId: employee.corporateId || 'admin', // Ensure corporateId is passed to form
        // Ensure branch is valid for formAvailableBranches
        branch: employee.branch && formAvailableBranches.some(b => b.name === employee.branch) ? employee.branch : formAvailableBranches[0]?.name || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.branch.trim()) {
      setPasswordError("Please fill in all required employee details.");
      return;
    }

    if (!editingEmployeeId) { // Only require password on creation
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
                // If password field is empty, retain old password
                const updatedPassword = formData.password ? formData.password : emp.password;
                
                return {
                    ...emp,
                    ...formData,
                    password: updatedPassword,
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-xl font-bold text-gray-800">{editingEmployeeId ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Basic Info */}
                  <div className="col-span-full pb-4 mb-4 border-b border-gray-100">
                     <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><User className="w-4 h-4 text-blue-500"/> Basic Information</h4>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                     <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleFormChange} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
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
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
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
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
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
                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                            placeholder={editingEmployeeId ? "Leave blank to keep current" : "••••••••"}
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
                              className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                              required 
                           />
                           <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                               {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                        </div>
                     </div>
                  )}

                  {/* Employment Details */}
                  <div className="col-span-full pt-6 pb-4 mb-4 border-b border-gray-100">
                     <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500"/> Employment Details</h4>
                  </div>
                  {isSuperAdmin && (
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Corporate / Head Office</label>
                          <select 
                            name="corporateId" 
                            value={formData.corporateId} 
                            onChange={handleFormChange} 
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white text-sm"
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
                     <select name="branch" value={formData.branch} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                        <option value="">Select Branch</option>
                        {formAvailableBranches.map((branch: any) => (
                           <option key={branch.id} value={branch.name}>{branch.name}</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                     <select name="role" value={formData.role} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                        {roleOptions.map(role => (
                           <option key={role} value={role}>{role}</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                     <select name="department" value={formData.department} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm" required>
                        {departmentOptions.map(dept => (
                           <option key={dept} value={dept}>{dept}</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                     <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" required />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
                     <input type="number" name="salary" value={formData.salary} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours (Shift)</label>
                     <select name="workingHours" value={formData.workingHours} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                        {shifts.map(shift => (
                           <option key={shift.id} value={shift.name}>{shift.name} ({shift.start} - {shift.end})</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off</label>
                     <select name="weekOff" value={formData.weekOff} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                           <option key={day} value={day}>{day}</option>
                        ))}
                     </select>
                  </div>

                  {/* Attendance Configuration */}
                  <div className="col-span-full pt-6 pb-4 mb-4 border-b border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Attendance Configuration</h4>
                  </div>
                  <div className="col-span-full space-y-2">
                      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <input 
                              type="checkbox" 
                              name="attendanceConfig.gpsGeofencing" 
                              checked={formData.attendanceConfig.gpsGeofencing} 
                              onChange={handleFormChange} 
                              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          Enable GPS Geofencing for punch-in
                      </label>
                      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <input 
                              type="checkbox" 
                              name="attendanceConfig.qrScan" 
                              checked={formData.attendanceConfig.qrScan} 
                              onChange={handleFormChange} 
                              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          Enable QR Scan for punch-in
                      </label>
                      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <input 
                              type="checkbox" 
                              name="attendanceConfig.manualPunch" 
                              checked={formData.attendanceConfig.manualPunch} 
                              onChange={handleFormChange} 
                              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          Allow Manual Punch (Web/Desktop)
                      </label>
                      <p className="text-xs text-gray-500 mt-2">At least one attendance method should be enabled.</p>
                  </div>

                  {/* Optional Profile Fields */}
                  <div className="col-span-full pt-6 pb-4 mb-4 border-b border-gray-100">
                     <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500"/> Additional Profile Details</h4>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                     <input type="date" name="dob" value={formData.dob} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                     <select name="gender" value={formData.gender} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm">
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                     <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                     <select name="maritalStatus" value={formData.maritalStatus} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm">
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
                         <input type="text" name="spouseName" value={formData.spouseName} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                      </div>
                  )}
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                     <input type="number" name="children" value={formData.children} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
                  </div>
                  <div className="col-span-full">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                     <textarea name="homeAddress" value={formData.homeAddress} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" rows={2} />
                  </div>

                  <div className="col-span-full pt-6 pb-4 mb-4 border-b border-gray-100">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500"/> Emergency Contact</h4>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                     <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                     <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                     <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleFormChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                  </div>

                  {passwordError && (
                      <div className="col-span-full text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {passwordError}
                      </div>
                  )}
               </div>

               <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                     <Save className="w-4 h-4" /> {editingEmployeeId ? 'Update Employee' : 'Add Employee'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
