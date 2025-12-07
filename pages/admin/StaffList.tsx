
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Search, Filter, Trash2, Edit2, 
  MapPin, Phone, Mail, Building2, Briefcase, 
  MoreVertical, CheckCircle, XCircle, X, Shield, Lock, Save
} from 'lucide-react';
import { Employee, CorporateAccount, UserRole } from '../../types';
import { MOCK_EMPLOYEES } from '../../constants';

// --- Helper for Session-Based Storage Keys ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';

// --- ToggleSwitch Component ---
const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
  <div 
    onClick={onChange}
    className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-emerald-200 transition-all`}
  >
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  </div>
);

const StaffList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [branches, setBranches] = useState<any[]>([]); // Using any for simplicity in aggregation
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    corporateId: isSuperAdmin() ? 'admin' : getSessionId(), // Default owner
    
    // Toggles (Flattened for Form)
    liveTracking: false,
    gpsGeofencing: false,
    qrScan: false,
    manualPunch: true,
    
    status: 'Active'
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // --- Load Data ---
  useEffect(() => {
    // 1. Load Corporates (for Admin dropdown)
    try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporates(corps);
    } catch (e) {}

    // 2. Load Branches
    let allBranches: any[] = [];
    try {
        if (isSuperAdmin()) {
            const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
            allBranches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];
            
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
               const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
               allBranches = [...allBranches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
            });
        } else {
            const key = `branches_data_${getSessionId()}`;
            const saved = localStorage.getItem(key);
            if (saved) allBranches = JSON.parse(saved).map((b: any) => ({...b, owner: getSessionId()}));
        }
    } catch (e) {}
    setBranches(allBranches);

    // 3. Load Employees
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    let allStaff: Employee[] = [];
    if (isSuperAdmin()) {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        allStaff = [...adminStaff.map((s: any) => ({...s, corporateId: 'admin', corporateName: 'Head Office'}))];
        
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                allStaff = [...allStaff, ...cStaff.map((s: any) => ({...s, corporateId: c.email, corporateName: c.companyName}))];
            });
        } catch(e) {}
        
        // Add Mocks if empty and is Admin
        if (allStaff.length === 0) allStaff = MOCK_EMPLOYEES.map(e => ({...e, corporateId: 'admin'}));
    } else {
        const key = `staff_data_${getSessionId()}`;
        const saved = localStorage.getItem(key);
        if (saved) allStaff = JSON.parse(saved).map((s: any) => ({...s, corporateId: getSessionId()}));
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

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Employee) => {
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
        password: emp.password || '',
        corporateId: emp.corporateId || (isSuperAdmin() ? 'admin' : getSessionId()),
        liveTracking: !!emp.liveTracking,
        gpsGeofencing: !!emp.attendanceConfig?.gpsGeofencing,
        qrScan: !!emp.attendanceConfig?.qrScan,
        manualPunch: emp.attendanceConfig?.manualPunch ?? true,
        status: emp.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
        alert("Please fill required fields (Name, Email, Role)");
        return;
    }

    const corporateIdToSave = formData.corporateId;
    const storageKey = corporateIdToSave === 'admin' ? 'staff_data' : `staff_data_${corporateIdToSave}`;
    
    // Construct Employee Object
    const employeeData: Employee = {
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
        
        liveTracking: formData.liveTracking,
        attendanceConfig: {
            gpsGeofencing: formData.gpsGeofencing,
            qrScan: formData.qrScan,
            manualPunch: formData.manualPunch
        },
        
        // Preserve other fields if editing
        ...(editingId ? employees.find(e => e.id === editingId) : {}) as any
    };

    // Save to specific storage
    try {
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        let newData;
        
        if (editingId) {
            // Check if corporate changed (Move employee)
            const oldEmp = employees.find(e => e.id === editingId);
            if (oldEmp && oldEmp.corporateId !== corporateIdToSave) {
                // Remove from old location
                const oldKey = oldEmp.corporateId === 'admin' ? 'staff_data' : `staff_data_${oldEmp.corporateId}`;
                const oldData = JSON.parse(localStorage.getItem(oldKey) || '[]');
                localStorage.setItem(oldKey, JSON.stringify(oldData.filter((e: any) => e.id !== editingId)));
                
                // Add to new
                newData = [...existingData, employeeData];
            } else {
                // Update in place
                newData = existingData.map((e: any) => e.id === editingId ? { ...e, ...employeeData } : e);
            }
        } else {
            // Create New
            newData = [...existingData, employeeData];
        }
        
        localStorage.setItem(storageKey, JSON.stringify(newData));
        loadEmployees(); // Reload all
        setIsModalOpen(false);
    } catch (e) {
        console.error("Save failed", e);
        alert("Failed to save employee data.");
    }
  };

  const handleDelete = (id: string, corporateId?: string) => {
      if(!window.confirm("Are you sure you want to delete this employee?")) return;
      
      const targetCorp = corporateId || (isSuperAdmin() ? 'admin' : getSessionId());
      const key = targetCorp === 'admin' ? 'staff_data' : `staff_data_${targetCorp}`;
      
      try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          const newData = data.filter((e: any) => e.id !== id);
          localStorage.setItem(key, JSON.stringify(newData));
          loadEmployees();
      } catch(e) { console.error(e); }
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
                  {Array.from(new Set(branches.map(b => b.name))).map(b => <option key={b} value={b}>{b}</option>)}
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
                              <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => handleDelete(emp.id, emp.corporateId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
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
                                  <Building2 className="w-3 h-3" /> {emp.corporateName}
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
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="font-bold text-gray-800 text-xl">{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isSuperAdmin() && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to (Corporate)</label>
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
                        <input type="text" name="password" value={formData.password} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Default: 123456" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
                        <input name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                        <input name="department" value={formData.department} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Branch</label>
                        <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500">
                            <option value="">Select Branch</option>
                            {availableBranchesForForm.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
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

                 <div className="mt-6 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-600" /> Permissions & Attendance
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ToggleSwitch label="Enable Live Tracking" checked={!!formData.liveTracking} onChange={() => setFormData(prev => ({...prev, liveTracking: !prev.liveTracking}))} />
                        <ToggleSwitch label="Enable Geofencing" checked={!!formData.gpsGeofencing} onChange={() => setFormData(prev => ({...prev, gpsGeofencing: !prev.gpsGeofencing}))} />
                        <ToggleSwitch label="Enable QR Scan" checked={!!formData.qrScan} onChange={() => setFormData(prev => ({...prev, qrScan: !prev.qrScan}))} />
                        <ToggleSwitch label="Allow Web Punch" checked={!!formData.manualPunch} onChange={() => setFormData(prev => ({...prev, manualPunch: !prev.manualPunch}))} />
                    </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2">
                       <Save className="w-4 h-4" /> Save Employee
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
