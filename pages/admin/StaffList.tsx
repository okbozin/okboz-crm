
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, 
  Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, 
  Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, 
  ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, 
  Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle, 
  Loader2, ExternalLink, Clock, Shield, Users, Check, LayoutGrid, Hash, Sparkles,
  ArrowRight, ArrowLeft
} from 'lucide-react';
import { Employee, Branch } from '../../types';
import { uploadFileToCloud } from '../../services/cloudService';
import AiAssistant from '../../components/AiAssistant';

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
  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterDepartment, setFilterDepartment] = useState('All Departments'); 
  
  // Settings for Dropdowns
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  
  // Default Attendance Settings (from Employee Settings)
  const [defaultAttendanceSettings, setDefaultAttendanceSettings] = useState({ gpsGeofencing: false, qrScan: false, manualPunch: true });

  // Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Initial Data Loading ---
  useEffect(() => {
    // 1. Load Settings (Roles, Shifts, Depts, Global Attendance)
    const savedRoles = localStorage.getItem('company_roles');
    if (savedRoles) setRolesList(JSON.parse(savedRoles));
    else setRolesList(['Manager', 'Team Lead', 'Driver', 'Sales Executive', 'HR', 'Admin']);

    const savedDepts = localStorage.getItem('company_departments'); 
    if (savedDepts) setDepartmentsList(JSON.parse(savedDepts));
    else setDepartmentsList(['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']);

    const shiftsKey = isSuperAdmin ? 'company_shifts' : `company_shifts_${sessionId}`;
    const savedShifts = localStorage.getItem(shiftsKey);
    if (savedShifts) setShiftsList(JSON.parse(savedShifts));
    else setShiftsList([{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);

    // Load Global Attendance Modes
    const attendanceKey = isSuperAdmin ? 'company_attendance_modes' : `company_attendance_modes_${sessionId}`;
    const savedAttendanceModes = localStorage.getItem(attendanceKey);
    if (savedAttendanceModes) {
        setDefaultAttendanceSettings(JSON.parse(savedAttendanceModes));
    }

    // 2. Load Branches
    let loadedBranches: any[] = [];
    if (isSuperAdmin) {
       const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
       loadedBranches = [...adminBranches];
       try {
         const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
         corporates.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
            loadedBranches = [...loadedBranches, ...cBranches];
         });
       } catch (e) {}
    } else {
       const key = `branches_data_${sessionId}`;
       const saved = localStorage.getItem(key);
       if (saved) loadedBranches = JSON.parse(saved);
    }
    setBranchesList(loadedBranches);

    // 3. Load Employees
    loadEmployees();
  }, [isSuperAdmin, sessionId]);

  const loadEmployees = () => {
      let allStaff: DisplayEmployee[] = [];

      if (isSuperAdmin) {
          // Admin's own staff
          const adminData = localStorage.getItem('staff_data');
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData);
                  allStaff = [...allStaff, ...parsed.map((e: any) => ({...e, franchiseName: 'Head Office', franchiseId: 'admin'}))];
              } catch (e) {}
          }

          // Corporate Staff
          try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData);
                        const tagged = parsed.map((e: any) => ({...e, franchiseName: corp.companyName, franchiseId: corp.email}));
                        allStaff = [...allStaff, ...tagged];
                    } catch (e) {}
                }
            });
          } catch(e) {}
      } else {
          // Corporate/User View
          const key = `staff_data_${sessionId}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              allStaff = JSON.parse(saved).map((e: any) => ({...e, franchiseName: 'My Branch', franchiseId: sessionId}));
          }
      }
      setEmployees(allStaff);
  };

  // --- Form State ---
  const initialFormState = {
    name: '',
    email: '',
    role: '',
    department: '',
    branch: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    phone: '',
    password: 'user123', // Default
    status: 'Active',
    workingHours: 'General Shift',
    weekOff: 'Sunday',
    // Permissions (Will be overridden by defaults in resetForm)
    liveTracking: false,
    gpsGeofencing: false,
    qrScan: false,
    manualPunch: true,
    allowedModules: [] as string[],
    // Details
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
    aadhar: '',
    pan: '',
    accountNumber: '',
    ifsc: '',
    upiId: '', 
    // Docs
    idProof1Url: '',
    idProof2Url: '',
  };

  const [formData, setFormData] = useState<Partial<Employee>>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Professional, 2: Settings, 3: Personal/Banking
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (moduleId: string) => {
      setFormData(prev => {
          const current = prev.allowedModules || [];
          if (current.includes(moduleId)) {
              return { ...prev, allowedModules: current.filter(id => id !== moduleId) };
          } else {
              return { ...prev, allowedModules: [...current, moduleId] };
          }
      });
  };

  const resetForm = () => {
      setFormData({
          ...initialFormState,
          // Sync with Global Settings Defaults
          gpsGeofencing: defaultAttendanceSettings.gpsGeofencing,
          qrScan: defaultAttendanceSettings.qrScan,
          manualPunch: defaultAttendanceSettings.manualPunch,
      });
      setEditingId(null);
      setCurrentStep(1);
  };

  const handleEdit = (employee: DisplayEmployee) => {
      setEditingId(employee.id);
      setFormData({ 
          ...employee,
          // Ensure attendance config matches current employee state if exists, fallback to defaults
          gpsGeofencing: employee.attendanceConfig?.gpsGeofencing ?? defaultAttendanceSettings.gpsGeofencing,
          qrScan: employee.attendanceConfig?.qrScan ?? defaultAttendanceSettings.qrScan,
          manualPunch: employee.attendanceConfig?.manualPunch ?? defaultAttendanceSettings.manualPunch,
      });
      setCurrentStep(1);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to delete this employee?")) {
          // Implement delete logic here similar to save but filtering
          const storageKey = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
          try {
             const currentList = JSON.parse(localStorage.getItem(storageKey) || '[]');
             const updatedList = currentList.filter((e: any) => e.id !== id);
             localStorage.setItem(storageKey, JSON.stringify(updatedList));
             loadEmployees();
          } catch(e) {}
      }
  };

  const handleSave = () => {
      if (!formData.name || !formData.email || !formData.role) {
          alert("Please fill required fields (Name, Email, Role)");
          return;
      }

      const storageKey = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
      
      const newEmployee: Employee = {
          id: editingId || `E${Date.now()}`,
          name: formData.name || '',
          email: formData.email,
          role: formData.role || '',
          department: formData.department || '',
          avatar: formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '')}&background=random&color=fff`,
          joiningDate: formData.joiningDate || new Date().toISOString(),
          ...formData,
          // Ensure toggle booleans are set
          liveTracking: !!formData.liveTracking,
          attendanceConfig: {
              gpsGeofencing: !!formData.gpsGeofencing,
              qrScan: !!formData.qrScan,
              manualPunch: !!formData.manualPunch
          }
      };

      try {
          const currentList = JSON.parse(localStorage.getItem(storageKey) || '[]');
          
          if (editingId) {
              // Update existing
              const targetEmployee = employees.find(e => e.id === editingId);
              if (targetEmployee && targetEmployee.franchiseId && targetEmployee.franchiseId !== 'admin') {
                   // Updating a franchise employee
                   const corpKey = `staff_data_${targetEmployee.franchiseId}`;
                   const corpList = JSON.parse(localStorage.getItem(corpKey) || '[]');
                   const updatedCorpList = corpList.map((e: Employee) => e.id === editingId ? newEmployee : e);
                   localStorage.setItem(corpKey, JSON.stringify(updatedCorpList));
              } else {
                  // Standard update
                  const updatedList = currentList.map((e: Employee) => e.id === editingId ? newEmployee : e);
                  localStorage.setItem(storageKey, JSON.stringify(updatedList));
              }
          } else {
              // Add new
              const updatedList = [newEmployee, ...currentList];
              localStorage.setItem(storageKey, JSON.stringify(updatedList));
          }
      } catch (e) {
          console.error("Error saving employee", e);
      }

      loadEmployees();
      setIsModalOpen(false);
      resetForm();
  };

  // --- Rendering ---
  
  const filteredEmployees = employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'All Roles' || emp.role === filterRole;
      const matchesStatus = filterStatus === 'All Status' || emp.status === filterStatus;
      const matchesDept = filterDepartment === 'All Departments' || emp.department === filterDepartment;
      
      return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">Manage your employees, roles, and permissions</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
         <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
         </div>
         <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
         >
            <option>All Roles</option>
            {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
         </select>
         <select 
            value={filterDepartment} 
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
         >
            <option>All Departments</option>
            {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
         </select>
         <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
         >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
         </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredEmployees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
               <div className="p-6 flex items-start justify-between">
                  <div className="flex gap-4">
                     <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                     <div>
                        <h3 className="font-bold text-gray-900">{emp.name}</h3>
                        <p className="text-sm text-gray-500">{emp.role}</p>
                        <p className="text-xs text-gray-400">{emp.department}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {emp.status}
                     </span>
                     {isSuperAdmin && emp.franchiseName && (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                           <Building2 className="w-3 h-3" /> {emp.franchiseName}
                        </span>
                     )}
                  </div>
               </div>
               
               {/* AI Quick Button */}
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100" title="Ask HR AI">
                       <Sparkles className="w-4 h-4" />
                   </button>
               </div>
               
               <div className="px-6 pb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                     <Mail className="w-4 h-4 text-gray-400" /> {emp.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                     <Phone className="w-4 h-4 text-gray-400" /> {emp.phone || 'N/A'}
                  </div>
               </div>

               <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500">ID: {emp.id}</span>
                  <div className="flex gap-2">
                     <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                     <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
               </div>
            </div>
         ))}
         {filteredEmployees.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
               No employees found.
            </div>
         )}
      </div>

      {/* Add/Edit Modal (3-Step Wizard) */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                  <div>
                      <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
                      <p className="text-xs text-gray-500 mt-1">Step {currentStep} of 3</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Step 1: Professional Details */}
                  {currentStep === 1 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                          <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-4">
                              <Briefcase className="w-4 h-4" /> Professional Information
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                   <option value="">Select Role</option>
                                   {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                   <option value="">Select Dept</option>
                                   {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                   <option value="">Select Branch</option>
                                   {branchesList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Salary (CTC)</label>
                                <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" placeholder="Monthly Gross" />
                             </div>
                          </div>
                      </div>
                  )}

                  {/* Step 2: Permissions */}
                  {currentStep === 2 && (
                      <div className="space-y-4 animate-in slide-in-from-right-4">
                          <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-4">
                              <Shield className="w-4 h-4" /> Access & Permissions
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Working Shift</label>
                                 <select name="workingHours" value={formData.workingHours} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                     <option value="General Shift">General Shift</option>
                                     {shiftsList.map(s => <option key={s.id} value={s.name}>{s.name} ({s.start}-{s.end})</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off</label>
                                 <select name="weekOff" value={formData.weekOff} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                     <option value="Sunday">Sunday</option>
                                     <option value="Saturday">Saturday</option>
                                     <option value="Friday">Friday</option>
                                 </select>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                             <ToggleSwitch label="Enable Live Tracking" checked={!!formData.liveTracking} onChange={() => setFormData(prev => ({...prev, liveTracking: !prev.liveTracking}))} />
                             <ToggleSwitch label="Enable Geofencing" checked={!!formData.gpsGeofencing} onChange={() => setFormData(prev => ({...prev, gpsGeofencing: !prev.gpsGeofencing}))} />
                             <ToggleSwitch label="Enable QR Scan" checked={!!formData.qrScan} onChange={() => setFormData(prev => ({...prev, qrScan: !prev.qrScan}))} />
                             <ToggleSwitch label="Allow Remote Punch" checked={!!formData.manualPunch} onChange={() => setFormData(prev => ({...prev, manualPunch: !prev.manualPunch}))} />
                          </div>

                          <div className="pt-4 border-t border-gray-100">
                             <label className="block text-sm font-medium text-gray-700 mb-3">Module Access</label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {PERMISSIONS.map(perm => (
                                   <label key={perm.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-all">
                                      <input 
                                         type="checkbox" 
                                         checked={formData.allowedModules?.includes(perm.id) || false} 
                                         onChange={() => handlePermissionToggle(perm.id)}
                                         className="rounded text-emerald-600 focus:ring-emerald-500"
                                      />
                                      {perm.label}
                                   </label>
                                ))}
                             </div>
                          </div>
                      </div>
                  )}

                  {/* Step 3: Personal & Banking */}
                  {currentStep === 3 && (
                      <div className="space-y-6 animate-in slide-in-from-right-4">
                          {/* Personal Details */}
                          <div>
                              <h4 className="text-sm font-bold text-purple-600 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-4">
                                  <User className="w-4 h-4" /> Personal Details
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                      <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                          <option value="">Select</option>
                                          <option value="Male">Male</option>
                                          <option value="Female">Female</option>
                                          <option value="Other">Other</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                                      <input name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" placeholder="e.g. O+" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                                      <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white">
                                          <option value="">Select</option>
                                          <option value="Single">Single</option>
                                          <option value="Married">Married</option>
                                          <option value="Divorced">Divorced</option>
                                      </select>
                                  </div>
                                  <div className="col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                                      <textarea name="homeAddress" rows={2} value={formData.homeAddress} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none resize-none" placeholder="Full residential address" />
                                  </div>
                              </div>
                          </div>

                          {/* Emergency Contact */}
                          <div>
                              <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-4">
                                  <AlertCircle className="w-4 h-4" /> Emergency Contact
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                      <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                                      <input name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" placeholder="e.g. Spouse, Father" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                      <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                              </div>
                          </div>

                          {/* Banking */}
                          <div>
                              <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-4">
                                  <CreditCard className="w-4 h-4" /> Banking & KYC
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account No.</label>
                                      <input name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                                      <input name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none uppercase" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                                      <input name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                      <input name="pan" value={formData.pan} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none uppercase" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                                      <input name="upiId" value={formData.upiId} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none" placeholder="user@upi" />
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
               </div>

               <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between rounded-b-2xl">
                  <button 
                    onClick={() => currentStep === 1 ? setIsModalOpen(false) : setCurrentStep(prev => prev - 1)} 
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white font-medium flex items-center gap-2"
                  >
                    {currentStep === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" /> Back</>}
                  </button>
                  
                  {currentStep < 3 ? (
                      <button 
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
                      >
                        Next <ArrowRight className="w-4 h-4" />
                      </button>
                  ) : (
                      <button 
                        onClick={handleSave} 
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Employee
                      </button>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StaffList;
