
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, 
  MapPin, Phone, Mail, Building2, 
  X, Save, Briefcase, Shield, User, CreditCard, Lock, Eye, EyeOff, AlertCircle,
  Calendar, CarFront, FileText, DollarSign, Headset, ClipboardList, ReceiptIndianRupee, Navigation, 
  Upload, Loader2, Image as ImageIcon, UserCircle 
} from 'lucide-react';
import { Employee, CorporateAccount, Branch } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';
import { uploadFileToCloud } from '../../services/cloudService'; 

// --- Helpers ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';

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
  // CRITICAL FIX: Synchronously load ALL data on mount to prevent overwriting
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin()) {
       let allStaff: Employee[] = [];
       
       // 1. Load Head Office Staff
       try {
           const adminData = localStorage.getItem('staff_data');
           if (adminData) {
               const parsedAdmin = JSON.parse(adminData);
               // Ensure they are tagged as admin for consistency
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
  const [searchTerm, setSearchTerm] = useState('');
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
    // Only run if we actually have data loaded to prevent wiping
    // (though the new initialization logic makes this safer)
    
    if (isSuperAdmin()) {
        const adminEmployees = employees.filter(e => !e.corporateId || e.corporateId === 'admin');
        localStorage.setItem('staff_data', JSON.stringify(adminEmployees));

        // Iterate through loaded corporates to save their specific lists
        // Note: This relies on 'corporates' state being populated.
        if (corporates.length > 0) {
            corporates.forEach(corp => {
                const corporateEmployees = employees.filter(e => e.corporateId === corp.email);
                localStorage.setItem(`staff_data_${corp.email}`, JSON.stringify(corporateEmployees));
            });
        }
    } else {
        // Corporate users save only their own employees
        const keySuffix = `_${getSessionId()}`;
        const currentCorpEmployees = employees.filter(e => e.corporateId === getSessionId());
        localStorage.setItem(`staff_data${keySuffix}`, JSON.stringify(currentCorpEmployees));
    }
  }, [employees, corporates]);

  // Filtered employees for display
  const filteredEmployees = useMemo(() => {
    let list = employees;
    
    // For Super Admin, filter by selected corporate in form (if not editing, default to 'admin' context)
    // For corporate user, only show their employees.
    const effectiveCorporateId = isSuperAdmin() ? formData.corporateId : getSessionId();
    if (effectiveCorporateId !== 'admin') {
      list = list.filter(e => e.corporateId === effectiveCorporateId);
    } else if (isSuperAdmin()) { 
      list = list.filter(e => !e.corporateId || e.corporateId === 'admin');
    }

    return list.filter(emp => {
      if (!emp) return false;
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [employees, searchTerm, formData.corporateId]);

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

    let avatarUrl = formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random&color=fff`;
    
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
            alert("Failed to upload avatar. Proceeding without new avatar.");
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
        if (prev.some(emp => emp.id === employeeData.id)) {
            employeeData.id = `E${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; 
        }
        return [...prev, employeeData];
      }
    });
    
    setUploadingAvatar(false);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    if (avatarInputRef.current) avatarInputRef.current.value = ''; 
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTogglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-600" /> Staff Management
          </h2>
          <p className="text-gray-500">Manage employee profiles, roles, and permissions</p>
        </div>
        <button 
          onClick={handleOpenAddEmployee}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {isSuperAdmin() && (
            <select 
                value={formData.corporateId} 
                onChange={e => setFormData({...formData, corporateId: e.target.value})}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
            >
                <option value="admin">Head Office</option>
                {corporates.map(c => (
                    <option key={c.id} value={c.email}>{c.companyName}</option>
                ))}
            </select>
        )}
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role / Dept</th>
                {isSuperAdmin() && <th className="px-6 py-4">Corporate</th>}
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Joining Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin() ? 7 : 6} className="py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 mb-3 text-gray-200" />
                      <p>No employees found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name || 'User')}&background=random&color=fff`} 
                          alt={emp.name} 
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <div className="font-bold text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{emp.role}</div>
                      <div className="text-xs text-gray-500">{emp.department}</div>
                    </td>
                    {isSuperAdmin() && (
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-indigo-500" />
                                <span className="text-indigo-700 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    {emp.corporateId === 'admin' ? 'Head Office' : corporates.find(c => c.email === emp.corporateId)?.companyName || 'N/A'}
                                </span>
                            </div>
                        </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-gray-700">{emp.email}</div>
                      <div className="text-xs text-gray-500">{emp.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(emp.joiningDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(emp)} 
                          className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-full transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)} 
                          className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
              {/* Left Column: Basic Info & Employment Details */}
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /> Basic Information</h4>
                
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-bold border border-gray-200 shrink-0 overflow-hidden">
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10" />
                    )}
                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      onChange={handleAvatarSelect} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*"
                      disabled={uploadingAvatar}
                    />
                  </div>
                  <div>
                    <button 
                      type="button" 
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                      {formData.avatar ? 'Change Avatar' : 'Upload Avatar'}
                    </button>
                    {formData.avatar && !uploadingAvatar && (
                        <button 
                            type="button" 
                            onClick={() => setFormData(prev => ({...prev, avatar: ''}))}
                            className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                        >
                            Remove
                        </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email *</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password *</label>
                  <div className="relative">
                    <input 
                      type={showPasswords[formData.id || 'new'] ? "text" : "password"} 
                      name="password" 
                      value={formData.password || ''} 
                      onChange={handleInputChange} 
                      className="w-full p-2 pr-10 border rounded-lg" 
                      required={!editingId} // Password required only for new employee
                      placeholder={editingId ? 'Leave blank to keep current' : 'Enter password'}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleTogglePasswordVisibility(formData.id || 'new')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPasswords[formData.id || 'new'] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-500" /> Employment Details</h4>
                {isSuperAdmin() && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corporate</label>
                        <select name="corporateId" value={formData.corporateId || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg">
                            <option value="admin">Head Office</option>
                            {corporates.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                        </select>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
                    <select name="role" value={formData.role || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required>
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department *</label>
                    <select name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                  <select name="branch" value={formData.branch || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg">
                    <option value="">Select Branch</option>
                    {allBranches
                        .filter(b => b && (!formData.corporateId || b.owner === formData.corporateId))
                        .map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Joining Date *</label>
                    <input type="date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Salary (CTC)</label>
                    <input type="number" name="salary" value={formData.salary || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select name="status" value={formData.status || 'Active'} onChange={handleInputChange} className="w-full p-2 border rounded-lg">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Advanced Settings & Permissions */}
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" /> Attendance & Tracking</h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <input type="checkbox" name="liveTracking" checked={formData.liveTracking || false} onChange={handleInputChange} className="rounded" />
                      <span className="text-sm">Enable Live Tracking</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <input type="checkbox" name="allowRemotePunch" checked={formData.allowRemotePunch || false} onChange={handleInputChange} className="rounded" />
                      <span className="text-sm">Allow Remote Punch-in</span>
                    </label>
                </div>
                <div className="space-y-3 p-3 bg-blue-50/20 border border-blue-100 rounded-lg">
                    <h5 className="text-xs font-bold text-blue-800 uppercase mb-2">Attendance Modes</h5>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">GPS Geofencing</span>
                      <input type="checkbox" checked={formData.attendanceConfig?.gpsGeofencing || false} onChange={() => handleToggleAttendanceConfig('gpsGeofencing')} className="rounded text-blue-600" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">QR Scan</span>
                      <input type="checkbox" checked={formData.attendanceConfig?.qrScan || false} onChange={() => handleToggleAttendanceConfig('qrScan')} className="rounded text-blue-600" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Manual Punch</span>
                      <input type="checkbox" checked={formData.attendanceConfig?.manualPunch || false} onChange={() => handleToggleAttendanceConfig('manualPunch')} className="rounded text-blue-600" />
                    </label>
                    {formData.attendanceConfig?.manualPunch && (
                        <div className="ml-6 mt-2">
                           <label className="block text-xs text-gray-600 mb-1">Manual Punch Mode:</label>
                           <select 
                             name="attendanceConfig.manualPunchMode"
                             value={formData.attendanceConfig.manualPunchMode || 'Anywhere'} 
                             onChange={handleInputChange} 
                             className="w-full p-1.5 border rounded-lg text-xs"
                           >
                              <option value="Anywhere">Anywhere</option>
                              <option value="BranchRadius">Within Branch Radius Only</option>
                           </select>
                        </div>
                    )}
                </div>

                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-red-500" /> Module Permissions</h4>
                <div className="grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100 max-h-60 overflow-y-auto">
                    {MODULE_PERMISSIONS.map(module => (
                        <label key={module.id} className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                name="allowedModules" 
                                value={module.id} 
                                checked={formData.allowedModules?.includes(module.id) || false} 
                                onChange={handleInputChange} 
                                className="rounded text-emerald-600"
                            />
                            <span className="text-sm text-gray-700">{module.label}</span>
                        </label>
                    ))}
                </div>

                {/* Personal Profile Details */}
                <h4 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><UserCircle className="w-4 h-4 text-orange-500" /> Personal Details (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                    <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg">
                      <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Home Address</label>
                  <textarea name="homeAddress" rows={2} value={formData.homeAddress || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg resize-none" />
                </div>
              </div>

              {/* Submit/Cancel Buttons */}
              <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={uploadingAvatar} className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2 disabled:opacity-50">
                  {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                  {editingId ? 'Update Employee' : 'Add Employee'}
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
