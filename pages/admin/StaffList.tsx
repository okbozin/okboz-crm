import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Plus, Search, Filter, Trash2, Edit2, 
  MapPin, Phone, Mail, Building2, Briefcase, 
  MoreVertical, CheckCircle, XCircle, X, Shield, Lock, Save, Eye, EyeOff,
  User, Calendar, Clock, Heart, Baby, BookUser, Home, CreditCard, FileText, Smartphone, RotateCw
} from 'lucide-react';
// Fix: Import Shift interface from types.ts
import { Employee, CorporateAccount, UserRole, Branch, Shift } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

// --- Helper for Session-Based Storage Keys ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';

// Fix: Define getListFromStorage function with generic type T
const getListFromStorage = <T extends unknown>(baseKey: string, defaultValue: T[]): T[] => {
    const sessionIdVal = getSessionId(); // Fix: sessionIdVal defined here
    const storageKey = sessionIdVal === 'admin' ? baseKey : `${baseKey}_${sessionIdVal}`; // Fix: storageKey defined here
    const saved = localStorage.getItem(storageKey);
    try {
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (error: any) { // Fix: error variable name corrected
        console.error(`Error parsing data for key ${storageKey}:`, error);
        return defaultValue;
    }
};

// --- ToggleSwitch Component ---
// Fix: Destructure props correctly
const ToggleSwitch: React.FC<{ label: string, checked: boolean, onChange: () => void, disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <div 
    onClick={!disabled ? onChange : undefined}
    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'}`}
  >
    <span className={`text-sm font-medium ${checked ? 'text-emerald-800' : 'text-gray-700'}`}>{label}</span>
    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  </div>
);

export const StaffList: React.FC = () => {
  // Fix: Initialize useState with empty arrays or correct types
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Dynamic Lists for Dropdowns
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  // Fix: Use Shift interface directly
  const [shifts, setShifts] = useState<Shift[]>([]); 
  const weekOffDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // For multi-step form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form State
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    branch: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    password: '',
    corporateId: '', // Will be set dynamically
    
    // Step 2: Toggles & Access
    workingShift: '', // Maps to name from 'shifts' list
    weekOff: 'Sunday',
    liveTracking: false,
    gpsGeofencing: false,
    qrScan: false,
    allowRemotePunch: true, // Renamed from manualPunch
    allowedModules: [] as string[], // List of module IDs
    
    // Step 3: Personal Details
    dob: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    spouseName: '',
    children: 0,
    homeAddress: '',
    
    // Step 3: Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',

    // Step 3: Banking & KYC
    accountNumber: '',
    ifsc: '',
    aadhar: '',
    pan: '',
    upiId: '', // NEW: UPI ID
    
    status: 'Active'
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  // Fix: Declare handleCloseModal early so it can be used throughout the component
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setShowPassword(false);
    setCurrentStep(1);
  };


  // --- Load Initial Data (Corporates, Branches, Employees, Settings Lists) ---
  useEffect(() => {
    // 1. Load Corporates (for Admin dropdown)
    const loadedCorporates: CorporateAccount[] = [];
    try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        loadedCorporates.push(...corps);
        setCorporates(corps);
    } catch (e) {}

    // 2. Load Branches
    const allBranches: Branch[] = [];
    try {
        const sessionIdVal = getSessionId();
        if (isSuperAdmin()) {
            const adminBranches: Branch[] = JSON.parse(localStorage.getItem('branches_data') || '[]');
            allBranches.push(...adminBranches.map((b: Branch) => ({...b, owner: 'admin'})));
            
            loadedCorporates.forEach((c: CorporateAccount) => { // Fix: use loadedCorporates
               const cBranches: Branch[] = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
               allBranches.push(...cBranches.map((b: Branch) => ({...b, owner: c.email})));
            });
        } else {
            const key = `branches_data_${sessionIdVal}`;
            const saved = localStorage.getItem(key);
            if (saved) allBranches.push(...JSON.parse(saved).map((b: Branch) => ({...b, owner: sessionIdVal})));
        }
    } catch (e) {}
    setBranches(allBranches);

    // 3. Load Employees
    loadEmployees();

    // 4. Load Dynamic Lists for Dropdowns/Checkboxes
    setDepartments(getListFromStorage<string>('company_departments', ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']));
    setRoles(getListFromStorage<string>('company_roles', ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Driver']));
    // Fix: Use Shift interface directly
    setShifts(getListFromStorage<Shift>('company_shifts', [{ id: 1, name: 'General Shift', start: '09:30 AM', end: '06:30 PM' }]));
  }, [corporates.length]); // Fix: Add corporates.length to dependency array

  const loadEmployees = () => {
    const allStaff: Employee[] = [];
    const sessionIdVal = getSessionId();
    
    if (isSuperAdmin()) {
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                allStaff.push(...JSON.parse(adminData).map((s: Employee) => ({...s, corporateId: 'admin', corporateName: 'Head Office'})));
            } catch (e) {}
        }
        // Corporate Staff
        try {
            corporates.forEach((c: CorporateAccount) => { // Fix: use 'corporates' state here
                const cStaff: Employee[] = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                allStaff.push(...cStaff.map((s: Employee) => ({...s, corporateId: c.email, corporateName: c.companyName})));
            });
        } catch(e) {}
        
    } else {
        const key = `staff_data_${sessionIdVal}`; 
        const saved = localStorage.getItem(key);
        if (saved) {
            allStaff.push(...JSON.parse(saved).map((e: Employee) => ({...e, corporateId: sessionIdVal, corporateName: 'My Branch'})));
        }
    }
    setEmployees(allStaff);
  };

  // --- Computed ---
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCorporate = filterCorporate === 'All' || emp.corporateId === filterCorporate;
      const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
      const matchesStatus = filterStatus === 'All' || (emp.status || 'Active') === filterStatus;

      return matchesSearch && matchesCorporate && matchesBranch && matchesStatus;
    });
  }, [employees, searchTerm, filterCorporate, filterBranch, filterStatus]);

  const availableBranchesForForm = useMemo(() => {
      const targetOwner = formData.corporateId;
      return branches.filter(b => b.owner === targetOwner);
  }, [branches, formData.corporateId]);

  // All possible module IDs (can be hardcoded or derived from Layout.tsx MASTER_ADMIN_LINKS)
  const allModuleAccessOptions = useMemo(() => [
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
      { id: 'email_marketing', label: 'Email Marketing' },
      // Add more as needed
  ], []);


  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target; // Fix: destructure all properties

    if (name === 'allowedModules') {
        // Handle multiple checkboxes for allowedModules
        setFormData(prev => {
            const currentModules = new Set(prev.allowedModules);
            if (checked) { // Fix: use 'checked'
                currentModules.add(value);
            } else {
                currentModules.delete(value);
            }
            return { ...prev, allowedModules: Array.from(currentModules) };
        });
    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 })); // Fix: use 'value'
    }
    else if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: checked })); // Fix: use 'checked'
    } else {
        setFormData(prev => ({ ...prev, [name]: value })); // Fix: use 'value'
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
        ...initialFormState,
        corporateId: isSuperAdmin() ? 'admin' : getSessionId(), // Fix: corporateId here
    });
    setShowPassword(false); // Reset password visibility
    setCurrentStep(1); // Start from step 1
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Employee) => { // Fix: 'emp' parameter
    setEditingId(emp.id);
    setFormData({
        name: emp.name,
        email: emp.email || '',
        phone: emp.phone || '',
        role: emp.role,
        department: emp.department,
        branch: emp.branch || '',
        joiningDate: emp.joiningDate,
        salary: emp.salary || '',
        password: '', // NEVER PRE-FILL PASSWORD FOR EDITING, ALWAYS ASK TO SET NEW
        corporateId: emp.corporateId || (isSuperAdmin() ? 'admin' : getSessionId()),
        
        // Step 2
        workingShift: emp.workingHours || '', // Assuming workingHours stores shift name
        weekOff: emp.weekOff || 'Sunday',
        liveTracking: !!emp.liveTracking,
        gpsGeofencing: !!emp.attendanceConfig?.gpsGeofencing,
        qrScan: !!emp.attendanceConfig?.qrScan,
        allowRemotePunch: emp.attendanceConfig?.manualPunch ?? true,
        allowedModules: emp.allowedModules || [],
        
        // Step 3: Personal Details
        dob: emp.dob ? emp.dob.split('T')[0] : '',
        gender: emp.gender || '',
        bloodGroup: emp.bloodGroup || '',
        maritalStatus: emp.maritalStatus || '',
        spouseName: emp.spouseName || '',
        children: emp.children || 0,
        homeAddress: emp.homeAddress || '',
        
        // Step 3: Emergency Contact
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactPhone: emp.emergencyContactPhone || '',
        emergencyContactRelationship: emp.emergencyContactRelationship || '',

        // Step 3: Banking & KYC
        accountNumber: emp.accountNumber || '',
        ifsc: emp.ifsc || '',
        aadhar: emp.aadhar || '',
        pan: emp.pan || '',
        upiId: emp.upiId || '',
        
        status: emp.status || 'Active'
    });
    setShowPassword(false); // Reset password visibility
    setCurrentStep(1); // Start from step 1 for editing
    setIsModalOpen(true);
  };

  const handleNextStep = () => {
      // Basic validation for current step
      if (currentStep === 1) {
          if (!formData.name || !formData.email || !formData.phone || !formData.role) {
              alert("Please fill in Name, Email, Phone, and Role.");
              return;
          }
      }
      if (currentStep < 3) {
          setCurrentStep(prev => prev + 1); // Fix: setCurrentStep used correctly
      }
  };

  const handlePrevStep = () => {
      if (currentStep > 1) {
          setCurrentStep(prev => prev - 1); // Fix: setCurrentStep used correctly
      }
  };


  const handleSave = (e: React.FormEvent) => { // Fix: 'e' parameter
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
        alert("Please fill required fields (Name, Email, Role)");
        return;
    }

    let corporateIdToSave = formData.corporateId; // Fix: corporateIdToSave declared in wider scope
    if (!corporateIdToSave) {
      corporateIdToSave = isSuperAdmin() ? 'admin' : getSessionId();
    }
    
    const storageKey = corporateIdToSave === 'admin' ? 'staff_data' : `staff_data_${corporateIdToSave}`;
    
    // Construct Employee Object
    const employeeData: Employee = { // Fix: employeeData declared
        id: editingId || `EMP-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        branch: formData.branch,
        joiningDate: formData.joiningDate,
        salary: formData.salary,
        password: formData.password || '123456', // Default pass if not set
        status: formData.status,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
        
        // Step 2
        workingHours: formData.workingShift, // Store selected shift name as workingHours
        weekOff: formData.weekOff,
        liveTracking: formData.liveTracking,
        attendanceConfig: {
            gpsGeofencing: formData.gpsGeofencing, // Fix: gpsGeofencing used
            qrScan: formData.qrScan,
            manualPunch: formData.allowRemotePunch
        },
        allowedModules: formData.allowedModules,

        // Step 3 Data
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        maritalStatus: formData.maritalStatus,
        spouseName: formData.spouseName,
        children: formData.children,
        homeAddress: formData.homeAddress,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        aadhar: formData.aadhar,
        pan: formData.pan,
        upiId: formData.upiId,
        
        // Preserve other fields if editing
        ...(editingId ? employees.find(e => e.id === editingId) : {}) as any
    };

    // If editing and password field is empty, retain old password
    if (editingId && formData.password === '') {
        const oldEmp = employees.find(e => e.id === editingId); // Fix: oldEmp declared
        if (oldEmp) {
            employeeData.password = oldEmp.password;
        }
    }

    // Save to specific storage
    try {
        const existingData: Employee[] = JSON.parse(localStorage.getItem(storageKey) || '[]'); // Fix: existingData declared
        let newData: Employee[]; // Fix: newData declared
        
        if (editingId) { // Fix: editingId used
            // Check if corporate changed (Move employee)
            const oldEmp = employees.find(e => e.id === editingId); // Fix: oldEmp declared
            if (oldEmp && oldEmp.corporateId !== corporateIdToSave) {
                // Remove from old location
                const oldKey = oldEmp.corporateId === 'admin' ? 'staff_data' : `staff_data_${oldEmp.corporateId}`;
                const oldData: Employee[] = JSON.parse(localStorage.getItem(oldKey) || '[]');
                localStorage.setItem(oldKey, JSON.stringify(oldData.filter((e: Employee) => e.id !== editingId)));
                
                // Add to new
                newData = [...existingData, employeeData];
            } else {
                // Update in place
                newData = existingData.map((e: Employee) => e.id === editingId ? { ...e, ...employeeData } : e);
            }
        } else {
            // Create New
            newData = [...existingData, employeeData];
        }
        
        localStorage.setItem(storageKey, JSON.stringify(newData)); // Fix: newData used
        loadEmployees(); // Reload all
        setIsModalOpen(false);
    } catch (error: any) { // Fix: error variable name corrected
        console.error("Save failed", error);
        alert("Failed to save employee data.");
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => { // Fix: 'id' parameter and 'e' parameter
      e.stopPropagation();
      if(!window.confirm("Are you sure you want to delete this employee?")) return;
      
      // Determine the corporateId of the employee being deleted
      const employeeToDelete = employees.find(emp => emp.id === id);
      const targetCorp = employeeToDelete?.corporateId || (isSuperAdmin() ? 'admin' : getSessionId()); // Default to 'admin' or current session if corporateId is missing
      
      const key = targetCorp === 'admin' ? 'staff_data' : `staff_data_${targetCorp}`;
      
      try {
          const data: Employee[] = JSON.parse(localStorage.getItem(key) || '[]');
          const newData = data.filter((emp: Employee) => emp.id !== id);
          localStorage.setItem(key, JSON.stringify(newData));
          loadEmployees();
      } catch(error: any) { console.error(error); } // Fix: error variable name corrected
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="w-8 h-8 text-emerald-600" /> Staff Management
          </h2>
          <p className="text-gray-500">Manage employees, roles, and attendance settings</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Staff
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              {isSuperAdmin() && (
                  <select 
                    value={filterCorporate}
                    onChange={(e) => setFilterCorporate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
                  >
                      <option value="All">All Corporates</option>
                      <option value="admin">Head Office</option>
                      {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                  </select>
              )}
              
              <select 
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
              >
                  <option value="All">All Branches</option>
                  {Array.from(new Set(branches.map(b => b.name))).map(bName => <option key={bName} value={bName}>{bName}</option>)}
              </select>

              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
              </select>
          </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
              <div key={emp.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                          <img src={emp.avatar} alt="" className="w-12 h-12 rounded-full border border-gray-100 bg-gray-50" />
                          <div className="flex gap-1">
                            {/* Fix: Pass emp to handleEdit function */}
                              <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Staff">
                                <Edit2 className="w-4 h-4"/>
                              </button>
                            {/* Fix: Pass emp.id and event object to handleDelete */}
                              <button onClick={(e) => handleDelete(emp.id, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Staff">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                          </div>
                      </div>
                      
                      <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">{emp.role} • {emp.department}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" /> {emp.email}
                          </div>
                          <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" /> {emp.phone || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" /> {emp.branch || 'No Branch'}
                          </div>
                          {isSuperAdmin() && emp.corporateName && (
                              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit mt-2">
                                  <Building2 className="w-3 h-3" />
                                  {emp.corporateName}
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold border ${emp.status === 'Active' || !emp.status ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {emp.status || 'Active'}
                      </div>
                      <div className="flex gap-2">
                          {emp.liveTracking && <span title="Live Tracking On" className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                          {emp.attendanceConfig?.gpsGeofencing && <MapPin className="w-4 h-4 text-orange-500" title="Geofencing On" />}
                      </div>
                  </div>
              </div>
          ))}
          {filteredEmployees.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <p>No staff members found.</p>
                  <button onClick={handleOpenAdd} className="mt-4 text-emerald-600 font-medium hover:underline">Add First Employee</button>
              </div>
          )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                 <span className="text-sm text-gray-500">Step {currentStep} of 3</span>
                 <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                 {/* Step 1: Professional Information */}
                 {currentStep === 1 && (
                     <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-emerald-600" /> PROFESSIONAL INFORMATION
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {isSuperAdmin() && (
                               <div className="md:col-span-2">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to Corporate</label>
                                   <select 
                                       name="corporateId" 
                                       value={formData.corporateId}
                                       onChange={(e) => setFormData({...formData, corporateId: e.target.value, branch: ''})} 
                                       className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                                   >
                                       <option value="admin">Head Office</option>
                                       {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                                   </select>
                               </div>
                           )}

                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                               <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email *</label>
                               <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                               <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                               <div className="relative">
                                   <input 
                                       type={showPassword ? "text" : "password"}
                                       name="password" 
                                       value={formData.password}
                                       onChange={handleInputChange} 
                                       className="w-full p-2 pr-10 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" 
                                       placeholder={editingId ? "Leave blank to keep current" : "Default: 123456"}
                                   />
                                   <button
                                       type="button"
                                       onClick={() => setShowPassword(!showPassword)}
                                       className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                       title={showPassword ? "Hide password" : "Show password"}
                                   >
                                       {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                   </button>
                               </div>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
                               <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500" required>
                                 <option value="">Select Role</option>
                                 {roles.map(r => <option key={r} value={r}>{r}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                               <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                                 <option value="">Select Department</option>
                                 {departments.map(d => <option key={d} value={d}>{d}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                               <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                                   <option value="">Select Branch</option>
                                   {availableBranchesForForm.map((b: Branch) => <option key={b.id} value={b.name}>{b.name}</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Joining Date</label>
                               <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monthly Salary (₹)</label>
                               <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                               <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                                   <option>Active</option>
                                   <option>Inactive</option>
                               </select>
                           </div>
                        </div>
                     </div>
                 )}

                 {/* Step 2: Access & Permissions */}
                 {currentStep === 2 && (
                     <div className="space-y-6">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-600" /> ACCESS & PERMISSIONS
                        </h4>
                        
                        {/* Working Shift & Weekly Off */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Working Shift</label>
                               <select name="workingShift" value={formData.workingShift} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                                 <option value="">Select Shift</option>
                                 {shifts.map(s => <option key={s.id} value={s.name}>{s.name} ({s.start} - {s.end})</option>)}
                               </select>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weekly Off</label>
                               <select name="weekOff" value={formData.weekOff} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                                 {weekOffDays.map(day => <option key={day} value={day}>{day}</option>)}
                               </select>
                           </div>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <ToggleSwitch label="Enable Live Tracking" checked={formData.liveTracking} onChange={() => setFormData(prev => ({...prev, liveTracking: !prev.liveTracking}))} />
                            <ToggleSwitch label="Enable Geofencing" checked={formData.gpsGeofencing} onChange={() => setFormData(prev => ({...prev, gpsGeofencing: !prev.gpsGeofencing}))} />
                            <ToggleSwitch label="Enable QR Scan" checked={formData.qrScan} onChange={() => setFormData(prev => ({...prev, qrScan: !prev.qrScan}))} />
                            <ToggleSwitch label="Allow Remote Punch" checked={formData.allowRemotePunch} onChange={() => setFormData(prev => ({...prev, allowRemotePunch: !prev.allowRemotePunch}))} />
                        </div>

                        {/* Module Access Checkboxes */}
                        <div className="mt-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">MODULE ACCESS</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {allModuleAccessOptions.map(module => (
                                    <label key={module.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-200 transition-colors">
                                        <input
                                            type="checkbox"
                                            name="allowedModules"
                                            value={module.id}
                                            checked={formData.allowedModules.includes(module.id)}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{module.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                     </div>
                 )}

                 {/* Step 3: Personal Details */}
                 {currentStep === 3 && (
                     <div className="space-y-6">
                        {/* Personal Details */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" /> PERSONAL DETAILS
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="dd/mm/yyyy" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Blood Group</label>
                                    <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. O+" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marital Status</label>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                {formData.maritalStatus === 'Married' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Spouse Name</label>
                                            <input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Children</label>
                                            <input type="number" name="children" value={formData.children} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Home Address</label>
                                    <textarea name="homeAddress" value={formData.homeAddress} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20" placeholder="Full residential address"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-orange-500" /> EMERGENCY CONTACT
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Name</label>
                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Relationship</label>
                                    <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Spouse, Father" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                                    <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" />
                                </div>
                            </div>
                        </div>

                        {/* Banking & KYC */}
                        <div className="mt-6 border-t border-gray-100 pt-6">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-purple-500" /> BANKING & KYC
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Account No.</label>
                                    <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="123456789" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IFSC Code</label>
                                    <input type="text" name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="HDFC000123456" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Aadhar Number</label>
                                    <input type="text" name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="123456789123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PAN Number</label>
                                    <input type="text" name="pan" value={formData.pan} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="CCMPK6857M" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">UPI ID</label>
                                    <input type="text" name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="user@upi" />
                                </div>
                            </div>
                        </div>
                     </div>
                 )}
              </form>

              {/* Navigation Buttons */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl shrink-0">
                  {currentStep > 1 && (
                      <button 
                          type="button" 
                          onClick={handlePrevStep}
                          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h16.5" />
                          </svg>
                          Back
                      </button>
                  )}

                  <div className="flex-1 flex justify-end gap-3">
                      {currentStep < 3 ? (
                          <button 
                              type="button" 
                              onClick={handleNextStep}
                              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2"
                          >
                              Next 
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                              </svg>
                          </button>
                      ) : (
                          <>
                              <button 
                                  type="button" 
                                  onClick={handleCloseModal}
                                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                  Cancel
                              </button>
                              <button 
                                  type="submit" 
                                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2"
                              >
                                  <Save className="w-4 h-4" /> {editingId ? 'Update Employee' : 'Save Employee'}
                              </button>
                          </>
                      )}
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;