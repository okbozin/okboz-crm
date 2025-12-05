
import React, { useState, useMemo, useEffect, useRef } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
// Added COLORS import from constants.ts
import { MOCK_EMPLOYEES, getEmployeeAttendance, COLORS } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount } from '../../types';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Camera, AlertCircle, Building2, RefreshCcw, Users, Coffee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

// Haversine formula to calculate distance between two lat/lng points in meters
function haversineDistance(coords1: { lat: number; lng: number; }, coords2: { lat: number; lng: number; }): number {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371e3; // metres

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng); 

    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}


const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const { companyName } = useBranding();

  const [activeTab, setActiveTab] = useState<'punch' | 'history' | 'report'>(isAdmin ? 'history' : 'punch');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  
  // Date State for Navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Determine Session Context
  const getSessionId = () => localStorage.getItem('app_session_id') || 'admin';
  const currentSessionId = getSessionId();
  const isSuperAdmin = currentSessionId === 'admin';

  // NEW: Filter States for Admin Panel
  const [filterCorporate, setFilterCorporate] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterStaffId, setFilterStaffId] = useState<string>('All');
  const [filterPeriodType, setFilterPeriodType] = useState<'Daily' | 'Monthly'>('Monthly'); 
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

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

  // NEW: Load Corporates and all Branches for filters
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);
  const [allBranchesList, setAllBranchesList] = useState<(Branch & { owner?: string, ownerName?: string })[]>([]);

  useEffect(() => {
    if (isAdmin) {
      // Load Corporates
      try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporatesList(corps);
      } catch (e) { console.error("Failed to load corporate accounts", e); }

      // Load All Branches (Aggregated)
      let aggregatedBranches: (Branch & { owner?: string, ownerName?: string })[] = [];
      try {
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
        aggregatedBranches = [...aggregatedBranches, ...adminBranches.map((b: Branch) => ({ ...b, owner: 'admin', ownerName: 'Head Office' }))];
        
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        corps.forEach((c: CorporateAccount) => {
          const corpBranchesKey = `branches_data_${c.email}`;
          const corpBranchesData = localStorage.getItem(corpBranchesKey);
          if (corpBranchesData) {
            const corpBranches = JSON.parse(corpBranchesData).map((b: Branch) => ({ ...b, owner: c.email, ownerName: c.companyName }));
            aggregatedBranches = [...aggregatedBranches, ...corpBranches];
          }
        });
      } catch (e) { console.error("Failed to load all branches", e); }
      setAllBranchesList(aggregatedBranches);
    }
  }, [isAdmin, isSuperAdmin]);


  // Load employees list (For Admin View Only) 
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isAdmin) {
      if (isSuperAdmin) {
          let allStaff: Employee[] = [];
          
          const adminData = localStorage.getItem('staff_data');
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData);
                  allStaff = [...allStaff, ...parsed.map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))];
              } catch (e) {}
          }

          try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData);
                        const tagged = parsed.map((e: any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}));
                        allStaff = [...allStaff, ...tagged];
                    } catch (e) {}
                }
            });
          } catch(e) {}
          
          return allStaff;
      } else { // Corporate Admin
          const key = `staff_data_${currentSessionId}`;
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved).map((e: any) => ({...e, corporateId: currentSessionId, corporateName: 'My Branch'})) : [];
      }
    }
    return [];
  });

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  // Resolve Logged In User
  useEffect(() => {
    if (!isAdmin) {
      const storedSessionId = localStorage.getItem('app_session_id');

      if (storedSessionId) {
        const found = findEmployeeById(storedSessionId);
        setLoggedInUser(found || MOCK_EMPLOYEES[0]);
      }
    }
  }, [isAdmin]);

  // NEW: Memoized list of employees filtered by admin panel filters
  const filteredEmployeesForDisplay = useMemo(() => {
    let list = employees;

    if (isSuperAdmin && filterCorporate !== 'All') {
      list = list.filter(emp => emp.corporateId === filterCorporate);
    }
    if (filterBranch !== 'All') {
      list = list.filter(emp => emp.branch === filterBranch);
    }
    if (filterStaffId !== 'All') {
      list = list.filter(emp => emp.id === filterStaffId);
    }

    return list;
  }, [employees, filterCorporate, filterBranch, filterStaffId, isSuperAdmin]);


  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); 
  const [employeeBranch, setEmployeeBranch] = useState<Branch | null>(null); 
  
  // Sync selectedEmployee
  useEffect(() => {
    if (isAdmin) {
      if (filteredEmployeesForDisplay.length > 0 && !selectedEmployee) {
        setSelectedEmployee(filteredEmployeesForDisplay[0]);
      } else if (filteredEmployeesForDisplay.length === 0) {
        setSelectedEmployee(null);
      } else if (selectedEmployee && !filteredEmployeesForDisplay.some(e => e.id === selectedEmployee.id)) {
        setSelectedEmployee(filteredEmployeesForDisplay[0]);
      }
    } else {
      if (loggedInUser) {
          setSelectedEmployee(loggedInUser);
      }
    }
  }, [isAdmin, filteredEmployeesForDisplay, loggedInUser, selectedEmployee]);


  // NEW: Load employee's assigned branch details
  useEffect(() => {
    if (selectedEmployee?.branch) {
      const allBranches: Branch[] = [];
      const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]');
      allBranches.push(...adminBranches);

      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      corporates.forEach((corp: any) => {
        const cBranches = JSON.parse(localStorage.getItem(`branches_data_${corp.email}`) || '[]');
        allBranches.push(...cBranches);
      });

      const foundBranch = allBranches.find(b => b.name === selectedEmployee.branch);
      setEmployeeBranch(foundBranch || null);
    } else {
      setEmployeeBranch(null);
    }
  }, [selectedEmployee]);

  // --- SYNC CALENDAR WITH DASHBOARD FILTERS ---
  useEffect(() => {
    if (isAdmin) {
        if (filterPeriodType === 'Monthly' && filterMonth) {
            const [y, m] = filterMonth.split('-').map(Number);
            // Only update if current date is different to avoid loop
            if (currentDate.getFullYear() !== y || currentDate.getMonth() !== (m - 1)) {
                setCurrentDate(new Date(y, m - 1, 1));
            }
        } else if (filterPeriodType === 'Daily' && filterDate) {
            const [y, m] = filterDate.split('-').map(Number);
            if (currentDate.getFullYear() !== y || currentDate.getMonth() !== (m - 1)) {
                setCurrentDate(new Date(y, m - 1, 1));
            }
        }
    }
  }, [filterMonth, filterDate, filterPeriodType, isAdmin]);

  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [editingDay, setEditingDay] = useState<DailyAttendance | null>(null);

  // Punch Card States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>('--:--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--:--');
  const [duration, setDuration] = useState<{ hours: number, minutes: number, seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  
  const [locationStatus, setLocationStatus] = useState<Employee['attendanceLocationStatus']>('idle');
  const [currentLocation, setCurrentLocation] = useState<Employee['currentLocation']>(null);
  const [cameraStatus, setCameraStatus] = useState<Employee['cameraPermissionStatus']>('idle');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  // ... (Permission & Geolocation logic) ...
  useEffect(() => {
    if (!isAdmin && selectedEmployee) {
      const requestPermissions = async () => {
        if (selectedEmployee.attendanceConfig?.gpsGeofencing || selectedEmployee.liveTracking) {
          setLocationStatus('fetching');
          if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
              (pos) => {
                const newLocation = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                };
                setCurrentLocation(newLocation);

                if (employeeBranch && selectedEmployee.attendanceConfig?.gpsGeofencing) {
                  const distance = haversineDistance(
                    { lat: newLocation.lat, lng: newLocation.lng },
                    { lat: employeeBranch.lat, lng: employeeBranch.lng }
                  );
                  if (distance <= employeeBranch.radius) {
                    setLocationStatus('within_geofence');
                  } else {
                    setLocationStatus('outside_geofence');
                  }
                } else {
                  setLocationStatus('granted'); 
                }

                const updatedEmployee = { ...selectedEmployee, currentLocation: newLocation, attendanceLocationStatus: locationStatus };
                const key = `staff_data_${currentSessionId}`;
                const allStaff = JSON.parse(localStorage.getItem(key) || '[]');
                const updatedStaff = allStaff.map((emp: Employee) => emp.id === updatedEmployee.id ? updatedEmployee : emp);
                localStorage.setItem(key, JSON.stringify(updatedStaff));

              },
              (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                  setLocationStatus('denied');
                } else {
                  setLocationStatus('idle');
                }
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
          } else {
            setLocationStatus('denied');
          }
        } else {
          setLocationStatus('idle');
        }

        if (selectedEmployee.attendanceConfig?.qrScan) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStatus('granted');
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {
            setCameraStatus('denied');
          }
        } else {
          setCameraStatus('idle');
        }
      };

      requestPermissions();
    }
  }, [isAdmin, selectedEmployee, employeeBranch, currentSessionId, locationStatus]);

  // ... (Punch Restore & Timer Logic) ...
  useEffect(() => {
    if (!isAdmin && selectedEmployee) {
      const savedSession = localStorage.getItem(`active_punch_session_${selectedEmployee.id}`);
      if (savedSession) {
        try {
          const { startTime } = JSON.parse(savedSession);
          const start = new Date(startTime);
          setIsCheckedIn(true);
          setCheckInTime(start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
        } catch (e) {
          localStorage.removeItem(`active_punch_session_${selectedEmployee.id}`);
        }
      } else {
          setIsCheckedIn(false);
          setCheckInTime('--:--');
          setDuration({ hours: 0, minutes: 0, seconds: 0 });
      }
    }
  }, [isAdmin, selectedEmployee]);

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
                setDuration({ 
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                });
            } catch (e) { setIsCheckedIn(false); }
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
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayDateStr = now.toISOString().split('T')[0];
    const punchYear = now.getFullYear();
    const punchMonth = now.getMonth();
    const punchStorageKey = `attendance_data_${selectedEmployee.id}_${punchYear}_${punchMonth}`;
    
    let currentMonthData: DailyAttendance[] = [];
    try {
        const stored = localStorage.getItem(punchStorageKey);
        currentMonthData = stored ? JSON.parse(stored) : [];
    } catch (e) {}

    const recordIndex = currentMonthData.findIndex(d => d.date === todayDateStr);
    
    if (recordIndex >= 0) {
        const record = currentMonthData[recordIndex];
        if (!isCheckedIn) {
            record.status = AttendanceStatus.PRESENT;
            record.checkIn = timeStr;
            record.isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
        } else {
            record.checkOut = timeStr;
        }
        currentMonthData[recordIndex] = record;
    } else {
        if (!isCheckedIn) {
            currentMonthData.push({
                date: todayDateStr,
                status: AttendanceStatus.PRESENT,
                checkIn: timeStr,
                isLate: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30),
            });
        }
    }
    localStorage.setItem(punchStorageKey, JSON.stringify(currentMonthData));

    setRefreshTrigger(prev => prev + 1);

    if (currentDate.getFullYear() === punchYear && currentDate.getMonth() === punchMonth) {
        setAttendanceData([...currentMonthData]); 
    }

    if (!isCheckedIn) {
        setIsCheckedIn(true);
        setCheckInTime(timeStr);
        setCheckOutTime('--:--');
        localStorage.setItem(`active_punch_session_${selectedEmployee.id}`, JSON.stringify({ startTime: now.toISOString(), employeeId: selectedEmployee.id }));
    } else {
        setIsCheckedIn(false);
        setCheckOutTime(timeStr);
        localStorage.removeItem(`active_punch_session_${selectedEmployee.id}`);
    }
  };

  const handleManualPunch = () => { performPunch(); };
  const handleQrScan = async () => {
      setIsScanningQr(true);
      setTimeout(() => { setIsScanningQr(false); performPunch(); }, 2000);
  };

  // Fetch attendance data
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
        setAttendanceData(getEmployeeAttendance(selectedEmployee, year, month));
      }
    } else {
      const generatedData = getEmployeeAttendance(selectedEmployee, year, month);
      if (generatedData.length > 0) {
          localStorage.setItem(savedAttendanceKey, JSON.stringify(generatedData));
      }
      setAttendanceData(generatedData);
    }
  }, [currentDate, selectedEmployee, refreshTrigger]); 

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Stats for Selected Employee (Calendar View / Employee Panel)
  const stats = useMemo(() => {
    return attendanceData.reduce((acc, day) => {
      if (day.status === AttendanceStatus.PRESENT) acc.present++;
      if (day.status === AttendanceStatus.ABSENT) acc.absent++;
      if (day.status === AttendanceStatus.HALF_DAY) acc.halfDay++;
      if (day.status === AttendanceStatus.PAID_LEAVE) acc.paidLeave++;
      if (day.status === AttendanceStatus.WEEK_OFF) acc.weekOff++;
      return acc;
    }, { present: 0, absent: 0, halfDay: 0, paidLeave: 0, weekOff: 0 });
  }, [attendanceData]);

  // --- AGGREGATED DASHBOARD STATS (ADMIN ONLY) ---
  const statsOverview = useMemo(() => {
    if (!isAdmin) return null;

    let overview = { 
        totalEmployees: 0, 
        present: 0, 
        absent: 0, 
        halfDay: 0, 
        leave: 0, 
        weekOff: 0, 
        late: 0 
    };
    
    // Context for date calculation
    const isDaily = filterPeriodType === 'Daily';
    const targetDate = new Date(filterDate); // Specific day
    const targetMonthDate = new Date(filterMonth); // Specific month (YYYY-MM)
    const dateStr = targetDate.toISOString().split('T')[0];

    overview.totalEmployees = filteredEmployeesForDisplay.length;

    filteredEmployeesForDisplay.forEach(emp => {
        const year = isDaily ? targetDate.getFullYear() : targetMonthDate.getFullYear();
        const month = isDaily ? targetDate.getMonth() : targetMonthDate.getMonth();
        
        const key = `attendance_data_${emp.id}_${year}_${month}`;
        let data: DailyAttendance[] = [];
        
        try { 
            const stored = localStorage.getItem(key);
            if (stored) data = JSON.parse(stored);
        } catch {}

        // Fallback to generated data if nothing stored (to show reasonable stats)
        if (!data || data.length === 0) data = getEmployeeAttendance(emp, year, month);

        if (isDaily) {
            // Count only for specific day
            const record = data.find(d => d.date === dateStr);
            if (record) {
                if (record.status === AttendanceStatus.PRESENT) { overview.present++; if(record.isLate) overview.late++; }
                else if (record.status === AttendanceStatus.ABSENT) overview.absent++;
                else if (record.status === AttendanceStatus.HALF_DAY) overview.halfDay++;
                else if (record.status === AttendanceStatus.PAID_LEAVE) overview.leave++;
                else if (record.status === AttendanceStatus.WEEK_OFF) overview.weekOff++;
            }
        } else {
            // Monthly Aggregation (Sum of all days in month for all employees)
            data.forEach(record => {
                if (record.status === AttendanceStatus.PRESENT) { overview.present++; if(record.isLate) overview.late++; }
                else if (record.status === AttendanceStatus.ABSENT) overview.absent++;
                else if (record.status === AttendanceStatus.HALF_DAY) overview.halfDay++;
                else if (record.status === AttendanceStatus.PAID_LEAVE) overview.leave++;
                else if (record.status === AttendanceStatus.WEEK_OFF) overview.weekOff++;
            });
        }
    });
    return overview;
  }, [filteredEmployeesForDisplay, filterDate, filterMonth, filterPeriodType, isAdmin, refreshTrigger]);

  // Chart Data for Dashboard (Admin View - Aggregated)
  const dashboardPieData = statsOverview ? [
    { name: 'Present', value: statsOverview.present, color: '#10b981' },
    { name: 'Absent', value: statsOverview.absent, color: '#ef4444' },
    { name: 'Half Day', value: statsOverview.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: statsOverview.leave, color: '#3b82f6' },
    { name: 'Week Off', value: statsOverview.weekOff, color: '#64748b' },
  ].filter(d => d.value > 0) : [];

  // Chart Data for Employee View (Single User - Monthly)
  // Also used for "Individual" view detail if needed, but primarily for Employee Panel
  const pieData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: stats.paidLeave, color: '#3b82f6' },
    { name: 'Week Off', value: stats.weekOff, color: '#64748b' },
  ].filter(d => d.value > 0);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const fullMonthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleDateClick = (day: DailyAttendance) => { if (isAdmin) setEditingDay(day); };

  const handleStatusUpdate = (newStatus: AttendanceStatus, newCheckIn: string, newCheckOut: string) => {
    if (!editingDay || !selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    const updatedData = attendanceData.map(item => {
        if (item.date === editingDay.date) {
            let isLate = false;
            if (newStatus === AttendanceStatus.PRESENT && newCheckIn) {
                const [hours, minutes] = newCheckIn.split(':').map(Number);
                if (hours > 9 || (hours === 9 && minutes > 30)) isLate = true;
            }
            return { ...item, status: newStatus, checkIn: newCheckIn, checkOut: newCheckOut, isLate: isLate };
        }
        return item;
    });
    setAttendanceData(updatedData);
    localStorage.setItem(key, JSON.stringify(updatedData));
    setEditingDay(null);
    setRefreshTrigger(prev => prev + 1); // Trigger dashboard refresh
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
          checkOut: '06:30 PM',
          isLate: false
        };
      }
      return day;
    });
    setAttendanceData(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMarkAllAbsent = () => {
    if (!selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    const updated = attendanceData.map(day => {
      if (day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.HALF_DAY || day.status === AttendanceStatus.PAID_LEAVE) {
        return {
          ...day,
          status: AttendanceStatus.ABSENT,
          checkIn: undefined,
          checkOut: undefined,
          isLate: false
        };
      }
      return day;
    });
    setAttendanceData(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setRefreshTrigger(prev => prev + 1);
  };

  const renderListView = () => (
    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
      {attendanceData.map((day, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
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
              <div className="text-right flex flex-col items-end gap-1 min-w-[100px]">
                {day.checkIn ? (
                    <>
                      <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">In</span>
                          <p className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{day.checkIn}</p>
                      </div>
                      {day.checkOut && (
                          <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Out</span>
                              <p className="font-mono text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{day.checkOut}</p>
                          </div>
                      )}
                    </>
                ) : (
                    <span className="text-xs text-gray-300 italic">No Punch Data</span>
                )}
              </div>
          </div>
      ))}
    </div>
  );

  // EMPLOYEE VIEW
  if (!isAdmin && selectedEmployee) {
    // ... (Employee view rendering logic, utilizing pieData) ...
    const config = selectedEmployee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true };
    const noMethodsEnabled = !config.manualPunch && !config.qrScan;

    let locationDisplay = "Location Unavailable";
    let locationColor = "text-gray-500";
    let locationIcon = <MapPin className="w-3 h-3" />;

    if (locationStatus === 'fetching') {
      locationDisplay = "Fetching location...";
      locationColor = "text-blue-500";
      locationIcon = <Loader2 className="w-3 h-3 animate-spin" />;
    } else if (locationStatus === 'denied') {
      locationDisplay = "Location Access Denied";
      locationColor = "text-red-500";
      locationIcon = <MapPin className="w-3 h-3" />;
    } else if (config.gpsGeofencing) {
        if (locationStatus === 'within_geofence') {
            locationDisplay = "Within Geofence";
            locationColor = "text-emerald-600";
        } else if (locationStatus === 'outside_geofence') {
            locationDisplay = "Outside Geofence";
            locationColor = "text-red-500";
        } else if (locationStatus === 'granted') {
            locationDisplay = "Location Detected"; 
            locationColor = "text-emerald-600";
        }
        locationIcon = <MapPin className="w-3 h-3" />;
    } else {
      locationDisplay = "Remote Punch Enabled";
      locationColor = "text-gray-500";
      locationIcon = <Navigation className="w-3 h-3" />;
    }

    const isPunchDisabled = 
        (config.gpsGeofencing && (locationStatus === 'denied' || locationStatus === 'fetching' || locationStatus === 'outside_geofence')) ||
        (config.qrScan && cameraStatus === 'denied');

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ... (QR Scan & Header) ... */}
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
             {/* ... (Punch Card UI from previous) ... */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center h-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
               <div className="mb-6">
                  <div className="text-4xl font-mono font-bold text-gray-800 mb-1">
                    {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                  </div>
                  <p className={`text-xs uppercase tracking-widest flex items-center justify-center gap-1 ${locationColor}`}>
                    {locationIcon} {locationDisplay}
                  </p>
                  {config.gpsGeofencing && employeeBranch && (
                    <p className="text-[10px] text-gray-400 mt-1">Branch: {employeeBranch.name}</p>
                  )}
               </div>
               <div className="space-y-3 w-full flex flex-col items-center">
                   {isCheckedIn ? (
                       <button onClick={handleManualPunch} className="w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl border-4 bg-red-50 border-red-100 text-red-600 hover:bg-red-100">
                          <Fingerprint className="w-12 h-12 mb-2 text-red-500" /><span className="font-bold text-lg">Check Out</span>
                        </button>
                   ) : (
                       <button onClick={handleManualPunch} disabled={isPunchDisabled} className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl border-4 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 ${isPunchDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Fingerprint className="w-12 h-12 mb-2 text-emerald-500" /><span className="font-bold text-lg">Check In</span>
                        </button>
                   )}
               </div>
             </div>
          </div>

          {/* Right Column: Analysis & Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <p className="text-xs text-gray-500 font-bold uppercase">Present</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.present}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <p className="text-xs text-gray-500 font-bold uppercase">Absent</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.absent}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <p className="text-xs text-gray-500 font-bold uppercase">Late</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{attendanceData.filter(d => d.isLate).length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <p className="text-xs text-gray-500 font-bold uppercase">Half Days</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.halfDay}</p>
                </div>
             </div>

             {/* Analysis Chart using pieData */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <PieChartIcon className="w-4 h-4 text-emerald-500" /> Monthly Overview
                </h3>
                <div className="flex-1 min-h-[160px]">
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
                               <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <ReTooltip />
                         <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px'}} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
        
        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <AttendanceCalendar data={attendanceData} stats={stats} />
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className={`mx-auto space-y-6 ${activeTab === 'report' ? 'max-w-6xl' : 'max-w-6xl'}`}> 
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* NEW: Filter Bar for Admin */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
              {isSuperAdmin && (
                <select
                  value={filterCorporate}
                  onChange={(e) => {
                    setFilterCorporate(e.target.value);
                    setFilterBranch('All');
                    setFilterStaffId('All');
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                >
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporatesList.map(c => (
                    <option key={c.email} value={c.email}>{c.companyName}</option>
                  ))}
                </select>
              )}

              <select
                value={filterBranch}
                onChange={(e) => {
                  setFilterBranch(e.target.value);
                  setFilterStaffId('All');
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                <option value="All">All Branches</option>
                {allBranchesList.filter(b => 
                    (filterCorporate === 'All' && (isSuperAdmin || b.owner === currentSessionId)) ||
                    (filterCorporate === 'admin' && b.owner === 'admin') ||
                    (b.owner === filterCorporate)
                  ).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              <select
                value={filterStaffId}
                onChange={(e) => setFilterStaffId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
              >
                <option value="All">All Staff</option>
                {filteredEmployeesForDisplay.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
             <button onClick={() => setFilterPeriodType('Daily')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriodType === 'Daily' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Daily</button>
             <button onClick={() => setFilterPeriodType('Monthly')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterPeriodType === 'Monthly' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>Monthly</button>
          </div>

          {filterPeriodType === 'Daily' ? (
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white"
            />
          ) : (
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white"
            />
          )}
        </div>
      )}

      {/* DASHBOARD WIDGET (Admin Summary) */}
      {isAdmin && statsOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
            {/* Left: Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm col-span-2 md:col-span-1">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Staff</p>
                        <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{statsOverview.totalEmployees}</h3>
                    <p className="text-[10px] text-gray-400">Active Employees</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Present</p>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-600">{statsOverview.present}</h3>
                    <p className="text-[10px] text-gray-400">{filterPeriodType === 'Monthly' ? 'Man-days' : 'Today'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Absent</p>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-600">{statsOverview.absent}</h3>
                    <p className="text-[10px] text-gray-400">{filterPeriodType === 'Monthly' ? 'Man-days' : 'Today'}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Late</p>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-orange-600">{statsOverview.late}</h3>
                    <p className="text-[10px] text-gray-400">Arrivals</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Half Day</p>
                        <Activity className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-amber-600">{statsOverview.halfDay}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Week Off</p>
                        <Coffee className="w-4 h-4 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-600">{statsOverview.weekOff}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm col-span-2 md:col-span-2">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">On Leave</p>
                        <Plane className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-indigo-600">{statsOverview.leave}</h3>
                    <p className="text-[10px] text-gray-400">Approved Leaves</p>
                </div>
            </div>

            {/* Right: Distribution Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                   <PieChartIcon className="w-4 h-4 text-emerald-500" /> 
                   {filterPeriodType} Distribution
                </h3>
                <div className="flex-1 min-h-[200px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={dashboardPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                         >
                            {dashboardPieData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <ReTooltip />
                         <Legend 
                            iconSize={8} 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} 
                         />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

      {/* ADMIN: INDIVIDUAL VIEW (With Dashboard Analytics) */}
      {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Toolbar: Employee Select (Now driven by filters) & Date */}
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
                            {filteredEmployeesForDisplay.length === 0 && <option>No Staff Found</option>}
                            {filteredEmployeesForDisplay.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role} {emp.corporateName && emp.corporateName !== 'My Branch' && `(${emp.corporateName})`}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Date Nav */}
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-3 text-sm font-bold text-gray-700 w-24 text-center">{monthLabel}</span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-md shadow-sm transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleMarkAllPresent} className="px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors">
                        Mark All Present
                    </button>
                    <button onClick={handleMarkAllAbsent} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                        Mark All Absent
                    </button>
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
             </div>

             {/* Calendar / List View Toggle */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> 
                        Attendance Log ({fullMonthLabel})
                    </h3>
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
                        renderListView()
                    )}
                </div>
             </div>
          </div>
      )}

      {/* Edit Modal (Common for Admin) - MODIFIED FOR PUNCH TIMES */}
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
              {/* Punch-in/out Time Inputs */}
              <div className="col-span-2 space-y-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Punch Times</h4>
                  <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Check-in Time</label>
                      <input 
                          type="time" 
                          value={editingDay.checkIn || ''} 
                          onChange={(e) => setEditingDay(prev => prev ? { ...prev, checkIn: e.target.value } : null)} 
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Check-out Time</label>
                      <input 
                          type="time" 
                          value={editingDay.checkOut || ''} 
                          onChange={(e) => setEditingDay(prev => prev ? { ...prev, checkOut: e.target.value } : null)} 
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                      />
                  </div>
              </div>

              {/* Status Buttons */}
              <button onClick={() => handleStatusUpdate(AttendanceStatus.PRESENT, editingDay.checkIn || '', editingDay.checkOut || '')} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.PRESENT ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-emerald-500 mb-1"></div><span className="font-semibold">Present</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.ABSENT, editingDay.checkIn || '', editingDay.checkOut || '')} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.ABSENT ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-red-500 mb-1"></div><span className="font-semibold">Absent</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.HALF_DAY, editingDay.checkIn || '', editingDay.checkOut || '')} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.HALF_DAY ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-amber-400 mb-1"></div><span className="font-semibold">Half Day</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.PAID_LEAVE, editingDay.checkIn || '', editingDay.checkOut || '')} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.PAID_LEAVE ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-gray-600'}`}>
                <div className="w-3 h-3 rounded-full bg-blue-400 mb-1"></div><span className="font-semibold whitespace-nowrap">Paid Leave</span>
              </button>
              <button onClick={() => handleStatusUpdate(AttendanceStatus.WEEK_OFF, editingDay.checkIn || '', editingDay.checkOut || '')} className={`col-span-2 p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${editingDay.status === AttendanceStatus.WEEK_OFF ? 'border-slate-400 bg-slate-50 text-slate-800' : 'border-gray-200 bg-white hover:bg-slate-50 hover:border-slate-200 text-gray-600'}`}>
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
