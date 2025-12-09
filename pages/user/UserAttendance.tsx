
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Download, ChevronLeft, ChevronRight, 
  Search, Filter, X, CheckCircle, AlertTriangle, LogIn, LogOut, RefreshCw, Fingerprint,
  CheckSquare, XSquare, Building, Globe, ExternalLink, Navigation, List, LayoutGrid
} from 'lucide-react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { 
  Employee, AttendanceStatus, DailyAttendance, Branch, UserRole, LocationRecord 
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

// Helper: Calculate Haversine Distance
const calculateDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
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
  
  // --- New Modal & Mode States ---
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchMode, setPunchMode] = useState<'Remote' | 'Office' | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  // State for forcing refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // View States
  const [viewMode, setViewMode] = useState<'Monthly' | 'Daily'>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date()); // For Monthly View (Stores Month)
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]); // For Daily View

  // Function to load data - moved outside to be reusable
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
            // Corporate or Employee viewing
            const keySuffix = (isAdmin || sessionId === 'admin') ? sessionId : localStorage.getItem('logged_in_employee_corporate_id') || sessionId;
            
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${keySuffix}`) || '[]');
            const cBranches = JSON.parse(localStorage.getItem(`branches_data_${keySuffix}`) || '[]');
            staff = cStaff.map((s: any) => ({...s, corporateId: keySuffix}));
            branches = cBranches.map((b: any) => ({...b, owner: keySuffix}));
        }
        setEmployees(staff);
        setAllBranchesList(branches);
    } catch (e) {
        console.error("Error loading data", e);
    }
  };

  // Initial Load
  useEffect(() => {
    loadData();
  }, [isSuperAdmin, sessionId, isAdmin]);

  // Storage Listener for Real-time Updates (Permissions/Config)
  useEffect(() => {
    const handleStorageChange = () => {
       loadData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isSuperAdmin, sessionId, isAdmin]);

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
        // Find latest data from the loaded 'employees' state if available, else fetch fresh
        // This ensures config updates are reflected in 'loggedInUser'
        const found = employees.length > 0 
           ? employees.find(e => e.id === storedSessionId) 
           : findEmployeeById(storedSessionId);
           
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
            
            // Pre-select employee's branch for convenience
            if (found.branch) {
                const b = allBranchesList.find(br => br.name === found.branch);
                if (b) setSelectedBranchId(b.id);
            }
        }
      }
    }
  }, [isAdmin, allBranchesList, employees]); // Added employees dependency

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

  // Attendance Data (Monthly View)
  const attendanceData = useMemo(() => {
      if (!selectedEmployee) return [];
      return getEmployeeAttendance(selectedEmployee, currentDate.getFullYear(), currentDate.getMonth());
  }, [selectedEmployee, currentDate, todayStatus, refreshKey]);

  // Attendance Data (Daily View - All Employees)
  const dailyReportData = useMemo(() => {
      if (viewMode !== 'Daily') return [];
      
      const [year, month, day] = dailyDate.split('-').map(Number);
      
      return filteredEmployeesForDisplay.map(emp => {
          const monthlyRecords = getEmployeeAttendance(emp, year, month - 1);
          const dayRecord = monthlyRecords.find(r => r.date === dailyDate);
          
          return {
              employee: emp,
              record: dayRecord || { date: dailyDate, status: AttendanceStatus.NOT_MARKED }
          };
      });
  }, [viewMode, dailyDate, filteredEmployeesForDisplay, refreshKey]);


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

  // --- Editing State (Admin) ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<EditAttendanceData | null>(null);

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

  const handleEditDailyRecord = (emp: Employee, record: DailyAttendance) => {
      if (!isAdmin) return;
      // Temporarily switch selected employee context for the edit modal logic to work
      setSelectedEmployee(emp);
      setEditModalData({
          date: record.date,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          isLate: record.isLate
      });
      setIsEditModalOpen(true);
  };

  const handleSaveAdminAttendanceEdit = () => {
      if (!selectedEmployee || !editModalData) return;
      // Determine year/month from the record being edited, not the view state
      const [y, m] = editModalData.date.split('-').map(Number);
      const year = y;
      const month = m - 1;

      const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
      
      // We need to re-fetch the specific employee's month data because 'attendanceData' might be stale 
      // if we are in Daily view and switched contexts
      let currentMonthData = getEmployeeAttendance(selectedEmployee, year, month);

      const updatedData = currentMonthData.map(d => {
          if (d.date === editModalData.date) {
              return { ...d, status: editModalData.status, checkIn: editModalData.checkIn, checkOut: editModalData.checkOut, isLate: editModalData.isLate };
          }
          return d;
      });
      
      if (!updatedData.find(d => d.date === editModalData.date)) {
          // If record didn't exist (e.g. future date or missing), add it
          updatedData.push(editModalData as DailyAttendance);
      }

      localStorage.setItem(key, JSON.stringify(updatedData));
      setRefreshKey(prev => prev + 1);
      setIsEditModalOpen(false);
  };

  // --- CORE PUNCH LOGIC ---

  const initiatePunch = () => {
      if (!selectedEmployee) return;
      if (todayStatus === 'Out') {
          // OPEN MODAL for Punch In
          // Refresh employee data to check for latest config restrictions
          const freshEmployee = employees.find(e => e.id === selectedEmployee.id);
          if (freshEmployee) setSelectedEmployee(freshEmployee);
          
          setShowPunchModal(true);
          setPunchMode(null); // Reset mode
      } else {
          // Punch OUT directly (auto-capture location)
          handlePunchOut();
      }
  };

  const performPunch = (type: 'In' | 'Out', locationData?: LocationRecord) => {
      if (!selectedEmployee) return;
      setIsPunching(true);

      setTimeout(() => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          const dateStr = now.toISOString().split('T')[0];
          const year = now.getFullYear();
          const month = now.getMonth();

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

          if (type === 'In') {
              setTodayStatus('In');
              setLastPunchTime(timeStr);
              
              const newRecord: DailyAttendance = {
                  date: dateStr,
                  status: AttendanceStatus.PRESENT,
                  checkIn: timeStr,
                  isLate: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 45),
                  punchInLocation: locationData
              };

              if (todayRecordIndex >= 0) {
                  updatedData[todayRecordIndex] = { ...updatedData[todayRecordIndex], ...newRecord };
              } else {
                  updatedData.push(newRecord);
              }
          } else {
              setTodayStatus('Out');
              setLastPunchTime(timeStr);
              if (todayRecordIndex >= 0) {
                  updatedData[todayRecordIndex] = {
                      ...updatedData[todayRecordIndex],
                      checkOut: timeStr,
                      punchOutLocation: locationData
                  };
              }
          }

          localStorage.setItem(key, JSON.stringify(updatedData));
          setIsPunching(false);
          setShowPunchModal(false);
          setPunchMode(null);
      }, 1000);
  };

  const handlePunchOut = () => {
      setIsPunching(true);
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const loc: LocationRecord = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      address: 'Logged Out Location',
                      timestamp: new Date().toISOString()
                  };
                  performPunch('Out', loc);
              },
              () => {
                  // Fallback if denied
                  performPunch('Out', { lat: 0, lng: 0, address: 'Unknown (GPS Denied)', timestamp: new Date().toISOString() });
              }
          );
      } else {
          performPunch('Out', { lat: 0, lng: 0, address: 'Unknown (No GPS)', timestamp: new Date().toISOString() });
      }
  };

  const handleModeSelection = (mode: 'Remote' | 'Office') => {
      setPunchMode(mode);
  };

  const handleConfirmPunchIn = () => {
      setIsPunching(true);
      if (!navigator.geolocation) {
          alert("Geolocation is not supported by this browser.");
          setIsPunching(false);
          return;
      }

      navigator.geolocation.getCurrentPosition(
          (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;

              if (punchMode === 'Office') {
                  if (!selectedBranchId) {
                      alert("Please select a branch.");
                      setIsPunching(false);
                      return;
                  }
                  const branch = allBranchesList.find(b => b.id === selectedBranchId);
                  if (!branch || !branch.lat || !branch.lng) {
                      alert("Invalid branch configuration.");
                      setIsPunching(false);
                      return;
                  }

                  const dist = calculateDistanceInMeters(userLat, userLng, branch.lat, branch.lng);
                  const radius = branch.radius || 100;

                  if (dist <= radius) {
                      performPunch('In', {
                          lat: userLat,
                          lng: userLng,
                          address: `Office: ${branch.name}`,
                          timestamp: new Date().toISOString()
                      });
                  } else {
                      alert(`You are too far from ${branch.name}. Distance: ${Math.round(dist)}m (Max: ${radius}m).`);
                      setIsPunching(false);
                  }
              } else {
                  // Remote Mode
                  performPunch('In', {
                      lat: userLat,
                      lng: userLng,
                      address: 'Remote: Work from Anywhere',
                      timestamp: new Date().toISOString()
                  });
              }
          },
          (error) => {
              console.error(error);
              alert("Location access is required to punch in.");
              setIsPunching(false);
          }
      );
  };

  // Check restrictions - Logic corrected: if mode is 'BranchRadius', Remote is restricted.
  const isBranchRestricted = selectedEmployee?.attendanceConfig?.manualPunchMode === 'BranchRadius';


  // --- BULK ACTION LOGIC (NEW) ---
  const handleBulkMarkAttendance = (status: AttendanceStatus) => {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return;
    }
    if (!window.confirm(`Are you sure you want to mark ALL eligible days of ${currentMonthYearLabel} as ${status.replace('_', ' ')} for ${selectedEmployee.name}?`)) {
      return;
    }

    setIsPunching(true); // Use isPunching to disable buttons

    const [year, month] = [currentDate.getFullYear(), currentDate.getMonth()];
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    let currentMonthData = getEmployeeAttendance(selectedEmployee, year, month);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const updatedData = currentMonthData.map(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0,0,0,0); // Normalize

      // Do not override Week Off, Holiday, or future dates
      if (day.status === AttendanceStatus.WEEK_OFF || day.status === AttendanceStatus.HOLIDAY || dayDate > today) {
        return day;
      }
      
      // Removed the specific check for `day.date === todayStr && day.status === AttendanceStatus.NOT_MARKED`
      // This allows bulk marking to apply to today's NOT_MARKED entries.

      if (status === AttendanceStatus.PRESENT) {
        return {
          ...day,
          status: AttendanceStatus.PRESENT,
          checkIn: '09:30 AM',
          checkOut: '06:30 PM',
          isLate: false, // Assume not late if bulk marked present
          punchInLocation: day.punchInLocation || { lat: 0, lng: 0, address: 'Bulk Marked Present', timestamp: new Date(day.date).toISOString() },
          punchOutLocation: day.punchOutLocation || { lat: 0, lng: 0, address: 'Bulk Marked Present', timestamp: new Date(day.date).toISOString() },
        };
      } else if (status === AttendanceStatus.ABSENT) {
        return {
          ...day,
          status: AttendanceStatus.ABSENT,
          checkIn: undefined,
          checkOut: undefined,
          isLate: undefined,
          punchInLocation: undefined,
          punchOutLocation: undefined,
        };
      }
      return day;
    });

    localStorage.setItem(key, JSON.stringify(updatedData));
    setRefreshKey(prev => prev + 1); // Trigger re-render
    setIsPunching(false);
    alert(`Attendance for ${selectedEmployee.name} updated successfully to ${status.replace('_', ' ')}!`);
  };


  // --- RENDER ---

  const employeePunchCardUI = (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${todayStatus === 'In' ? 'from-red-400 to-orange-500' : 'from-emerald-400 to-teal-500'}`}></div>
          <div className="mb-6">
              <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h3>
              <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide uppercase">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
          </div>
          
          <div className="relative group">
              {isPunching && (
                  <>
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${todayStatus === 'In' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                  </>
              )}
              
              <button 
                  onClick={initiatePunch}
                  disabled={isPunching}
                  className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center border-[6px] transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-2xl
                      ${todayStatus === 'In' 
                          ? 'border-red-100 bg-gradient-to-b from-red-50 to-white text-red-500 shadow-red-200/50 hover:border-red-200' 
                          : 'border-emerald-100 bg-gradient-to-b from-emerald-50 to-white text-emerald-500 shadow-emerald-200/50 hover:border-emerald-200'
                      }`}
              >
                  <Fingerprint className={`w-20 h-20 transition-all duration-500 ${isPunching ? 'opacity-50 blur-[1px]' : 'opacity-100'}`} strokeWidth={1.5} />
              </button>
          </div>

          <div className="mt-8 space-y-2">
              <p className="text-gray-500 text-sm font-medium">
                  {isPunching ? 'Processing...' : (todayStatus === 'In' ? 'Duty Active' : 'Ready to Start')}
              </p>
              <h4 className={`text-xl font-bold ${todayStatus === 'In' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {isPunching ? 'Please Wait...' : (todayStatus === 'In' ? 'Punch Out' : 'Punch In')}
              </h4>
          </div>

          {lastPunchTime && (
              <div className="mt-4 py-2 px-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last Action: {lastPunchTime}
              </div>
          )}
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

      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
            {/* Context Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                {isSuperAdmin && (
                    <select
                        value={filterCorporate}
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); setFilterStaffId('All'); setSelectedEmployee(null); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="All">All Corporates</option>
                        {corporates.map((c: any) => <option key={c.email} value={c.email}>{c.companyName}</option>)}
                    </select>
                )}
                <select
                    value={filterBranch}
                    onChange={(e) => { setFilterBranch(e.target.value); setFilterStaffId('All'); setSelectedEmployee(null); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="All">All Branches</option>
                    {allBranchesList.filter(b => b && (filterCorporate === 'All' || b.owner === filterCorporate)).map((b, i) => (
                        <option key={i} value={b.name}>{b.name}</option>
                    ))}
                </select>
                
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('Monthly')}
                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'Monthly' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <LayoutGrid className="w-4 h-4"/> Monthly Calendar
                    </button>
                    <button 
                        onClick={() => setViewMode('Daily')}
                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${viewMode === 'Daily' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <List className="w-4 h-4"/> Daily Report
                    </button>
                </div>
            </div>
            
            {/* View Specific Filters */}
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
                {viewMode === 'Monthly' ? (
                    <>
                        <select
                            value={filterStaffId}
                            onChange={(e) => { 
                                setFilterStaffId(e.target.value); 
                                const emp = employees.find(ep => ep.id === e.target.value);
                                setSelectedEmployee(emp || null);
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
                        >
                            <option value="All">Select Employee to View Calendar</option>
                            {filteredEmployeesForDisplay.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                        <input 
                            type="month"
                            value={currentDate.toISOString().slice(0, 7)}
                            onChange={(e) => setCurrentDate(new Date(e.target.value))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </>
                ) : (
                    <>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                             Select Date:
                             <input 
                                type="date"
                                value={dailyDate}
                                onChange={(e) => setDailyDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </label>
                    </>
                )}
            </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - User Profile / Stats (Only for Employee View or Admin Monthly when selected) */}
        {(!isAdmin || (isAdmin && viewMode === 'Monthly')) && (
            <div className="lg:col-span-1 space-y-6 flex flex-col">
                {viewMode === 'Monthly' && (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                        <span className="font-bold text-gray-800">{currentMonthYearLabel}</span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                    </div>
                )}

                {!isAdmin && selectedEmployee ? employeePunchCardUI : (
                    isAdmin && selectedEmployee ? (
                        // Admin view of employee card
                         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-gray-500 mb-3">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{selectedEmployee.name}</h3>
                            <p className="text-sm text-gray-500">{selectedEmployee.role}</p>
                            <div className="mt-4 flex gap-2 justify-center">
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-bold">{selectedEmployee.branch || 'No Branch'}</span>
                                <span className={`px-2 py-1 text-xs rounded-lg font-bold ${selectedEmployee.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {selectedEmployee.status}
                                </span>
                            </div>
                         </div>
                    ) : (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                            <User className="w-16 h-16 opacity-30 mb-4" />
                            <p>{isAdmin ? 'Select an employee to view calendar' : 'Loading your profile...'}</p>
                        </div>
                    )
                )}
            </div>
        )}

        {/* Right Column: Calendar or Daily Report */}
        <div className={`space-y-6 ${viewMode === 'Daily' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
            
            {/* MONTHLY CALENDAR VIEW */}
            {viewMode === 'Monthly' && selectedEmployee && (
                <>
                    {isAdmin && (
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleBulkMarkAttendance(AttendanceStatus.PRESENT)}
                                disabled={!selectedEmployee || isPunching}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <CheckSquare className="w-4 h-4" /> Mark All Present
                            </button>
                            <button
                                onClick={() => handleBulkMarkAttendance(AttendanceStatus.ABSENT)}
                                disabled={!selectedEmployee || isPunching}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <XSquare className="w-4 h-4" /> Mark All Absent
                            </button>
                        </div>
                    )}
                    <AttendanceCalendar
                        data={attendanceData}
                        stats={stats}
                        onDateClick={handleDateClickForAdminEdit}
                        currentMonthLabel={currentMonthYearLabel}
                        showStats={true}
                    />
                </>
            )}

            {/* DAILY REPORT VIEW */}
            {viewMode === 'Daily' && isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <List className="w-4 h-4 text-emerald-600" /> Daily Attendance Report - {new Date(dailyDate).toLocaleDateString()}
                        </h3>
                        <div className="text-xs text-gray-500">
                             Total: {dailyReportData.length} | 
                             Present: {dailyReportData.filter(d => d.record.status === AttendanceStatus.PRESENT || d.record.status === AttendanceStatus.HALF_DAY).length}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Branch</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Punch In</th>
                                    <th className="px-6 py-3">In Location</th>
                                    <th className="px-6 py-3">Punch Out</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {dailyReportData.map(({employee, record}) => (
                                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {employee.name}
                                            <div className="text-xs text-gray-400 font-normal">{employee.role}</div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">{employee.branch || '-'}</td>
                                        <td className="px-6 py-3">
                                             <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                 record.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' :
                                                 record.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                                                 record.status === AttendanceStatus.HALF_DAY ? 'bg-amber-100 text-amber-700' :
                                                 record.status === AttendanceStatus.WEEK_OFF ? 'bg-gray-100 text-gray-600' :
                                                 'bg-gray-50 text-gray-400 border border-gray-200'
                                             }`}>
                                                 {String(record.status).replace('_', ' ')}
                                                 {record.isLate && ' (Late)'}
                                             </span>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs">{record.checkIn || '-'}</td>
                                        <td className="px-6 py-3">
                                            {record.punchInLocation ? (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${record.punchInLocation.lat},${record.punchInLocation.lng}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[150px] truncate"
                                                    title={record.punchInLocation.address}
                                                >
                                                    <MapPin className="w-3 h-3 flex-shrink-0" /> 
                                                    {record.punchInLocation.address.includes('Remote') ? 'Remote' : 'Office'}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs">{record.checkOut || '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => handleEditDailyRecord(employee, record)}
                                                className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {dailyReportData.length === 0 && (
                                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">No employees found for this filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Existing Log Table for Monthly View (kept for consistency if desired, or can be hidden) */}
            {viewMode === 'Monthly' && isAdmin && selectedEmployee && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-blue-500" /> Monthly Location Log
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Punch In</th>
                                    <th className="px-4 py-3">In Location</th>
                                    <th className="px-4 py-3">Punch Out</th>
                                    <th className="px-4 py-3">Out Location</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {attendanceData
                                    .filter(d => d.checkIn || d.checkOut)
                                    .sort((a,b) => b.date.localeCompare(a.date))
                                    .map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{row.date}</td>
                                        <td className="px-4 py-3 text-emerald-600 font-mono text-xs">{row.checkIn || '-'}</td>
                                        <td className="px-4 py-3">
                                            {row.punchInLocation ? (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${row.punchInLocation.lat},${row.punchInLocation.lng}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                                >
                                                    <MapPin className="w-3 h-3" /> 
                                                    {row.punchInLocation.address.includes('Remote') ? 'Remote' : 'Office'}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-red-500 font-mono text-xs">{row.checkOut || '-'}</td>
                                        <td className="px-4 py-3">
                                            {row.punchOutLocation ? (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${row.punchOutLocation.lat},${row.punchOutLocation.lng}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                                                >
                                                    <MapPin className="w-3 h-3" /> View
                                                </a>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {attendanceData.filter(d => d.checkIn || d.checkOut).length === 0 && (
                                    <tr><td colSpan={5} className="py-6 text-center text-gray-400 italic">No punch records found for this month.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* PUNCH MODE MODAL */}
      {showPunchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg">Select Work Mode</h3>
                      <button onClick={() => { setShowPunchModal(false); setIsPunching(false); }} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Grid column logic adjusted: If Restricted, use 1 col (hide Remote). If not restricted, use 2 cols (show both). */}
                      <div className={`grid gap-4 ${isBranchRestricted ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          
                          {/* REMOTE CARD - Only shown if NOT restricted */}
                          {!isBranchRestricted && (
                              <div 
                                  onClick={() => handleModeSelection('Remote')}
                                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-3 text-center ${
                                      punchMode === 'Remote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                                  }`}
                              >
                                  <div className={`p-3 rounded-full ${punchMode === 'Remote' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                      <Globe className="w-6 h-6" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-sm text-gray-800">Remote</h4>
                                      <p className="text-xs text-gray-500">Work from Anywhere</p>
                                  </div>
                              </div>
                          )}

                          {/* OFFICE CARD - Always shown, possibly centered if it's the only one */}
                          <div 
                              onClick={() => handleModeSelection('Office')}
                              className={`border-2 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center gap-3 text-center ${
                                  punchMode === 'Office' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'
                              }`}
                          >
                              <div className={`p-3 rounded-full ${punchMode === 'Office' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                  <Building className="w-6 h-6" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-sm text-gray-800">Office</h4>
                                  <p className="text-xs text-gray-500">Work from Branch</p>
                              </div>
                          </div>
                      </div>

                      {punchMode === 'Office' && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Branch</label>
                              <select 
                                  value={selectedBranchId} 
                                  onChange={(e) => setSelectedBranchId(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                              >
                                  <option value="">-- Choose Branch --</option>
                                  {allBranchesList.map(b => (
                                      <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                              </select>
                              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> GPS verification required.
                              </p>
                          </div>
                      )}

                      <button 
                          onClick={handleConfirmPunchIn}
                          disabled={!punchMode || isPunching || (punchMode === 'Office' && !selectedBranchId)}
                          className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-2"
                      >
                          {isPunching ? 'Verifying Location...' : 'Confirm Punch In'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Admin Edit Modal (Existing code reused) */}
       {isEditModalOpen && editModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-800">Edit Attendance - {editModalData.date}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* ... (Existing Edit Form) ... */}
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
                    {/* Time Inputs */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check In</label>
                            <input 
                                type="text" 
                                placeholder="09:30 AM"
                                value={editModalData.checkIn || ''}
                                onChange={(e) => setEditModalData(prev => prev ? { ...prev, checkIn: e.target.value } : null)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check Out</label>
                            <input 
                                type="text" 
                                placeholder="06:30 PM"
                                value={editModalData.checkOut || ''}
                                onChange={(e) => setEditModalData(prev => prev ? { ...prev, checkOut: e.target.value } : null)}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>

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
