
import React, { useState, useMemo, useEffect } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { MOCK_EMPLOYEES, getEmployeeAttendance } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee } from '../../types';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#64748b']; // Green, Red, Amber, Slate

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const { companyName } = useBranding();

  const [activeTab, setActiveTab] = useState<'punch' | 'history' | 'report'>(isAdmin ? 'history' : 'punch');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Date State for Navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Determine Session Context
  const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
  const currentSessionId = getSessionId();
  const isSuperAdmin = currentSessionId === 'admin';
  
  // Helper to find an employee by ID across all storage locations
  const findEmployeeById = (id: string): Employee | undefined => {
      // 1. Check Admin Staff
      try {
        const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
        let found = adminStaff.find((e: any) => e.id === id);
        if (found) return found;
      } catch(e) {}

      // 2. Check Corporate Staff
      try {
        const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        for (const corp of corporates) {
            const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
            const found = cStaff.find((e: any) => e.id === id);
            if (found) return found;
        }
      } catch(e) {}

      // 3. Check Mocks
      return MOCK_EMPLOYEES.find(e => e.id === id);
  };

  // Load employees list (For Admin View Only)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isAdmin) {
      if (isSuperAdmin) {
          // --- SUPER ADMIN AGGREGATION ---
          let allStaff: Employee[] = [];
          
          // 1. Admin Data (Head Office)
          const adminData = localStorage.getItem('staff_data');
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData);
                  allStaff = [...allStaff, ...parsed.map((e: any) => ({...e, name: `${e.name} (Head Office)`}))];
              } catch (e) {}
          }

          // 2. Corporate Data
          try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData);
                        // Append franchise name to employee name for clarity in dropdown
                        const tagged = parsed.map((e: any) => ({...e, name: `${e.name} (${corp.companyName})`}));
                        allStaff = [...allStaff, ...tagged];
                    } catch (e) {}
                }
            });
          } catch(e) {}
          
          // 3. Fallback to Mocks if absolutely nothing exists
          if (allStaff.length === 0) return MOCK_EMPLOYEES;
          return allStaff;
      } else {
          // Regular Franchise/Corporate Admin - Only see their own staff
          const key = `staff_data_${currentSessionId}`;
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved) : [];
      }
    }
    return [];
  });

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  // Resolve Logged In User
  useEffect(() => {
    if (!isAdmin) {
      const storedRole = localStorage.getItem('user_role');
      const storedSessionId = localStorage.getItem('app_session_id');

      if (storedSessionId) {
        const found = findEmployeeById(storedSessionId);
        setLoggedInUser(found || MOCK_EMPLOYEES[0]);
      }
    }
  }, [isAdmin]);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); 
  
  // Sync selectedEmployee
  useEffect(() => {
    if (isAdmin) {
      if (employees.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employees[0]);
      }
    } else {
      // For employee view, wait for loggedInUser to be resolved
      if (loggedInUser) {
          setSelectedEmployee(loggedInUser);
      }
    }
  }, [isAdmin, employees, loggedInUser]);


  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);

  // Punch Card States (for employee view)
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>('--:--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--:--');
  const [duration, setDuration] = useState<{ hours: number, minutes: number, seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [location, setLocation] = useState<string>('Fetching location...');
  
  // QR Scan State
  const [isScanningQr, setIsScanningQr] = useState(false);

  // Clock for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  // Geolocation Logic
  useEffect(() => {
    if (!isAdmin && selectedEmployee) {
        // If GPS is required or just generally available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    // In a real app, reverse geocode here.
                    // For mock, we'll just say "Near Office"
                    setLocation("Location Detected: Within Geofence");
                },
                (err) => {
                    setLocation("Location Access Denied");
                }
            );
        } else {
            setLocation("GPS not supported");
        }
    }
  }, [isAdmin, selectedEmployee]);

  // Restore active punch session on mount (for employee view)
  useEffect(() => {
    if (!isAdmin && selectedEmployee) {
      const savedSession = localStorage.getItem(`active_punch_session_${selectedEmployee.id}`);
      if (savedSession) {
        try {
          const { startTime } = JSON.parse(savedSession);
          const start = new Date(startTime);
          
          setIsCheckedIn(true);
          setCheckInTime(start.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          }));
        } catch (e) {
          console.error("Failed to restore punch session", e);
          localStorage.removeItem(`active_punch_session_${selectedEmployee.id}`);
        }
      } else {
          setIsCheckedIn(false);
          setCheckInTime('--:--');
          setDuration({ hours: 0, minutes: 0, seconds: 0 });
      }
    }
  }, [isAdmin, selectedEmployee]);

  // Duration Timer Logic
  useEffect(() => {
    let interval: any;
    
    if (isCheckedIn && selectedEmployee) {
      const updateTimer = () => {
        const savedSession = localStorage.getItem(`active_punch_session_${selectedEmployee.id}`);
        if (savedSession) {
            try {
                const { startTime } = JSON.parse(savedSession);
                const start = new Date(startTime);
                const now = new Date();
                const diff = Math.max(0, now.getTime() - start.getTime());
                
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                setDuration({ hours, minutes, seconds });
            } catch (e) {
                setIsCheckedIn(false);
            }
        }
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
        setDuration({ hours: 0, minutes: 0, seconds: 0 });
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isCheckedIn, selectedEmployee]);

  const performPunch = () => {
    if (!selectedEmployee) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    const todayDateStr = now.toISOString().split('T')[0];

    const year = now.getFullYear();
    const month = now.getMonth();
    const attendanceStorageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    
    let currentMonthAttendance: DailyAttendance[] = [];
    try {
        currentMonthAttendance = JSON.parse(localStorage.getItem(attendanceStorageKey) || '[]');
    } catch (e) {}
    
    let todayRecordIndex = currentMonthAttendance.findIndex(d => d.date === todayDateStr);
    let todayRecord = todayRecordIndex !== -1 ? currentMonthAttendance[todayRecordIndex] : null;

    if (!isCheckedIn) {
      // PUNCH IN
      setIsCheckedIn(true);
      setCheckInTime(timeStr);
      setCheckOutTime('--:--');
      
      localStorage.setItem(`active_punch_session_${selectedEmployee.id}`, JSON.stringify({
        startTime: now.toISOString(),
        employeeId: selectedEmployee.id
      }));

      if (todayRecord) {
        todayRecord.status = AttendanceStatus.PRESENT;
        todayRecord.checkIn = timeStr;
        todayRecord.isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30); 
      } else {
        todayRecord = {
          date: todayDateStr,
          status: AttendanceStatus.PRESENT,
          checkIn: timeStr,
          isLate: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30),
        };
        currentMonthAttendance.push(todayRecord);
      }
    } else {
      // PUNCH OUT
      setIsCheckedIn(false);
      setCheckOutTime(timeStr);
      
      localStorage.removeItem(`active_punch_session_${selectedEmployee.id}`);

      if (todayRecord) {
        todayRecord.checkOut = timeStr;
      }
    }

    localStorage.setItem(attendanceStorageKey, JSON.stringify(currentMonthAttendance));
    setAttendanceData(currentMonthAttendance);
  };

  const handleManualPunch = () => {
      // Check GPS restriction
      if (selectedEmployee?.attendanceConfig?.gpsGeofencing) {
          if (location.includes("Denied") || location.includes("Fetching")) {
              alert("GPS Location is required for attendance. Please enable location access.");
              return;
          }
      }
      performPunch();
  };

  const handleQrScan = () => {
      setIsScanningQr(true);
      // Simulate scanning process
      setTimeout(() => {
          setIsScanningQr(false);
          // Assume success
          performPunch();
      }, 2000);
  };


  // Fetch attendance data when date or selected employee changes
  useEffect(() => {
    if (!selectedEmployee) {
      setAttendanceData([]);
      return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const savedAttendanceKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    const savedData = localStorage.getItem(savedAttendanceKey);

    if (savedData) {
      try {
        setAttendanceData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse attendance data", e);
        setAttendanceData(getEmployeeAttendance(selectedEmployee, year, month));
      }
    } else {
      const generatedData = getEmployeeAttendance(selectedEmployee, year, month);
      if (generatedData.length > 0) {
          localStorage.setItem(savedAttendanceKey, JSON.stringify(generatedData));
      }
      setAttendanceData(generatedData);
    }
  }, [currentDate, selectedEmployee]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculate stats dynamically
  const stats = useMemo(() => {
    return attendanceData.reduce((acc, day) => {
      switch (day.status) {
        case AttendanceStatus.PRESENT:
          acc.present++;
          break;
        case AttendanceStatus.ABSENT:
          acc.absent++;
          break;
        case AttendanceStatus.HALF_DAY:
          acc.halfDay++;
          break;
        case AttendanceStatus.PAID_LEAVE:
          acc.paidLeave++;
          break;
        case AttendanceStatus.WEEK_OFF:
          acc.weekOff++;
          break;
      }
      return acc;
    }, {
      present: 0,
      absent: 0,
      halfDay: 0,
      paidLeave: 0,
      weekOff: 0
    });
  }, [attendanceData]);

  // Generate Report Data
  const reportData = useMemo(() => {
    const employeesToRender = isAdmin 
      ? employees 
      : (selectedEmployee ? [selectedEmployee] : []); 

    return employeesToRender.map(emp => {
        const seed = emp.name.length;
        const totalDays = 22; 
        const present = Math.max(15, 22 - (seed % 6));
        const absent = Math.floor((22 - present) / 3);
        const lateHalf = 22 - present - absent;
        const percentage = Math.round((present / 22) * 100);
        
        return {
            ...emp,
            stats: { totalDays, present, absent, lateHalf, percentage }
        };
    });
  }, [isAdmin, employees, selectedEmployee]);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const fullMonthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // --- Render Logic ---

  const handleDateClick = (day: DailyAttendance) => {
    if (isAdmin) {
      setEditingDay(day);
    }
  };

  // Handle Status Update (Admin)
  const handleStatusUpdate = (newStatus: AttendanceStatus) => {
    if (!editingDay || !selectedEmployee) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    const updatedData = attendanceData.map(item => {
        if (item.date === editingDay.date) {
            return {
                ...item,
                status: newStatus,
                checkIn: newStatus === AttendanceStatus.PRESENT ? '09:30 AM' : undefined,
                checkOut: newStatus === AttendanceStatus.PRESENT ? '06:30 PM' : undefined,
                isLate: false
            };
        }
        return item;
    });
    
    setAttendanceData(updatedData);
    localStorage.setItem(key, JSON.stringify(updatedData));
    setEditingDay(null);
  };

  const handleMarkAllPresent = () => {
    if (!selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    const updated = attendanceData.map(day => {
      if (day.status === AttendanceStatus.ABSENT || day.status === AttendanceStatus.NOT_MARKED) {
        return {
          ...day,
          status: AttendanceStatus.PRESENT,
          checkIn: '09:30 AM',
          checkOut: '06:30 PM'
        };
      }
      return day;
    });
    setAttendanceData(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const handleMarkAllAbsent = () => {
    if (!selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    const updated = attendanceData.map(day => {
      if (day.status === AttendanceStatus.PRESENT) {
        return {
          ...day,
          status: AttendanceStatus.ABSENT,
          checkIn: undefined,
          checkOut: undefined
        };
      }
      return day;
    });
    setAttendanceData(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  // Chart Data for Employee
  const pieData = [
    { name: 'Present', value: stats.present },
    { name: 'Absent', value: stats.absent },
    { name: 'Half Day', value: stats.halfDay },
    { name: 'Leave/Off', value: stats.paidLeave + stats.weekOff },
  ].filter(d => d.value > 0);

  // EMPLOYEE VIEW
  if (!isAdmin && selectedEmployee) {
    // Determine which punch methods are allowed
    // Default to true/false if config is missing to be safe, but use the object if present
    const config = selectedEmployee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true };
    
    // If no methods are enabled, we might default to manual or show error
    const noMethodsEnabled = !config.manualPunch && !config.qrScan;
    const isGpsRequiredAndDenied = config.gpsGeofencing && (location.includes("Denied") || location.includes("Fetching"));


    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* QR Scanner Simulation Modal */}
        {isScanningQr && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                <div className="bg-black border border-white/20 rounded-2xl w-full max-w-sm aspect-[3/4] relative overflow-hidden flex flex-col items-center justify-center text-white">
                    <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10"></div>
                    <div className="w-64 h-64 border-2 border-emerald-500 rounded-xl relative z-20 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                    <p className="mt-8 z-20 font-bold tracking-wider animate-pulse flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> SCANNING QR CODE...
                    </p>
                    <button 
                        onClick={() => setIsScanningQr(false)}
                        className="absolute bottom-8 z-20 text-sm text-gray-400 hover:text-white underline"
                    >
                        Cancel Scan
                    </button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Attendance</h2>
            <p className="text-gray-500">Track your daily check-ins and monthly analysis</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm text-gray-500">Today is</p>
            <p className="text-lg font-bold text-gray-800">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Punch Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center h-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
               
               <div className="mb-6">
                  <div className="text-4xl font-mono font-bold text-gray-800 mb-1">
                    {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                  </div>
                  
                  {config.gpsGeofencing ? (
                      <p className={`text-xs uppercase tracking-widest flex items-center justify-center gap-1 ${location.includes('Denied') || location.includes('Fetching') ? 'text-red-500' : 'text-emerald-600'}`}>
                        <MapPin className="w-3 h-3" /> {location}
                      </p>
                  ) : (
                      <p className="text-xs text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
                        <Navigation className="w-3 h-3" /> Remote Punch Enabled
                      </p>
                  )}
               </div>

               {/* Dynamic Punch Buttons based on Restrictions */}
               <div className="space-y-3 w-full flex flex-col items-center">
                   {isCheckedIn ? (
                       // Check Out button
                       <button
                          onClick={handleManualPunch}
                          className="w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                        >
                          <Fingerprint className="w-12 h-12 mb-2 text-red-500" />
                          <span className="font-bold text-lg">Check Out</span>
                        </button>
                   ) : (
                       // Check In Options
                       <>
                           {config.manualPunch && !config.qrScan && ( // Only Manual Punch allowed
                               <button
                                  onClick={handleManualPunch}
                                  disabled={isGpsRequiredAndDenied}
                                  className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 ${isGpsRequiredAndDenied ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <Fingerprint className="w-12 h-12 mb-2 text-emerald-500" />
                                  <span className="font-bold text-lg">Check In</span>
                                  {isGpsRequiredAndDenied && <span className="absolute bottom-1 text-[7px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1 rounded">GPS Required</span>}
                                </button>
                           )}

                           {config.qrScan && !config.manualPunch && ( // Only QR Scan allowed
                                <button
                                  onClick={handleQrScan}
                                  className="w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"
                                >
                                  <ScanLine className="w-12 h-12 mb-2 text-blue-500" />
                                  <span className="font-bold text-lg">Scan QR</span>
                                </button>
                           )}

                           {config.manualPunch && config.qrScan && ( // Both Manual Punch and QR Scan allowed
                               <>
                                   <button
                                      onClick={handleManualPunch}
                                      disabled={isGpsRequiredAndDenied}
                                      className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 ${isGpsRequiredAndDenied ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <Fingerprint className="w-12 h-12 mb-2 text-emerald-500" />
                                      <span className="font-bold text-lg">Check In</span>
                                      {isGpsRequiredAndDenied && <span className="absolute bottom-1 text-[7px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1 rounded">GPS Required</span>}
                                    </button>
                                   <button
                                      onClick={handleQrScan}
                                      className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <ScanLine className="w-5 h-5" /> Use QR Code
                                    </button>
                               </>
                           )}

                           {noMethodsEnabled && (
                               <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                   Punch-in is disabled. Please contact your administrator.
                               </div>
                           )}
                       </>
                   )}
               </div>

               <div className="grid grid-cols-2 gap-4 w-full mt-8 pt-6 border-t border-gray-100">
                  <div>
                     <p className="text-xs text-gray-400 uppercase mb-1">Logged In</p>
                     <p className="text-lg font-bold text-gray-800 font-mono">{checkInTime}</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase mb-1">Working Hrs</p>
                     <p className="text-lg font-bold text-blue-600 font-mono">
                       {String(duration.hours).padStart(2, '0')}:{String(duration.minutes).padStart(2, '0')}
                     </p>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Analysis & Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-500 font-bold uppercase">Present</p>
                      <span className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg"><CheckCircle className="w-4 h-4" /></span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.present}</p>
                   <p className="text-xs text-gray-400 mt-1">Days this month</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-500 font-bold uppercase">Absent</p>
                      <span className="bg-red-100 text-red-700 p-1.5 rounded-lg"><XCircle className="w-4 h-4" /></span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.absent}</p>
                   <p className="text-xs text-gray-400 mt-1">Days this month</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-500 font-bold uppercase">Late</p>
                      <span className="bg-orange-100 text-orange-700 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{attendanceData.filter(d => d.isLate).length}</p>
                   <p className="text-xs text-gray-400 mt-1">Occurrences</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                   <div className="flex justify-between items-start">
                      <p className="text-xs text-gray-500 font-bold uppercase">Half Days</p>
                      <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg"><Activity className="w-4 h-4" /></span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.halfDay}</p>
                   <p className="text-xs text-gray-400 mt-1">Days this month</p>
                </div>
             </div>

             {/* Analysis Chart */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <PieChartIcon className="w-4 h-4 text-emerald-500" /> Monthly Overview
                </h3>
                <div className="flex-1 min-h-[160px]">
                   {pieData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={5}
                              dataKey="value"
                           >
                              {pieData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                           <ReTooltip />
                           <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="h-full flex items-center justify-center text-gray-400 text-xs">No data yet</div>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" /> Attendance History
                 </h3>
                 <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-bold w-20 text-center">{monthLabel}</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                    <Calendar className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                    <List className="w-4 h-4" />
                 </button>
              </div>
           </div>

           <div className="p-6">
              {viewMode === 'calendar' ? (
                 <div className="max-w-2xl mx-auto">
                    <AttendanceCalendar data={attendanceData} stats={stats} />
                 </div>
              ) : (
                 <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {attendanceData.map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                           <div className="flex items-center gap-4">
                              {/* MILD COLOR BACKGROUNDS FOR LIST VIEW */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${
                                 day.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                 day.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-700 border-red-200' :
                                 day.status === AttendanceStatus.HALF_DAY ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                 day.status === AttendanceStatus.PAID_LEAVE ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                 day.status === AttendanceStatus.WEEK_OFF ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                 'bg-white text-gray-400 border-gray-200'
                              }`}>
                                 {new Date(day.date).getDate()}
                              </div>
                              <div>
                                 <p className="font-medium text-gray-900">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                                 <p className="text-xs text-gray-500">{day.status.replace('_', ' ')}</p>
                              </div>
                           </div>
                           <div className="text-right flex flex-col items-end gap-1 min-w-[80px]">
                              {day.checkIn ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-gray-400 uppercase tracking-wide">In</span>
                                        <p className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{day.checkIn}</p>
                                    </div>
                                    {day.checkOut && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] text-gray-400 uppercase tracking-wide">Out</span>
                                            <p className="font-mono text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{day.checkOut}</p>
                                        </div>
                                    )}
                                  </>
                              ) : (
                                  <span className="text-xs text-gray-300">--:--</span>
                              )}
                           </div>
                        </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className={`mx-auto space-y-6 ${activeTab === 'report' ? 'max-w-6xl' : 'max-w-5xl'}`}> {/* Increased width for admin */}
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
           <p className="text-gray-500">Monitor and manage staff attendance</p>
        </div>
        {/* Tabs */}
        <div className="bg-gray-100 p-1 rounded-xl flex shadow-inner">
            <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
            <User className="w-4 h-4" /> Individual
            </button>
            <button 
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
            <List className="w-4 h-4" /> Muster Roll
            </button>
        </div>
      </div>

      {/* ADMIN: INDIVIDUAL VIEW (With Dashboard Analytics) */}
      {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Toolbar: Select Employee & Date */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <select 
                            value={selectedEmployee?.id || ''}
                            onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id === e.target.value) || null)}
                            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 hover:bg-white transition-colors min-w-[220px]"
                        >
                            {employees.length === 0 && <option>No Staff Found</option>}
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Date Nav */}
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
                        <span className="px-3 text-sm font-bold text-gray-700 w-24 text-center">{monthLabel}</span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleMarkAllPresent} className="px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                        Mark All Present
                    </button>
                    <button onClick={handleMarkAllAbsent} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                        Mark All Absent
                    </button>
                </div>
             </div>

             {/* Analysis Row (Same as Employee View) */}
             {selectedEmployee && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">Present</span>
                                <span className="bg-emerald-100 text-emerald-600 p-1 rounded-md"><CheckCircle className="w-3.5 h-3.5" /></span>
                            </div>
                            <span className="text-2xl font-bold text-gray-800">{stats.present}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">Absent</span>
                                <span className="bg-red-100 text-red-600 p-1 rounded-md"><XCircle className="w-3.5 h-3.5" /></span>
                            </div>
                            <span className="text-2xl font-bold text-gray-800">{stats.absent}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">Late</span>
                                <span className="bg-orange-100 text-orange-600 p-1 rounded-md"><Clock className="w-3.5 h-3.5" /></span>
                            </div>
                            <span className="text-2xl font-bold text-gray-800">{attendanceData.filter(d => d.isLate).length}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">Half Day</span>
                                <span className="bg-yellow-100 text-yellow-600 p-1 rounded-md"><Activity className="w-3.5 h-3.5" /></span>
                            </div>
                            <span className="text-2xl font-bold text-gray-800">{stats.halfDay}</span>
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-40 lg:h-auto">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Monthly Distribution</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ReTooltip />
                                    <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
             )}

             {/* Calendar / List View Toggle */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-500" /> 
                        Attendance Log ({fullMonthLabel})
                    </h3>
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                        <button 
                            onClick={() => setViewMode('calendar')} 
                            className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Calendar className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="p-6">
                    {viewMode === 'calendar' ? (
                        <div className="max-w-3xl mx-auto">
                            <AttendanceCalendar 
                                data={attendanceData} 
                                stats={stats} 
                                onDateClick={handleDateClick} 
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {attendanceData.map((day, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handleDateClick(day)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group"
                                >
                                    {/* MILD COLOR BACKGROUNDS FOR LIST VIEW - MATCHING CALENDAR */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${
                                        day.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        day.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-700 border-red-200' :
                                        day.status === AttendanceStatus.HALF_DAY ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        day.status === AttendanceStatus.PAID_LEAVE ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        day.status === AttendanceStatus.WEEK_OFF ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                        'bg-white text-gray-400 border-gray-200'
                                    }`}>
                                        {new Date(day.date).getDate()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-700">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                        <p className="text-[10px] text-gray-500">{day.status.replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                        {day.checkIn ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">In: {day.checkIn}</span>
                                                {day.checkOut && (
                                                    <span className="text-xs font-mono font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Out: {day.checkOut}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-300">-</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
          </div>
      )}

      {/* Report / Muster Roll View */}
      {activeTab === 'report' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                     <div className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 bg-gray-50 font-medium text-sm">
                        Report for: {monthLabel}
                     </div>
                     <select className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                        <option>All Departments</option>
                        <option>Sales</option>
                        <option>Tech</option>
                     </select>
                  </div>
                  <button className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 px-5 py-2 rounded-lg font-medium transition-colors text-sm w-full md:w-auto justify-center">
                     <Download className="w-4 h-4" /> Export CSV
                  </button>
               </div>

               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                           <tr>
                              <th className="px-6 py-4">Employee</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4 text-center">Present</th>
                              <th className="px-6 py-4 text-center">Absent</th>
                              <th className="px-6 py-4 text-center">Late</th>
                              <th className="px-6 py-4 text-center">Perf %</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                           {reportData.map((emp) => (
                              <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors">
                                 <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                    <img src={emp.avatar} className="w-8 h-8 rounded-full" alt="" />
                                    {emp.name}
                                 </td>
                                 <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                                 <td className="px-6 py-4 text-center font-bold text-emerald-600">{emp.stats.present}</td>
                                 <td className="px-6 py-4 text-center font-bold text-red-500">{emp.stats.absent}</td>
                                 <td className="px-6 py-4 text-center font-bold text-orange-500">{emp.stats.lateHalf}</td>
                                 <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{width: `${emp.stats.percentage}%`}}></div>
                                        </div>
                                        <span className="text-xs font-bold">{emp.stats.percentage}%</span>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
          </div>
      )}

      {/* Edit Modal (Common for Admin) */}
      {editingDay && activeTab === 'history' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">Edit Attendance</h3>
                <p className="text-sm text-gray-500">{new Date(editingDay.date).toDateString()}</p>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <button onClick={() => handleStatusUpdate(AttendanceStatus.PRESENT)} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.PRESENT ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-1"></div><span className="font-semibold">Present</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.ABSENT)} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.ABSENT ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-red-500 mb-1"></div><span className="font-semibold">Absent</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.HALF_DAY)} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.HALF_DAY ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-amber-400 mb-1"></div><span className="font-semibold">Half Day</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.PAID_LEAVE)} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.PAID_LEAVE ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-blue-400 mb-1"></div><span className="font-semibold whitespace-nowrap">Paid Leave</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.WEEK_OFF)} className={`col-span-2 p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.WEEK_OFF ? 'border-slate-400 bg-slate-50 text-slate-800' : 'border-gray-200 bg-white hover:bg-slate-50 hover:border-slate-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-slate-400 mb-1"></div><span className="font-semibold">Week Off</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAttendance;
