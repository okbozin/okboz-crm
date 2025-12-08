
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
import { useNotification } from '../../context/NotificationContext'; // Import useNotification
import { sendSystemNotification } from '../../services/cloudService'; // Import sendSystemNotification
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
// Add missing imports for CorporateAccount, Branch, and Employee
import { DailyAttendance, AttendanceStatus, CorporateAccount, Branch, Employee, UserRole } from '../../types';

interface UserAttendanceProps {
  isAdmin?: boolean;
}

// Haversine formula to calculate distance between two lat/lng points in meters
function haversineDistance(coords1: { lat: number; lng: number; }, coords2: { lat: number; lng: number; }): number {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371e3; // metres

    const dLat = toRad(coords2.lat - coords1.lat);
    // Fix: Changed 'lon' to 'lng' as per type definition
    const dLon = toRad(coords2.lng - coords1.lng); 

    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat); // Changed to coords2.lat
    
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
  if (totalMinutes < 0) totalMinutes = 0; // Should not happen with careful calculation
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60); // Round minutes for better display
  return `${hours}h ${minutes}m`;
};

// Helper to find employee by ID across all storage locations
const findEmployeeById = (id: string): Employee | undefined => {
    try {
      const adminStaff = JSON.parse(localStorage.getItem('staff_data') || '[]');
      let found = adminStaff.find((e: any) => e.id === id);
      if (found) return { ...found, corporateId: 'admin' };
    } catch(e) {}

    try {
      const corporates = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
      for (const corp of corporates) {
          const cStaff = JSON.parse(localStorage.getItem(`staff_data_${corp.email}`) || '[]');
          const found = cStaff.find((e: any) => e.id === id);
          if (found) return { ...found, corporateId: corp.email };
      }
    } catch(e) {}

    return MOCK_EMPLOYEES.find(e => e.id === id);
};

