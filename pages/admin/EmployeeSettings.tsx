
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, UserX, Clock, 
  Settings2, Plane, Calendar, Zap, DollarSign, 
  RotateCcw, Download, Award, File, Bell, 
  MessageCircle, Plus, Trash2, Edit2, CheckCircle, 
  MapPin as MapPinIcon, Briefcase as BriefcaseIcon,
  ToggleLeft, ToggleRight, Save, UploadCloud, Search,
  AlertCircle, Shield, Smartphone, TrendingUp as TrendingUpIcon, RotateCw, CalendarCheck, X, MessageSquare, Briefcase
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';

// --- Helper for Session-Based Storage Keys ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';
const getStorageKey = (baseKey: string) => isSuperAdmin() ? baseKey : `${baseKey}_${getSessionId()}`;

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

const ToggleSwitch = ({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) => (
  <div 
    onClick={!disabled ? onChange : undefined}
    className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all cursor-pointer ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={`font-medium text-sm ${checked ? 'text-emerald-800' : 'text-gray-700'}`}>{label}</span>
    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  </div>
);

// --- Sub-Components ---

// 1. My Company Report (Real Calculation)
const MyCompanyReport = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, payroll: 0 });

  useEffect(() => {
    // Load staff to calculate stats
    const key = getStorageKey('staff_data');
    let staff = [];
    try {
      staff = JSON.parse(localStorage.getItem(key) || '[]');
    } catch(e) { staff = isSuperAdmin() ? [] : MOCK_EMPLOYEES; } // Fallback for demo if empty

    const activeStaff = staff.filter((e: any) => e.status !== 'Inactive');
    const totalPayroll = activeStaff.reduce((sum: number, e: any) => sum + (parseFloat(e.salary || '0') || 0), 0);

    setStats({
      total: staff.length,
      active: activeStaff.length,
      payroll: totalPayroll
    });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="My Company Report" icon={FileText} desc="Overview of company health and statistics." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Total Active Employees</p>
          <h3 className="text-3xl font-bold text-gray-800">{stats.active}</h3>
          <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Total Database: {stats.total}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Attendance Rate (Avg)</p>
          <h3 className="text-3xl font-bold text-gray-800">--%</h3>
          <p className="text-gray-400 text-xs font-medium mt-2">Calculated monthly</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Est. Monthly Payroll</p>
          <h3 className="text-3xl font-bold text-gray-800">₹{(stats.payroll/100000).toFixed(2)}L</h3>
          <p className="text-gray-400 text-xs font-medium mt-2">Based on CTC</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-300">
         <Download className="w-10 h-10 text-gray-400 mx-auto mb-3" />
         <h4 className="text-gray-900 font-medium">Download Full Report</h4>
         <p className="text-gray-500 text-sm mb-4">Get a detailed PDF analysis of your company stats.</p>
         <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
           Download PDF
         </button>
      </div>
    </div>
  );
};

