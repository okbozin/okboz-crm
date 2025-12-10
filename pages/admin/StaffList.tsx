
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  MapPin, Phone, Mail, Building2, 
  X, Save, Briefcase, Shield, User, CreditCard, Lock, Eye, EyeOff, AlertCircle,
  Calendar, CarFront, FileText, DollarSign, Headset, ClipboardList, ReceiptIndianRupee, Navigation, 
  Upload, Loader2, Image as ImageIcon, UserCircle, CheckCircle, Ban
} from 'lucide-react';
import { Employee, CorporateAccount, Branch } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';
import { uploadFileToCloud } from '../../services/cloudService'; 

// --- Helpers ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';

// Helper for Avatar Colors based on name
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 
    'bg-orange-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-cyan-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const MODULE_PERMISSIONS = [
  { id: 'admin_attendance_view', label: 'Attendance (Admin View)', icon: Calendar, path: '/admin/attendance' },
  { id: 'staff_management', label: 'Staff Management', icon: Users, path: '/admin/staff' },
  { id: 'vendor_attachment', label: 'Vendor Attachment (Admin View)', icon: CarFront, path: '/admin/vendors' },
  { id: 'branches', label: 'Branches (Admin View)', icon: Building2, path: '/admin/branches' },
  { id: 'documents_admin_view', label: 'Documents (Admin View)', icon: FileText, path: '/admin/documents' },
  { id: 'payroll_admin_view', label: 'Payroll (Admin View)', icon: DollarSign, path: '/admin/payroll' },
  { id: 'finance_expenses_admin_view', label: 'Finance & Expenses (Admin View)', icon: CreditCard, path: '/admin/finance-and-expenses' },
  { id: 'email_marketing', label: 'Email Marketing', icon: Mail, path: '/admin/email-marketing' },
  { id: 'customer_care_admin_view', label: 'Customer Care (Admin View)', icon: Headset, path: '/admin/customer-care' },
  { id: 'tasks_admin_view', label: 'Tasks (Admin View)', icon: ClipboardList, path: '/admin/tasks' },
  { id: 'trip_earning_admin_view', label: 'Trip Earning (Admin View)', icon: ReceiptIndianRupee, path: '/admin/trip-earning' },
  { id: 'live_tracking_admin_view', label: 'Live Tracking (Admin View)', icon: Navigation },
  { id: 'my_attendance', label: 'My Attendance (Employee View)', icon: Calendar },
  { id: 'my_salary', label: 'My Salary (Employee View)', icon: DollarSign },
  { id: 'apply_leave', label: 'Apply Leave (Employee View)', icon: Briefcase },
  { id: 'my_profile', label: 'My Profile (Employee View)', icon: UserCircle },
  { id: 'security_account', label: 'Security & Account (Employee View)', icon: Lock },
  { id: 'tasks', label: 'My Tasks (Employee View)', icon: ClipboardList },
  { id: 'customer_care', label: 'My Customer Care (Employee View)', icon: Headset },
  { id: 'trip_earning', label: 'My Trip Earning (Employee View)', icon: ReceiptIndianRupee },
  { id: 'documents_employee_view', label: 'My Documents (Employee View)', icon: FileText },
  { id: 'vendor_attachment_employee_view', label: 'My Vendors (Employee View)', icon: CarFront },
  { id: 'finance_expenses_employee_view', label: 'My Expenses (Employee View)', icon: CreditCard },
];