const UserAttendance: React.FC<UserAttendanceProps> = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const { companyName } = useBranding();
  const { playAlarmSound } = useNotification(); // Use notification context

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
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporatesList(corps);
      } catch (e) { console.error("Failed to load corporate accounts", e); }

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


  // Load employees list
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
      } else {
          const key = `staff_data_${currentSessionId}`;
          const saved = localStorage.getItem(key);
          return saved ? JSON.parse(saved).map((e: any) => ({...e, corporateId: currentSessionId, corporateName: 'My Branch'})) : [];
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
  const [isScanningQr, setIsScanningQr] = useState(false); // Not implemented in this iteration
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        
        // Update employee's onlineHistory in local storage
        let staffDataKey = 'staff_data';
        if (selectedEmployee.corporateId && selectedEmployee.corporateId !== 'admin') {
            staffDataKey = `staff_data_${selectedEmployee.corporateId}`;
        }
        const allStaff = JSON.parse(localStorage.getItem(staffDataKey) || '[]');
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
        
        // Send system notification
        await sendSystemNotification({
          type: 'online_status',
          title: `Employee ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          targetRoles: [UserRole.ADMIN, UserRole.CORPORATE],
          corporateId: selectedEmployee.corporateId === 'admin' ? null : selectedEmployee.corporateId || null,
          employeeId: selectedEmployee.id,
          link: '/admin/tracking' // Link to live tracking page
        });
      };

      sendOnlineStatus('online'); // On mount

      return () => {
        sendOnlineStatus('offline'); // On unmount/cleanup
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
        let parsedData = JSON.parse(savedData);
        // If loaded data is from a past month, ensure future days are NOT_MARKED
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
    // If Individual View: Stats for SELECTED EMPLOYEE
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
    // If Muster Roll: Stats for ALL EMPLOYEES in filtered list
    else {
        // Mock aggregate for now as it's complex to fetch all
        // In real app, backend provides this
        return { 
            present: Math.floor(filteredEmployeesForDisplay.length * 0.8),
            absent: Math.floor(filteredEmployeesForDisplay.length * 0.1),
            halfDay: 0,
            paidLeave: 0, // Simplified for MusterRoll
            weekOff: 0, // Simplified
            late: Math.floor(filteredEmployeesForDisplay.length * 0.05)
        };
    }
  }, [attendanceData, viewMode, filteredEmployeesForDisplay, selectedEmployee]);

  // Total Monthly Duration Calculation for Employee View
  const totalMonthlyDurationMinutes = useMemo(() => {
    let totalMinutes = 0;
    if (selectedEmployee) {
      attendanceData.forEach(day => {
        if ((day.status === AttendanceStatus.PRESENT || day.status === AttendanceStatus.HALF_DAY) && day.checkIn && day.checkOut) {
          const startMinutes = parseTimeToMinutes(day.checkIn);
          const endMinutes = parseTimeToMinutes(day.checkOut);
          if (startMinutes !== null && endMinutes !== null) {
            let diff = endMinutes - startMinutes;
            if (diff < 0) diff += 24 * 60; // Handle overnight shifts
            totalMinutes += diff;
          }
        }
      });
    }
    return totalMinutes;
  }, [attendanceData, selectedEmployee]);

  const formattedTotalMonthlyDuration = useMemo(() => formatDuration(totalMonthlyDurationMinutes), [totalMonthlyDurationMinutes]);


  // Chart Data
  const pieData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: stats.paidLeave, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Month Label
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Bulk Actions
  const handleMarkAll = (status: AttendanceStatus) => {
    if (!selectedEmployee) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const storageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;
    
    // Create full month data if missing
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
        // Only mark past/today, skip future
        if (dDate <= today && d.status === AttendanceStatus.NOT_MARKED) {
             return { ...d, status, checkIn: status === AttendanceStatus.PRESENT ? '09:30 AM' : undefined, checkOut: status === AttendanceStatus.PRESENT ? '06:30 PM' : undefined };
        }
        return d;
    });

    setAttendanceData(updatedData);
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    setRefreshTrigger(p => p + 1);
  };

  // --- EMPLOYEE PUNCH CARD LOGIC ---

  const getLocation = () => {
    if (navigator.geolocation) {
      setLocationStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLocation = { lat: latitude, lng: longitude, accuracy };
          setCurrentLocation(newLocation);

          if (employeeBranch && employeeBranch.lat && employeeBranch.lng && employeeBranch.radius) {
            const distance = haversineDistance(
              { lat: newLocation.lat, lng: newLocation.lng },
              { lat: employeeBranch.lat, lng: employeeBranch.lng }
            );

            if (distance <= employeeBranch.radius) {
              setLocationStatus('within_geofence');
            } else {
              setLocationStatus('outside_geofence');
              playAlarmSound();
            }
          } else {
            setLocationStatus('granted');
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
            playAlarmSound();
          } else {
            setLocationStatus('idle'); // Or 'error'
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationStatus('denied');
      playAlarmSound();
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream; // Store stream to stop it later
      setCameraStatus('granted');
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately if not actually using for capture
    } catch (error) {
      console.error("Camera permission error:", error);
      setCameraStatus('denied');
      playAlarmSound();
    }
  };

  const handlePunch = async () => {
    if (!selectedEmployee) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayStr = now.toISOString().split('T')[0];
    const year = now.getFullYear();
    const month = now.getMonth();
    const storageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    // Get latest attendance data
    let currentAttendance = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let todayRecordIndex = currentAttendance.findIndex((d: DailyAttendance) => d.date === todayStr);

    if (todayRecordIndex === -1) {
      // If no record for today, create a new one (e.g., first punch of the month or new day)
      currentAttendance.push({
        date: todayStr,
        status: AttendanceStatus.NOT_MARKED, // Will be updated below
        checkIn: undefined,
        checkOut: undefined,
        isLate: false,
      });
      todayRecordIndex = currentAttendance.length - 1;
    }

    let updatedRecord = { ...currentAttendance[todayRecordIndex] };

    // --- Permissions Check ---
    const config = selectedEmployee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true };
    let canPunch = true;
    let punchMessage = '';
    // Fix: Explicitly cast type for notification
    let notificationType: 'punch_in' | 'punch_out';
    let notificationTitle: string;
    let notificationMessage: string;

    if (!isCheckedIn) { // Punch In
      notificationType = 'punch_in';
      notificationTitle = 'Employee Punched In';

      if (config.gpsGeofencing) {
        await getLocation();
        if (locationStatus === 'denied') {
          punchMessage = "Cannot Punch In: Geolocation permission denied.";
          canPunch = false;
        } else if (locationStatus === 'outside_geofence') {
          punchMessage = `Cannot Punch In: You are outside the geofenced area for ${employeeBranch?.name || 'your branch'}.`;
          canPunch = false;
        }
      }
      if (canPunch && config.qrScan) { // This is a placeholder as QR scan logic isn't fully implemented in this UI
        await requestCameraPermission();
        if (cameraStatus === 'denied') {
          punchMessage = "Cannot Punch In: Camera permission denied.";
          canPunch = false;
        }
        // In a real app, QR scan would happen here and validate
      }

      if (canPunch) {
        updatedRecord.checkIn = timeString;
        updatedRecord.status = AttendanceStatus.PRESENT;
        // Logic to determine if late (e.g., checkInTime > '09:30 AM')
        updatedRecord.isLate = (parseTimeToMinutes(timeString) || 0) > (parseTimeToMinutes('09:30 AM') || 0); // Check against 9:30 AM
        setCheckInTime(timeString);
        setIsCheckedIn(true);
        notificationMessage = `${selectedEmployee.name} (${selectedEmployee.id}) has punched in at ${timeString}.`;
      } else {
        // Display error message to user
        alert(punchMessage);
        return;
      }
    } else { // Punch Out
      notificationType = 'punch_out';
      notificationTitle = 'Employee Punched Out';

      updatedRecord.checkOut = timeString;
      setCheckOutTime(timeString);
      setIsCheckedIn(false); // Reset for next day
      notificationMessage = `${selectedEmployee.name} (${selectedEmployee.id}) has punched out at ${timeString}.`;
    }

    currentAttendance[todayRecordIndex] = updatedRecord;
    localStorage.setItem(storageKey, JSON.stringify(currentAttendance));
    setAttendanceData(currentAttendance); // Update local state
    setRefreshTrigger(prev => prev + 1); // Trigger refresh for calendar/stats

    // Send Notification
    await sendSystemNotification({
        type: notificationType, 
        title: notificationTitle,
        message: notificationMessage,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE], // Send to relevant roles
        corporateId: selectedEmployee.corporateId === 'admin' ? null : selectedEmployee.corporateId || null,
        employeeId: selectedEmployee.id,
        link: '/admin/attendance' // Link to admin attendance page
    });
  };

  // --- UI Location/Camera Status Display ---
    let locationDisplay = "Location Unavailable";
    let locationColor = "text-gray-500";
    let locationIcon = <MapPin className="w-3 h-3" />;

    switch (locationStatus) {
        case 'idle':
        case 'fetching':
            locationDisplay = "Fetching Location...";
            locationColor = "text-blue-500";
            locationIcon = <Loader2 className="w-3 h-3 animate-spin" />;
            break;
        case 'granted':
            locationDisplay = "Location Granted";
            locationColor = "text-emerald-500";
            locationIcon = <CheckCircle className="w-3 h-3" />;
            break;
        case 'within_geofence':
            locationDisplay = "Within Geofence";
            locationColor = "text-emerald-500";
            locationIcon = <CheckCircle className="w-3 h-3" />;
            break;
        case 'outside_geofence':
            locationDisplay = `Outside Geofence (${employeeBranch?.name})`;
            locationColor = "text-red-500";
            locationIcon = <AlertCircle className="w-3 h-3" />;
            break;
        case 'denied':
            locationDisplay = "Location Denied";
            locationColor = "text-red-500";
            locationIcon = <XCircle className="w-3 h-3" />;
            break;
    }

    let cameraDisplay = "Camera Unavailable";
    let cameraColor = "text-gray-500";
    let cameraIcon = <Camera className="w-3 h-3" />;

    switch (cameraStatus) {
        case 'idle':
            cameraDisplay = "Camera Status Idle";
            break;
        case 'granted':
            cameraDisplay = "Camera Granted";
            cameraColor = "text-emerald-500";
            cameraIcon = <CheckCircle className="w-3 h-3" />;
            break;
        case 'denied':
            cameraDisplay = "Camera Denied";
            cameraColor = "text-red-500";
            cameraIcon = <XCircle className="w-3 h-3" />;
            break;
    }

  // --- ADMIN ATTENDANCE EDIT MODAL LOGIC ---
  const handleDateClickForAdmin = (day: DailyAttendance) => {
    if (!selectedEmployee) return;
    setEditModalData(day);
    setEditEmployeeName(selectedEmployee.name);
    setEditEmployeeId(selectedEmployee.id);
    setIsEditModalOpen(true);
  };

  const handleEditModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editModalData) return;
    const { name, value, type, checked } = e.target as HTMLInputElement;

    if (name === 'isLate') {
        setEditModalData(prev => prev ? { ...prev, isLate: checked } : null);
    } else {
        setEditModalData(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const saveEditedAttendance = async () => {
    if (!editModalData || !selectedEmployee) return;

    const year = new Date(editModalData.date).getFullYear();
    const month = new Date(editModalData.date).getMonth();
    const storageKey = `attendance_data_${selectedEmployee.id}_${year}_${month}`;

    const currentAttendance: DailyAttendance[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const recordIndex = currentAttendance.findIndex(d => d.date === editModalData.date);

    if (recordIndex !== -1) {
        currentAttendance[recordIndex] = editModalData;
    } else {
        currentAttendance.push(editModalData);
    }

    localStorage.setItem(storageKey, JSON.stringify(currentAttendance));
    setAttendanceData(currentAttendance);
    setRefreshTrigger(prev => prev + 1); // Force calendar refresh
    setIsEditModalOpen(false);

    // Send Notification for manual edit
    const message = `Attendance for ${selectedEmployee.name} (${selectedEmployee.id}) on ${editModalData.date} manually adjusted. New status: ${editModalData.status}, In: ${editModalData.checkIn || '-'}, Out: ${editModalData.checkOut || '-'}.`;
    await sendSystemNotification({
        type: 'system', // or 'attendance_edit' if a new type is added
        title: 'Attendance Manually Edited',
        message: message,
        targetRoles: [UserRole.ADMIN, UserRole.CORPORATE], // Notify admins and corporate owners
        corporateId: selectedEmployee.corporateId === 'admin' ? null : selectedEmployee.corporateId || null,
        employeeId: selectedEmployee.id,
        link: '/admin/attendance' // Link to admin attendance page
    });
  };

  const getDurationString = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    try {
        const startMinutes = parseTimeToMinutes(checkIn);
        const endMinutes = parseTimeToMinutes(checkOut);
        if (startMinutes === null || endMinutes === null) return null;

        let diff = endMinutes - startMinutes;
        if (diff < 0) diff += 24 * 60; // Handle overnight
        if (diff <= 0) return null;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h}h ${m}m`;
    } catch (e) { return null; }
  };


  // --- ADMIN RENDER ---
  if (isAdmin) {
      return (
          <div className="space-y-6 max-w-[1600px] mx-auto">
             {/* Header Section */}
             <div>
                <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
                <p className="text-gray-500">Monitor and manage staff attendance</p>
             </div>

             {/* Main Toolbar */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                 {/* Left Filters */}
                 <div className="flex flex-wrap gap-3 items-center flex-1">
                    {/* Corporate Filter (Super Admin Only) */}
                    {isSuperAdmin && (
                        <select 
                            value={filterCorporate}
                            onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); }}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
                        >
                            <option value="All">All Corporates</option>
                            <option value="admin">Head Office</option>
                            {corporatesList.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                        </select>
                    )}

                    {/* Branch Filter */}
                    <select 
                        value={filterBranch}
                        onChange={(e) => { setFilterBranch(e.target.value); setFilterStaffId('All'); }}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
                    >
                        <option value="All">All Branches</option>
                        {allBranchesList
                            .filter(b => isSuperAdmin ? (filterCorporate === 'All' || b.owner === filterCorporate) : b.owner === currentSessionId)
                            .map((b, i) => <option key={i} value={b.name}>{b.name}</option>)
                        }
                    </select>
                    
                    {/* Employee Filter (Only in Individual View) */}
                    {viewMode === 'Individual' && (
                        <select 
                            value={filterStaffId}
                            onChange={(e) => { 
                                setFilterStaffId(e.target.value); 
                                const emp = employees.find(ep => ep.id === e.target.value);
                                if (emp) setSelectedEmployee(emp);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[250px]"
                        >
                            <option value="All">Select Employee</option>
                            {filteredEmployeesForDisplay.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                        </select>
                    )}
                 </div>

                 {/* Right Controls */}
                 <div className="flex gap-3 items-center">
                     {/* Period Toggle */}
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setPeriodType('Daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodType === 'Daily' ? 'bg-white dark:bg-gray-600 shadow text-gray-800' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Daily
                        </button>
                        <button 
                            onClick={() => setPeriodType('Monthly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${periodType === 'Monthly' ? 'bg-white dark:bg-gray-600 shadow text-gray-800' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Monthly
                        </button>
                     </div>

                     {/* Date Picker */}
                     <div className="relative">
                        <input 
                            type={periodType === 'Daily' ? 'date' : 'month'}
                            value={periodType === 'Daily' ? currentDate.toISOString().split('T')[0] : currentDate.toISOString().slice(0, 7)}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (periodType === 'Daily') setCurrentDate(new Date(val));
                                else {
                                    const [y, m] = val.split('-').map(Number);
                                    setCurrentDate(new Date(y, m - 1, 1));
                                }
                            }}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white min-w-[160px]"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                     </div>
                 </div>
             </div>

             {/* View Switcher (Tabs) */}
             <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                 <button 
                    onClick={() => setViewMode('Individual')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'Individual' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <User className="w-4 h-4" /> Individual
                 </button>
                 <button 
                    onClick={() => setViewMode('MusterRoll')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'MusterRoll' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    <ListChecks className="w-4 h-4" /> Muster Roll
                 </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards Grid */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Staff</p>
                            <h3 className="text-2xl font-bold text-gray-800">{filteredEmployeesForDisplay.length}</h3>
                            <p className="text-[10px] text-gray-400 mt-1">Active Employees</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-emerald-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Present</p>
                                    <h3 className="text-2xl font-bold text-emerald-600">{stats.present}</h3>
                                </div>
                                <CheckCircle className="w-5 h-5 text-emerald-500 opacity-20" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Man-days</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Absent</p>
                                    <h3 className="text-2xl font-bold text-red-600">{stats.absent}</h3>
                                </div>
                                <XCircle className="w-5 h-5 text-red-500 opacity-20" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Man-days</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Late</p>
                                    <h3 className="text-2xl font-bold text-orange-600">{stats.late}</h3>
                                </div>
                                <Clock className="w-5 h-5 text-orange-500 opacity-20" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Arrivals</p>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Half Day</p>
                                    <h3 className="text-2xl font-bold text-amber-600">{stats.halfDay}</h3>
                                </div>
                                <Activity className="w-5 h-5 text-amber-500 opacity-20" />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Week Off</p>
                                    <h3 className="text-2xl font-bold text-slate-600">{stats.weekOff}</h3>
                                </div>
                                <Coffee className="w-5 h-5 text-slate-500 opacity-20" />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">On Leave</p>
                                    <h3 className="2xl font-bold text-blue-600">{stats.paidLeave}</h3>
                                </div>
                                <Plane className="w-5 h-5 text-blue-500 opacity-20" />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Approved</p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-500" /> Monthly Distribution
                    </h4>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <ReTooltip />
                                <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{fontSize: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
             </div>

             {/* Content View */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 
                 {/* View Controls */}
                 <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50">
                     <div className="flex items-center gap-3">
                         {selectedEmployee && (
                             <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                                 <User className="w-4 h-4 text-gray-400" />
                                 <span className="text-sm font-bold text-gray-700">{selectedEmployee.name}</span>
                                 <span className="text-xs text-gray-400">({selectedEmployee.role})</span>
                             </div>
                         )}
                         <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                             <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
                             <span className="text-sm font-mono font-bold text-gray-700 px-2 min-w-[100px] text-center">
                                 {periodType === 'Daily' ? currentDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : monthLabel}
                             </span>
                             <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight className="w-4 h-4" /></button>
                         </div>
                     </div>

                     {viewMode === 'Individual' && (
                         <div className="flex gap-3">
                             <button 
                                onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                                className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                             >
                                Mark All Present
                             </button>
                             <button 
                                onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                                className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                             >
                                Mark All Absent
                             </button>
                             <div className="flex border border-gray-200 rounded-lg bg-white p-0.5">
                                 <button className="p-1.5 bg-gray-100 rounded text-gray-700"><Calendar className="w-4 h-4" /></button>
                                 <button className="p-1.5 hover:bg-gray-50 rounded text-gray-400"><List className="w-4 h-4" /></button>
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Content Body */}
                 <div className="p-6">
                     {viewMode === 'Individual' ? (
                         selectedEmployee ? (
                             <AttendanceCalendar 
                                 data={attendanceData} 
                                 stats={stats} 
                                 showStats={false} // Stats already shown in top dashboard
                                 onDateClick={handleDateClickForAdmin} // Add click handler for admin
                             />
                         ) : (
                             <div className="text-center py-10 text-gray-400">Select an employee to view calendar</div>
                         )
                     ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">In Time</th>
                                        <th className="px-6 py-4 text-center">Out Time</th>
                                        <th className="px-6 py-4 text-center">Hours</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEmployeesForDisplay.map(emp => (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-3">
                                                <img src={emp.avatar} className="w-8 h-8 rounded-full border border-gray-100" alt="" />
                                                {emp.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{emp.role}</td>
                                            <td className="px-6 py-4 text-center">
                                                {/* Mock Status for Muster Roll List - In real app, fetch status for currentDate */}
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold border border-emerald-200">
                                                    PRESENT
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-gray-600">09:30 AM</td>
                                            <td className="px-6 py-4 text-center font-mono text-gray-600">06:30 PM</td>
                                            <td className="px-6 py-4 text-center text-gray-500">9h 0m</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-blue-600 hover:underline text-xs font-medium">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     )}
                 </div>
             </div>

            {/* Admin Attendance Edit Modal */}
            {isEditModalOpen && editModalData && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-xl">Edit Attendance</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <User className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-bold text-blue-800">{editEmployeeName}</p>
                                    <p className="text-xs text-blue-600">on {new Date(editModalData.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={editModalData.status}
                                    onChange={handleEditModalChange}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                >
                                    {Object.values(AttendanceStatus).map(statusOption => (
                                        <option key={statusOption} value={statusOption}>{statusOption}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                                    <input
                                        type="time"
                                        id="checkIn"
                                        name="checkIn"
                                        value={editModalData.checkIn ? new Date(`2000-01-01 ${editModalData.checkIn}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                        onChange={(e) => {
                                            const newTime = e.target.value;
                                            setEditModalData(prev => prev ? { ...prev, checkIn: newTime ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined } : null);
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                                    <input
                                        type="time"
                                        id="checkOut"
                                        name="checkOut"
                                        value={editModalData.checkOut ? new Date(`2000-01-01 ${editModalData.checkOut}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                                        onChange={(e) => {
                                            const newTime = e.target.value;
                                            setEditModalData(prev => prev ? { ...prev, checkOut: newTime ? new Date(`2000-01-01T${newTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined } : null);
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border border-gray-200">
                                <label htmlFor="isLate" className="text-sm font-medium text-gray-700">Mark as Late</label>
                                <input
                                    type="checkbox"
                                    id="isLate"
                                    name="isLate"
                                    checked={editModalData.isLate || false}
                                    onChange={handleEditModalChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                            </div>

                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex justify-between items-center">
                                <span className="font-bold text-emerald-800 text-sm">Working Duration:</span>
                                <span className="font-bold text-emerald-600 text-lg">{getDurationString(editModalData.checkIn, editModalData.checkOut) || '--:--'}</span>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors">Cancel</button>
                            <button onClick={saveEditedAttendance} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
      );
  }

  // --- EMPLOYEE VIEW RENDER (Preserved) ---
  if (selectedEmployee) {
    const config = selectedEmployee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true };
    
    // Duration display
    const formattedDuration = duration.hours > 0 || duration.minutes > 0 
        ? `${duration.hours}h ${duration.minutes}m` 
        : '';
    
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-3"> {/* Added gap for refresh button */}
            <h2 className="text-2xl font-bold text-gray-800">My Attendance</h2>
            <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                title="Refresh Attendance"
            >
                <RefreshCcw className="w-5 h-5" />
            </button>
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
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 mt-2">
                    <p className={`text-xs uppercase tracking-widest flex items-center gap-1 ${locationColor}`}>
                      {locationIcon} {locationDisplay}
                    </p>
                    {config.qrScan && ( // Only show camera status if QR scan is enabled
                        <p className={`text-xs uppercase tracking-widest flex items-center gap-1 ${cameraColor}`}>
                            {cameraIcon} {cameraDisplay}
                        </p>
                    )}
                  </div>
               </div>
               
               {/* PUNCH BUTTONS */}
               {/* Replaced PUNCH CARD UI with a Fingerprint Scanner UI */}
               <div className="w-full flex flex-col items-center justify-center space-y-4">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                   <div 
                     className={`absolute inset-0 rounded-full flex items-center justify-center animate-pulse-slow opacity-60 ${isCheckedIn ? 'bg-red-100' : 'bg-emerald-100'}`}
                     aria-hidden="true"
                   ></div>
                   <div 
                     onClick={handlePunch} // Attach handler here
                     className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105
                     ${isCheckedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                     role="button"
                     tabIndex={0}
                     aria-label={isCheckedIn ? "Punch Out" : "Punch In"}
                   >
                     <Fingerprint className="w-16 h-16" />
                   </div>
                 </div>
                 <p className="text-sm font-semibold text-gray-700">
                   {isCheckedIn ? 'Tap to Punch Out' : 'Tap to Punch In'}
                 </p>
                 <div className="text-xs text-gray-500">
                   {checkInTime !== '--:--' && <p>Check-in: {checkInTime}</p>}
                   {checkOutTime !== '--:--' && <p>Check-out: {checkOutTime}</p>}
                   {formattedDuration && <p>Duration: {formattedDuration}</p>}
                 </div>
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
                   <p className="text-xs text-gray-500 font-bold uppercase">Half Day</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.halfDay}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                   <p className="text-xs text-gray-500 font-bold uppercase">On Leave</p>
                   <p className="text-2xl font-bold text-gray-800 mt-2">{stats.paidLeave}</p>
                </div>
                {/* NEW: Total Monthly Hours Card */}
                <div className="col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl shadow-sm text-white flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-indigo-100">Total Monthly Hours</p>
                        <p className="text-2xl font-bold mt-1">{formattedTotalMonthlyDuration}</p>
                    </div>
                    <Timer className="w-8 h-8 text-indigo-200 opacity-70" />
                </div>
             </div>

             {/* Analysis Chart */}
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
             <AttendanceCalendar 
                                 data={attendanceData} 
                                 stats={stats} 
                             />
        </div>
      </div>
    );
  }

  return <div className="text-center p-8 text-gray-500">Loading...</div>;
};

export default UserAttendance;
