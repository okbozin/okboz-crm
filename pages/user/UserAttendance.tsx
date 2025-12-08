import React, { useState, useMemo, useEffect, useRef } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { MOCK_EMPLOYEES, getEmployeeAttendance, COLORS } from '../../constants';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Camera, AlertCircle, Building2, RefreshCcw, Users, Coffee,
  Search, Filter, LayoutGrid, ListChecks, Save, Edit2, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { useNotification } from '../../context/NotificationContext'; 
import { sendSystemNotification } from '../../services/cloudService'; 
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { DailyAttendance, AttendanceStatus, CorporateAccount, Branch, Employee, UserRole } from '../../types';

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

// Helper to parse time strings like "09:30 AM" into total minutes from midnight
const parseTimeToMinutes = (timeString: string): number | null => {
  if (!timeString) return null;
  try {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch (e) {
    console.error("Error parsing time string:", timeString, e);
    return null;
  }
};

// Helper to format total minutes into Hh Mm Ss
const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes < 0) totalMinutes = 0; 
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60); 
  return `${hours}h ${minutes}m`;
};

// Helper to find employee by ID across all storage locations
const findEmployeeById = (id: string): Employee | undefined => {
    try {
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]').filter((item: any) => item && typeof item === 'object');
      let found = adminStaff.find((e: any) => e.id === id);
      if (found) return { ...found, corporateId: 'admin' };
    } catch(e) {}

    try {
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
      for (const corp of corporates) {
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
          const found = cStaff.find((e: any) => e.id === id);
          if (found) return { ...found, corporateId: corp.email };
      }
    } catch(e) {}

    return MOCK_EMPLOYEES.find(e => e.id === id);
};