const StaffList: React.FC = () => {
  // Load ALL data on mount
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin()) {
       let allStaff: Employee[] = [];
       
       // 1. Load Head Office Staff
       try {
           const adminData = localStorage.getItem('staff_data');
           if (adminData) {
               const parsedAdmin = JSON.parse(adminData);
               allStaff = parsedAdmin.map((e: any) => ({...e, corporateId: 'admin'}));
           } else {
               allStaff = MOCK_EMPLOYEES.map(e => ({...e, corporateId: 'admin'}));
           }
       } catch(e) { console.error("Error loading admin staff", e); }

       // 2. Load Corporate Staff
       try {
           const savedCorporates = localStorage.getItem('corporate_accounts');
           const corps = savedCorporates ? JSON.parse(savedCorporates) : [];
           corps.forEach((c: any) => {
               const cData = localStorage.getItem(`staff_data_${c.email}`);
               if (cData) {
                   const cEmployees = JSON.parse(cData).map((e:any) => ({...e, corporateId: c.email}));
                   allStaff = [...allStaff, ...cEmployees];
               }
           });
       } catch(e) { console.error("Error loading corporate staff", e); }
       
       return allStaff.filter((item: any) => item && typeof item === 'object');
    } else {
       // Corporate/Employee View
       const keySuffix = `_${getSessionId()}`;
       const saved = localStorage.getItem(`staff_data${keySuffix}`);
       let initialData = saved ? JSON.parse(saved) : [];
       return initialData.filter((item: any) => item && typeof item === 'object');
    }
  });

  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form State
  const initialFormState: Partial<Employee> = {
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    branch: '',
    salary: '',
    password: '',
    avatar: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    liveTracking: false,
    allowRemotePunch: false,
    attendanceConfig: {
      gpsGeofencing: true,
      qrScan: true,
      manualPunch: true,
      manualPunchMode: 'Anywhere'
    },
    allowedModules: [],
    corporateId: isSuperAdmin() ? 'admin' : getSessionId(),
    gender: '', dob: '', bloodGroup: '', maritalStatus: '', spouseName: '', children: 0,
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
    homeAddress: '', aadhar: '', pan: '', accountNumber: '', ifsc: '', upiId: ''
  };
  const [formData, setFormData] = useState<Partial<Employee>>(initialFormState);
  
  // Avatar Upload State
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load supporting data (corporates, branches)
  useEffect(() => {
    const loadSupportingData = () => {
      try {
        const loadedCorporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
        setCorporates(loadedCorporates);

        let loadedBranches: Branch[] = [];
        if (isSuperAdmin()) {
          const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]').filter((item: any) => item && typeof item === 'object');
          loadedBranches = [...adminBranches];
          loadedCorporates.forEach((c: any) => {
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
            loadedBranches = [...loadedBranches, ...cBranches];
          });
        } else {
          const key = `branches_data_${getSessionId()}`;
          loadedBranches = JSON.parse(localStorage.getItem(key) || '[]').filter((item: any) => item && typeof item === 'object');
        }
        setAllBranches(loadedBranches);
      } catch (e) {
        console.error("Error loading supporting data", e);
      }
    };

    loadSupportingData();
    window.addEventListener('storage', loadSupportingData);
    return () => window.removeEventListener('storage', loadSupportingData);
  }, []);

  // Persist Employee data
  useEffect(() => {
    if (isSuperAdmin()) {
        const adminEmployees = employees.filter(e => !e.corporateId || e.corporateId === 'admin');
        localStorage.setItem('staff_data', JSON.stringify(adminEmployees));

        if (corporates.length > 0) {
            corporates.forEach(corp => {
                const corporateEmployees = employees.filter(e => e.corporateId === corp.email);
                localStorage.setItem(`staff_data_${corp.email}`, JSON.stringify(corporateEmployees));
            });
        }
    } else {
        const keySuffix = `_${getSessionId()}`;
        const currentCorpEmployees = employees.filter(e => e.corporateId === getSessionId());
        localStorage.setItem(`staff_data${keySuffix}`, JSON.stringify(currentCorpEmployees));
    }
  }, [employees, corporates]);

  // Filtered employees for display
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp) return false;
      
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone?.includes(searchTerm);
      
      const matchesCorporate = filterCorporate === 'All' || emp.corporateId === filterCorporate || (filterCorporate === 'admin' && emp.corporateId === 'admin');
      const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
      const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;

      // Ensure proper context visibility (Super Admin sees all, Corporate sees own)
      const contextCheck = isSuperAdmin() 
         ? true 
         : emp.corporateId === getSessionId();

      return matchesSearch && matchesCorporate && matchesBranch && matchesStatus && contextCheck;
    });
  }, [employees, searchTerm, filterCorporate, filterBranch, filterStatus]);

  const departments = useMemo(() => {
    const key = isSuperAdmin() ? 'company_departments' : `company_departments_${getSessionId()}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
    return list.filter(Boolean);
  }, []);

  const roles = useMemo(() => {
    const key = isSuperAdmin() ? 'company_roles' : `company_roles_${getSessionId()}`;
    const saved = localStorage.getItem(key);
    let list = saved ? JSON.parse(saved) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Driver'];
    return list.filter(Boolean);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (name === 'allowedModules') {
        const currentModules = formData.allowedModules || [];
        setFormData(prev => ({
            ...prev,
            allowedModules: checked ? [...currentModules, value] : currentModules.filter(m => m !== value)
        }));
    } else if (name.includes('.')) { 
        const [parent, child] = name.split('.');
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent as keyof Partial<Employee>],
                [child]: value
            }
        }));
    }
    else {
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleToggleAttendanceConfig = (key: keyof Employee['attendanceConfig']) => {
    setFormData(prev => ({
      ...prev,
      attendanceConfig: {
        ...prev.attendanceConfig,
        [key]: !prev.attendanceConfig?.[key]
      }
    }));
  };

  const handleOpenAddEmployee = () => {
    setEditingId(null);
    setFormData(initialFormState); // Reset form
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setFormData({
      ...employee,
      joiningDate: employee.joiningDate.split('T')[0],
      dob: employee.dob ? employee.dob.split('T')[0] : '',
      salary: employee.salary?.toString() || '',
      corporateId: employee.corporateId || (isSuperAdmin() ? 'admin' : getSessionId()),
      attendanceConfig: employee.attendanceConfig || initialFormState.attendanceConfig
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role || !formData.department || !formData.joiningDate || !formData.password) {
      alert("Please fill all required fields (Name, Email, Role, Department, Joining Date, Password).");
      return;
    }

    setUploadingAvatar(true);

    let avatarUrl = formData.avatar || '';
    
    if (avatarInputRef.current?.files?.[0]) {
        try {
            const file = avatarInputRef.current.files[0];
            const path = `avatars/${formData.corporateId || 'admin'}/${formData.id || Date.now()}_${file.name}`;
            const cloudUrl = await uploadFileToCloud(file, path);
            if (cloudUrl) {
                avatarUrl = cloudUrl;
            } else {
                avatarUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }
        } catch (error) {
            console.error("Avatar upload failed:", error);
        }
    }
    
    const effectiveCorporateId = formData.corporateId || (isSuperAdmin() ? 'admin' : getSessionId());

    const employeeData: Employee = {
      id: editingId || `E${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      role: formData.role,
      department: formData.department,
      branch: formData.branch || '',
      salary: formData.salary || '0',
      password: formData.password,
      avatar: avatarUrl,
      joiningDate: formData.joiningDate,
      status: formData.status || 'Active',
      liveTracking: formData.liveTracking || false,
      allowRemotePunch: formData.allowRemotePunch || false,
      attendanceConfig: formData.attendanceConfig || initialFormState.attendanceConfig,
      allowedModules: formData.allowedModules || [],
      corporateId: effectiveCorporateId,
      dob: formData.dob || '',
      gender: formData.gender || '',
      bloodGroup: formData.bloodGroup || '',
      maritalStatus: formData.maritalStatus || '',
      spouseName: formData.spouseName || '',
      children: formData.children || 0,
      homeAddress: formData.homeAddress || '',
      emergencyContactName: formData.emergencyContactName || '',
      emergencyContactPhone: formData.emergencyContactPhone || '',
      emergencyContactRelationship: formData.emergencyContactRelationship || '',
      aadhar: formData.aadhar || '',
      pan: formData.pan || '',
      accountNumber: formData.accountNumber || '',
      ifsc: formData.ifsc || '',
      upiId: formData.upiId || '',
    };

    setEmployees(prev => {
      if (editingId) {
        return prev.map(emp => emp.id === editingId ? employeeData : emp);
      } else {
        return [employeeData, ...prev];
      }
    });
    
    setUploadingAvatar(false);
    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Users className="w-8 h-8 text-emerald-600" /> Staff Management
          </h2>
          <p className="text-gray-500">Manage your team members and access.</p>
        </div>
        
        <button 
          onClick={handleOpenAddEmployee}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Search by name, email, or phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
            />
         </div>
         
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             {isSuperAdmin() && (
                 <select 
                    value={filterCorporate}
                    onChange={(e) => setFilterCorporate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
                 >
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                 </select>
             )}
             
             <select 
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
             >
                <option value="All">All Branches</option>
                {allBranches
                    .filter(b => !isSuperAdmin() || filterCorporate === 'All' || b.owner === filterCorporate)
                    .map((b, i) => (
                    <option key={i} value={b.name}>{b.name}</option>
                ))}
             </select>

             <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px]"
             >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
             </select>
         </div>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map(emp => {
            const corpName = isSuperAdmin() && emp.corporateId === 'admin' 
                ? 'Head Office' 
                : corporates.find(c => c.email === emp.corporateId)?.companyName || 'Corporate';
            
            const displayBranch = emp.branch || 'Main Branch';
            const displayLocation = isSuperAdmin() ? (emp.corporateId === 'admin' ? `OK BOZ HEAD OFFICE` : `OK BOZ ${corpName.toUpperCase()}`) : `OK BOZ ${displayBranch.toUpperCase()}`;

            return (
                <div key={emp.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow relative group">
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(emp)} className="text-gray-400 hover:text-blue-500 p-1 hover:bg-blue-50 rounded-full transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${emp.avatar && !emp.avatar.includes('ui-avatars') ? '' : getAvatarColor(emp.name)} overflow-hidden`}>
                            {emp.avatar && !emp.avatar.includes('ui-avatars') ? (
                                <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                            ) : (
                                getInitials(emp.name)
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{emp.name}</h3>
                            <p className="text-sm text-gray-500 font-medium">{emp.role} • {emp.department}</p>
                        </div>
                    </div>

                    <div className="space-y-2.5 text-sm text-gray-600 mb-5">
                        <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate">{emp.email}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{emp.phone}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate">{isSuperAdmin() ? (emp.corporateId === 'admin' ? 'Head Office' : corpName) : displayBranch}</span>
                        </div>
                    </div>

                    <div className="mb-4">
                         <span className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide border border-indigo-100">
                             {displayLocation}
                         </span>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${emp.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                           {emp.status}
                        </span>
                        {/* Simulated Online Status Dot */}
                        {emp.isOnline ? (
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white shadow-sm" title="Online"></span>
                        ) : (
                            <span className="w-2.5 h-2.5 bg-red-400 rounded-full ring-2 ring-white shadow-sm" title="Offline"></span>
                        )}
                    </div>
                </div>
            );
        })}
        
        {filteredEmployees.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No employees found matching your filters.</p>
            </div>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                 <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-5">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><User className="w-4 h-4 text-blue-500"/> Personal & Work Details</h4>
                       
                       <div className="flex justify-center mb-4">
                          <div 
                              onClick={() => avatarInputRef.current?.click()}
                              className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors relative overflow-hidden group"
                          >
                              {formData.avatar && !formData.avatar.includes('ui-avatars') ? (
                                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <>
                                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 mb-1" />
                                      <span className="text-[10px] text-gray-500">Upload Photo</span>
                                  </>
                              )}
                              <input 
                                  type="file" 
                                  ref={avatarInputRef} 
                                  className="hidden" 
                                  accept="image/*"
                              />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                             <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="John Doe" />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone *</label>
                             <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="+91..." />
                          </div>
                       </div>
                       
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Login ID) *</label>
                           <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="john@company.com" />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department *</label>
                             <select required name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="">Select Dept</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
                             <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="">Select Role</option>
                                {roles.map(r => <option key={r} value={r}>{r}</option>)}
                             </select>
                          </div>
                       </div>

                       {/* Conditional Branch/Corporate Selectors */}
                       <div className="grid grid-cols-2 gap-4">
                           {isSuperAdmin() && (
                               <div>
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corporate</label>
                                   <select 
                                      name="corporateId" 
                                      value={formData.corporateId} 
                                      onChange={handleInputChange} 
                                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                                   >
                                      <option value="admin">Head Office</option>
                                      {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                                   </select>
                               </div>
                           )}
                           
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                               <select 
                                  name="branch" 
                                  value={formData.branch} 
                                  onChange={handleInputChange} 
                                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                               >
                                  <option value="">Select Branch</option>
                                  {allBranches
                                     .filter(b => b.owner === (formData.corporateId || getSessionId()))
                                     .map(b => <option key={b.id} value={b.name}>{b.name}</option>)
                                  }
                               </select>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Joining Date *</label>
                               <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monthly Salary (₹)</label>
                               <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0" />
                           </div>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Login Password *</label>
                           <div className="relative">
                               <input 
                                  type={showPasswords['new'] ? "text" : "password"} 
                                  name="password" 
                                  value={formData.password} 
                                  onChange={handleInputChange} 
                                  className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                                  placeholder="Set a strong password" 
                                  required={!editingId}
                               />
                               <button 
                                  type="button"
                                  onClick={() => setShowPasswords(prev => ({...prev, new: !prev.new}))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                               >
                                   {showPasswords['new'] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                               </button>
                           </div>
                       </div>
                    </div>

                    {/* Right Column: Permissions & Config */}
                    <div className="space-y-6">
                       <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-purple-500"/> Permissions & Settings</h4>
                       
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                           <h5 className="text-xs font-bold text-gray-500 uppercase">Attendance Rules</h5>
                           <label className="flex items-center justify-between cursor-pointer">
                               <span className="text-sm text-gray-700">GPS Geofencing</span>
                               <input type="checkbox" checked={formData.attendanceConfig?.gpsGeofencing} onChange={() => handleToggleAttendanceConfig('gpsGeofencing')} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                           </label>
                           <label className="flex items-center justify-between cursor-pointer">
                               <span className="text-sm text-gray-700">QR Scan Required</span>
                               <input type="checkbox" checked={formData.attendanceConfig?.qrScan} onChange={() => handleToggleAttendanceConfig('qrScan')} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                           </label>
                           <label className="flex items-center justify-between cursor-pointer">
                               <span className="text-sm text-gray-700">Allow Manual Punch</span>
                               <input type="checkbox" checked={formData.attendanceConfig?.manualPunch} onChange={() => handleToggleAttendanceConfig('manualPunch')} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                           </label>
                           <div className="pt-2 border-t border-gray-200 mt-2">
                               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manual Punch Mode</label>
                               <select 
                                  value={formData.attendanceConfig?.manualPunchMode} 
                                  onChange={(e) => setFormData(prev => ({...prev, attendanceConfig: {...prev.attendanceConfig!, manualPunchMode: e.target.value as any}}))}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                               >
                                   <option value="Anywhere">Anywhere (Remote)</option>
                                   <option value="BranchRadius">Branch Radius Only</option>
                               </select>
                           </div>
                       </div>

                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                           <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Live Tracking</h5>
                           <label className="flex items-center justify-between cursor-pointer">
                               <span className="text-sm text-gray-700">Enable Live GPS Tracking</span>
                               <input 
                                  type="checkbox" 
                                  name="liveTracking"
                                  checked={formData.liveTracking} 
                                  onChange={handleInputChange} 
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" 
                               />
                           </label>
                           <p className="text-[10px] text-gray-400 mt-1">
                               Tracking is active only when employee is clocked in.
                           </p>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Status</label>
                           <select 
                              name="status" 
                              value={formData.status} 
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                           >
                               <option value="Active">Active</option>
                               <option value="Inactive">Inactive</option>
                           </select>
                       </div>

                       {/* Module Permissions */}
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Module Access</label>
                           <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 custom-scrollbar">
                               {MODULE_PERMISSIONS.map(mod => (
                                   <label key={mod.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                                       <input 
                                          type="checkbox" 
                                          name="allowedModules" 
                                          value={mod.id}
                                          checked={formData.allowedModules?.includes(mod.id)}
                                          onChange={handleInputChange}
                                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" 
                                       />
                                       <span className="text-sm text-gray-700">{mod.label}</span>
                                   </label>
                               ))}
                           </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-gray-100 mt-6 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                    <button type="submit" disabled={uploadingAvatar} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2">
                       {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                       {editingId ? 'Update Employee' : 'Save Employee'}
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
