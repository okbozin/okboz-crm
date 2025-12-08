
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, FileText, UserX, Clock, 
  Settings2, Plane, Calendar, Zap, DollarSign, 
  RotateCcw, Download, Award, File, Bell, 
  MessageCircle, Plus, Trash2, Edit2, 
  MapPin as MapPinIcon, 
  Save, UploadCloud, 
  AlertCircle, Shield, Smartphone, RotateCw, CalendarCheck, MessageSquare, Hourglass, AlertTriangle, Timer,
  Calculator
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

const ToggleSwitch = ({ label, checked, onChange, disabled, description }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean, description?: string }) => (
  <div 
    onClick={!disabled ? onChange : undefined}
    className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all cursor-pointer ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div>
        <span className={`font-medium text-sm block ${checked ? 'text-emerald-800' : 'text-gray-700'}`}>{label}</span>
        {description && <span className="text-xs text-gray-500 mt-1 block">{description}</span>}
    </div>
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
      <SectionHeader title="Shifts & Breaks" icon={Clock} desc="Configure working hours (12-hour AM/PM)." />
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
                            className="text-gray-500 hover:bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* List */}
        <div className="space-y-3">
            {shifts.map(shift => (
                <div key={shift.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-100 transition-all group">
                    <div>
                        <h4 className="font-bold text-gray-800">{shift.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 font-medium font-mono">{shift.start}</span>
                            <span className="text-gray-400 text-xs">to</span>
                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 font-medium font-mono">{shift.end}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(shift)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button 
                            onClick={() => {
                                if (window.confirm("Delete this shift?")) {
                                    setShifts(shifts.filter(s => s.id !== shift.id));
                                    if (editingId === shift.id) {
                                        setEditingId(null);
                                        setShiftForm({ name: '', startHour: '09', startMin: '00', startAmPm: 'AM', endHour: '06', endMin: '00', endAmPm: 'PM' });
                                    }
                                }
                            }} 
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// 7. Attendance Rules (New Module)
const AttendanceRules = () => {
  // Load settings or defaults
  const [rules, setRules] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('company_attendance_rules'));
    return saved ? JSON.parse(saved) : {
      lateGraceMins: 15,
      earlyExitGraceMins: 10,
      halfDayThresholdHrs: 4,
      fullDayThresholdHrs: 8,
      autoHalfDay: true,
      overtimeEnabled: true,
      fixedHourlyRate: 1000,
      lateDeductionEnabled: true
    };
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey('company_attendance_rules'), JSON.stringify(rules));
  }, [rules]);

  const handleChange = (field: string, value: any) => {
    setRules((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SectionHeader title="Attendance Rules" icon={AlertTriangle} desc="Configure grace periods, half-day logic, and overtime." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grace Periods */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
           <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
             <Timer className="w-4 h-4 text-orange-500" /> Grace Periods
           </h4>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Entry Grace (mins)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={rules.lateGraceMins} 
                  onChange={(e) => handleChange('lateGraceMins', parseInt(e.target.value) || 0)} 
                  className="w-full p-2 pl-9 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Time allowed after shift start before marked "Late".</p>
           </div>
           
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Early Exit Grace (mins)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={rules.earlyExitGraceMins} 
                  onChange={(e) => handleChange('earlyExitGraceMins', parseInt(e.target.value) || 0)} 
                  className="w-full p-2 pl-9 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Time allowed before shift end without penalty.</p>
           </div>
        </div>

        {/* Working Hours & Half Day */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
           <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
             <Hourglass className="w-4 h-4 text-blue-500" /> Duration Logic
           </h4>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Hrs (Half Day)</label>
                <input 
                  type="number" 
                  value={rules.halfDayThresholdHrs} 
                  onChange={(e) => handleChange('halfDayThresholdHrs', parseFloat(e.target.value) || 0)} 
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Hrs (Full Day)</label>
                <input 
                  type="number" 
                  value={rules.fullDayThresholdHrs} 
                  onChange={(e) => handleChange('fullDayThresholdHrs', parseFloat(e.target.value) || 0)} 
                  className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
           </div>
           
           <ToggleSwitch 
              label="Auto-Mark Half Day" 
              checked={rules.autoHalfDay} 
              onChange={() => handleChange('autoHalfDay', !rules.autoHalfDay)}
              description="Automatically mark attendance as Half Day if late beyond grace period or hours not met."
           />
        </div>

        {/* Financials: Overtime & Deductions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4 md:col-span-2">
           <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
             <Calculator className="w-4 h-4 text-emerald-500" /> Overtime & Deductions
           </h4>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Hourly Rate (₹)</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      value={rules.fixedHourlyRate} 
                      onChange={(e) => handleChange('fixedHourlyRate', parseFloat(e.target.value) || 0)} 
                      className="w-full p-2 pl-8 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                 </div>
                 <p className="text-xs text-gray-500 mt-1">Used for calculating fixed Overtime Incentives and Late Deductions.</p>
              </div>

              <div className="space-y-3">
                 <ToggleSwitch 
                    label="Enable Overtime Incentive" 
                    checked={rules.overtimeEnabled} 
                    onChange={() => handleChange('overtimeEnabled', !rules.overtimeEnabled)}
                    description="Pay incentive for extra hours worked based on Fixed Hourly Rate."
                 />
                 
                 <ToggleSwitch 
                    label="Enable Late Deduction" 
                    checked={rules.lateDeductionEnabled} 
                    onChange={() => handleChange('lateDeductionEnabled', !rules.lateDeductionEnabled)}
                    description="Deduct pay for late arrival hours based on Fixed Hourly Rate."
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// ... (Other existing components: CustomPaidLeaves, HolidayList, AutoLiveTrack, etc. remain unchanged)

const EmployeeSettings = () => {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('My Company Report');

  const categories: { name: SettingCategory, icon: any }[] = [
    { name: 'My Company Report', icon: FileText },
    { name: 'My Team (Admins)', icon: Shield },
    { name: 'Departments & Roles', icon: Building2 },
    { name: 'Shifts & Breaks', icon: Clock },
    { name: 'Attendance Rules', icon: AlertTriangle }, // Added here
    { name: 'Attendance Modes', icon: Smartphone },
    { name: 'Custom Paid Leaves', icon: Plane },
    { name: 'Holiday List', icon: Calendar },
    { name: 'Auto Live Track', icon: MapPinIcon },
    { name: 'Custom Fields', icon: Settings2 },
    { name: 'Inactive Employees', icon: UserX },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Settings Menu</h3>
          </div>
          <nav className="p-2 space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeCategory === cat.name 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <cat.icon className={`w-4 h-4 ${activeCategory === cat.name ? 'text-emerald-500' : 'text-gray-400'}`} />
                {cat.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeCategory === 'My Company Report' && <MyCompanyReport />}
          {activeCategory === 'My Team (Admins)' && <MyTeamAdmins />}
          {activeCategory === 'Departments & Roles' && <DepartmentsAndRoles />}
          {activeCategory === 'Custom Fields' && <CustomFields />}
          {activeCategory === 'Inactive Employees' && <InactiveEmployees />}
          {activeCategory === 'Shifts & Breaks' && <ShiftsAndBreaks />}
          {activeCategory === 'Attendance Rules' && <AttendanceRules />}
          {/* Placeholders for other sections not fully implemented in this update */}
          {activeCategory === 'Attendance Modes' && <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-dashed">Attendance Modes settings coming soon.</div>}
          {activeCategory === 'Custom Paid Leaves' && <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-dashed">Leave settings coming soon.</div>}
          {activeCategory === 'Holiday List' && <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-dashed">Holiday calendar settings coming soon.</div>}
          {activeCategory === 'Auto Live Track' && <div className="text-gray-500 p-8 text-center bg-white rounded-xl border border-dashed">Live Tracking configuration coming soon.</div>}
        </div>
      </div>
    </div>
  );
};

export default EmployeeSettings;