// Fix: Changed from a const functional component with separate export to a direct export default function
export default function UserAttendance({ isAdmin = false }: UserAttendanceProps) {
  const navigate = useNavigate();
  const { companyName } = useBranding();
  const { playAlarmSound } = useNotification(); 

  // Admin View State
  const [viewMode, setViewMode] = useState<'Individual' | 'MusterRoll'>('Individual');
  const [periodType, setPeriodType] = useState<'Daily' | 'Monthly'>('Monthly');
  
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

  // NEW: Load Corporates and all Branches for filters
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);
  const [allBranchesList, setAllBranchesList] = useState<(Branch & { owner?: string, ownerName?: string })[]>([]);

  useEffect(() => {
    if (isAdmin) {
      try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
        setCorporatesList(corps);
      } catch (e) { console.error("Failed to load corporate accounts", e); }

      let aggregatedBranches: (Branch & { owner?: string, ownerName?: string })[] = [];
      try {
        const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]').filter((item: any) => item && typeof item === 'object');
        aggregatedBranches = [...aggregatedBranches, ...adminBranches.map((b: Branch) => ({ ...b, owner: 'admin', ownerName: 'Head Office' }))];
        
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
        corps.forEach((c: CorporateAccount) => {
          const corpBranchesKey = `branches_data_${c.email}`;
          const corpBranchesData = localStorage.getItem(corpBranchesKey);
          if (corpBranchesData) {
            const corpBranches = JSON.parse(corpBranchesData).filter((item: any) => item && typeof item === 'object').map((b: Branch) => ({ ...b, owner: c.email, ownerName: c.companyName }));
            aggregatedBranches = [...aggregatedBranches, ...corpBranches];
          }
        });
      } catch (e) { console.error("Failed to load all branches", e); }
      setAllBranchesList(aggregatedBranches);
    }
  }, [isAdmin, isSuperAdmin]);


  // Load employees list
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (isAdmin) {
      if (isSuperAdmin) {
          let allStaff: Employee[] = [];
          const adminData = localStorage.getItem('staff_data');
          if (adminData) {
              try { 
                  const parsed = JSON.parse(adminData).filter((item: any) => item && typeof item === 'object');
                  allStaff = [...allStaff, ...parsed.map((e: any) => ({...e, corporateId: 'admin', corporateName: 'Head Office'}))];
              } catch (e) {}
          }
          try {
            const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
            corporates.forEach((corp: any) => {
                const cData = localStorage.getItem(`staff_data_${corp.email}`);
                if (cData) {
                    try {
                        const parsed = JSON.parse(cData).filter((item: any) => item && typeof item === 'object');
                        const tagged = parsed.map((e: any) => ({...e, corporateId: corp.email, corporateName: corp.companyName}));
                        allStaff = [...allStaff, ...tagged];
                    } catch (e) {}
                }
            });
          } catch(e) {}
          return allStaff;
      } else {
          const key = `staff_data_${currentSessionId}`;
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved).filter((item: any) => item && typeof item === 'object').map((e: any) => ({...e, corporateId: currentSessionId, corporateName: 'My Branch'})) : [];
      }
    }
    return [];
  });

  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      const storedSessionId = localStorage.getItem('app_session_id');
      if (storedSessionId) {
        const found = findEmployeeById(storedSessionId);
        setLoggedInUser(found || MOCK_EMPLOYEES[0]);
      }
    }
  }, [isAdmin]);

  const filteredEmployeesForDisplay = useMemo(() => {
    let list = employees;
    if (isSuperAdmin && filterCorporate !== 'All') {
      list = list.filter(emp => emp.corporateId === filterCorporate);
    }
    if (filterBranch !== 'All') {
      list = list.filter(emp => emp.branch === filterBranch);
    }
    return list;
  }, [employees, filterCorporate, filterBranch, isSuperAdmin]);


  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); 
  const [employeeBranch, setEmployeeBranch] = useState<Branch | null>(null); 
  
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

  useEffect(() => {
    if (selectedEmployee?.branch) {
      const allBranches: Branch[] = [];
      const adminBranches = JSON.parse(localStorage.getItem('branches_data') || '[]').filter((item: any) => item && typeof item === 'object');
      allBranches.push(...adminBranches);

      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]').filter((item: any) => item && typeof item === 'object');
      corporates.forEach((corp: any) => {
        const cBranches = JSON.parse(localStorage.getItem(`branches_data_${corp.email}`) || '[]').filter((item: any) => item && typeof item === 'object');
        allBranches.push(...cBranches);
      });

      const foundBranch = allBranches.find(b => b.name === selectedEmployee.branch);
      setEmployeeBranch(foundBranch || null);
    } else {
      setEmployeeBranch(null);
    }
  }, [selectedEmployee]);


  // Load Attendance Data
  const [attendanceData, setAttendanceData] = useState<DailyAttendance[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  // --- EMPLOYEE SPECIFIC STATES ---
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
  const streamRef = useRef<MediaStream | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  
  // Feedback message state
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

  // --- ADMIN ATTENDANCE EDIT MODAL STATES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<DailyAttendance | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');

  // Timer for Employee
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  // Update Check-in/Check-out status and Duration
  useEffect(() => {
    if (!selectedEmployee) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = attendanceData.find(d => d.date === todayStr);

    if (todayRecord) {
      setCheckInTime(todayRecord.checkIn || '--:--');
      setCheckOutTime(todayRecord.checkOut || '--:--');
      setIsCheckedIn(!!todayRecord.checkIn && !todayRecord.checkOut);

      if (todayRecord.checkIn && todayRecord.checkOut) {
        const startMinutes = parseTimeToMinutes(todayRecord.checkIn);
        const endMinutes = parseTimeToMinutes(todayRecord.checkOut);

        if (startMinutes !== null && endMinutes !== null) {
          let diff = endMinutes - startMinutes;
          if (diff < 0) diff += 24 * 60; // Handle overnight
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setDuration({ hours: h, minutes: m, seconds: 0 }); 
        } else {
          setDuration({ hours: 0, minutes: 0, seconds: 0 });
        }
      } else {
        setDuration({ hours: 0, minutes: 0, seconds: 0 });
      }
    } else {
      setIsCheckedIn(false);
      setCheckInTime('--:--');
      setCheckOutTime('--:--');
      setDuration({ hours: 0, minutes: 0, seconds: 0 });
    }
  }, [attendanceData, selectedEmployee]);

  // Online/Offline Status Notification for Employee
  useEffect(() => {
    if (!isAdmin && selectedEmployee && selectedEmployee.liveTracking) {
      const sendOnlineStatus = async (status: 'online' | 'offline') => {
        const timestamp = new Date().toISOString();
        const notificationMessage = `${selectedEmployee.name} is now ${status}.`;
        
        let staffDataKey = 'staff_data';
        if (selectedEmployee.corporateId && selectedEmployee.corporateId !== 'admin') {
            staffDataKey = `staff_data_${selectedEmployee.corporateId}`;
        }
        const allStaff = JSON.parse(localStorage.getItem(staffDataKey) || '[]').filter((item: any) => item && typeof item === 'object');
        const updatedStaff = allStaff.map((emp: Employee) => {
            if (emp.id === selectedEmployee.id) {
                const currentHistory = emp.onlineHistory || [];
                return { 
                    ...emp, 
                    onlineHistory: [...currentHistory, { timestamp, status }],
                    isOnline: status === 'online'
                };
            }
            return emp;
        });
        localStorage.setItem(staffDataKey, JSON.stringify(updatedStaff));
        
        await sendSystemNotification({
          type: 'online_status',
          title: `Employee ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
          corporateId: selectedEmployee.corporateId === 'admin' ? undefined : selectedEmployee.corporateId,
          employeeId: selectedEmployee.id,
          link: '/admin/tracking'
        });
      };

      sendOnlineStatus('online');

      return () => {
        sendOnlineStatus('offline');
      };
    }
  }, [isAdmin, selectedEmployee]);

  // Fetch attendance data
  useEffect(() => {
    if (!selectedEmployee) {
      setAttendanceData([]);
      return;
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const savedAttendanceKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    let savedData = localStorage.getItem(savedAttendanceKey);

    if (savedData) {
      try {
        let parsedData = JSON.parse(savedData).filter((item: any) => item && typeof item === 'object');
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth()) {
            parsedData = parsedData.map((d: DailyAttendance) => {
                const dayOfMonth = parseInt(d.date.split('-')[2], 10);
                if (dayOfMonth > today.getDate()) {
                    return { ...d, status: AttendanceStatus.NOT_MARKED, checkIn: undefined, checkOut: undefined, isLate: false };
                }
                return d;
            });
        }
        setAttendanceData(parsedData);
      } catch (e) {
        const generatedData = getEmployeeAttendance(selectedEmployee, year, month);
        localStorage.setItem(savedAttendanceKey, JSON.stringify(generatedData));
        setAttendanceData(generatedData);
      }
    } else {
      const generatedData = getEmployeeAttendance(selectedEmployee, year, month);
      if (generatedData.length > 0) {
          localStorage.setItem(savedAttendanceKey, JSON.stringify(generatedData));
      }
      setAttendanceData(generatedData);
    }
  }, [currentDate, selectedEmployee, refreshTrigger]); 

  const handlePrev = () => {
    if (periodType === 'Daily') {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
    } else {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  }
  const handleNext = () => {
    if (periodType === 'Daily') {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
    } else {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  }

  const stats = useMemo(() => {
    if (viewMode === 'Individual' && selectedEmployee) {
        return attendanceData.reduce((acc, day) => {
        if (day.status === AttendanceStatus.PRESENT) acc.present++;
        if (day.status === AttendanceStatus.ABSENT) acc.absent++;
        if (day.status === AttendanceStatus.HALF_DAY) acc.halfDay++;
        if (day.status === AttendanceStatus.PAID_LEAVE) acc.paidLeave++;
        if (day.status === AttendanceStatus.WEEK_OFF) acc.weekOff++;
        if (day.isLate) acc.late++;
        return acc;
        }, { present: 0, absent: 0, halfDay: 0, paidLeave: 0, weekOff: 0, late: 0 });
    } 
    else {
        return { 
            present: Math.floor(filteredEmployeesForDisplay.length * 0.8),
            absent: Math.floor(filteredEmployeesForDisplay.length * 0.1),
            halfDay: 0,
            paidLeave: 0, 
            weekOff: 0, 
            late: Math.floor(filteredEmployeesForDisplay.length * 0.05)
        };
    }
  }, [attendanceData, viewMode, filteredEmployeesForDisplay, selectedEmployee]);

  const totalMonthlyDurationMinutes = useMemo(() => {
    let totalMinutes = 0;
    if (selectedEmployee) {
      attendanceData.forEach(day => {
        if ((day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.HALF_DAY) && day.checkIn && day.checkOut) {
          const startMinutes = parseTimeToMinutes(day.checkIn);
          const endMinutes = parseTimeToMinutes(day.checkOut);
          if (startMinutes !== null && endMinutes !== null) {
            let diff = endMinutes - startMinutes;
            if (diff < 0) diff += 24 * 60;
            totalMinutes += diff;
          }
        }
      });
    }
    return totalMinutes;
  }, [attendanceData, selectedEmployee]);

  const formattedTotalMonthlyDuration = useMemo(() => formatDuration(totalMonthlyDurationMinutes), [totalMonthlyDurationMinutes]);


  const pieData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: stats.paidLeave, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const storageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    
    let newData = [...attendanceData];
    if (newData.length === 0) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            newData.push({
                date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                status: AttendanceStatus.NOT_MARKED
            });
        }
    }

    const today = new Date();
    const updatedData = newData.map(d => {
        const dDate = new Date(d.date);
        if (dDate <= today && d.status === AttendanceStatus.NOT_MARKED) {
             return { ...d, status, checkIn: status === AttendanceStatus.PRESENT ? '09:30 AM' : undefined, checkOut: status === AttendanceStatus.PRESENT ? '06:30 PM' : undefined };
        }
        return d;
    });

    setAttendanceData(updatedData);
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    setRefreshTrigger(p => p + 1);
  };

  const getLocationPromise = (): Promise<[Employee['attendanceLocationStatus'], Employee['currentLocation'] | null]> => new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(['denied', null]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve(['granted', { lat: latitude, lng: longitude, accuracy }]);
      },
      (error) => {
        console.error("Geolocation Error:", error);
        resolve(['denied', null]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const getCameraPermission = async (): Promise<Employee['cameraPermissionStatus']> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'denied';
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return 'granted';
    } catch (e) {
      console.error("Camera permission error:", e);
      return 'denied';
    }
  };

  const handlePunch = async () => {
    if (!selectedEmployee || isPunching) return;

    setIsPunching(true);
    setPunchMessage(null); // Clear previous messages

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentTimeFormatted = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let newLocationStatus: Employee['attendanceLocationStatus'] = 'idle';
    let newCameraStatus: Employee['cameraPermissionStatus'] = 'idle';
    let newLocation: Employee['currentLocation'] = null;

    // 1. Get Permissions & Location (if configured for employee)
    if (selectedEmployee.liveTracking || selectedEmployee.attendanceConfig?.gpsGeofencing) {
        [newLocationStatus, newLocation] = await getLocationPromise();
        setLocationStatus(newLocationStatus);
    }
    if (selectedEmployee.attendanceConfig?.qrScan) {
        newCameraStatus = await getCameraPermission();
        setCameraStatus(newCameraStatus);
    }

    // 2. Validate Punch based on settings
    let canPunch = true;
    let failReason = '';

    if (selectedEmployee.attendanceConfig?.gpsGeofencing && newLocationStatus !== 'granted') {
        canPunch = false;
        failReason = "Location permission denied.";
    } else if (selectedEmployee.attendanceConfig?.qrScan && newCameraStatus !== 'granted') {
        canPunch = false;
        failReason = "Camera permission denied.";
    }

    // Geofencing Check
    if (canPunch && selectedEmployee.attendanceConfig?.gpsGeofencing && newLocation && employeeBranch) {
        const distance = haversineDistance(newLocation, { lat: employeeBranch.lat, lng: employeeBranch.lng });
        if (distance > employeeBranch.radius) {
            canPunch = false;
            failReason = `You are ${Math.round(distance - employeeBranch.radius)}m outside the geofence (${employeeBranch.radius}m).`;
            setLocationStatus('outside_geofence');
        } else {
            setLocationStatus('within_geofence');
        }
    }

    // Proceed with Punch if Valid
    if (canPunch) {
        // Update employee's current location and attendance status
        let staffDataKey = 'staff_data';
        if (selectedEmployee.corporateId && selectedEmployee.corporateId !== 'admin') {
            staffDataKey = `staff_data_${selectedEmployee.corporateId}`;
        }
        const allStaff = JSON.parse(localStorage.getItem(staffDataKey) || '[]').filter((item: any) => item && typeof item === 'object');
        const updatedStaff = allStaff.map((emp: Employee) => {
            if (emp.id === selectedEmployee.id) {
                return { ...emp, currentLocation: newLocation, attendanceLocationStatus: newLocationStatus, cameraPermissionStatus: newCameraStatus };
            }
            return emp;
        });
        localStorage.setItem(staffDataKey, JSON.stringify(updatedStaff));


        // Update attendance record
        const year = today.getFullYear();
        const month = today.getMonth();
        const storageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
        const existingAttendance = JSON.parse(localStorage.getItem(storageKey) || '[]').filter((item: any) => item && typeof item === 'object');

        let updatedAttendance = [...existingAttendance];
        const dayIndex = updatedAttendance.findIndex(d => d.date === todayStr);

        if (!isCheckedIn) { // Punch In
            const checkInHour = today.getHours();
            const checkInMinute = today.getMinutes();

            let isLate = false;
            // Assuming a default shift start time of 9:30 AM (or fetch from employee.workingHours)
            const defaultShiftStart = selectedEmployee.workingHours ? parseTimeToMinutes(selectedEmployee.workingHours.split(' - ')[0]) : parseTimeToMinutes('09:30 AM');
            const actualCheckInMinutes = parseTimeToMinutes(currentTimeFormatted);

            if (defaultShiftStart !== null && actualCheckInMinutes !== null && actualCheckInMinutes > defaultShiftStart + 15) { // 15 min grace
                isLate = true;
            }

            if (dayIndex !== -1) {
                updatedAttendance[dayIndex] = {
                    ...updatedAttendance[dayIndex],
                    status: AttendanceStatus.PRESENT,
                    checkIn: currentTimeFormatted,
                    isLate: isLate
                };
            } else {
                updatedAttendance.push({
                    date: todayStr,
                    status: AttendanceStatus.PRESENT,
                    checkIn: currentTimeFormatted,
                    isLate: isLate
                });
            }
            setPunchMessage({ type: 'success', text: `Punched IN at ${currentTimeFormatted}!` + (isLate ? ' (Late)' : '') });
            // NEW: Send Punch-In Notification
            await sendSystemNotification({
                type: 'punch_in', // Explicitly cast 'type'
                title: 'Employee Punched In',
                message: `${selectedEmployee.name} punched in at ${currentTimeFormatted}.`,
                targetRoles: [UserRole.ADMIN, UserRole.CORPORATE], // Admin and Corporate can receive
                corporateId: selectedEmployee.corporateId === 'admin' ? undefined : selectedEmployee.corporateId,
                employeeId: selectedEmployee.id,
                link: '/admin/attendance' // Link to attendance page
            });

        } else { // Punch Out
            if (dayIndex !== -1) {
                updatedAttendance[dayIndex] = {
                    ...updatedAttendance[dayIndex],
                    checkOut: currentTimeFormatted
                };
            }
            setPunchMessage({ type: 'success', text: `Punched OUT at ${currentTimeFormatted}!` });
             // NEW: Send Punch-Out Notification
             await sendSystemNotification({
                type: 'punch_out', // Explicitly cast 'type'
                title: 'Employee Punched Out',
                message: `${selectedEmployee.name} punched out at ${currentTimeFormatted}.`,
                targetRoles: [UserRole.ADMIN, UserRole.CORPORATE], // Admin and Corporate can receive
                corporateId: selectedEmployee.corporateId === 'admin' ? undefined : selectedEmployee.corporateId,
                employeeId: selectedEmployee.id,
                link: '/admin/attendance' // Link to attendance page
            });
        }
        localStorage.setItem(storageKey, JSON.stringify(updatedAttendance));
        setAttendanceData(updatedAttendance);
        setRefreshTrigger(p => p + 1); // Trigger re-render of attendance calendar
    } else {
        setPunchMessage({ type: 'error', text: failReason });
    }

    setIsPunching(false);
  };

  const handleDateClickForAdminEdit = (day: DailyAttendance) => {
    if (isAdmin && selectedEmployee) {
        setEditModalData(day);
        setEditEmployeeName(selectedEmployee.name);
        setEditEmployeeId(selectedEmployee.id);
        setIsEditModalOpen(true);
    }
  };

  const handleSaveAdminAttendanceEdit = () => {
    if (!editModalData || !editEmployeeId) return;

    const year = parseInt(editModalData.date.split('-')[0]);
    const month = parseInt(editModalData.date.split('-')[1]) - 1; // Month index
    const storageKey = `attendance_data_${editEmployeeId}_${year}_${month}`;

    const existingAttendance = JSON.parse(localStorage.getItem(storageKey) || '[]').filter((item: any) => item && typeof item === 'object');
    const updatedAttendance = existingAttendance.map((d: DailyAttendance) =>
        d.date === editModalData.date ? { ...d, ...editModalData } : d
    );

    localStorage.setItem(storageKey, JSON.stringify(updatedAttendance));
    setRefreshTrigger(p => p + 1); // Refresh calendar
    setIsEditModalOpen(false);
    setEditModalData(null);
  };

  const currentMonthDay = currentDate.getDate();
  const currentMonthYearLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayOfMonthLabel = currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // UI for Employee Section (non-admin)
  const employeePunchCardUI = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col justify-between items-center text-center max-w-sm mx-auto">
        {punchMessage && (
            <div className={`p-3 rounded-lg text-sm w-full mb-4 flex items-center gap-2 ${punchMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {punchMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{punchMessage.text}</span>
            </div>
        )}
        <div className="mb-6">
            <p className="text-sm text-gray-500 font-medium mb-1">{dayOfMonthLabel}</p>
            <h3 className="text-5xl font-bold text-gray-900 mb-2 font-mono tracking-tight">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</h3>
            <p className="text-sm text-gray-500">
                {isCheckedIn ? 'Currently Checked-in' : 'Ready to Punch In'}
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full mb-6 text-gray-700">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Check-in</span>
                <span className="font-bold text-lg">{checkInTime}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Check-out</span>
                <span className="font-bold text-lg">{checkOutTime}</span>
            </div>
            <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col">
                <span className="text-xs text-gray-500 mb-1">Duration</span>
                <span className="font-bold text-lg">{`${duration.hours.toString().padStart(2, '0')}h ${duration.minutes.toString().padStart(2, '0')}m ${duration.seconds.toString().padStart(2, '0')}s`}</span>
            </div>
        </div>

        {selectedEmployee.branch && (
            <div className={`text-xs p-2 rounded-lg w-full mb-6 flex items-center justify-center gap-2 ${
                locationStatus === 'within_geofence' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                locationStatus === 'outside_geofence' ? 'bg-red-50 text-red-700 border border-red-100' :
                'bg-gray-50 text-gray-500 border border-gray-100'
            }`}>
                {locationStatus === 'within_geofence' && <MapPin className="w-4 h-4 shrink-0" />}
                {locationStatus === 'outside_geofence' && <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>
                    {locationStatus === 'within_geofence' && `Within ${employeeBranch?.radius}m of ${employeeBranch?.name}`}
                    {locationStatus === 'outside_geofence' && `Outside geofence of ${employeeBranch?.name}`}
                    {locationStatus === 'denied' && `Location access denied.`}
                    {locationStatus === 'idle' && `Checking location...`}
                    {locationStatus === 'fetching' && <Loader2 className="w-4 h-4 animate-spin" />}
                </span>
            </div>
        )}

        {selectedEmployee.attendanceConfig?.qrScan && isScanningQr && (
            <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden mb-6 flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover"></video>
                <button onClick={() => setIsScanningQr(false)} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"><X className="w-4 h-4" /></button>
                <div className="absolute inset-0 border-8 border-dashed border-white/50 rounded-lg"></div>
            </div>
        )}

        <button
            onClick={handlePunch}
            disabled={isPunching || (selectedEmployee.attendanceConfig?.qrScan && isScanningQr)}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors shadow-lg ${
                !isCheckedIn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
        >
            {isPunching && <Loader2 className="w-5 h-5 animate-spin" />}
            {isCheckedIn ? 'Punch OUT' : 'Punch IN'}
        </button>

        {selectedEmployee.attendanceConfig?.qrScan && !isScanningQr && !isCheckedIn && (
            <button
                onClick={() => setIsScanningQr(true)}
                className="mt-3 w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
                <ScanLine className="w-5 h-5" /> Scan QR Code
            </button>
        )}
    </div>
  );


  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isAdmin ? 'Staff Attendance Management' : 'My Attendance'}</h2>
          <p className="text-gray-500">
            {isAdmin ? 'View and manage employee attendance records.' : 'Track your daily attendance and work hours.'}
          </p>
        </div>

        {isAdmin && (
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                    onClick={() => setViewMode('Individual')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${viewMode === 'Individual' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <User className="w-4 h-4" /> Individual
                </button>
                <button
                    onClick={() => setViewMode('MusterRoll')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${viewMode === 'MusterRoll' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ListChecks className="w-4 h-4" /> Muster Roll
                </button>
            </div>
        )}
      </div>

      {/* Admin Filters / Employee Profile Header */}
      {isAdmin ? (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {isSuperAdmin && (
                <select
                    value={filterCorporate}
                    onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); setFilterStaffId('All'); setSelectedEmployee(null); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
                >
                    <option value="All">All Corporates</option>
                    <option value="admin">Head Office</option>
                    {corporatesList.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
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
                    const selected = filteredEmployeesForDisplay.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(selected || null);
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
            >
                <option value="All">Select Employee</option>
                {filteredEmployeesForDisplay.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
            </select>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setPeriodType('Daily')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${periodType === 'Daily' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                >
                    Daily
                </button>
                <button
                    onClick={() => setPeriodType('Monthly')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${periodType === 'Monthly' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
                >
                    Monthly
                </button>
            </div>

            {periodType === 'Daily' ? (
                <input
                    type="date"
                    value={currentDate.toISOString().split('T')[0]}
                    onChange={(e) => setCurrentDate(new Date(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                />
            ) : (
                <input
                    type="month"
                    value={currentDate.toISOString().slice(0, 7)}
                    onChange={(e) => setCurrentDate(new Date(e.target.value + '-01'))}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white"
                />
            )}
            <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="p-1.5 text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-lg hover:bg-emerald-50 transition-colors"
                title="Force Refresh"
            >
                <RefreshCcw className="w-4 h-4" />
            </button>
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Employee Punch Card or Admin Calendar Navigation) */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
            {isAdmin ? (
                // Admin Calendar Navigation & Summary
                <>
                {selectedEmployee ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={handlePrev} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="font-bold text-gray-800 text-lg">{currentMonthYearLabel}</h3>
                            <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        {periodType === 'Daily' && (
                            <div className="text-center mb-6">
                                <p className="text-lg font-bold text-gray-800">{currentDate.toLocaleDateString('en-US', {day:'numeric', weekday:'short'})}</p>
                                <p className="text-sm text-gray-500">{currentDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</p>
                            </div>
                        )}

                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-xl">
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Present</p>
                                    <span className="text-xl font-bold text-gray-800">{stats.present}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Absent</p>
                                    <span className="text-xl font-bold text-gray-800">{stats.absent}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 rounded-xl">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Late Entries</p>
                                    <span className="text-xl font-bold text-gray-800">{stats.late}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Timer className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Hours</p>
                                    <span className="text-xl font-bold text-gray-800">{formattedTotalMonthlyDuration}</span>
                                </div>
                            </div>
                        </div>

                        {periodType === 'Monthly' && (
                            <div className="mt-6 border-t border-gray-100 pt-4 flex gap-3">
                                <button
                                    onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                                    className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100"
                                >
                                    Mark All Present
                                </button>
                                <button
                                    onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                                    className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-100"
                                >
                                    Mark All Absent
                                </button>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500 flex-1 flex flex-col items-center justify-center">
                        <Users className="w-16 h-16 opacity-30 mb-4" />
                        <p>Select an employee from the dropdown above to view their attendance.</p>
                    </div>
                )}
                </>
            ) : (
                // Employee's own Punch Card
                selectedEmployee ? employeePunchCardUI : (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center text-gray-500 flex-1 flex flex-col items-center justify-center">
                        <User className="w-16 h-16 opacity-30 mb-4" />
                        <p>Loading your profile...</p>
                    </div>
                )
            )}
        </div>

        {/* Right Column (Calendar Display or Muster Roll) */}
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
                                    {[...Array(currentDate.getDate())].map((_, i) => (
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
                                    const dailyRecords = empAttendance.filter(d => parseInt(d.date.split('-')[2]) <= currentDate.getDate());

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
                                            {dailyRecords.map((rec, idx) => (
                                                <td key={idx} className="px-2 py-3 text-center">
                                                    <span className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' :
                                                        rec.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                                                        rec.status === AttendanceStatus.HALF_DAY ? 'bg-amber-100 text-amber-700' :
                                                        rec.status === AttendanceStatus.PAID_LEAVE ? 'bg-blue-100 text-blue-700' :
                                                        rec.status === AttendanceStatus.WEEK_OFF ? 'bg-slate-100 text-slate-500' :
                                                        'bg-gray-100 text-gray-400'
                                                    }`}>
                                                        {rec.status === AttendanceStatus.PRESENT ? (rec.isLate ? 'L' : 'P') :
                                                         rec.status === AttendanceStatus.ABSENT ? 'A' :
                                                         rec.status === AttendanceStatus.HALF_DAY ? 'H' :
                                                         rec.status === AttendanceStatus.PAID_LEAVE ? 'V' :
                                                         rec.status === AttendanceStatus.WEEK_OFF ? 'W' :
                                                         '-'}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center font-bold text-emerald-600">{summary.P}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600">{summary.A}</td>
                                            <td className="px-4 py-3 text-center font-bold text-orange-600">{summary.L}</td>
                                        </tr>
                                    );
                                })}
                                {filteredEmployeesForDisplay.length === 0 && (
                                    <tr><td colSpan={currentDate.getDate() + 4} className="py-8 text-center text-gray-500">No employees selected or found.</td></tr>
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

      {/* Admin Attendance Edit Modal */}
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
                                <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {editModalData.status === AttendanceStatus.PRESENT || editModalData.status === AttendanceStatus.HALF_DAY ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                                <input
                                    type="time"
                                    value={editModalData.checkIn ? new Date(`2000-01-01 ${editModalData.checkIn}`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                    onChange={(e) => setEditModalData(prev => prev ? { ...prev, checkIn: new Date(`2000-01-01 ${e.target.value}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) } : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                                <input
                                    type="time"
                                    value={editModalData.checkOut ? new Date(`2000-01-01 ${editModalData.checkOut}`).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
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
                    ) : null}

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