// 2. My Team (Admins)
const MyTeamAdmins = () => {
  const [admins, setAdmins] = useState<any[]>(() => {
    const saved = localStorage.getItem(getStorageKey('sub_admins'));
    return saved ? JSON.parse(saved) : [];
  });
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'Admin' });

  useEffect(() => {
    localStorage.setItem(getStorageKey('sub_admins'), JSON.stringify(admins));
  }, [admins]);

  const handleAdd = () => {
    if(newAdmin.name && newAdmin.email) {
      setAdmins([...admins, { ...newAdmin, id: Date.now(), status: 'Active' }]);
      setNewAdmin({ name: '', email: '', role: 'Admin' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="My Team (Admins)" icon={Shield} desc="Manage sub-admins and HR managers." />
      
      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
         <h4 className="text-sm font-bold text-gray-700 mb-3">Add New Admin</h4>
         <div className="flex gap-2">
            <input placeholder="Name" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin, name: e.target.value})} className="flex-1 p-2 border rounded text-sm"/>
            <input placeholder="Email" value={newAdmin.email} onChange={e=>setNewAdmin({...newAdmin, email: e.target.value})} className="flex-1 p-2 border rounded text-sm"/>
            <button onClick={handleAdd} className="bg-emerald-500 text-white px-4 rounded text-sm font-bold">Add</button>
         </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-gray-500">No sub-admins added.</td></tr>}
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{admin.name}</div>
                  <div className="text-gray-500 text-xs">{admin.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{admin.role}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setAdmins(admins.filter(a => a.id !== admin.id))} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
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

// 3. Departments & Roles
const DepartmentsAndRoles = () => {
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_departments'));
    return saved ? JSON.parse(saved) : ['Sales', 'Marketing', 'Development', 'HR', 'Operations', 'Finance'];
  });

  const [roles, setRoles] = useState<string[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_roles'));
    return saved ? JSON.parse(saved) : ['Manager', 'Team Lead', 'Executive', 'Intern', 'Director', 'Driver'];
  });

  const [inputVal, setInputVal] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'Departments' | 'Roles'>('Departments');

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_departments'), JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_roles'), JSON.stringify(roles));
  }, [roles]);

  const handleSave = () => {
    if (!inputVal.trim()) return;
    const currentList = activeTab === 'Departments' ? departments : roles;
    const setList = activeTab === 'Departments' ? setDepartments : setRoles;

    if (editingIdx !== null) {
        const updated = [...currentList];
        updated[editingIdx] = inputVal.trim();
        setList(updated);
        setEditingIdx(null);
    } else {
        setList([...currentList, inputVal.trim()]);
    }
    setInputVal('');
  };

  const handleEdit = (idx: number) => {
      const currentList = activeTab === 'Departments' ? departments : roles;
      setInputVal(currentList[idx]);
      setEditingIdx(idx);
  };

  const handleDelete = (idx: number) => {
      const currentList = activeTab === 'Departments' ? departments : roles;
      const setList = activeTab === 'Departments' ? setDepartments : setRoles;
      setList(currentList.filter((_, i) => i !== idx));
      if (editingIdx === idx) { setEditingIdx(null); setInputVal(''); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Departments & Roles" icon={Building2} desc="Define organization structure." />
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
              <button 
                onClick={() => { setActiveTab('Departments'); setInputVal(''); setEditingIdx(null); }}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'Departments' ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  Departments
              </button>
              <button 
                onClick={() => { setActiveTab('Roles'); setInputVal(''); setEditingIdx(null); }}
                className={`flex-1 py-3 text-sm font-bold ${activeTab === 'Roles' ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  Roles
              </button>
          </div>
          
          <div className="p-6">
              <div className="flex gap-2 mb-6">
                  <input 
                    value={inputVal} 
                    onChange={(e) => setInputVal(e.target.value)} 
                    className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder={editingIdx !== null ? `Edit ${activeTab.slice(0,-1)}` : `Add New ${activeTab.slice(0,-1)}`}
                  />
                  <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                      {editingIdx !== null ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                      {editingIdx !== null ? 'Save' : 'Add'}
                  </button>
                  {editingIdx !== null && (
                      <button onClick={() => { setEditingIdx(null); setInputVal(''); }} className="text-gray-500 px-3 hover:bg-gray-100 rounded-lg">Cancel</button>
                  )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {(activeTab === 'Departments' ? departments : roles).map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors group">
                          <span className="text-sm font-medium text-gray-700">{item}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(i)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={() => handleDelete(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
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
       <p className="text-gray-500 mb-4">No custom fields defined.</p>
       <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 mx-auto">
         <Plus className="w-4 h-4" /> Add Field
       </button>
    </div>
  </div>
);

// 5. Inactive Employees
const InactiveEmployees = () => {
  const [inactiveStaff, setInactiveStaff] = useState<any[]>([]);

  const loadInactive = () => {
      const key = getStorageKey('staff_data');
      try {
        const localData = JSON.parse(localStorage.getItem(key) || '[]');
        setInactiveStaff(localData.filter((e: any) => e.status === 'Inactive'));
      } catch(e) { console.error(e); }
  };

  useEffect(() => { loadInactive(); }, []);

  const handleRestore = (id: string) => {
      if(!window.confirm(`Restore employee to Active status?`)) return;
      const key = getStorageKey('staff_data');
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = stored.map((e: any) => e.id === id ? { ...e, status: 'Active' } : e);
        localStorage.setItem(key, JSON.stringify(updated));
        loadInactive();
      } catch (e) { alert("Error restoring."); }
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
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inactiveStaff.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{emp.name}</td>
                  <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleRestore(emp.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100">Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500">No inactive employees.</div>
      )}
    </div>
  );
};

// 6. Shifts & Breaks (Updated to 12-hour format with Edit)
const ShiftsAndBreaks = () => {
  const [shifts, setShifts] = useState<any[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_shifts'));
    return saved ? JSON.parse(saved) : [{ id: 1, name: 'General Shift', start: '09:30 AM', end: '06:30 PM' }];
  });
  
  const [shiftForm, setShiftForm] = useState({ 
    name: '', 
    startHour: '09', startMin: '00', startAmPm: 'AM',
    endHour: '06', endMin: '00', endAmPm: 'PM' 
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const hours = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_shifts'), JSON.stringify(shifts));
  }, [shifts]);

  const handleSave = () => {
    if (!shiftForm.name) return;
    
    const start = `${shiftForm.startHour}:${shiftForm.startMin} ${shiftForm.startAmPm}`;
    const end = `${shiftForm.endHour}:${shiftForm.endMin} ${shiftForm.endAmPm}`;
    
    if (editingId) {
        setShifts(shifts.map(s => s.id === editingId ? { ...s, name: shiftForm.name, start, end } : s));
        setEditingId(null);
    } else {
        setShifts([...shifts, { id: Date.now(), name: shiftForm.name, start, end }]);
    }
    
    // Reset Form
    setShiftForm({ 
        name: '', 
        startHour: '09', startMin: '00', startAmPm: 'AM',
        endHour: '06', endMin: '00', endAmPm: 'PM' 
    });
  };

  const handleEdit = (shift: any) => {
      // Parse "09:30 AM" -> hour, min, ampm
      const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hour, min] = time.split(':');
          return { hour, min, period };
      };
      
      const s = parseTime(shift.start);
      const e = parseTime(shift.end);

      setShiftForm({
          name: shift.name,
          startHour: s.hour, startMin: s.min, startAmPm: s.period,
          endHour: e.hour, endMin: e.min, endAmPm: e.period
      });
      setEditingId(shift.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Configure working hours (12-hour AM/PM)." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        
        {/* Editor */}
        <div className={`flex flex-col gap-4 mb-6 p-4 rounded-xl border transition-colors ${editingId ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Shift Name</label>
                <input 
                  value={shiftForm.name} 
                  onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                  placeholder="e.g. Morning Shift" 
                />
            </div>
            
            <div className="flex gap-6 items-end">
                {/* Start Time */}
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Start Time</label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <select value={shiftForm.startHour} onChange={e => setShiftForm({...shiftForm, startHour: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="py-2 text-sm text-gray-400">:</span>
                        <select value={shiftForm.startMin} onChange={e => setShiftForm({...shiftForm, startMin: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={shiftForm.startAmPm} onChange={e => setShiftForm({...shiftForm, startAmPm: e.target.value})} className="p-2 text-sm outline-none bg-gray-100 font-bold text-gray-700 border-l border-gray-300 cursor-pointer hover:bg-gray-200">
                            <option>AM</option><option>PM</option>
                        </select>
                    </div>
                </div>

                {/* End Time */}
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">End Time</label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <select value={shiftForm.endHour} onChange={e => setShiftForm({...shiftForm, endHour: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="py-2 text-sm text-gray-400">:</span>
                        <select value={shiftForm.endMin} onChange={e => setShiftForm({...shiftForm, endMin: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={shiftForm.endAmPm} onChange={e => setShiftForm({...shiftForm, endAmPm: e.target.value})} className="p-2 text-sm outline-none bg-gray-100 font-bold text-gray-700 border-l border-gray-300 cursor-pointer hover:bg-gray-200">
                            <option>AM</option><option>PM</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm">
                        {editingId ? 'Update' : 'Add Shift'}
                    </button>
                    {editingId && (
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setShiftForm({ name: '', startHour: '09', startMin: '00', startAmPm: 'AM', endHour: '06', endMin: '00', endAmPm: 'PM' });
                            }} 
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-2">
          {shifts.map((s) => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors group">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                    <Clock className="w-4 h-4" />
                 </div>
                 <div>
                     <span className="block text-sm font-bold text-gray-800">{s.name}</span>
                     <span className="text-xs text-gray-500 font-mono">
                        {s.start} - {s.end}
                     </span>
                 </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(s)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg">
                    <Edit2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => setShifts(shifts.filter(x => x.id !== s.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 className="w-4 h-4"/>
                  </button>
              </div>
            </div>
          ))}
          {shifts.length === 0 && <div className="text-center text-gray-400 text-sm py-4">No shifts configured.</div>}
        </div>
      </div>
    </div>
  );
};

// 7. Attendance Modes
const AttendanceModes = () => {
  const [modes, setModes] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('company_attendance_modes'));
    return saved ? JSON.parse(saved) : { gpsGeofencing: false, qrScan: false, manualPunch: true };
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_attendance_modes'), JSON.stringify(modes));
  }, [modes]);

  const handleToggle = (m: string) => {
      setModes((prev: any) => ({ ...prev, [m]: !prev[m] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Attendance Modes" icon={Smartphone} desc="Configure default allowed methods for staff." />
      <div className="space-y-3">
        <ToggleSwitch label="Enable GPS Geofencing" checked={modes.gpsGeofencing} onChange={() => handleToggle('gpsGeofencing')} />
        <ToggleSwitch label="Enable QR Scan" checked={modes.qrScan} onChange={() => handleToggle('qrScan')} />
        <ToggleSwitch label="Allow Manual Punch" checked={modes.manualPunch} onChange={() => handleToggle('manualPunch')} />
      </div>
    </div>
  );
};

// 8. Custom Paid Leaves
const CustomPaidLeaves = () => {
  const [leaveTypes, setLeaveTypes] = useState<any[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_leave_types'));
    return saved ? JSON.parse(saved) : [
      { id: 'cl', name: 'Casual Leave', quota: 12 },
      { id: 'sl', name: 'Sick Leave', quota: 8 },
      { id: 'pl', name: 'Privilege Leave', quota: 15 },
    ];
  });
  const [leaveForm, setLeaveForm] = useState({ name: '', quota: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_leave_types'), JSON.stringify(leaveTypes));
  }, [leaveTypes]);

  const handleSave = () => {
      if(leaveForm.name && leaveForm.quota) {
          if (editingId) {
              setLeaveTypes(leaveTypes.map(l => l.id === editingId ? { ...l, name: leaveForm.name, quota: parseInt(leaveForm.quota) } : l));
              setEditingId(null);
          } else {
              setLeaveTypes([...leaveTypes, { id: Date.now(), name: leaveForm.name, quota: parseInt(leaveForm.quota) }]);
          }
          setLeaveForm({ name: '', quota: '' });
      }
  };

  const handleEdit = (leave: any) => {
      setLeaveForm({ name: leave.name, quota: leave.quota.toString() });
      setEditingId(leave.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Custom Paid Leaves" icon={Plane} desc="Define leave types and annual quotas." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
         <div className="flex gap-2 mb-4">
            <input value={leaveForm.name} onChange={e=>setLeaveForm({...leaveForm, name: e.target.value})} className="flex-1 border rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Leave Name" />
            <input type="number" value={leaveForm.quota} onChange={e=>setLeaveForm({...leaveForm, quota: e.target.value})} className="w-24 border rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Quota" />
            <button onClick={handleSave} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                {editingId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                {editingId ? 'Save' : 'Add'}
            </button>
            {editingId && (
                <button onClick={() => { setEditingId(null); setLeaveForm({name:'', quota:''}); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">Cancel</button>
            )}
         </div>
         <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {leaveTypes.map(l => (
                <div key={l.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100 group hover:border-emerald-200 transition-colors">
                    <span className="text-sm font-medium">{l.name} <span className="text-emerald-600 font-bold ml-2">({l.quota} Days)</span></span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(l)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => setLeaveTypes(leaveTypes.filter(x => x.id !== l.id))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// 9. Holiday List
const HolidayList = () => {
  const [holidays, setHolidays] = useState<any[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_holidays'));
    return saved ? JSON.parse(saved) : [
        { id: 'h1', name: 'New Year', date: '2025-01-01' },
        { id: 'h2', name: 'Republic Day', date: '2025-01-26' },
        { id: 'h3', name: 'Independence Day', date: '2025-08-15' },
    ];
  });
  const [form, setForm] = useState({ name: '', date: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_holidays'), JSON.stringify(holidays));
  }, [holidays]);

  const handleSave = () => {
      if(form.name && form.date) {
          if (editingId) {
              setHolidays(holidays.map(h => h.id === editingId ? { ...h, ...form } : h).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
              setEditingId(null);
          } else {
              setHolidays([...holidays, { id: Date.now().toString(), ...form }].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          }
          setForm({ name: '', date: '' });
      }
  };

  const handleEdit = (h: any) => {
      setForm({ name: h.name, date: h.date });
      setEditingId(h.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Holiday List" icon={CalendarCheck} desc="Manage company holidays." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
         <div className="flex gap-2 mb-4">
            <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="flex-1 border rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Holiday Name" />
            <input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-36 border rounded p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            <button onClick={handleSave} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                {editingId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                {editingId ? 'Save' : 'Add'}
            </button>
            {editingId && (
                <button onClick={() => { setEditingId(null); setForm({name:'', date:''}); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">Cancel</button>
            )}
         </div>
         <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {holidays.map(h => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100 group hover:border-emerald-200 transition-colors">
                    <div>
                        <span className="text-sm font-bold text-gray-800">{h.name}</span>
                        <span className="text-xs text-gray-500 ml-2">{h.date}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(h)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => setHolidays(holidays.filter(x => x.id !== h.id))} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// 10. Auto Live Track
const AutoLiveTrack = () => {
    const [enabled, setEnabled] = useState(() => localStorage.getItem(getStorageKey('company_settings_autotrack')) === 'true');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_autotrack'), String(enabled)); }, [enabled]);
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Auto Live Track" icon={MapPinIcon} desc="Enable automatic GPS tracking for field staff." />
            <ToggleSwitch label="Enable Live Tracking" checked={enabled} onChange={() => setEnabled(!enabled)} />
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mt-4 border border-blue-100">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                This will request location access from staff devices during working hours.
            </div>
        </div>
    );
};

// 11. Calendar Month
const CalendarMonth = () => {
    const [startMonth, setStartMonth] = useState(() => localStorage.getItem(getStorageKey('company_settings_financial_year')) || 'April');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_financial_year'), startMonth); }, [startMonth]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Calendar Month" icon={Calendar} desc="Set financial year start." />
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start</label>
                <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    <option>January</option><option>April</option><option>July</option><option>October</option>
                </select>
            </div>
        </div>
    );
};

// 12. Attendance Cycle
const AttendanceCycle = () => {
    const [cycle, setCycle] = useState(() => localStorage.getItem(getStorageKey('company_settings_attendance_cycle')) || 'Calendar Month');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_attendance_cycle'), cycle); }, [cycle]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Attendance Cycle" icon={RotateCw} desc="Define attendance calculation period." />
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Period</label>
                <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    <option>Calendar Month (1st to End)</option>
                    <option>Wage Cycle (26th to 25th)</option>
                </select>
            </div>
        </div>
    );
};

// 13. Payout Date
const PayoutDate = () => {
    const [payoutDate, setPayoutDate] = useState(() => localStorage.getItem(getStorageKey('company_global_payout_day')) || '5');
    useEffect(() => { localStorage.setItem(getStorageKey('company_global_payout_day'), payoutDate); }, [payoutDate]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Payout Date" icon={DollarSign} desc="Set monthly salary payout day." />
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month</label>
                <input type="number" min="1" max="28" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
        </div>
    );
};

// 14. Import Settings
const ImportSettings = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Import Settings" icon={UploadCloud} desc="Configure data import defaults." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500">
            Import configurations are managed automatically based on CSV headers.
        </div>
    </div>
);

// 15. Incentive Types
const IncentiveTypes = () => {
    const [types, setTypes] = useState<string[]>(() => {
        const saved = localStorage.getItem(getStorageKey('company_incentive_types'));
        return saved ? JSON.parse(saved) : ['Performance', 'Sales Commission', 'Referral'];
    });
    const [newType, setNewType] = useState('');

    useEffect(() => { localStorage.setItem(getStorageKey('company_incentive_types'), JSON.stringify(types)); }, [types]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Incentive Types" icon={Award} desc="Define incentive categories." />
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex gap-2 mb-4">
                    <input value={newType} onChange={e=>setNewType(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="Incentive Name" />
                    <button onClick={()=>{if(newType) {setTypes([...types, newType]); setNewType('')}}} className="bg-emerald-500 text-white p-2 rounded"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {types.map((t, i) => (
                        <div key={i} className="flex justify-between p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="text-sm">{t}</span>
                            <button onClick={()=>setTypes(types.filter((_, idx)=>idx!==i))} className="text-red-400"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 16. Salary Templates
const SalaryTemplates = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Salary Templates" icon={File} desc="Manage salary structures." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500">
            Standard Template: Basic (50%), HRA (30%), Allowance (20%) is currently active.
        </div>
    </div>
);

// 17. Round Off
const RoundOff = () => {
    const [round, setRound] = useState(() => localStorage.getItem(getStorageKey('company_settings_round_off')) || 'None');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_round_off'), round); }, [round]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Round Off" icon={RotateCcw} desc="Round off attendance times." />
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <select value={round} onChange={(e) => setRound(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    <option>None</option><option>Nearest 15 Mins</option><option>Nearest 30 Mins</option>
                </select>
            </div>
        </div>
    );
};

// 18. App Notifications
const AppNotifications = () => {
    const [enabled, setEnabled] = useState(() => localStorage.getItem(getStorageKey('company_settings_notifications')) === 'true');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_notifications'), String(enabled)); }, [enabled]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="App Notifications" icon={Bell} desc="Enable system notifications." />
            <ToggleSwitch label="Enable In-App Alerts" checked={enabled} onChange={() => setEnabled(!enabled)} />
        </div>
    );
};

// 19. Request A Feature
const RequestAFeature = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Request A Feature" icon={MessageSquare} desc="Feedback and suggestions." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
            <textarea className="w-full border rounded-lg p-3 mb-3 text-sm" rows={4} placeholder="Describe your idea..."></textarea>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Submit</button>
        </div>
    </div>
);


// --- Main Component ---
const EmployeeSettings: React.FC = () => {
  const [activeSetting, setActiveSetting] = useState<SettingCategory>('My Company Report');

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
      default: return null;
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
      {/* Sidebar */}
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

      {/* Content */}
      <div className="flex-1 p-8 bg-gray-50 overflow-y-auto custom-scrollbar">
        {renderActiveSetting()}
      </div>
    </div>
  );
};

export default EmployeeSettings;
