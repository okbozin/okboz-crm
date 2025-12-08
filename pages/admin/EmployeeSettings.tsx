
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, UserX, Clock, 
  Settings2, Plane, Calendar, Zap, DollarSign, 
  RotateCcw, Download, Award, File, Bell, 
  MessageCircle, Plus, Trash2, Edit2, 
  MapPin as MapPinIcon, 
  Save, UploadCloud, 
  AlertCircle, Shield, Smartphone, RotateCw, CalendarCheck, MessageSquare, Timer, AlertTriangle, Car
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';

// --- Helper for Session-Based Storage Keys ---
const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
const isSuperAdmin = () => getSessionId() === 'admin';
const getStorageKey = (baseKey: string) => isSuperAdmin() ? baseKey : `${baseKey}_${getSessionId()}`;

// --- Types ---
type SettingCategory = 
  | 'My Company Report' | 'My Team (Admins)' | 'Departments & Roles' | 'Custom Fields' | 'Inactive Employees'
  | 'Shifts & Breaks' | 'Attendance Modes' | 'Attendance Rules'
  | 'Custom Paid Leaves' | 'Holiday List'
  | 'Auto Live Track'
  | 'Transport Settings'
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

// 1. My Company Report
const MyCompanyReport = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, payroll: 0 });

  useEffect(() => {
    const key = getStorageKey('staff_data');
    let staff = [];
    try {
      staff = JSON.parse(localStorage.getItem(key) || '[]');
    } catch(e) { staff = isSuperAdmin() ? [] : MOCK_EMPLOYEES; }

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
      <SectionHeader title="My Company Report" icon={FileText} desc="View key metrics about your workforce, including total count, active status, and estimated payroll." />
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
      <SectionHeader title="My Team (Admins)" icon={Shield} desc="Control access permissions by adding sub-admins or HR managers who can help manage the system." />
      
      <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
         <h4 className="text-sm font-bold text-gray-700 mb-3">Add New Admin</h4>
         <div className="flex gap-2">
            <input placeholder="Name" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin, name: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"/>
            <input placeholder="Email" value={newAdmin.email} onChange={e=>setNewAdmin({...newAdmin, email: e.target.value})} className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"/>
            <button onClick={handleAdd} className="bg-emerald-500 text-white px-4 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-600">Add</button>
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
      <SectionHeader title="Departments & Roles" icon={Building2} desc="Configure the structural hierarchy of your organization by defining departments and job roles." />
      
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
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder={editingIdx !== null ? `Edit ${activeTab.slice(0,-1)}` : `Add New ${activeTab.slice(0,-1)}`}
                  />
                  <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors">
                      {editingIdx !== null ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                      {editingIdx !== null ? 'Save' : 'Add'}
                  </button>
                  {editingIdx !== null && (
                      <button onClick={() => { setEditingIdx(null); setInputVal(''); }} className="text-gray-500 px-3 hover:bg-gray-100 rounded-lg border border-gray-200">Cancel</button>
                  )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {(activeTab === 'Departments' ? departments : roles).map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors group">
                          <span className="text-sm font-medium text-gray-700">{item}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(i)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => handleDelete(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
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
    <SectionHeader title="Custom Fields" icon={Settings2} desc="Define additional data fields to capture specific employee information." />
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
      <SectionHeader title="Inactive Employees" icon={UserX} desc="Access records of former employees and restore them if necessary." />
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
                    <button onClick={() => handleRestore(emp.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">Restore</button>
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
          try {
            const [time, period] = timeStr.split(' ');
            const [hour, min] = time.split(':');
            return { hour, min, period };
          } catch(e) { return { hour: '09', min: '00', period: 'AM' }; }
      };
      
      const s = parseTime(shift.start);
      const e = parseTime(shift.end);

      setShiftForm({
          name: shift.name,
          startHour: s.hour, startMin: s.min, startAmPm: s.period,
          endHour: e.hour, endMin: e.min, endAmPm: e.period
      });
      setEditingId(shift.id);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see form
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Set up work schedules, shift timings, and break durations." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        
        {/* Editor */}
        <div className={`flex flex-col gap-4 mb-6 p-4 rounded-xl border transition-colors ${editingId ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Shift Name</label>
                <input 
                  value={shiftForm.name} 
                  onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})} 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                  placeholder="e.g. Morning Shift" 
                />
            </div>
            
            <div className="flex flex-wrap gap-6 items-end">
                {/* Start Time */}
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase">Start Time</label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white">
                        <select value={shiftForm.startHour} onChange={e => setShiftForm({...shiftForm, startHour: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="py-2 text-sm text-gray-400 font-bold">:</span>
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
                        <span className="py-2 text-sm text-gray-400 font-bold">:</span>
                        <select value={shiftForm.endMin} onChange={e => setShiftForm({...shiftForm, endMin: e.target.value})} className="p-2 text-sm outline-none bg-transparent appearance-none text-center w-12 cursor-pointer hover:bg-gray-50">
                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={shiftForm.endAmPm} onChange={e => setShiftForm({...shiftForm, endAmPm: e.target.value})} className="p-2 text-sm outline-none bg-gray-100 font-bold text-gray-700 border-l border-gray-300 cursor-pointer hover:bg-gray-200">
                            <option>AM</option><option>PM</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
                        {editingId ? 'Update Shift' : 'Add Shift'}
                    </button>
                    {editingId && (
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setShiftForm({ name: '', startHour: '09', startMin: '00', startAmPm: 'AM', endHour: '06', endMin: '00', endAmPm: 'PM' });
                            }} 
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-2">
          {shifts.map((s) => (
            <div key={s.id} className="flex justify-between items-center p-4 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors group">
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                    <Clock className="w-5 h-5" />
                 </div>
                 <div>
                     <span className="block text-sm font-bold text-gray-900">{s.name}</span>
                     <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {s.start} - {s.end}
                     </span>
                 </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(s)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Edit">
                    <Edit2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => setShifts(shifts.filter(x => x.id !== s.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Delete">
                    <Trash2 className="w-4 h-4"/>
                  </button>
              </div>
            </div>
          ))}
          {shifts.length === 0 && <div className="text-center text-gray-400 text-sm py-8 border border-dashed border-gray-300 rounded-lg">No shifts configured.</div>}
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
      <SectionHeader title="Attendance Modes" icon={Smartphone} desc="Choose how employees can mark attendance (GPS, QR, Manual)." />
      <div className="space-y-3">
        <ToggleSwitch label="Enable GPS Geofencing" checked={modes.gpsGeofencing} onChange={() => handleToggle('gpsGeofencing')} />
        <ToggleSwitch label="Enable QR Scan" checked={modes.qrScan} onChange={() => handleToggle('qrScan')} />
        <ToggleSwitch label="Allow Manual Punch" checked={modes.manualPunch} onChange={() => handleToggle('manualPunch')} />
      </div>
    </div>
  );
};

// 8. Attendance Rules (Moved out of EmployeeSettings)
const AttendanceRules = () => {
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('company_attendance_rules'));
    return saved ? JSON.parse(saved) : {
      graceIn: '15',
      graceOut: '15',
      lateAction: 'Fixed', // Fixed | HalfDay | None
      penaltyAmount: '1000',
      halfDayThreshold: '120',
      trackOvertime: false
    };
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_attendance_rules'), JSON.stringify(rules));
  }, [rules]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Attendance Rules & Penalties" icon={Timer} desc="Configure grace periods, late penalties, and overtime logic." />
      
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        
        {/* Grace Period Section */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" /> Grace Periods
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Punch-In Grace Time (Mins)</label>
              <input 
                type="number" 
                value={rules.graceIn} 
                onChange={(e) => setRules({...rules, graceIn: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="15"
              />
              <p className="text-[10px] text-gray-400 mt-1">Allowed delay after shift start.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Punch-Out Early Limit (Mins)</label>
              <input 
                type="number" 
                value={rules.graceOut} 
                onChange={(e) => setRules({...rules, graceOut: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="15"
              />
              <p className="text-[10px] text-gray-400 mt-1">Allowed early exit before shift end.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Penalty Section */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Late Penalties
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Late Mark Action</label>
              <select 
                value={rules.lateAction} 
                onChange={(e) => setRules({...rules, lateAction: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="None">Mark Late Only (No Deduction)</option>
                <option value="Fixed">Deduct Fixed Amount</option>
                <option value="HalfDay">Mark Half Day</option>
              </select>
            </div>

            {rules.lateAction === 'Fixed' && (
              <div className="animate-in fade-in slide-in-from-left-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Fixed Penalty (₹ per Hour)</label>
                <input 
                  type="number" 
                  value={rules.penaltyAmount} 
                  onChange={(e) => setRules({...rules, penaltyAmount: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="1000"
                />
                <p className="text-[10px] text-orange-500 mt-1">Deducted for every hour late beyond grace time.</p>
              </div>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Auto Half Day */}
        <div>
           <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-500" /> Auto Half-Day Logic
          </h4>
          <div className="flex items-center gap-4">
             <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Half-Day Threshold (Mins Late)</label>
                <input 
                  type="number" 
                  value={rules.halfDayThreshold} 
                  onChange={(e) => setRules({...rules, halfDayThreshold: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="120"
                />
             </div>
             <div className="flex-1 pt-6">
                <p className="text-xs text-gray-500">If employee is late by more than this time, attendance is automatically marked as Half-Day.</p>
             </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Overtime */}
        <div>
           <ToggleSwitch 
             label="Convert Extra Hours to Incentive" 
             checked={rules.trackOvertime} 
             onChange={() => setRules({...rules, trackOvertime: !rules.trackOvertime})} 
           />
           <p className="text-[10px] text-gray-400 mt-2 px-1">If enabled, working beyond shift end time (post grace) will be tracked as incentive hours.</p>
        </div>

      </div>
    </div>
  );
};

// 9. Custom Paid Leaves
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
      <SectionHeader title="Custom Paid Leaves" icon={Plane} desc="Manage leave types and set annual quotas for employees." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
         <div className="flex gap-2 mb-4">
            <input value={leaveForm.name} onChange={e=>setLeaveForm({...leaveForm, name: e.target.value})} className="flex-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Leave Name" />
            <input type="number" value={leaveForm.quota} onChange={e=>setLeaveForm({...leaveForm, quota: e.target.value})} className="w-24 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Quota" />
            <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                {editingId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                {editingId ? 'Save' : 'Add'}
            </button>
            {editingId && (
                <button onClick={() => { setEditingId(null); setLeaveForm({name:'', quota:''}); }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>
            )}
         </div>
         <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {leaveTypes.map(l => (
                <div key={l.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-emerald-200 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{l.name} <span className="text-emerald-600 font-bold ml-2 bg-emerald-50 px-2 py-0.5 rounded text-xs">({l.quota} Days)</span></span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(l)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => setLeaveTypes(leaveTypes.filter(x => x.id !== l.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// 10. Holiday List (Up to 2026)
const INDIAN_HOLIDAYS = [
    // 2024 (Remaining)
    { id: '2024-10-02', name: 'Gandhi Jayanti', date: '2024-10-02' },
    { id: '2024-10-12', name: 'Dussehra', date: '2024-10-12' },
    { id: '2024-10-31', name: 'Diwali', date: '2024-10-31' },
    { id: '2024-11-15', name: 'Guru Nanak Jayanti', date: '2024-11-15' },
    { id: '2024-12-25', name: 'Christmas', date: '2024-12-25' },
    // 2025
    { id: '2025-01-01', name: 'New Year', date: '2025-01-01' },
    { id: '2025-01-14', name: 'Pongal / Makar Sankranti', date: '2025-01-14' },
    { id: '2025-01-26', name: 'Republic Day', date: '2025-01-26' },
    { id: '2025-02-26', name: 'Maha Shivaratri', date: '2025-02-26' },
    { id: '2025-03-14', name: 'Holi', date: '2025-03-14' },
    { id: '2025-03-31', name: 'Eid al-Fitr (Ramzan)', date: '2025-03-31' },
    { id: '2025-04-14', name: 'Tamil New Year / Ambedkar Jayanti', date: '2025-04-14' },
    { id: '2025-04-18', name: 'Good Friday', date: '2025-04-18' },
    { id: '2025-05-01', name: 'Labour Day', date: '2025-05-01' },
    { id: '2025-06-07', name: 'Bakrid / Eid al-Adha', date: '2025-06-07' },
    { id: '2025-08-15', name: 'Independence Day', date: '2025-08-15' },
    { id: '2025-08-16', name: 'Janmashtami', date: '2025-08-16' },
    { id: '2025-08-27', name: 'Ganesh Chaturthi', date: '2025-08-27' },
    { id: '2025-10-02', name: 'Gandhi Jayanti / Dussehra', date: '2025-10-02' },
    { id: '2025-10-20', name: 'Diwali', date: '2025-10-20' },
    { id: '2025-12-25', name: 'Christmas', date: '2025-12-25' },
    // 2026
    { id: '2026-01-01', name: 'New Year', date: '2026-01-01' },
    { id: '2026-01-15', name: 'Pongal / Makar Sankranti', date: '2026-01-15' },
    { id: '2026-01-26', name: 'Republic Day', date: '2026-01-26' },
    { id: '2026-02-15', name: 'Maha Shivaratri', date: '2026-02-15' },
    { id: '2026-03-04', name: 'Holi', date: '2026-03-04' },
    { id: '2026-03-20', name: 'Eid al-Fitr', date: '2026-03-20' },
    { id: '2026-04-03', name: 'Good Friday', date: '2026-04-03' },
    { id: '2026-04-14', name: 'Ambedkar Jayanti', date: '2026-04-14' },
    { id: '2026-05-01', name: 'Labour Day', date: '2026-05-01' },
    { id: '2026-05-27', name: 'Bakrid', date: '2026-05-27' },
    { id: '2026-08-15', name: 'Independence Day', date: '2026-08-15' },
    { id: '2026-09-04', name: 'Janmashtami', date: '2026-09-04' },
    { id: '2026-09-14', name: 'Ganesh Chaturthi', date: '2026-09-14' },
    { id: '2026-10-02', name: 'Gandhi Jayanti', date: '2026-10-02' },
    { id: '2026-10-20', name: 'Dussehra', date: '2026-10-20' },
    { id: '2026-11-08', name: 'Diwali', date: '2026-11-08' },
    { id: '2026-12-25', name: 'Christmas', date: '2026-12-25' },
];

const HolidayList = () => {
  const [holidays, setHolidays] = useState<any[]>(() => {
    const saved = localStorage.getItem(getStorageKey('company_holidays'));
    // If no saved holidays, initialize with the full Indian list
    return saved ? JSON.parse(saved) : INDIAN_HOLIDAYS;
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Holiday List (2024-2026)" icon={CalendarCheck} desc="Maintain the company holiday calendar for the year." />
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
         <div className="flex gap-2 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="flex-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" placeholder="Holiday Name" />
            <input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-40 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
            <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                {editingId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                {editingId ? 'Update' : 'Add'}
            </button>
            {editingId && (
                <button onClick={() => { setEditingId(null); setForm({name:'', date:''}); }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancel</button>
            )}
         </div>
         <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {holidays.map(h => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 group hover:border-emerald-300 hover:shadow-sm transition-all">
                    <div>
                        <span className="text-sm font-bold text-gray-800">{h.name}</span>
                        <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded font-mono">{h.date}</span>
                        {/* Highlight year */}
                        <span className="text-[10px] text-gray-400 ml-2">{h.date.split('-')[0]}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(h)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => setHolidays(holidays.filter(x => x.id !== h.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// 11. Auto Live Track
const AutoLiveTrack = () => {
    const [enabled, setEnabled] = useState(() => localStorage.getItem(getStorageKey('company_settings_autotrack')) === 'true');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_autotrack'), String(enabled)); }, [enabled]);
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Auto Live Track" icon={MapPinIcon} desc="Enable automatic GPS tracking for field staff during working hours." />
            <ToggleSwitch label="Enable Live Tracking" checked={enabled} onChange={() => setEnabled(!enabled)} />
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mt-4 border border-blue-100">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                This will request location access from staff devices during working hours.
            </div>
        </div>
    );
};

// 12. Transport Settings (NEW)
// Defaults for Transport Settings
const DEFAULT_RENTAL_PACKAGES = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400 
};

const TransportSettings = () => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';
  const getSessionKey = (baseKey: string) => isSuperAdmin ? baseKey : `${baseKey}_${sessionId}`;

  const [settingsVehicleType, setSettingsVehicleType] = useState<'Sedan' | 'SUV'>('Sedan');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });

  const [pricing, setPricing] = useState<any>(() => {
    const saved = localStorage.getItem(getSessionKey('transport_pricing_rules_v2'));
    if (!saved && !isSuperAdmin) {
        // Fallback to global defaults if no specific settings found
        const globalSettings = localStorage.getItem('transport_pricing_rules_v2');
        if (globalSettings) return JSON.parse(globalSettings);
    }
    return saved ? JSON.parse(saved) : { Sedan: DEFAULT_PRICING_SEDAN, SUV: DEFAULT_PRICING_SUV };
  });

  const [rentalPackages, setRentalPackages] = useState<any[]>(() => {
    const saved = localStorage.getItem(getSessionKey('transport_rental_packages_v2'));
    if (!saved && !isSuperAdmin) {
        const globalPkgs = localStorage.getItem('transport_rental_packages_v2');
        if (globalPkgs) return JSON.parse(globalPkgs);
    }
    return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
  });

  useEffect(() => {
      localStorage.setItem(getSessionKey('transport_pricing_rules_v2'), JSON.stringify(pricing));
      localStorage.setItem(getSessionKey('transport_rental_packages_v2'), JSON.stringify(rentalPackages));
  }, [pricing, rentalPackages]);

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing((prev: any) => ({
      ...prev,
      [settingsVehicleType]: {
        ...prev[settingsVehicleType],
        [name]: parseFloat(value) || 0
      }
    }));
  };

  const handleAddPackage = () => {
    if (!newPackage.name || !newPackage.priceSedan) return;
    const pkg = {
      id: `pkg-${Date.now()}`,
      name: newPackage.name,
      hours: parseFloat(newPackage.hours) || 0,
      km: parseFloat(newPackage.km) || 0,
      priceSedan: parseFloat(newPackage.priceSedan) || 0,
      priceSuv: parseFloat(newPackage.priceSuv) || 0,
    };
    setRentalPackages([...rentalPackages, pkg]);
    setShowAddPackage(false);
    setNewPackage({ name: '', hours: '', km: '', priceSedan: '', priceSuv: '' });
  };

  const removePackage = (id: string) => {
    if (window.confirm('Remove this package?')) {
      setRentalPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Transport Settings" icon={Car} desc="Configure vehicle rates, rental packages, and outstation pricing rules." />
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-bold text-gray-800 text-sm uppercase">Vehicle Configuration</h3>
             <div className="bg-gray-100 rounded-lg p-1 flex">
                <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'Sedan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Sedan</button>
                <button onClick={() => setSettingsVehicleType('SUV')} className={`px-4 py-1 text-xs font-bold rounded transition-colors ${settingsVehicleType === 'SUV' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>SUV</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Local Rules */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Local Rules</h4>
              <div><label className="text-xs text-gray-500 block mb-1">Base Fare (₹)</label><input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Base Km Included</label><input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Extra Km Rate (₹/km)</label><input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Waiting Charge (₹/min)</label><input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
            </div>

            {/* Outstation Rules */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Outstation Rules</h4>
              <div><label className="text-xs text-gray-500 block mb-1">Min Km / Day</label><input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Per Km Rate (₹/km)</label><input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Driver Allowance (₹/day)</label><input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Driver Night Allowance</label><input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
            </div>

            {/* Rental Rules */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-2 mb-2">Rental Rules</h4>
              <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-500 block mb-1">Extra Hr (₹)</label><input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Extra Km (₹)</label><input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-2 border rounded text-sm bg-white" /></div>
              </div>
              
              <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-700">Packages</label>
                      <button onClick={() => setShowAddPackage(!showAddPackage)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 font-bold"><Plus className="w-3 h-3" /></button>
                  </div>
                  {showAddPackage && (
                      <div className="bg-white p-2 rounded border border-blue-100 mb-2 space-y-2 text-xs">
                          <input placeholder="Name" className="w-full p-1 border rounded" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} />
                          <div className="flex gap-1"><input placeholder="Hrs" className="w-1/2 p-1 border rounded" value={newPackage.hours} onChange={e => setNewPackage({...newPackage, hours: e.target.value})} /><input placeholder="Km" className="w-1/2 p-1 border rounded" value={newPackage.km} onChange={e => setNewPackage({...newPackage, km: e.target.value})} /></div>
                          <div className="flex gap-1"><input placeholder="Sedan ₹" className="w-1/2 p-1 border rounded" value={newPackage.priceSedan} onChange={e => setNewPackage({...newPackage, priceSedan: e.target.value})} /><input placeholder="SUV ₹" className="w-1/2 p-1 border rounded" value={newPackage.priceSuv} onChange={e => setNewPackage({...newPackage, priceSuv: e.target.value})} /></div>
                          <button onClick={handleAddPackage} className="w-full bg-blue-600 text-white py-1 rounded font-bold">Add</button>
                      </div>
                  )}
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      {rentalPackages.map(pkg => (
                          <div key={pkg.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                              <div><div className="text-xs font-bold">{pkg.name}</div><div className="text-[10px] text-gray-500">{pkg.hours}h/{pkg.km}km</div></div>
                              <div className="text-right flex items-center gap-1"><div className="text-[10px]">S:{pkg.priceSedan} X:{pkg.priceSuv}</div><button onClick={() => removePackage(pkg.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

// 13. Calendar Month
const CalendarMonth = () => {
    const [startMonth, setStartMonth] = useState(() => localStorage.getItem(getStorageKey('company_settings_financial_year')) || 'April');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_financial_year'), startMonth); }, [startMonth]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Calendar Month" icon={Calendar} desc="Define the start month of your financial or leave year." />
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year Start</label>
                <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>January</option><option>April</option><option>July</option><option>October</option>
                </select>
            </div>
        </div>
    );
};

// 14. Attendance Cycle
const AttendanceCycle = () => {
    const [cycle, setCycle] = useState(() => localStorage.getItem(getStorageKey('company_settings_attendance_cycle')) || 'Calendar Month');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_attendance_cycle'), cycle); }, [cycle]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Attendance Cycle" icon={RotateCw} desc="Set the period for attendance calculation (e.g., 1st-30th or 26th-25th)." />
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Period</label>
                <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>Calendar Month (1st to End)</option>
                    <option>Wage Cycle (26th to 25th)</option>
                </select>
            </div>
        </div>
    );
};

// 15. Payout Date
const PayoutDate = () => {
    const [payoutDate, setPayoutDate] = useState(() => localStorage.getItem(getStorageKey('company_global_payout_day')) || '5');
    useEffect(() => { localStorage.setItem(getStorageKey('company_global_payout_day'), payoutDate); }, [payoutDate]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Payout Date" icon={DollarSign} desc="Set the default monthly salary payout date." />
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Day of Month (1-28)</label>
                <input type="number" min="1" max="28" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
        </div>
    );
};

// 16. Import Settings
const ImportSettings = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Import Settings" icon={UploadCloud} desc="Configure default behaviors for bulk data imports." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 shadow-sm">
            Import configurations are managed automatically based on CSV headers.
        </div>
    </div>
);

// 17. Incentive Types
const IncentiveTypes = () => {
    const [types, setTypes] = useState<string[]>(() => {
        const saved = localStorage.getItem(getStorageKey('company_incentive_types'));
        return saved ? JSON.parse(saved) : ['Performance', 'Sales Commission', 'Referral'];
    });
    const [newType, setNewType] = useState('');

    useEffect(() => { localStorage.setItem(getStorageKey('company_incentive_types'), JSON.stringify(types)); }, [types]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Incentive Types" icon={Award} desc="Define categories for performance-based incentives." />
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex gap-2 mb-4">
                    <input value={newType} onChange={e=>setNewType(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Incentive Name" />
                    <button onClick={()=>{if(newType) {setTypes([...types, newType]); setNewType('')}}} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {types.map((t, i) => (
                        <div key={i} className="flex justify-between p-2 bg-gray-50 rounded border border-gray-100 hover:border-emerald-100 transition-colors">
                            <span className="text-sm text-gray-700">{t}</span>
                            <button onClick={()=>setTypes(types.filter((_, idx)=>idx!==i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 18. Salary Templates
const SalaryTemplates = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Salary Templates" icon={File} desc="Create and manage salary structures and breakdown templates." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 shadow-sm">
            Standard Template: Basic (50%), HRA (30%), Allowance (20%) is currently active.
        </div>
    </div>
);

// 19. Round Off
const RoundOff = () => {
    const [round, setRound] = useState(() => localStorage.getItem(getStorageKey('company_settings_round_off')) || 'None');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_round_off'), round); }, [round]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="Round Off" icon={RotateCcw} desc="Configure how attendance time is rounded for calculation." />
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <select value={round} onChange={(e) => setRound(e.target.value)} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>None</option><option>Nearest 15 Mins</option><option>Nearest 30 Mins</option>
                </select>
            </div>
        </div>
    );
};

// 20. App Notifications
const AppNotifications = () => {
    const [enabled, setEnabled] = useState(() => localStorage.getItem(getStorageKey('company_settings_notifications')) === 'true');
    useEffect(() => { localStorage.setItem(getStorageKey('company_settings_notifications'), String(enabled)); }, [enabled]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <SectionHeader title="App Notifications" icon={Bell} desc="Manage system-wide alerts and in-app notifications." />
            <ToggleSwitch label="Enable In-App Alerts" checked={enabled} onChange={() => setEnabled(!enabled)} />
        </div>
    );
};

// 21. Request A Feature
const RequestAFeature = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Request A Feature" icon={MessageSquare} desc="Share your ideas and feedback to help us improve." />
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center shadow-sm">
            <textarea className="w-full border rounded-lg p-3 mb-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" rows={4} placeholder="Describe your idea..."></textarea>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">Submit</button>
        </div>
    </div>
);


// --- Main Component ---
const EmployeeSettings: React.FC = () => {
  const [activeSetting, setActiveSetting] = useState<SettingCategory>('My Company Report');

  const AttendanceRules = () => {
    const [rules, setRules] = useState(() => {
      const saved = localStorage.getItem(getStorageKey('company_attendance_rules'));
      return saved ? JSON.parse(saved) : {
        graceIn: '15',
        graceOut: '15',
        lateAction: 'Fixed', // Fixed | HalfDay | None
        penaltyAmount: '1000',
        halfDayThreshold: '120',
        trackOvertime: false
      };
    });
  
    useEffect(() => {
      localStorage.setItem(getStorageKey('company_attendance_rules'), JSON.stringify(rules));
    }, [rules]);
  
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <SectionHeader title="Attendance Rules & Penalties" icon={Timer} desc="Configure grace periods, late penalties, and overtime logic." />
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          
          {/* Grace Period Section */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" /> Grace Periods
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Punch-In Grace Time (Mins)</label>
                <input 
                  type="number" 
                  value={rules.graceIn} 
                  onChange={(e) => setRules({...rules, graceIn: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="15"
                />
                <p className="text-[10px] text-gray-400 mt-1">Allowed delay after shift start.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Punch-Out Early Limit (Mins)</label>
                <input 
                  type="number" 
                  value={rules.graceOut} 
                  onChange={(e) => setRules({...rules, graceOut: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="15"
                />
                <p className="text-[10px] text-gray-400 mt-1">Allowed early exit before shift end.</p>
              </div>
            </div>
          </div>
  
          <hr className="border-gray-100" />
  
          {/* Penalty Section */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Late Penalties
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Late Mark Action</label>
                <select 
                  value={rules.lateAction} 
                  onChange={(e) => setRules({...rules, lateAction: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="None">Mark Late Only (No Deduction)</option>
                  <option value="Fixed">Deduct Fixed Amount</option>
                  <option value="HalfDay">Mark Half Day</option>
                </select>
              </div>
  
              {rules.lateAction === 'Fixed' && (
                <div className="animate-in fade-in slide-in-from-left-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fixed Penalty (₹ per Hour)</label>
                  <input 
                    type="number" 
                    value={rules.penaltyAmount} 
                    onChange={(e) => setRules({...rules, penaltyAmount: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="1000"
                  />
                  <p className="text-[10px] text-orange-500 mt-1">Deducted for every hour late beyond grace time.</p>
                </div>
              )}
            </div>
          </div>
  
          <hr className="border-gray-100" />
  
          {/* Auto Half Day */}
          <div>
             <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-500" /> Auto Half-Day Logic
            </h4>
            <div className="flex items-center gap-4">
               <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Half-Day Threshold (Mins Late)</label>
                  <input 
                    type="number" 
                    value={rules.halfDayThreshold} 
                    onChange={(e) => setRules({...rules, halfDayThreshold: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="120"
                  />
               </div>
               <div className="flex-1 pt-6">
                  <p className="text-xs text-gray-500">If employee is late by more than this time, attendance is automatically marked as Half-Day.</p>
               </div>
            </div>
          </div>
  
          <hr className="border-gray-100" />
  
          {/* Overtime */}
          <div>
             <ToggleSwitch 
               label="Convert Extra Hours to Incentive" 
               checked={rules.trackOvertime} 
               onChange={() => setRules({...rules, trackOvertime: !rules.trackOvertime})} 
             />
             <p className="text-[10px] text-gray-400 mt-2 px-1">If enabled, working beyond shift end time (post grace) will be tracked as incentive hours.</p>
          </div>
  
        </div>
      </div>
    );
  };

  const renderActiveSetting = () => {
    switch (activeSetting) {
      case 'My Company Report': return <MyCompanyReport />;
      case 'My Team (Admins)': return <MyTeamAdmins />;
      case 'Departments & Roles': return <DepartmentsAndRoles />;
      case 'Custom Fields': return <CustomFields />;
      case 'Inactive Employees': return <InactiveEmployees />;
      case 'Shifts & Breaks': return <ShiftsAndBreaks />;
      case 'Attendance Modes': return <AttendanceModes />;
      case 'Attendance Rules': return <AttendanceRules />;
      case 'Custom Paid Leaves': return <CustomPaidLeaves />;
      case 'Holiday List': return <HolidayList />;
      case 'Auto Live Track': return <AutoLiveTrack />;
      case 'Transport Settings': return <TransportSettings />;
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
    { category: 'Attendance Rules', icon: Timer },
    { category: 'Custom Paid Leaves', icon: Plane },
    { category: 'Holiday List', icon: CalendarCheck },
    { category: 'Auto Live Track', icon: MapPinIcon },
    { category: 'Transport Settings', icon: Car },
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-100' : 'text-gray-700 hover:bg-gray-50 border border-transparent'}`}
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
