
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Phone, Mail, X, User, Upload, FileText, CreditCard, 
  Briefcase, Building, Calendar, Pencil, Trash2, Building2, Lock, 
  Download, Navigation, Globe, MapPin, Eye, EyeOff, Smartphone, 
  ScanLine, MousePointerClick, Heart, Baby, BookUser, Home, Truck, 
  Files, Car, RefreshCcw, Edit2, Save, AlertCircle, CheckCircle, 
  Loader2, ExternalLink, Clock, Shield, Users, Check, LayoutGrid, Hash, Sparkles
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

// Helper for Avatar Initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Helper for Avatar Color based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 
    'bg-indigo-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const StaffList: React.FC = () => {
  const [employees, setEmployees] = useState<DisplayEmployee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterDepartment, setFilterDepartment] = useState('All Departments'); // Added Dept Filter
  
  // Settings for Dropdowns
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]); // Added Dept List

  // Session Context
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Initial Data Loading ---
  useEffect(() => {
    // 1. Load Settings (Roles, Shifts, Depts)
    const savedRoles = localStorage.getItem('company_roles');
    if (savedRoles) setRolesList(JSON.parse(savedRoles));
    else setRolesList(['Manager', 'Team Lead', 'Driver', 'Sales Executive', 'HR', 'Admin']);

    const savedDepts = localStorage.getItem('company_departments'); // Load Departments
    if (savedDepts) setDepartmentsList(JSON.parse(savedDepts));
    else setDepartmentsList(['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance']);

    const savedShifts = localStorage.getItem(isSuperAdmin ? 'company_shifts' : `company_shifts_${sessionId}`);
    if (savedShifts) setShiftsList(JSON.parse(savedShifts));
    else setShiftsList([{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }]);

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
    // Permissions
    liveTracking: false,
    gpsGeofencing: false,
    qrScan: false,
    manualPunch: true,
    allowedModules: [] as string[],
    // Details
    aadhar: '',
    pan: '',
    accountNumber: '',
    ifsc: '',
    upiId: '', // New field
    homeAddress: '',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    // Docs
    idProof1Url: '',
    idProof2Url: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- AI State ---
  const [aiContextEmployee, setAiContextEmployee] = useState<DisplayEmployee | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleSave = () => {
      if (!formData.name || !formData.email || !formData.role) {
          alert("Please fill required fields (Name, Email, Role)");
          return;
      }

      // Determine where to save based on context
      // If Super Admin adds, it goes to 'staff_data' (Head Office)
      // If Corporate adds, it goes to 'staff_data_{id}'
      // Note: Admin cannot currently add staff *into* a franchise directly via this UI easily without a selector.
      // For now, assume Admin adds to HO, Corp adds to Corp.
      
      const storageKey = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
      
      const newEmployee: Employee = {
          id: editingId || `E${Date.now()}`,
          ...formData,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
          // Ensure toggle booleans are set
          liveTracking: formData.liveTracking,
          attendanceConfig: {
              gpsGeofencing: formData.gpsGeofencing,
              qrScan: formData.qrScan,
              manualPunch: formData.manualPunch
          }
      };

      try {
          const currentList = JSON.parse(localStorage.getItem(storageKey) || '[]');
          let updatedList;
          
          if (editingId) {
              // Update existing in local storage
              // Note: If Super Admin edits a Franchise employee, we need to know WHICH franchise key to update.
              // We can find this via the `franchiseId` property on the employee object in state.
              const targetEmployee = employees.find(e => e.id === editingId);
              if (targetEmployee && targetEmployee.franchiseId && targetEmployee.franchiseId !== 'admin') {
                   // Updating a franchise employee
                   const corpKey = `staff_data_${targetEmployee.franchiseId}`;
                   const corpList = JSON.parse(localStorage.getItem(corpKey) || '[]');
                   const updatedCorpList = corpList.map((e: Employee) => e.id === editingId ? newEmployee : e);
                   localStorage.setItem(corpKey, JSON.stringify(updatedCorpList));
                   updatedList = currentList; // No change to main list if viewing all
              } else {
                   // Updating own employee
                   updatedList = currentList.map((e: Employee) => e.id === editingId ? newEmployee : e);
                   localStorage.setItem(storageKey, JSON.stringify(updatedList));
              }
          } else {
              // Create New
              updatedList = [newEmployee, ...currentList];
              localStorage.setItem(storageKey, JSON.stringify(updatedList));
          }
          
          loadEmployees(); // Reload combined list
          handleCloseModal();
          alert(`Staff ${editingId ? 'updated' : 'added'} successfully!`);

      } catch (e) {
          console.error("Error saving staff", e);
          alert("Failed to save data.");
      }
  };

  const handleEdit = (employee: DisplayEmployee) => {
      setEditingId(employee.id);
      setIsEditMode(true);
      setFormData({
          ...initialFormState,
          ...employee,
          // Flatten nested config for form
          gpsGeofencing: employee.attendanceConfig?.gpsGeofencing || false,
          qrScan: employee.attendanceConfig?.qrScan || false,
          manualPunch: employee.attendanceConfig?.manualPunch ?? true,
          // Ensure arrays exist
          allowedModules: employee.allowedModules || []
      });
      setIsModalOpen(true);
  };

  const handleDelete = (id: string, franchiseId?: string) => {
      if (!window.confirm("Are you sure you want to delete this employee?")) return;

      const targetKey = (franchiseId && franchiseId !== 'admin') ? `staff_data_${franchiseId}` : (isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`);
      
      try {
          const list = JSON.parse(localStorage.getItem(targetKey) || '[]');
          const updated = list.filter((e: Employee) => e.id !== id);
          localStorage.setItem(targetKey, JSON.stringify(updated));
          loadEmployees();
      } catch (e) {
          console.error("Error deleting", e);
      }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setIsEditMode(false);
      setCurrentStep(1);
      setFormData(initialFormState);
  };

  const openAiChat = (employee: DisplayEmployee) => {
      setAiContextEmployee(employee);
      setShowAiModal(true);
  };

  // --- Filtering ---
  const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
          const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesRole = filterRole === 'All Roles' || emp.role === filterRole;
          const matchesStatus = filterStatus === 'All Status' || (filterStatus === 'Active' ? emp.status !== 'Inactive' : emp.status === 'Inactive');
          const matchesDept = filterDepartment === 'All Departments' || emp.department === filterDepartment;

          return matchesSearch && matchesRole && matchesStatus && matchesDept;
      });
  }, [employees, searchTerm, filterRole, filterStatus, filterDepartment]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">Manage your team members and their permissions</p>
        </div>
        <div className="flex gap-2">
            <button 
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + "Name,Role,Email,Phone,Department,JoinDate\n" + employees.map(e => `${e.name},${e.role},${e.email},${e.phone},${e.department},${e.joiningDate}`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "staff_export.csv");
                    document.body.appendChild(link);
                    link.click();
                }}
            >
                <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
                onClick={() => { setIsEditMode(false); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" /> Add Staff
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select 
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <option>All Departments</option>
                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <option>All Roles</option>
                {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
            </select>
         </div>
      </div>

      {/* CARD GRID VIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all relative group">
                  {/* Top Actions */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                          onClick={() => handleEdit(emp)} 
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                      >
                          <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                          onClick={() => handleDelete(emp.id, emp.franchiseId)} 
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Header: Avatar & Main Info */}
                  <div className="flex items-start gap-4 mb-4">
                      {emp.avatar && !emp.avatar.includes('ui-avatars') ? (
                          <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                      ) : (
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm ${getAvatarColor(emp.name)}`}>
                              {getInitials(emp.name)}
                          </div>
                      )}
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">{emp.name}</h3>
                          <p className="text-sm text-gray-500 font-medium">{emp.role}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                              {emp.department && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      {emp.department}
                                  </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                  Joined {new Date(emp.joiningDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Body: Details */}
                  <div className="space-y-3 mb-6">
                      {isSuperAdmin && emp.franchiseName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <Building2 className="w-4 h-4 text-indigo-500" />
                              <span className="font-medium">{emp.franchiseName}</span>
                          </div>
                      )}
                      {emp.branch && !isSuperAdmin && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{emp.branch}</span>
                          </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{emp.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{emp.email}</span>
                      </div>
                  </div>

                  {/* Footer: Status & AI Action */}
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                          emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {emp.status || 'Active'}
                      </span>

                      <button 
                          onClick={() => openAiChat(emp)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                          <Sparkles className="w-3 h-3" /> Ask HR AI
                      </button>
                  </div>
              </div>
          ))}
          
          {filteredEmployees.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No staff found</h3>
                  <p className="text-gray-500 mt-1">Adjust filters or add a new employee.</p>
              </div>
          )}
      </div>

      {/* Add/Edit Modal (Simplified for brevity, full form logic kept from previous) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h3>
                 <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                  {/* Step Wizard Header */}
                  <div className="flex justify-center mb-8">
                      {[1, 2, 3].map(step => (
                          <div key={step} className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep === step ? 'bg-emerald-600 text-white' : currentStep > step ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                  {currentStep > step ? <Check className="w-4 h-4" /> : step}
                              </div>
                              {step < 3 && <div className={`w-16 h-1 bg-gray-200 mx-2 ${currentStep > step ? 'bg-emerald-200' : ''}`}></div>}
                          </div>
                      ))}
                  </div>

                  {/* Step 1: Basic Info */}
                  {currentStep === 1 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                  <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                  <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white">
                                      <option value="">Select Role</option>
                                      {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                  <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white">
                                      <option value="">Select Department</option>
                                      {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                                  <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (CTC/Month)</label>
                                  <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none" placeholder="0" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                  <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white">
                                      <option value="">Select Branch</option>
                                      {branchesList.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Step 2: Permissions & Settings */}
                  {currentStep === 2 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" /> App Access</h4>
                              <div className="space-y-3">
                                  <ToggleSwitch label="Enable Live GPS Tracking" checked={formData.liveTracking} onChange={() => setFormData({...formData, liveTracking: !formData.liveTracking})} />
                                  <ToggleSwitch label="Enforce GPS Geofencing" checked={formData.gpsGeofencing} onChange={() => setFormData({...formData, gpsGeofencing: !formData.gpsGeofencing})} />
                                  <ToggleSwitch label="Allow QR Code Scan" checked={formData.qrScan} onChange={() => setFormData({...formData, qrScan: !formData.qrScan})} />
                              </div>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><Lock className="w-4 h-4" /> Module Permissions</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  {PERMISSIONS.map(perm => (
                                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                          <input 
                                              type="checkbox" 
                                              checked={formData.allowedModules.includes(perm.id)}
                                              onChange={() => handlePermissionToggle(perm.id)}
                                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                          />
                                          <span className="text-sm text-gray-700 font-medium">{perm.label}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Step 3: Banking & Personal */}
                  {currentStep === 3 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                          <h4 className="font-bold text-gray-800 border-b pb-2 mb-4">Banking Details</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <input placeholder="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                              <input placeholder="IFSC Code" name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                              <input placeholder="PAN Number" name="pan" value={formData.pan} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                              <input placeholder="Aadhar Number" name="aadhar" value={formData.aadhar} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                              <input placeholder="UPI ID" name="upiId" value={formData.upiId} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full col-span-2" />
                          </div>
                          
                          <h4 className="font-bold text-gray-800 border-b pb-2 mb-4 pt-4">Emergency Contact</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <input placeholder="Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                              <input placeholder="Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleInputChange} className="p-2.5 border rounded-lg w-full" />
                          </div>
                      </div>
                  )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between rounded-b-2xl">
                  {currentStep > 1 ? (
                      <button onClick={() => setCurrentStep(curr => curr - 1)} className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-white transition-colors">Back</button>
                  ) : (
                      <div></div>
                  )}
                  
                  {currentStep < 3 ? (
                      <button onClick={() => setCurrentStep(curr => curr + 1)} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md">Next Step</button>
                  ) : (
                      <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2">
                          <Check className="w-5 h-5" /> Save Staff
                      </button>
                  )}
              </div>
           </div>
        </div>
      )}

      {/* AI Assistant Modal (Pre-filled context) */}
      {showAiModal && aiContextEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-transparent w-full max-w-md h-[500px] relative pointer-events-auto">
                  <div className="absolute inset-0" onClick={() => setShowAiModal(false)}></div>
                  <div className="relative z-10 h-full">
                      <AiAssistant 
                          systemInstruction="You are an HR Assistant. Analyze the employee data provided."
                          initialMessage={`Here is the file for ${aiContextEmployee.name}. You can ask about their performance, attendance trends, or contact info.`}
                          triggerButtonLabel="Close AI"
                          isOpenInitially={true}
                          chatPrompt={`Tell me about ${aiContextEmployee.name} (${aiContextEmployee.role}).`}
                      />
                      <button 
                        onClick={() => setShowAiModal(false)}
                        className="absolute -top-12 right-0 text-white font-bold bg-black/50 p-2 rounded-full hover:bg-black/70"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StaffList;
