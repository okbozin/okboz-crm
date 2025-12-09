
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, User, Mail, Phone, MapPin, 
  Trash2, Edit2, CheckCircle, X, Shield, Building2, Briefcase, 
  Calendar, DollarSign, Eye, EyeOff, Lock, UserCheck, Smartphone
} from 'lucide-react';
import { Employee, UserRole } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

const StaffList: React.FC = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [employees, setEmployees] = useState<Employee[]>(() => {
    let allEmployees: Employee[] = [];
    if (isSuperAdmin) {
        // 1. Admin Head Office Staff
        const adminData = localStorage.getItem('staff_data');
        if (adminData) {
            try { 
                allEmployees = [...allEmployees, ...JSON.parse(adminData).map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))]; 
            } catch (e) {}
        } else {
            // Mocks for first run if empty
            allEmployees = [...MOCK_EMPLOYEES.map(e => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))];
        }

        // 2. Corporate Staff
        try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((c: any) => {
                const cData = localStorage.getItem(`staff_data_${c.email}`);
                if (cData) {
                    try { 
                        const cEmployees = JSON.parse(cData).map((e: any) => ({...e, corporateId: c.email, corporateName: c.companyName}));
                        allEmployees = [...allEmployees, ...cEmployees]; 
                    } catch (e) {}
                }
            });
        } catch(e) {}
    } else {
        const key = `staff_data_${sessionId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved).map((e: any) => ({...e, corporateId: sessionId})); } catch (e) {}
        }
        return [];
    }
    return allEmployees;
  });

  const [corporates, setCorporates] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Load Context Data (Corporates & Branches)
  useEffect(() => {
      try {
          const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
          setCorporates(corps);

          let allBranches = [];
          if (isSuperAdmin) {
              const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
              allBranches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
              corps.forEach((c: any) => {
                  const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                  allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
              });
          } else {
              const key = `branches_data_${sessionId}`;
              const saved = localStorage.getItem(key);
              if (saved) allBranches = JSON.parse(saved).map((b: any) => ({...b, owner: sessionId}));
          }
          setBranches(allBranches);
      } catch(e) {}
  }, [isSuperAdmin, sessionId]);

  // Persist Changes
  useEffect(() => {
      if (isSuperAdmin) {
          // Save Admin Staff
          const adminStaff = employees.filter(e => e.corporateId === 'admin').map(({corporateId, corporateName, ...rest}) => rest);
          localStorage.setItem('staff_data', JSON.stringify(adminStaff));

          // Save Corporate Staff
          corporates.forEach(c => {
              const cStaff = employees.filter(e => e.corporateId === c.email).map(({corporateId, corporateName, ...rest}) => rest);
              localStorage.setItem(`staff_data_${c.email}`, JSON.stringify(cStaff));
          });
      } else {
          const key = `staff_data_${sessionId}`;
          const myStaff = employees.map(({corporateId, corporateName, ...rest}) => rest);
          localStorage.setItem(key, JSON.stringify(myStaff));
      }
  }, [employees, isSuperAdmin, sessionId, corporates]);

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCorporate, setFilterCorporate] = useState('All');
  
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    role: '',
    department: '',
    email: '',
    phone: '',
    password: '',
    branch: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    status: 'Active',
    corporateId: isSuperAdmin ? 'admin' : sessionId,
    allowRemotePunch: false,
    liveTracking: false
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = e.target.checked;
    
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.email || !formData.role) {
          alert("Please fill required fields");
          return;
      }

      const ownerName = isSuperAdmin 
        ? (formData.corporateId === 'admin' ? 'Head Office' : corporates.find(c => c.email === formData.corporateId)?.companyName || 'Corporate')
        : 'My Branch';

      const newEmployee: Employee = {
          id: editingId || `EMP-${Date.now()}`,
          name: formData.name,
          role: formData.role,
          department: formData.department,
          email: formData.email,
          phone: formData.phone,
          password: formData.password || '123456',
          branch: formData.branch,
          joiningDate: formData.joiningDate,
          salary: formData.salary,
          status: formData.status,
          corporateId: formData.corporateId,
          corporateName: ownerName,
          allowRemotePunch: formData.allowRemotePunch,
          liveTracking: formData.liveTracking,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff`,
          attendanceConfig: {
              gpsGeofencing: true,
              qrScan: false,
              manualPunch: true,
              manualPunchMode: formData.allowRemotePunch ? 'Anywhere' : 'BranchRadius'
          },
          allowedModules: [] // Can be expanded later
      };

      if (editingId) {
          setEmployees(prev => prev.map(e => e.id === editingId ? { ...e, ...newEmployee } : e));
      } else {
          setEmployees(prev => [newEmployee, ...prev]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
  };

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({
          name: emp.name,
          role: emp.role,
          department: emp.department,
          email: emp.email || '',
          phone: emp.phone || '',
          password: emp.password || '',
          branch: emp.branch || '',
          joiningDate: emp.joiningDate,
          salary: emp.salary || '',
          status: emp.status || 'Active',
          corporateId: emp.corporateId || (isSuperAdmin ? 'admin' : sessionId),
          allowRemotePunch: emp.allowRemotePunch || false,
          liveTracking: emp.liveTracking || false
      });
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Are you sure you want to delete this employee?")) {
          setEmployees(prev => prev.filter(e => e.id !== id));
      }
  };

  const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
          const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesRole = filterRole === 'All' || emp.role === filterRole;
          const matchesBranch = filterBranch === 'All' || emp.branch === filterBranch;
          const matchesCorporate = filterCorporate === 'All' || emp.corporateId === filterCorporate;
          
          return matchesSearch && matchesRole && matchesBranch && matchesCorporate;
      });
  }, [employees, searchTerm, filterRole, filterBranch, filterCorporate]);

  const availableBranchesForForm = useMemo(() => {
      const targetOwner = formData.corporateId;
      return branches.filter(b => b.owner === targetOwner);
  }, [branches, formData.corporateId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <p className="text-gray-500">Manage your employees, roles, and access.</p>
        </div>
        <button 
            onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
            <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
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
          
          {isSuperAdmin && (
              <select 
                  value={filterCorporate} 
                  onChange={(e) => setFilterCorporate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
              </select>
          )}

          <select 
              value={filterBranch} 
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
              <option value="All">All Branches</option>
              {Array.from(new Set(branches.map(b => b.name))).map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
              <option value="All">All Roles</option>
              {Array.from(new Set(employees.map(e => e.role))).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(emp => (
              <div key={emp.id} className={`bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow group relative ${emp.status === 'Inactive' ? 'opacity-75 border-gray-200' : 'border-gray-200'}`}>
                  {emp.status === 'Inactive' && (
                      <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">Inactive</div>
                  )}
                  {isSuperAdmin && emp.corporateName && (
                      <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] font-bold border border-indigo-100 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {emp.corporateName}
                      </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                      <img src={emp.avatar} alt={emp.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
                      <div>
                          <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                          <p className="text-emerald-600 font-medium text-sm">{emp.role}</p>
                          <p className="text-gray-500 text-xs">{emp.department}</p>
                      </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" /> {emp.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" /> {emp.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" /> {emp.branch || 'No Branch'}
                      </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                          {emp.allowRemotePunch && <span className="bg-blue-50 text-blue-600 p-1.5 rounded" title="Remote Punch Allowed"><Briefcase className="w-3.5 h-3.5"/></span>}
                          {emp.liveTracking && <span className="bg-purple-50 text-purple-600 p-1.5 rounded" title="Live Tracking Enabled"><Smartphone className="w-3.5 h-3.5"/></span>}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handleEdit(emp)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* Identity */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Full Name *</label>
                        <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Status</label>
                        <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                 </div>

                 {/* Role & Dept */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Role *</label>
                        <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500" required>
                            <option value="">Select</option>
                            <option>Manager</option><option>Team Lead</option><option>Staff</option><option>Driver</option><option>HR</option><option>Admin</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Department</label>
                        <select name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">Select</option>
                            <option>Sales</option><option>Marketing</option><option>Operations</option><option>Development</option><option>Support</option>
                        </select>
                    </div>
                 </div>

                 {/* Assignment */}
                 <div className="grid grid-cols-2 gap-4">
                    {isSuperAdmin && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Corporate / Head Office</label>
                            <select name="corporateId" value={formData.corporateId} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                                <option value="admin">Head Office</option>
                                {corporates.map(c => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Branch Assignment</label>
                        <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">Select Branch</option>
                            {availableBranchesForForm.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                    </div>
                 </div>

                 {/* Contact & Login */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Email (Login ID) *</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Password</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Default: 123456" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                 </div>

                 {/* HR Details */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Joining Date</label>
                        <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">Monthly Salary (CTC)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                            <input type="number" name="salary" value={formData.salary} onChange={handleInputChange} className="w-full pl-7 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                    </div>
                 </div>

                 {/* Permissions */}
                 <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600"/> Permissions & Features</h4>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="allowRemotePunch" checked={formData.allowRemotePunch} onChange={handleInputChange} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                            <span className="text-sm text-gray-700">Allow Remote Punch-In</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="liveTracking" checked={formData.liveTracking} onChange={handleInputChange} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                            <span className="text-sm text-gray-700">Enable Live Tracking</span>
                        </label>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2">
                       <CheckCircle className="w-4 h-4" /> Save Employee
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
