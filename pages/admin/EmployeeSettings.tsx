
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, UserX, Clock, 
  Settings2, Plane, Calendar, Zap, DollarSign, 
  RotateCcw, Download, Award, File, Bell, 
  MessageSquare, Plus, Trash2, Edit2, CheckCircle, 
  MapPin as MapPinIcon, Briefcase as BriefcaseIcon,
  ToggleLeft, ToggleRight, Save, UploadCloud, Search,
  AlertCircle, Shield, Smartphone, TrendingUp as TrendingUpIcon, RotateCw, CalendarCheck, X
} from 'lucide-react';

// --- Types ---
type SettingCategory = 
  | 'My Company Report' | 'My Team (Admins)' | 'Departments & Roles' | 'Custom Fields' | 'Inactive Employees'
  | 'Shifts & Breaks' | 'Attendance Modes'
  | 'Custom Paid Leaves' | 'Holiday List'
  | 'Auto Live Track'
  | 'Calendar Month' | 'Attendance Cycle' | 'Payout Date' | 'Import Settings' | 'Incentive Types' | 'Salary Templates' | 'Round Off'
  | 'App Notifications'
  | 'Request A Feature';

// --- Reusable UI Elements ---
const SectionHeader = ({ title, icon: Icon, desc }: { title: string, icon: any, desc?: string }) => (
  <div className="mb-6 border-b border-gray-100 pb-4">
    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
        <Icon className="w-5 h-5" />
      </div>
      {title}
    </h2>
    {desc && <p className="text-sm text-gray-500 mt-1 ml-11">{desc}</p>}
  </div>
);

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
    <span className="font-medium text-gray-700">{label}</span>
    <button 
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- Sub-Components for Each Section ---

// 1. My Company Report
const MyCompanyReport = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="My Company Report" icon={FileText} desc="Overview of company health and statistics." />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Total Employees</p>
        <h3 className="text-3xl font-bold text-gray-800">142</h3>
        <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
          <TrendingUpIcon className="w-3 h-3" /> +12% this month
        </p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Attendance Rate</p>
        <h3 className="text-3xl font-bold text-gray-800">94%</h3>
        <p className="text-emerald-600 text-xs font-medium mt-2">Consistent Performance</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm mb-1">Total Payroll (Est)</p>
        <h3 className="text-3xl font-bold text-gray-800">₹42.5L</h3>
        <p className="text-gray-400 text-xs font-medium mt-2">Next cycle: Dec 01</p>
      </div>
    </div>
    <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-300">
       <Download className="w-10 h-10 text-gray-400 mx-auto mb-3" />
       <h4 className="text-gray-900 font-medium">Download Full Report</h4>
       <p className="text-gray-500 text-sm mb-4">Get a detailed PDF analysis of your company stats.</p>
       <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
         Download PDF
       </button>
    </div>
  </div>
);

