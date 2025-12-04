
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, ScanLine, MousePointerClick } from 'lucide-react'; 
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

  // Initialize state
  const [employees, setEmployees] = useState<DisplayEmployee[]>(() => {
    if (isSuperAdmin) {
        // --- SUPER ADMIN AGGREGATION ---
        let allData: DisplayEmployee[] = [];
        
        // 1. Admin Data
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                const parsed = JSON.parse(adminData);
                // Explicitly set franchiseId to 'admin' for proper filtering
                allData = [...allData, ...parsed.map((e: any) => ({...e, corporateId: 'admin', franchiseName: 'Head Office', franchiseId: 'admin'}))];
            } catch (e) {}
        } else {
            // No data found in storage, initialize empty
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

  const [branches, setBranches] = useState<any[]>([]); // Using any to accommodate corporateId extension
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);
  
  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamic Settings from EmployeeSettings
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);

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
    let allBranches: any[] = [];
    if (isSuperAdmin) {
        // Head Office
        try {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            allBranches = [...allBranches, ...adminBranches.map((b: any) => ({...b, corporateId: 'admin'}))];
        } catch(e) {}
        
        // Corporates
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, corporateId: c.email}))];
            });
        } catch(e) {}
    } else {
        const branchKey = getSessionKey('branches_data');
        try {
            const saved = localStorage.getItem(branchKey);
            if (saved) allBranches = JSON.parse(saved);
        } catch(e) {}
    }
    setBranches(allBranches);

    // 3. Shifts (Prioritize company_shifts key from EmployeeSettings, fall back to old app_settings)
    const savedShifts = localStorage.getItem('company_shifts');
    if (savedShifts) {
        try { 
            setShifts(JSON.parse(savedShifts)); 
        } catch (e) { console.error(e); }
    } else {
        // Fallback to legacy structure
        const settingsKey = getSessionKey('app_settings');
        const savedSettings = localStorage.getItem(settingsKey);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.shifts && Array.isArray(parsed.shifts)) {
                    setShifts(parsed.shifts);
                }
            } catch (e) { console.error(e); }
        }
        // Default if nothing exists
        if (shifts.length === 0) {
             setShifts([{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);
        }
    }

    // 4. Departments & Roles (Global for simplicity, or namespaced if needed)
    const savedDepts = localStorage.getItem('company_departments');
    if (savedDepts) {
        try { setDepartmentOptions(JSON.parse(savedDepts)); } catch (e) {}
    } else {
        setDepartmentOptions(['Sales', 'Marketing', 'Development', 'HR', 'Operations']);
    }

    const savedRoles = localStorage.getItem('company_roles');
    if (savedRoles) {
        try { setRoleOptions(JSON.parse(savedRoles)); } catch (e) {}
    } else {
        setRoleOptions(['Manager', 'Team Lead', 'Executive', 'Intern', 'Director']);
    }

  }, [isSuperAdmin]);

  // Derived Available Branches based on filters
  const availableBranches = useMemo(() => {
      if (!isSuperAdmin) return branches;
      if (filterCorporate === 'All') return branches;
      if (filterCorporate === 'admin') return branches.filter((b: any) => b.corporateId === 'admin');
      return branches.filter((b: any) => b.corporateId === filterCorporate);
  }, [branches, filterCorporate, isSuperAdmin]);

  // Save to namespaced localStorage ONLY if not viewing aggregated data
  useEffect(() => {
    if (!isSuperAdmin) {
        const key = getSessionKey('staff_data');
        localStorage.setItem(key, JSON.stringify(employees.map(({franchiseName, franchiseId, ...rest}) => rest)));
    } else {
        // For Super Admin, we only save 'Head Office' staff back to 'staff_data' to avoid overwriting franchise data with the whole list
        const headOfficeStaff = employees.filter(e => e.franchiseId === 'admin');
        // Strip metadata before saving
        const cleanAdmin = headOfficeStaff.map(({franchiseName, franchiseId, ...rest}) => rest);
        localStorage.setItem('staff_data', JSON.stringify(cleanAdmin));

        // For Super Admin, also update individual corporate staff lists
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: any) => {
            const corpStaff = employees.filter(e => e.franchiseId === c.email);
            const cleanCorpStaff = corpStaff.map(({franchiseName, franchiseId, ...rest}) => rest);
            localStorage.setItem(`staff_data_${c.email}`, JSON.stringify(cleanCorpStaff));
        });
    }
  }, [employees, isSuperAdmin, sessionId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    password: '', // Added password field
    phone: '',
    department: '',
    role: '', // Changed default to empty to force selection
    branch: '',
    paymentCycle: 'Monthly',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Onboarding',
    workingHours: '', 
    weekOff: 'Sunday',
    aadhar: '',
    pan: '',
    accountNumber: '',
    ifsc: '',
    liveTracking: false, // Added live tracking toggle
    // Attendance Config
    gpsGeofencing: true,
    qrScan: false,
    manualPunch: true, // Default Manual Punch (Web) to true
    currentLocation: undefined, // NEW: Initialize
    attendanceLocationStatus: 'idle', // NEW: Initialize
    cameraPermissionStatus: 'idle', // NEW: Initialize
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple CSV parsing (rows split by newline, cols by comma)
      const lines = text.split('\n');
      if (lines.length < 2) {
          alert("Invalid CSV format. Needs header and at least one row.");
          return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      // Expected headers logic: map common variations
      
      const newStaff: DisplayEmployee[] = [];
      
      for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const rowData: any = {};
          headers.forEach((h, idx) => { rowData[h] = values[idx]; });
          
          // Simple mapping
          const name = rowData.name || rowData['employee name'] || rowData.firstname ? `${rowData.firstname} ${rowData.lastname}` : '';
          const email = rowData.email || rowData['email address'];
          
          if (name && email) {
              newStaff.push({
                  id: `E${Date.now() + i}`,
                  name: name,
                  email: email,
                  phone: rowData.phone || rowData.mobile || '',
                  role: rowData.role || rowData.designation || 'Employee',
                  department: rowData.department || 'General',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`,
                  joiningDate: rowData.joiningdate || new Date().toISOString().split('T')[0],
                  status: 'Active',
                  password: 'user123', // Default password for bulk import
                  weekOff: 'Sunday',
                  corporateId: isSuperAdmin ? 'admin' : sessionId, // NEW: corporateId for imported staff
                  franchiseName: isSuperAdmin ? 'Head Office' : 'My Branch',
                  franchiseId: isSuperAdmin ? 'admin' : sessionId,
                  liveTracking: false,
                  attendanceConfig: {
                      gpsGeofencing: true,
                      qrScan: false,
                      manualPunch: true // Default for imported staff
                  },
                  currentLocation: undefined, // NEW: Initialize
                  attendanceLocationStatus: 'idle', // NEW: Initialize
                  cameraPermissionStatus: 'idle', // NEW: Initialize
              });
          }
      }
      
      if (newStaff.length > 0) {
          setEmployees(prev => [...prev, ...newStaff]);
          alert(`Successfully imported ${newStaff.length} staff members.`);
      } else {
          alert("No valid staff records found. Ensure columns: Name, Email, Phone, Role, Department.");
      }
    };
    
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    if (shifts.length > 0) {
        setFormData(prev => ({...prev, workingHours: shifts[0].name}));
    }
    setEditingId(null);
    setShowPassword(false);
    setIsModalOpen(false);
    setSelectedFiles([]);
  };

  const handleEdit = (employee: Employee) => {
    const nameParts = employee.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    setFormData({
      firstName: firstName || '',
      lastName: lastName || '',
      email: employee.email || '',
      password: employee.password || '', // Populate password for edit
      phone: employee.phone || '',
      department: employee.department,
      role: employee.role,
      branch: employee.branch || '',
      paymentCycle: employee.paymentCycle || 'Monthly',
      salary: employee.salary || '',
      joiningDate: employee.joiningDate,
      status: employee.status || 'Active',
      workingHours: employee.workingHours || (shifts.length > 0 ? shifts[0].name : ''),
      weekOff: employee.weekOff || 'Sunday',
      aadhar: employee.aadhar || '',
      pan: employee.pan || '',
      accountNumber: employee.accountNumber || '',
      ifsc: employee.ifsc || '',
      liveTracking: employee.liveTracking || false,
      gpsGeofencing: employee.attendanceConfig?.gpsGeofencing ?? !employee.allowRemotePunch ?? true,
      qrScan: employee.attendanceConfig?.qrScan ?? false,
      manualPunch: employee.attendanceConfig?.manualPunch ?? true, // Keep it true when editing
      currentLocation: employee.currentLocation, // NEW: Preserve
      attendanceLocationStatus: employee.attendanceLocationStatus || 'idle', // NEW: Preserve
      cameraPermissionStatus: employee.cameraPermissionStatus || 'idle', // NEW: Preserve
    });
    setEditingId(employee.id);
    setShowPassword(false);
    setIsModalOpen(true);
    setSelectedFiles([]); 
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      // For Super Admin, handle deletion from appropriate corporate list
      if (isSuperAdmin) {
        const employeeToDelete = employees.find(emp => emp.id === id);
        if (employeeToDelete) {
          const targetKey = employeeToDelete.franchiseId === 'admin' ? 'staff_data' : `staff_data_${employeeToDelete.franchiseId}`;
          const currentStaff = JSON.parse(localStorage.getItem(targetKey) || '[]');
          const updatedStaff = currentStaff.filter((emp: Employee) => emp.id !== id);
          localStorage.setItem(targetKey, JSON.stringify(updatedStaff));
          setEmployees(prev => prev.filter(emp => emp.id !== id));
        }
      } else {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.role) return;

    const attendanceConfig = {
        gpsGeofencing: formData.gpsGeofencing,
        qrScan: formData.qrScan,
        manualPunch: formData.manualPunch
    };

    if (editingId) {
      // Update existing
      setEmployees(prev => prev.map(emp => {
        if (emp.id === editingId) {
          return {
            ...emp,
            name: `${formData.firstName} ${formData.lastName}`,
            role: formData.role,
            department: formData.department || 'General',
            joiningDate: formData.joiningDate,
            email: formData.email,
            password: formData.password, // Save password
            phone: formData.phone,
            branch: formData.branch,
            paymentCycle: formData.paymentCycle,
            salary: formData.salary,
            status: formData.status,
            workingHours: formData.workingHours,
            weekOff: formData.weekOff,
            aadhar: formData.aadhar,
            pan: formData.pan,
            accountNumber: formData.accountNumber,
            ifsc: formData.ifsc,
            liveTracking: formData.liveTracking,
            allowRemotePunch: !formData.gpsGeofencing, // Backward compat
            attendanceConfig: attendanceConfig,
            currentLocation: formData.currentLocation, // NEW: Preserve
            attendanceLocationStatus: formData.attendanceLocationStatus, // NEW: Preserve
            cameraPermissionStatus: formData.cameraPermissionStatus, // NEW: Preserve
            // corporateId and franchiseId/Name should remain unchanged during edit
          };
        }
        return emp;
      }));
    } else {
      // Create new
      const newEmployee: DisplayEmployee = {
        id: `E${Date.now().toString().slice(-6)}`,
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role,
        department: formData.department || 'General',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}&background=10b981&color=fff`,
        joiningDate: formData.joiningDate,
        email: formData.email,
        password: formData.password, // Save password
        phone: formData.phone,
        branch: formData.branch,
        paymentCycle: formData.paymentCycle,
        salary: formData.salary,
        status: formData.status,
        workingHours: formData.workingHours,
        weekOff: formData.weekOff,
        aadhar: formData.aadhar,
        pan: formData.pan,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        corporateId: isSuperAdmin ? 'admin' : sessionId, // NEW: corporateId for new employees
        franchiseName: isSuperAdmin ? 'Head Office' : 'My Branch', // Tag new creations
        franchiseId: isSuperAdmin ? 'admin' : sessionId,
        liveTracking: formData.liveTracking,
        allowRemotePunch: !formData.gpsGeofencing, // Backward compat
        attendanceConfig: attendanceConfig,
        currentLocation: undefined, // NEW: Initialize
        attendanceLocationStatus: 'idle', // NEW: Initialize
        cameraPermissionStatus: 'idle', // NEW: Initialize
      };
      setEmployees(prev => [...prev, newEmployee]);
    }
    
    resetForm();
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || (emp.status || 'Active') === selectedStatus;
    
    // Corporate & Branch Filtering
    let matchesCorporate = true;
    if (isSuperAdmin && filterCorporate !== 'All') {
        // Ensure a safe fallback for head office matching
        const empCorpId = emp.corporateId || 'admin';
        matchesCorporate = empCorpId === filterCorporate;
    } else if (!isSuperAdmin) {
        // For corporate user, only show their own employees
        matchesCorporate = (emp.corporateId || 'admin') === sessionId;
    }

    const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
    
    return matchesSearch && matchesDept && matchesStatus && matchesCorporate && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">
             {isSuperAdmin ? "View and manage employees across all franchises" : "Manage your employees and their roles"}
          </p>
        </div>
        <div className="flex gap-2">
            <input 
                type="file" 
                accept=".csv" 
                ref={csvInputRef} 
                className="hidden" 
                onChange={handleCSVImport} 
            />
            <button 
                onClick={() => csvInputRef.current?.click()}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Upload className="w-5 h-5" />
                Import CSV
            </button>
            <button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Staff
            </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2 md:gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          
          {/* Corporate Filter (Super Admin) */}
          {isSuperAdmin && (
              <select 
                value={filterCorporate}
                onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[160px]"
              >
                <option value="All">All Corporates</option>
                <option value="admin">Head Office</option>
                {corporates.map((c: any) => (
                    <option key={c.email} value={c.email}>{c.companyName}</option>
                ))}
              </select>
          )}

          {/* Branch Filter */}
          <select 
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[140px]"
          >
            <option value="All">All Branches</option>
            {availableBranches.map((b, i) => (
                <option key={i} value={b.name}>{b.name}</option>
            ))}
          </select>

          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[140px]"
          >
            <option value="All">All Departments</option>
            {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-gray-700 cursor-pointer min-w-[130px]"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Probation">Probation</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
          <div key={employee.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${employee.status === 'Inactive' ? 'opacity-70' : ''}`}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="relative">
                    <img src={employee.avatar} alt={employee.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100 group-hover:border-emerald-300 transition-colors" />
                    {employee.liveTracking && (
                        <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="Live Tracking Enabled">
                            <Navigation className="w-3 h-3" />
                        </div>
                    )}
                    {employee.allowRemotePunch && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="Remote Punch Allowed">
                            <Globe className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(employee)}
                    className="text-gray-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-full transition-colors"
                    title="Edit Details"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(employee.id)}
                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-800">{employee.name}</h3>
              <p className="text-emerald-600 font-medium text-sm mb-1">{employee.role}</p>
              <p className="text-gray-500 text-xs mb-4">{employee.department} Dept • Joined {new Date(employee.joiningDate).toLocaleDateString()}</p>

              {isSuperAdmin && employee.franchiseName && (
                  <div className="mb-3 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold border border-indigo-100">
                      <Building2 className="w-3 h-3" />
                      {employee.franchiseName}
                  </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{employee.phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '.')}@okboz.com`}</span>
                </div>
                {employee.branch && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{employee.branch}</span>
                    </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  employee.status === 'Probation' ? 'bg-yellow-100 text-yellow-700' : 
                  employee.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                  'bg-green-100 text-green-700'
                }`}>
                {employee.status || 'Active'}
              </span>
              <button onClick={() => handleEdit(employee)} className="text-sm text-blue-600 font-medium hover:underline">View Profile</button>
            </div>
          </div>
        )) : (
           <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
               <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
               <p>No staff members found.</p>
               <p className="text-xs mt-1">Click "Add Staff" to create your first employee.</p>
           </div>
        )}
        
        {/* Add New Placeholder Card */}
        <button 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all min-h-[200px]"
        >
           <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
             <Plus className="w-6 h-6" />
           </div>
           <span className="font-medium">Add New Employee</span>
        </button>
      </div>

      {/* Add/Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Staff Details' : 'Add New Staff'}</h3>
                <p className="text-sm text-gray-500">{editingId ? 'Update employee information' : 'Complete onboarding details for new employee'}</p>
              </div>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                
                {/* 1. Personal Information */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User className="w-4 h-4 text-emerald-500"/> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input 
                        type="text" 
                        name="firstName"
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        name="lastName"
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="email" 
                          name="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="tel" 
                          name="phone"
                          placeholder="+91 1234567890"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          name="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Employment Details */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Briefcase className="w-4 h-4 text-emerald-500"/> Employment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                       <select 
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="">Select Department</option>
                          {departmentOptions.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                    </div>

                    {/* Live Tracking Toggle */}
                    <div className="lg:col-span-2 flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex-1 pl-2">
                            <label className="block text-sm font-medium text-gray-900">Live Tracking</label>
                            <p className="text-xs text-gray-500">Enable GPS tracking for this employee</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, liveTracking: !prev.liveTracking }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${formData.liveTracking ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.liveTracking ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    {/* Punch-in Restrictions Group */}
                    <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Punch-in Restriction (Allowed Modes)</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* GPS Geofencing */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${formData.gpsGeofencing ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className={`p-2 rounded-full ${formData.gpsGeofencing ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">GPS Geofencing</p>
                                    <p className="text-xs text-gray-500">Enforce branch radius check</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, gpsGeofencing: !prev.gpsGeofencing }))}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.gpsGeofencing ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.gpsGeofencing ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* QR Code Scan */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${formData.qrScan ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className={`p-2 rounded-full ${formData.qrScan ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <ScanLine className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">QR Code Scan</p>
                                    <p className="text-xs text-gray-500">Scan branch QR to punch</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, qrScan: !prev.qrScan }))}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.qrScan ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.qrScan ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Manual Punch */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${formData.manualPunch ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className={`p-2 rounded-full ${formData.manualPunch ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <MousePointerClick className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Manual Punch (Web)</p>
                                    <p className="text-xs text-gray-500">Allow direct web button</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, manualPunch: !prev.manualPunch }))}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.manualPunch ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.manualPunch ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                       <select 
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="">Select Job Role</option>
                          {roleOptions.map(role => (
                              <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                    </div>
                    
                    <div className="lg:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Branch Location</label>
                       <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <select 
                            name="branch"
                            value={formData.branch}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                          >
                            <option value="">Select Branch</option>
                            {/* Corrected: Use 'formAvailableBranches' which is the Memoized branch list */}
                            {availableBranches.length > 0 ? (
                                availableBranches.map((b: any) => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))
                            ) : (
                                <>
                                    <option value="Main">Main Branch (Default)</option>
                                </>
                            )}
                          </select>
                       </div>
                    </div>

                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Payment Cycle</label>
                       <select 
                            name="paymentCycle"
                            value={formData.paymentCycle}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Bi-Weekly">Bi-Weekly</option>
                        </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salary Amount (Per Cycle)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-sans">₹</span>
                        <input 
                          type="number" 
                          name="salary"
                          placeholder="0.00"
                          value={formData.salary}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="date" 
                          name="joiningDate"
                          value={formData.joiningDate}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select 
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="Onboarding">Onboarding</option>
                          <option value="Active">Active</option>
                          <option value="Probation">Probation</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours (Shift)</label>
                       <select 
                            name="workingHours"
                            value={formData.workingHours}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="">Select Shift</option>
                          {shifts.map(shift => (
                              <option key={shift.id} value={shift.name}>
                                {shift.name} ({shift.start} - {shift.end})
                              </option>
                          ))}
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off</label>
                       <div className="relative">
                          <select 
                            name="weekOff"
                            value={formData.weekOff}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                          >
                            <option value="Sunday">Sunday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Friday">Friday</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="SatSun">Saturday & Sunday</option>
                          </select>
                       </div>
                    </div>
                  </div>
                </section>

                {/* 3. KYC Documents */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <FileText className="w-4 h-4 text-emerald-500"/> KYC Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                      <input 
                        type="text" 
                        name="aadhar"
                        placeholder="XXXX-XXXX-XXXX"
                        value={formData.aadhar}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                      <input 
                        type="text" 
                        name="pan"
                        placeholder="ABCDE1234F"
                        value={formData.pan}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
                       <input 
                         type="file"
                         ref={fileInputRef}
                         onChange={handleFileChange}
                         className="hidden"
                         multiple
                         accept="image/*,.pdf" 
                       />
                       <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-emerald-400 transition-all cursor-pointer group"
                       >
                          <div className="bg-gray-100 p-3 rounded-full mb-3 group-hover:bg-emerald-100 transition-colors">
                             <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Click to upload Aadhar & PAN scans</p>
                          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                       </div>

                       {/* Selected Files List */}
                       {selectedFiles.length > 0 && (
                           <div className="mt-4 space-y-2">
                               {selectedFiles.map((file, idx) => (
                                   <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                       <div className="flex items-center gap-3 overflow-hidden">
                                           <div className="bg-white p-2 rounded border border-gray-200 text-emerald-600">
                                               <FileText className="w-4 h-4" />
                                           </div>
                                           <div className="truncate">
                                               <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                               <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                                           </div>
                                       </div>
                                       <button 
                                         type="button" 
                                         onClick={() => removeFile(idx)}
                                         className="text-gray-400 hover:text-red-500 p-1"
                                       >
                                           <X className="w-4 h-4" />
                                       </button>
                                   </div>
                               ))}
                           </div>
                       )}
                    </div>
                  </div>
                </section>

                {/* 4. Banking Details */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
                    <CreditCard className="w-4 h-4 text-emerald-500"/> Banking Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input 
                        type="text" 
                        name="accountNumber"
                        placeholder="1234567890"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                      <input 
                        type="text" 
                        name="ifsc"
                        placeholder="HDFC0001234"
                        value={formData.ifsc}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 sticky bottom-0 z-10">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {editingId ? 'Update Staff Details' : 'Complete Onboarding'}
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