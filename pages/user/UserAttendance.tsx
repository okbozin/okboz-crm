
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Download, ChevronLeft, ChevronRight, 
  Search, Filter, X, CheckCircle, AlertTriangle, LogIn, LogOut, RefreshCw, Fingerprint 
} from 'lucide-react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { 
  Employee, AttendanceStatus, DailyAttendance, Branch, UserRole 
} from '../../types';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

interface EditAttendanceData {
    date: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    isLate?: boolean;
}

// Helper to find employee
const findEmployeeById = (id: string): Employee | undefined => {
    try {
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      let found = adminStaff.find((e: any) => e.id === id);
      if (found) return found;
    } catch(e) {}

    try {
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      for (const corp of corporates) {
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
          const found = cStaff.find((e: any) => e.id === id);
          if (found) return found;
      }
    } catch(e) {}

    return MOCK_EMPLOYEES.find(e => e.id === id);
};

export default function UserAttendance({ isAdmin = false }: UserAttendanceProps) {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- State for Filters (Admin View) ---
  const [filterCorporate, setFilterCorporate] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStaffId, setFilterStaffId] = useState('All');
  
  // --- Data Loading ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allBranchesList, setAllBranchesList] = useState<any[]>([]);
  const [corporates, setCorporates] = useState<any[]>([]);

  // State for Punch Logic
  const [isPunching, setIsPunching] = useState(false);
  const [todayStatus, setTodayStatus] = useState<'In' | 'Out'>('Out');
  const [lastPunchTime, setLastPunchTime] = useState<string | null>(null);

  useEffect(() => {
    const loadData = () => {
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            setCorporates(corps);

            let staff: Employee[] = [];
            let branches: any[] = [];

            if (isSuperAdmin) {
                const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
                const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
                staff = [...adminStaff];
                branches = [...adminBranches.map((b: any) => ({...b, owner: 'admin'}))];

                corps.forEach((c: any) => {
                    const cStaff = JSON.parse(localStorage.getItem(`staff_data_${c.email}`) || '[]');
                    const cBranches = JSON.parse(localStorage.getItem(`branches_data_${c.email}`) || '[]');
                    
                    staff = [...staff, ...cStaff.map((s: any) => ({...s, corporateId: c.email}))];
                    branches = [...branches, ...cBranches.map((b: any) => ({...b, owner: c.email}))];
                });
            } else {
                // Corporate or Employee viewing (though Employee usually won't see admin view)
                if (sessionId !== 'admin') {
                     const cStaff = JSON.parse(localStorage.getItem(`staff_data_${sessionId}`) || '[]');
                     const cBranches = JSON.parse(localStorage.getItem(`branches_data_${sessionId}`) || '[]');
                     staff = cStaff.map((s: any) => ({...s, corporateId: sessionId}));
                     branches = cBranches.map((b: any) => ({...b, owner: sessionId}));
                }
            }
            setEmployees(staff);
            setAllBranchesList(branches);
        } catch (e) {
            console.error("Error loading data", e);
        }
    };
    loadData();
  }, [isSuperAdmin, sessionId]);

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
        const found = findEmployeeById(storedSessionId);
        setLoggedInUser(found || null);
        
        // Determine Initial Punch Status based on LocalStorage Data
        if (found) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const dateStr = today.toISOString().split('T')[0];
            
            const attendance = getEmployeeAttendance(found, year, month);
            const todayRecord = attendance.find(a => a.date === dateStr);
            
            if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
                setTodayStatus('In');
                setLastPunchTime(todayRecord.checkIn);
            } else if (todayRecord && todayRecord.checkOut) {
                setTodayStatus('Out');
                setLastPunchTime(todayRecord.checkOut);
            } else {
                setTodayStatus('Out');
            }
        }
      }
    }
  }, [isAdmin]);

  const filteredEmployeesForDisplay = useMemo(() => {
    let list = employees.filter(emp => emp);
    
    if (isSuperAdmin && filterCorporate !== 'All') {
      list = list.filter(emp => emp.corporateId === filterCorporate);
    }
    if (filterBranch !== 'All') {
      list = list.filter(emp => emp.branch === filterBranch);
    }
    return list;
  }, [employees, filterCorporate, filterBranch, isSuperAdmin]);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); 
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'Individual' | 'MusterRoll'>('Individual');
  const [periodType, setPeriodType] = useState<'Monthly'>('Monthly'); 

  useEffect(() => {
    if (isAdmin) {
      if (filteredEmployeesForDisplay.length > 0) {
        if (!selectedEmployee || !filteredEmployeesForDisplay.some(e => e.id === selectedEmployee.id)) {
            setSelectedEmployee(filteredEmployeesForDisplay[0]);
            setFilterStaffId(filteredEmployeesForDisplay[0].id);
        }
      } else {
        setSelectedEmployee(null);
        setFilterStaffId('All');
      }
    } else {
      if (loggedInUser) {
          setSelectedEmployee(loggedInUser);
      }
    }
  }, [isAdmin, filteredEmployeesForDisplay, loggedInUser]); 

  // Attendance Data
  const attendanceData = useMemo(() => {
      if (!selectedEmployee) return [];
      return getEmployeeAttendance(selectedEmployee, currentDate.getFullYear(), currentDate.getMonth());
  }, [selectedEmployee, currentDate, todayStatus]); // Add todayStatus dependency to refresh on punch

  const stats = useMemo(() => {
      const present = attendanceData.filter(d => d.status === AttendanceStatus.PRESENT).length;
      const absent = attendanceData.filter(d => d.status === AttendanceStatus.ABSENT).length;
      const halfDay = attendanceData.filter(d => d.status === AttendanceStatus.HALF_DAY).length;
      const paidLeave = attendanceData.filter(d => d.status === AttendanceStatus.PAID_LEAVE).length;
      const weekOff = attendanceData.filter(d => d.status === AttendanceStatus.WEEK_OFF).length;
      const late = attendanceData.filter(d => d.isLate).length;
      return { present, absent, halfDay, paidLeave, weekOff, late };
  }, [attendanceData]);

  const currentMonthYearLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // --- Editing State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<EditAttendanceData | null>(null);
  const editEmployeeName = selectedEmployee?.name || '';

  const handleDateClickForAdminEdit = (day: DailyAttendance) => {
      if (!isAdmin) return;
      setEditModalData({
          date: day.date,
          status: day.status,
          checkIn: day.checkIn,
          checkOut: day.checkOut,
          isLate: day.isLate
      });
      setIsEditModalOpen(true);
  };

  const handleSaveAdminAttendanceEdit = () => {
      if (!selectedEmployee || !editModalData) return;
      alert(`Updated attendance for ${selectedEmployee.name} on ${editModalData.date}. (Mock Save)`);
      setIsEditModalOpen(false);
  };

  // --- PUNCH HANDLER ---
  const handlePunchAction = () => {
      if (!selectedEmployee) return;
      setIsPunching(true);

      // Simulate API Call delay
      setTimeout(() => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          const dateStr = now.toISOString().split('T')[0];
          const year = now.getFullYear();
          const month = now.getMonth();

          // Get existing data
          const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
          let currentMonthData: DailyAttendance[] = [];
          try {
              const saved = localStorage.getItem(key);
              currentMonthData = saved ? JSON.parse(saved) : getEmployeeAttendance(selectedEmployee, year, month);
          } catch(e) {
              currentMonthData = getEmployeeAttendance(selectedEmployee, year, month);
          }

          let updatedData = [...currentMonthData];
          let todayRecordIndex = updatedData.findIndex(d => d.date === dateStr);

          if (todayStatus === 'Out') {
              // PUNCH IN (Green -> Red)
              setTodayStatus('In');
              setLastPunchTime(timeStr);
              
              if (todayRecordIndex >= 0) {
                  updatedData[todayRecordIndex] = {
                      ...updatedData[todayRecordIndex],
                      status: AttendanceStatus.PRESENT,
                      checkIn: timeStr,
                      isLate: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 45) // Late after 9:45 AM
                  };
              } else {
                  // Should essentially typically exist from mock generation, but safe fallback
                  updatedData.push({
                      date: dateStr,
                      status: AttendanceStatus.PRESENT,
                      checkIn: timeStr,
                      isLate: false
                  });
              }
          } else {
              // PUNCH OUT (Red -> Green)
              setTodayStatus('Out');
              setLastPunchTime(timeStr);
              
              if (todayRecordIndex >= 0) {
                  updatedData[todayRecordIndex] = {
                      ...updatedData[todayRecordIndex],
                      checkOut: timeStr
                  };
              }
          }

          // Save to storage
          localStorage.setItem(key, JSON.stringify(updatedData));
          setIsPunching(false);
          // Force refresh of stats/calendar will happen via useMemo dependency on todayStatus
      }, 1500);
  };

  const employeePunchCardUI = (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
          {/* Decorative Background */}
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${todayStatus === 'In' ? 'from-red-400 to-orange-500' : 'from-emerald-400 to-teal-500'}`}></div>
          
          <div className="mb-6">
              <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h3>
              <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide uppercase">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
          </div>
          
          {/* Fingerprint Button */}
          <div className="relative group">
              {/* Ripple Effect Container */}
              {isPunching && (
                  <>
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${todayStatus === 'In' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping delay-150 ${todayStatus === 'In' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                  </>
              )}
              
              <button 
                  onClick={handlePunchAction}
                  disabled={isPunching}
                  className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center border-[6px] transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl
                      ${todayStatus === 'In' 
                          ? 'border-red-100 bg-gradient-to-b from-red-50 to-white text-red-500 shadow-red-200/50 hover:border-red-200' 
                          : 'border-emerald-100 bg-gradient-to-b from-emerald-50 to-white text-emerald-500 shadow-emerald-200/50 hover:border-emerald-200'
                      }`}
              >
                  <Fingerprint className={`w-20 h-20 transition-all duration-500 ${isPunching ? 'opacity-50 blur-[1px]' : 'opacity-100'}`} strokeWidth={1.5} />
                  
                  {/* Scanner Light Animation */}
                  <div className={`absolute inset-0 rounded-full overflow-hidden pointer-events-none`}>
                      <div className={`absolute top-0 left-0 w-full h-1.5 shadow-[0_0_15px_2px_rgba(255,255,255,0.8)] animate-[scan_2.5s_ease-in-out_infinite] ${todayStatus === 'In' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  </div>
              </button>
          </div>

          <div className="mt-8 space-y-2">
              <p className="text-gray-500 text-sm font-medium">
                  {isPunching ? 'Processing...' : (todayStatus === 'In' ? 'Duty Active' : 'Ready to Start')}
              </p>
              <h4 className={`text-xl font-bold ${todayStatus === 'In' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {isPunching ? 'Scanning...' : (todayStatus === 'In' ? 'Punch Out' : 'Punch In')}
              </h4>
          </div>

          {lastPunchTime && (
              <div className="mt-6 py-2 px-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last Action: {lastPunchTime}
              </div>
          )}

          {/* CSS for Scan Animation */}
          <style>{`
            @keyframes scan {
                0%, 100% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                50% { top: 100%; }
            }
          `}</style>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <CalendarIcon className="w-8 h-8 text-emerald-600" /> 
             {isAdmin ? 'Attendance Management' : 'My Attendance'}
          </h2>
          <p className="text-gray-500">
             {isAdmin ? 'Monitor and manage employee attendance' : 'View your attendance history and punch in/out'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center flex-wrap">
            {isSuperAdmin && (
                <select
                    value={filterCorporate}
                    onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); setFilterStaffId('All'); setSelectedEmployee(null); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                >
                    <option value="All">All Corporates</option>
                    {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                </select>
            )}

            <select
                value={filterBranch}
                onChange={(e) => { setFilterBranch(e.target.value); setFilterStaffId('All'); setSelectedEmployee(null); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
            >
                <option value="All">All Branches</option>
                {allBranchesList
                    .filter(b => b && (filterCorporate === 'All' || (b.owner === filterCorporate)))
                    .map((b, i) => (
                    <option key={i} value={b.name}>{b.name}</option>
                ))}
            </select>

            <select
                value={filterStaffId}
                onChange={(e) => { 
                    setFilterStaffId(e.target.value); 
                    const emp = employees.find(ep => ep.id === e.target.value);
                    setSelectedEmployee(emp || null);
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
            >
                {filteredEmployeesForDisplay.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
                {filteredEmployeesForDisplay.length === 0 && <option value="All">No Staff Found</option>}
            </select>

            <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
                <button 
                    onClick={() => setViewMode('Individual')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'Individual' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                >
                    Individual
                </button>
                <button 
                    onClick={() => setViewMode('MusterRoll')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'MusterRoll' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                >
                    Muster Roll
                </button>
            </div>
        </div>
      ) : (
        // Employee Profile Header (Non-Admin View)
        selectedEmployee && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
              <img src={selectedEmployee.avatar} alt={selectedEmployee.name} className="w-12 h-12 rounded-full border border-gray-100 object-cover" />
              <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedEmployee.name}</h3>
                  <p className="text-sm text-gray-500">{selectedEmployee.role} • {selectedEmployee.branch}</p>
              </div>
              <div className="ml-auto text-center hidden sm:block">
                  <p className="text-xs text-gray-500">Live Tracking</p>
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${selectedEmployee.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
              </div>
          </div>
        )
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Punch Card for user, or Summary for Admin) */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
            {/* Date Navigator */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                <span className="font-bold text-gray-800">{currentMonthYearLabel}</span>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
            </div>

            {/* Punch Card UI */}
            {!isAdmin && selectedEmployee ? employeePunchCardUI : (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <User className="w-16 h-16 opacity-30 mb-4" />
                    <p>{isAdmin ? 'Select an employee to view details' : 'Loading your profile...'}</p>
                </div>
            )}
        </div>

        {/* Right Column: Calendar / Muster Roll */}
        <div className="lg:col-span-2 space-y-6">
            {isAdmin && viewMode === 'Individual' && selectedEmployee && (
                <AttendanceCalendar
                    data={attendanceData}
                    stats={stats}
                    onDateClick={handleDateClickForAdminEdit}
                    currentMonthLabel={currentMonthYearLabel}
                    showStats={periodType === 'Monthly'}
                />
            )}

            {isAdmin && viewMode === 'MusterRoll' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">Muster Roll - {currentMonthYearLabel}</h3>
                        <button className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1">
                            <Download className="w-4 h-4" /> Export Muster
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 sticky left-0 bg-white z-10 w-40">Employee</th>
                                    {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate())].map((_, i) => (
                                        <th key={i} className="px-2 py-3 text-center w-10">
                                            {i + 1}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center">P</th>
                                    <th className="px-4 py-3 text-center">A</th>
                                    <th className="px-4 py-3 text-center">L</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEmployeesForDisplay.map(emp => {
                                    const empAttendance = getEmployeeAttendance(emp, currentDate.getFullYear(), currentDate.getMonth());
                                    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                                    
                                    const dailyRecords = empAttendance.filter(d => parseInt(d.date.split('-')[2]) <= daysInMonth);

                                    const summary = dailyRecords.reduce((acc, rec) => {
                                        if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.HALF_DAY) acc.P++;
                                        if (rec.status === AttendanceStatus.ABSENT) acc.A++;
                                        if (rec.isLate) acc.L++;
                                        return acc;
                                    }, { P: 0, A: 0, L: 0 });

                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 sticky left-0 bg-white z-10 w-40">
                                                <div className="font-medium text-gray-900">{emp.name}</div>
                                                <div className="text-xs text-gray-500">{emp.role}</div>
                                            </td>
                                            {/* We need to map through all days of month, finding record or putting empty */}
                                            {[...Array(daysInMonth)].map((_, idx) => {
                                                const dayNum = idx + 1;
                                                const record = dailyRecords.find(r => parseInt(r.date.split('-')[2]) === dayNum);
                                                
                                                return (
                                                    <td key={idx} className="px-2 py-3 text-center">
                                                        <span className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            record?.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' :
                                                            record?.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                                                            record?.status === AttendanceStatus.HALF_DAY ? 'bg-amber-100 text-amber-700' :
                                                            record?.status === AttendanceStatus.PAID_LEAVE ? 'bg-blue-100 text-blue-700' :
                                                            record?.status === AttendanceStatus.WEEK_OFF ? 'bg-slate-100 text-slate-500' :
                                                            'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {record?.status === AttendanceStatus.PRESENT ? (record.isLate ? 'L' : 'P') :
                                                             record?.status === AttendanceStatus.ABSENT ? 'A' :
                                                             record?.status === AttendanceStatus.HALF_DAY ? 'H' :
                                                             record?.status === AttendanceStatus.PAID_LEAVE ? 'V' :
                                                             record?.status === AttendanceStatus.WEEK_OFF ? 'W' :
                                                             '-'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center font-bold text-emerald-600">{summary.P}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600">{summary.A}</td>
                                            <td className="px-4 py-3 text-center font-bold text-orange-600">{summary.L}</td>
                                        </tr>
                                    );
                                })}
                                {filteredEmployeesForDisplay.length === 0 && (
                                    <tr><td colSpan={35} className="py-8 text-center text-gray-500">No employees selected or found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isAdmin && selectedEmployee && (
                <AttendanceCalendar
                    data={attendanceData}
                    stats={stats}
                    currentMonthLabel={currentMonthYearLabel}
                    showStats={true}
                />
            )}
        </div>
      </div>
      
      {/* Admin Edit Modal */}
       {isEditModalOpen && editModalData && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-800">Edit Attendance - {editModalData.date}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <img src={selectedEmployee.avatar} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-bold text-gray-900">{editEmployeeName}</p>
                            <p className="text-xs text-gray-500">{selectedEmployee.role}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={editModalData.status}
                            onChange={(e) => setEditModalData(prev => prev ? { ...prev, status: e.target.value as AttendanceStatus } : null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                            {Object.values(AttendanceStatus).map(status => (
                                <option key={status} value={status}>{String(status).replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {(editModalData.status === AttendanceStatus.PRESENT || editModalData.status === AttendanceStatus.HALF_DAY) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                                <input
                                    type="time"
                                    value={editModalData.checkIn ? new Date(`2000-01-01 ${editModalData.checkIn}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    onChange={(e) => setEditModalData(prev => prev ? { ...prev, checkIn: new Date(`2000-01-01 ${e.target.value}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                                <input
                                    type="time"
                                    value={editModalData.checkOut ? new Date(`2000-01-01 ${editModalData.checkOut}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    onChange={(e) => setEditModalData(prev => prev ? { ...prev, checkOut: new Date(`2000-01-01 ${e.target.value}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="flex items-center text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={editModalData.isLate || false}
                                        onChange={(e) => setEditModalData(prev => prev ? { ...prev, isLate: e.target.checked } : null)}
                                        className="mr-2 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    Mark as Late
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleSaveAdminAttendanceEdit} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-colors">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