// 2. My Team (Admins)
const MyTeamAdmins = () => {
  const [admins, setAdmins] = useState([
    { id: 1, name: 'Senthil Kumar', role: 'Super Admin', email: 'senthil@okboz.com', active: true },
    { id: 2, name: 'Priya Sharma', role: 'HR Manager', email: 'priya@okboz.com', active: true },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="My Team (Admins)" icon={Shield} desc="Manage access levels and administrative staff." />
      
      <div className="flex justify-end">
        <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{admin.name}</div>
                  <div className="text-gray-500 text-xs">{admin.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{admin.role}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-emerald-600 p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 3. Departments & Roles (Updated for Persistence)
const DepartmentsAndRoles = () => {
  // Load initial state from local storage or defaults
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_departments');
    return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
  });

  const [roles, setRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem('company_roles');
    return saved ? JSON.parse(saved) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Associate'];
  });

  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState('');

  // Persist changes
  useEffect(() => {
    localStorage.setItem('company_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('company_roles', JSON.stringify(roles));
  }, [roles]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Departments & Roles" icon={Building2} desc="Define the organizational structure for your company." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Depts */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-500" /> Departments</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newDept} 
              onChange={(e) => setNewDept(e.target.value)} 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Logistics"
            />
            <button onClick={() => {if(newDept.trim()) {setDepartments([...departments, newDept.trim()]); setNewDept('')}}} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {departments.map((d, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{d}</span>
                <button onClick={() => setDepartments(departments.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
        {/* Roles */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BriefcaseIcon className="w-4 h-4 text-blue-500" /> Job Roles</h3>
          <div className="flex gap-2 mb-4">
            <input 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)} 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Driver"
            />
            <button onClick={() => {if(newRole.trim()) {setRoles([...roles, newRole.trim()]); setNewRole('')}}} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {roles.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                <span className="text-sm font-medium text-gray-700">{r}</span>
                <button onClick={() => setRoles(roles.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Custom Fields
const CustomFields = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Custom Fields" icon={Settings2} desc="Add extra fields to employee profiles." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         Currently no custom fields configured.
       </div>
       <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 mx-auto">
         <Plus className="w-4 h-4" /> Add Custom Field
       </button>
    </div>
  </div>
);

// 5. Inactive Employees
const InactiveEmployees = () => {
  const [inactiveStaff, setInactiveStaff] = useState<any[]>([]);
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  const loadInactive = () => {
      let all: any[] = [];
      // 1. Head Office / Current User Data
      // For Super Admin in StaffList, they only save to 'staff_data'.
      // For normal users/corporate, they save to 'staff_data_{id}'.
      const sessionId = localStorage.getItem('app_session_id') || 'admin';
      const key = isSuperAdmin ? 'staff_data' : `staff_data_${sessionId}`;
      
      try {
        const localData = JSON.parse(localStorage.getItem(key) || '[]');
        // We tag them with the storage key so we know where to save them back
        all = [...localData.map((e:any) => ({...e, storageKey: key}))];
      } catch(e) {
        console.error("Error loading staff data for inactive list", e);
      }

      setInactiveStaff(all.filter(e => e.status === 'Inactive'));
  };

  useEffect(() => {
      loadInactive();
  }, []);

  const handleRestore = (employee: any) => {
      if(!window.confirm(`Restore ${employee.name} to Active status?`)) return;

      const key = employee.storageKey;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = stored.map((e: any) => e.id === employee.id ? { ...e, status: 'Active' } : e);
        localStorage.setItem(key, JSON.stringify(updated));
        loadInactive(); // Refresh list
      } catch (e) {
        console.error("Failed to restore employee", e);
        alert("Error restoring employee data.");
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Inactive Employees" icon={UserX} desc="View and restore former employees." />
      
      {inactiveStaff.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Left On (Est.)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inactiveStaff.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt="" className="w-8 h-8 rounded-full opacity-60" />
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-gray-500 text-xs">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {emp.joiningDate ? new Date(new Date(emp.joiningDate).setMonth(new Date(emp.joiningDate).getMonth() + 12)).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleRestore(emp)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500">
          No inactive employees found.
        </div>
      )}
    </div>
  );
};

// 6. Shifts & Breaks (Updated for Persistence)
const ShiftsAndBreaks = () => {
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  const [shifts, setShifts] = useState<any[]>(() => {
    const saved = localStorage.getItem(getSessionKey('company_shifts'));
    return saved ? JSON.parse(saved) : [{ id: 1, name: 'General Shift', start: '09:30', end: '18:30' }];
  });

  const [newShift, setNewShift] = useState({ name: '', start: '', end: '' });

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_shifts'), JSON.stringify(shifts));
  }, [shifts, sessionId]);

  const handleAddShift = () => {
    if (newShift.name.trim() && newShift.start.trim() && newShift.end.trim()) {
      setShifts([...shifts, { id: Date.now(), ...newShift }]);
      setNewShift({ name: '', start: '', end: '' });
    }
  };

  const handleDeleteShift = (id: number) => {
    if (window.confirm("Delete this shift?")) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Configure working hours and break schedules." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> Working Shifts</h3>
        <div className="flex gap-2 mb-4">
          <input 
            value={newShift.name} 
            onChange={(e) => setNewShift({...newShift, name: e.target.value})} 
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Shift Name"
          />
          <input 
            type="time" 
            value={newShift.start} 
            onChange={(e) => setNewShift({...newShift, start: e.target.value})} 
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-gray-500 text-sm flex items-center">to</span>
          <input 
            type="time" 
            value={newShift.end} 
            onChange={(e) => setNewShift({...newShift, end: e.target.value})} 
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={handleAddShift} className="bg-emerald-500 text-white p-2 rounded-lg"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {shifts.map((s) => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
              <span className="text-sm font-medium text-gray-700">{s.name} ({s.start} - {s.end})</span>
              <button onClick={() => handleDeleteShift(s.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 7. Attendance Modes
const AttendanceModes = () => {
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  const [modes, setModes] = useState(() => {
    const saved = localStorage.getItem(getSessionKey('company_attendance_modes'));
    return saved ? JSON.parse(saved) : { gpsGeofencing: false, qrScan: false, manualPunch: true };
  });

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_attendance_modes'), JSON.stringify(modes));
  }, [modes, sessionId]);

  const handleToggle = (mode: keyof typeof modes) => {
    const isCurrentlyEnabled = modes[mode];

    if (isCurrentlyEnabled) {
        // Trying to disable. Check if others are enabled.
        const otherEnabled = Object.keys(modes).some(key =>
            key !== mode && modes[key as keyof typeof modes] === true
        );
        if (!otherEnabled) {
            alert("At least one attendance method must be enabled.");
            return;
        }
    }
    setModes(prev => ({ ...prev, [mode]: !prev[mode] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Attendance Modes" icon={Smartphone} desc="Configure allowed methods for staff attendance." />
      <div className="space-y-3">
        <ToggleSwitch 
            label="Enable GPS Geofencing for punch-in" 
            checked={modes.gpsGeofencing} 
            onChange={() => handleToggle('gpsGeofencing')} 
        />
        <p className="text-xs text-gray-500 pl-4 -mt-2">Geofencing requires Branch locations with set radius.</p>
        <ToggleSwitch 
            label="Enable QR Scan for punch-in" 
            checked={modes.qrScan} 
            onChange={() => handleToggle('qrScan')} 
        />
        <p className="text-xs text-gray-500 pl-4 -mt-2">QR Scan requires Camera permissions.</p>
        <ToggleSwitch 
            label="Allow Manual Punch (Web/Desktop)" 
            checked={modes.manualPunch} 
            onChange={() => handleToggle('manualPunch')} 
        />
        <p className="text-xs text-red-500 pl-4 -mt-2">At least one attendance method should be enabled.</p>
      </div>
    </div>
  );
};


// 8. Custom Paid Leaves (Updated for Persistence)
const CustomPaidLeaves = () => {
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  interface LeaveType {
    id: string;
    name: string;
    quota: number;
    period: 'Year' | 'Month';
  }

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(() => {
    const saved = localStorage.getItem(getSessionKey('company_leave_types'));
    return saved ? JSON.parse(saved) : [
      { id: 'cl', name: 'Casual Leave', quota: 12, period: 'Year' },
      { id: 'sl', name: 'Sick Leave', quota: 8, period: 'Year' },
      { id: 'pl', name: 'Privilege Leave', quota: 15, period: 'Year' },
    ];
  });

  const [newLeave, setNewLeave] = useState({ name: '', quota: '', period: 'Year' as 'Year' | 'Month' });
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_leave_types'), JSON.stringify(leaveTypes));
  }, [leaveTypes, sessionId]);

  const handleAddOrUpdateLeave = () => {
    if (newLeave.name.trim() && newLeave.quota) {
      if (editingLeaveId) {
        setLeaveTypes(prev => prev.map(lt => lt.id === editingLeaveId ? { ...lt, name: newLeave.name, quota: parseFloat(newLeave.quota), period: newLeave.period } : lt));
        setEditingLeaveId(null);
      } else {
        setLeaveTypes([...leaveTypes, { id: `lt-${Date.now()}`, name: newLeave.name, quota: parseFloat(newLeave.quota), period: newLeave.period }]);
      }
      setNewLeave({ name: '', quota: '', period: 'Year' });
    }
  };

  const handleEditLeave = (leave: LeaveType) => {
    setEditingLeaveId(leave.id);
    setNewLeave({ name: leave.name, quota: leave.quota.toString(), period: leave.period });
  };

  const handleDeleteLeave = (id: string) => {
    if (window.confirm("Delete this leave type?")) {
      setLeaveTypes(leaveTypes.filter(lt => lt.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Custom Paid Leaves" icon={Plane} desc="Define custom leave types and their annual quotas." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plane className="w-4 h-4 text-emerald-500" /> Leave Types</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <input 
            value={newLeave.name} 
            onChange={(e) => setNewLeave({...newLeave, name: e.target.value})} 
            className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Leave Name"
          />
          <input 
            type="number"
            value={newLeave.quota} 
            onChange={(e) => setNewLeave({...newLeave, quota: e.target.value})} 
            className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Quota"
          />
          <select 
            value={newLeave.period} 
            onChange={(e) => setNewLeave({...newLeave, period: e.target.value as 'Year' | 'Month'})} 
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            <option>Year</option>
            <option>Month</option>
          </select>
          <button onClick={handleAddOrUpdateLeave} className="bg-emerald-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center gap-1">
            {editingLeaveId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingLeaveId ? 'Update' : 'Add'}
          </button>
          {editingLeaveId && <button onClick={() => {setEditingLeaveId(null); setNewLeave({ name: '', quota: '', period: 'Year' });}} className="p-2 text-gray-500 hover:text-red-500"><X className="w-4 h-4"/></button>}
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
              <span className="text-sm font-medium text-gray-700">{lt.name} ({lt.quota} per {lt.period})</span>
              <div className="flex gap-1">
                <button onClick={() => handleEditLeave(lt)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => handleDeleteLeave(lt.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 9. Holiday List (Updated for Persistence)
const HolidayList = () => {
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  interface Holiday {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
  }

  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem(getSessionKey('company_holidays'));
    return saved ? JSON.parse(saved) : [
      { id: 'h1', name: 'New Year Day', date: '2025-01-01' },
      { id: 'h2', name: 'Republic Day', date: '2025-01-26' },
      { id: 'h3', name: 'Independence Day', date: '2025-08-15' },
      { id: 'h4', name: 'Gandhi Jayanti', date: '2025-10-02' },
      { id: 'h5', name: 'Diwali', date: '2025-10-20' },
      { id: 'h6', name: 'Christmas Day', date: '2025-12-25' },
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_holidays'), JSON.stringify(holidays));
  }, [holidays, sessionId]);

  const handleAddOrUpdateHoliday = () => {
    if (newHoliday.name.trim() && newHoliday.date) {
      if (editingHolidayId) {
        setHolidays(prev => prev.map(h => h.id === editingHolidayId ? { ...h, name: newHoliday.name, date: newHoliday.date } : h).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setEditingHolidayId(null);
      } else {
        setHolidays([...holidays, { id: `h-${Date.now()}`, name: newHoliday.name, date: newHoliday.date }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }
      setNewHoliday({ name: '', date: '' });
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHolidayId(holiday.id);
    setNewHoliday({ name: holiday.name, date: holiday.date });
  };

  const handleDeleteHoliday = (id: string) => {
    if (window.confirm("Delete this holiday?")) {
      setHolidays(holidays.filter(h => h.id !== id));
    }
  };

  const handleUploadList = () => {
    alert("Upload Holiday List feature is not implemented in this demo.");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Holiday List" icon={CalendarCheck} desc="Manage company-wide holidays and observances." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-emerald-500" /> Company Holidays</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <input 
            value={newHoliday.name} 
            onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})} 
            className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Holiday Name"
          />
          <input 
            type="date"
            value={newHoliday.date} 
            onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})} 
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button onClick={handleAddOrUpdateHoliday} className="bg-emerald-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center gap-1">
            {editingHolidayId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingHolidayId ? 'Update' : 'Add'}
          </button>
          {editingHolidayId && <button onClick={() => {setEditingHolidayId(null); setNewHoliday({ name: '', date: '' });}} className="p-2 text-gray-500 hover:text-red-500"><X className="w-4 h-4"/></button>}
          <button onClick={handleUploadList} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1">
            <UploadCloud className="w-4 h-4" /> Upload List
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {holidays.map((h) => (
            <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
              <span className="text-sm font-medium text-gray-700">{h.name}</span>
              <span className="text-sm text-gray-600">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <div className="flex gap-1">
                <button onClick={() => handleEditHoliday(h)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => handleDeleteHoliday(h.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// 10. Auto Live Track
const AutoLiveTrack = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Auto Live Track" icon={MapPinIcon} desc="Configure automatic GPS tracking for field employees." />
    <ToggleSwitch label="Enable Live Tracking for Field Staff" checked={true} onChange={() => alert("Feature toggle not implemented.")} />
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700">
      <AlertCircle className="w-4 h-4 inline-block mr-2 text-orange-500" />
      Live tracking consumes battery. Advise staff to enable power-saving mode.
    </div>
  </div>
);

// 11. Calendar Month
const CalendarMonth = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Calendar Month" icon={Calendar} desc="Configure the starting month for attendance and payroll cycles." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start Month</label>
      <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
        <option>January</option>
        <option>April (Common for India)</option>
        <option>July</option>
        <option>October</option>
      </select>
      <p className="text-xs text-gray-500 mt-2">Changing this will reset some attendance calculations for reports.</p>
    </div>
  </div>
);

// 12. Attendance Cycle
const AttendanceCycle = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Attendance Cycle" icon={RotateCw} desc="Define how attendance periods are calculated." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Calculation Period</label>
      <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
        <option>Calendar Month (1st to 30/31st)</option>
        <option>Custom Cycle (e.g., 26th to 25th)</option>
      </select>
      <p className="text-xs text-gray-500 mt-2">Custom cycle allows more flexible payroll periods.</p>
    </div>
  </div>
);

// 13. Payout Date (Updated for Persistence)
const PayoutDate = () => {
  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem(getSessionKey('company_departments'));
    return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
  });

  const [payoutDates, setPayoutDates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(getSessionKey('company_payout_dates'));
    return saved ? JSON.parse(saved) : {};
  });

  const [globalPayoutDay, setGlobalPayoutDay] = useState<string>(() => {
    const saved = localStorage.getItem(getSessionKey('company_global_payout_day'));
    return saved || '5'; // Default to 5th
  });

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_payout_dates'), JSON.stringify(payoutDates));
  }, [payoutDates, sessionId]);

  useEffect(() => {
    localStorage.setItem(getSessionKey('company_global_payout_day'), globalPayoutDay);
  }, [globalPayoutDay, sessionId]);

  const handleDeptPayoutChange = (dept: string, day: string) => {
    setPayoutDates(prev => ({ ...prev, [dept]: day }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Payout Date" icon={DollarSign} desc="Set monthly payroll payout dates for different departments." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> Payout Day</h3>
        
        <div className="mb-6">
           <label className="block text-sm font-medium text-gray-700 mb-1">Global Payout Day (if not set per department)</label>
           <input 
             type="number" 
             min="1" 
             max="28" // To avoid month end issues
             value={globalPayoutDay} 
             onChange={(e) => setGlobalPayoutDay(e.target.value)} 
             className="w-20 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
           />
           <span className="ml-2 text-sm text-gray-600">of each month</span>
        </div>

        <h4 className="font-bold text-gray-700 mb-3">Department Specific Payout Days</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
          {departments.map((dept) => (
            <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">{dept}</span>
              <div className="flex items-center gap-2">
                <select 
                  value={payoutDates[dept] || ''} 
                  onChange={(e) => handleDeptPayoutChange(dept, e.target.value)} 
                  className="w-24 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Global ({globalPayoutDay})</option>
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">th</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 14. Import Settings
const ImportSettings = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Import Settings" icon={UploadCloud} desc="Configure data import options for various modules." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         Data import for Staff, Leads, etc. can be configured here.
       </div>
       <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-2 mx-auto">
         <Search className="w-4 h-4" /> View Import Logs
       </button>
    </div>
  </div>
);

// 15. Incentive Types
const IncentiveTypes = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Incentive Types" icon={Award} desc="Define different types of incentives for employees." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         No incentive types configured.
       </div>
       <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 mx-auto">
         <Plus className="w-4 h-4" /> Add Incentive Type
       </button>
    </div>
  </div>
);

// 16. Salary Templates
const SalaryTemplates = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Salary Templates" icon={File} desc="Create and manage salary templates for different roles." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         No salary templates available.
       </div>
       <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 mx-auto">
         <Plus className="w-4 h-4" /> Create Template
       </button>
    </div>
  </div>
);

// 17. Round Off
const RoundOff = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Round Off" icon={RotateCcw} desc="Configure rules for rounding off attendance and payroll figures." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">Round Off Attendance (e.g., 15 mins)</label>
      <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
        <option>No Round Off</option>
        <option>Nearest 15 minutes</option>
        <option>Nearest 30 minutes</option>
        <option>Nearest Hour</option>
      </select>
      <p className="text-xs text-gray-500 mt-2">Applies to check-in/check-out times.</p>
    </div>
  </div>
);

// 18. App Notifications
const AppNotifications = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="App Notifications" icon={Bell} desc="Manage in-app notifications and alerts." />
    <ToggleSwitch label="Enable Real-time Notifications" checked={true} onChange={() => alert("Feature toggle not implemented.")} />
    <ToggleSwitch label="Send Email for Critical Alerts" checked={true} onChange={() => alert("Feature toggle not implemented.")} />
  </div>
);

// 19. Request A Feature
const RequestAFeature = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <SectionHeader title="Request A Feature" icon={MessageSquare} desc="Submit your ideas and suggestions to the development team." />
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
       <div className="mb-4 text-gray-500">
         Have an idea to improve OK BOZ? Let us know!
       </div>
       <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-2 mx-auto">
         <MessageSquare className="w-4 h-4" /> Submit Idea
       </button>
    </div>
  </div>
);


// --- Main EmployeeSettings Component ---
const EmployeeSettings: React.FC = () => { // Changed to const declaration
  const [activeSetting, setActiveSetting] = useState<SettingCategory>('Departments & Roles'); // Default to a populated section

  const renderActiveSetting = () => {
    switch (activeSetting) {
      case 'My Company Report': return <MyCompanyReport />;
      case 'My Team (Admins)': return <MyTeamAdmins />;
      case 'Departments & Roles': return <DepartmentsAndRoles />;
      case 'Custom Fields': return <CustomFields />;
      case 'Inactive Employees': return <InactiveEmployees />;
      case 'Shifts & Breaks': return <ShiftsAndBreaks />;
      case 'Attendance Modes': return <AttendanceModes />;
      case 'Custom Paid Leaves': return <CustomPaidLeaves />;
      case 'Holiday List': return <HolidayList />;
      case 'Auto Live Track': return <AutoLiveTrack />;
      case 'Calendar Month': return <CalendarMonth />;
      case 'Attendance Cycle': return <AttendanceCycle />;
      case 'Payout Date': return <PayoutDate />;
      case 'Import Settings': return <ImportSettings />;
      case 'Incentive Types': return <IncentiveTypes />;
      case 'Salary Templates': return <SalaryTemplates />;
      case 'Round Off': return <RoundOff />;
      case 'App Notifications': return <AppNotifications />;
      case 'Request A Feature': return <RequestAFeature />;
      default: return <div className="p-6 text-gray-500">Select a setting from the sidebar.</div>;
    }
  };

  const settingsLinks: { category: SettingCategory, icon: any }[] = [
    { category: 'My Company Report', icon: FileText },
    { category: 'My Team (Admins)', icon: Shield },
    { category: 'Departments & Roles', icon: Building2 },
    { category: 'Custom Fields', icon: Settings2 },
    { category: 'Inactive Employees', icon: UserX },
    { category: 'Shifts & Breaks', icon: Clock },
    { category: 'Attendance Modes', icon: Smartphone },
    { category: 'Custom Paid Leaves', icon: Plane },
    { category: 'Holiday List', icon: CalendarCheck },
    { category: 'Auto Live Track', icon: MapPinIcon },
    { category: 'Calendar Month', icon: Calendar },
    { category: 'Attendance Cycle', icon: RotateCw },
    { category: 'Payout Date', icon: DollarSign },
    { category: 'Import Settings', icon: UploadCloud },
    { category: 'Incentive Types', icon: Award },
    { category: 'Salary Templates', icon: File },
    { category: 'Round Off', icon: RotateCcw },
    { category: 'App Notifications', icon: Bell },
    { category: 'Request A Feature', icon: MessageSquare },
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-gray-500" /> Employee Settings
        </h3>
        <nav className="space-y-1">
          {settingsLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeSetting === link.category;
            return (
              <button
                key={link.category}
                onClick={() => setActiveSetting(link.category)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                <span className="truncate">{link.category}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 bg-gray-50 overflow-y-auto custom-scrollbar">
        {renderActiveSetting()}
      </div>
    </div>
  );
}

export default EmployeeSettings;
