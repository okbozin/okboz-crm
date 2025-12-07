
import React, { useState, useMemo, useEffect, useRef } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { MOCK_EMPLOYEES, getEmployeeAttendance, COLORS } from '../../constants';
import { AttendanceStatus, DailyAttendance, Employee, Branch, CorporateAccount } from '../../types';
import { 
  ChevronLeft, ChevronRight, Calendar, List, CheckCircle, XCircle, 
  User, MapPin, Clock, Fingerprint, Download, X, 
  PieChart as PieChartIcon, Activity, ScanLine, Loader2, Navigation,
  Phone, DollarSign, Plane, Briefcase, Camera, AlertCircle, Building2, RefreshCcw, Users, Coffee,
  Search, Filter
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
    // Filter by search/ID if needed, though usually handled by dropdown
    return list;
  }, [employees, filterCorporate, filterBranch, isSuperAdmin]);


  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null); 
  const [employeeBranch, setEmployeeBranch] = useState<Branch | null>(null); 
  
  useEffect(() => {
    if (isAdmin) {
      // For admin view, select the first employee from filtered list if none selected
      if (filteredEmployeesForDisplay.length > 0) {
        if (!selectedEmployee || !filteredEmployeesForDisplay.some(e => e.id === selectedEmployee.id)) {
            setSelectedEmployee(filteredEmployeesForDisplay[0]);
            setFilterStaffId(filteredEmployeesForDisplay[0].id); // Sync filter
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
  }, [isAdmin, filteredEmployeesForDisplay, loggedInUser]); // Removed selectedEmployee from dependency to prevent loop


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

  useEffect(() => {
    if (isAdmin) {
        if (filterPeriodType === 'Monthly' && filterMonth) {
            const [y, m] = filterMonth.split('-').map(Number);
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
  
  // QR Scan UI States
  const [isScanningQr, setIsScanningQr] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer);
  }, []);

  // --- Permission & Geolocation logic (Only for Employee) ---
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

        // Pre-check camera permissions if enabled
        if (selectedEmployee.attendanceConfig?.qrScan) {
          try {
            // Check if permission is already granted
            const status = await navigator.permissions.query({ name: 'camera' as any });
            if (status.state === 'granted') {
                setCameraStatus('granted');
            } else if (status.state === 'denied') {
                setCameraStatus('denied');
            } else {
                setCameraStatus('idle'); // Will prompt on click
            }
          } catch (e) {
            setCameraStatus('idle');
          }
        } else {
          setCameraStatus('idle');
        }
      };

      requestPermissions();
    }
  }, [isAdmin, selectedEmployee, employeeBranch, currentSessionId]);

  // --- QR Camera Handling ---
  useEffect(() => {
    const startCamera = async () => {
        if (isScanningQr && videoRef.current) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setCameraStatus('granted');
            } catch (err) {
                console.error("Camera error:", err);
                setCameraStatus('denied');
                alert("Could not access camera. Please allow camera permissions.");
                setIsScanningQr(false);
            }
        }
    };

    if (isScanningQr) {
        startCamera();
    } else {
        // Cleanup function to stop stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }

    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, [isScanningQr]);

  // --- Simulate QR Success ---
  useEffect(() => {
      let scanTimer: any;
      if (isScanningQr && cameraStatus === 'granted') {
          // Simulate scanning delay
          scanTimer = setTimeout(() => {
              setIsScanningQr(false);
              // Stop stream
              if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
              }
              performPunch();
              alert("QR Code Detected! Attendance Marked.");
          }, 2500);
      }
      return () => clearTimeout(scanTimer);
  }, [isScanningQr, cameraStatus]);


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
  
  const initiateQrScan = () => {
      setIsScanningQr(true);
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

  // Chart Data for Employee View
  const pieData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
    { name: 'Half Day', value: stats.halfDay, color: '#f59e0b' },
    { name: 'Leave', value: stats.paidLeave, color: '#3b82f6' },
    { name: 'Week Off', value: stats.weekOff, color: '#64748b' },
  ].filter(d => d.value > 0);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const fullMonthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ----------------------------------------------------------
  // ADMIN VIEW RENDER
  // ----------------------------------------------------------
  if (isAdmin) {
      return (
          <div className="space-y-6 max-w-7xl mx-auto">
             {/* Admin Filters */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mr-2">
                    <Filter className="w-4 h-4" /> Filters
                </h3>
                
                {isSuperAdmin && (
                    <select 
                        value={filterCorporate}
                        onChange={(e) => { setFilterCorporate(e.target.value); setFilterBranch('All'); setFilterStaffId('All'); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
                    >
                        <option value="All">All Corporates</option>
                        <option value="admin">Head Office</option>
                        {corporatesList.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
                    </select>
                )}

                <select 
                    value={filterBranch}
                    onChange={(e) => { setFilterBranch(e.target.value); setFilterStaffId('All'); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[150px]"
                >
                    <option value="All">All Branches</option>
                    {allBranchesList
                        .filter(b => isSuperAdmin ? (filterCorporate === 'All' || b.owner === filterCorporate) : true)
                        .map((b, i) => <option key={i} value={b.name}>{b.name}</option>)
                    }
                </select>

                <select 
                    value={filterStaffId}
                    onChange={(e) => { 
                        setFilterStaffId(e.target.value); 
                        const emp = employees.find(ep => ep.id === e.target.value);
                        if (emp) setSelectedEmployee(emp);
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
                >
                    <option value="All">Select Employee</option>
                    {filteredEmployeesForDisplay.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
             </div>

             {!selectedEmployee ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                      <Users className="w-12 h-12 mb-3 opacity-20" />
                      <p>Select an employee using the filters above to view their attendance.</p>
                  </div>
             ) : (
                 <>
                     {/* Header with Name */}
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                         <div className="flex items-center gap-4">
                             <img src={selectedEmployee.avatar} alt={selectedEmployee.name} className="w-12 h-12 rounded-full border border-gray-100" />
                             <div>
                                 <h3 className="font-bold text-gray-800 text-lg">{selectedEmployee.name}</h3>
                                 <p className="text-xs text-gray-500">{selectedEmployee.role} • {selectedEmployee.branch}</p>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                             <span className="font-bold text-gray-700 min-w-[120px] text-center">{fullMonthLabel}</span>
                             <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5"/></button>
                         </div>
                     </div>

                     {/* Stats & Calendar */}
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                         <AttendanceCalendar data={attendanceData} stats={stats} />
                     </div>
                 </>
             )}
          </div>
      );
  }

  // ----------------------------------------------------------
  // EMPLOYEE VIEW RENDER
  // ----------------------------------------------------------
  if (selectedEmployee) {
    const config = selectedEmployee.attendanceConfig || { gpsGeofencing: false, qrScan: false, manualPunch: true };
    
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
        (config.gpsGeofencing && (locationStatus === 'denied' || locationStatus === 'fetching' || locationStatus === 'outside_geofence'));

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
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
                  <p className={`text-xs uppercase tracking-widest flex items-center justify-center gap-1 ${locationColor}`}>
                    {locationIcon} {locationDisplay}
                  </p>
                  {config.gpsGeofencing && employeeBranch && (
                    <p className="text-[10px] text-gray-400 mt-1">Branch: {employeeBranch.name}</p>
                  )}
               </div>
               
               {/* PUNCH BUTTONS */}
               <div className="space-y-3 w-full flex flex-col items-center">
                   {isCheckedIn ? (
                       <button onClick={handleManualPunch} className="w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl border-4 bg-red-50 border-red-100 text-red-600 hover:bg-red-100 transition-all hover:scale-105 active:scale-95">
                          <Fingerprint className="w-12 h-12 mb-2 text-red-500" /><span className="font-bold text-lg">Check Out</span>
                        </button>
                   ) : (
                       <div className="flex flex-col gap-4 w-full items-center">
                           {config.qrScan && (
                                <button 
                                    onClick={initiateQrScan}
                                    disabled={cameraStatus === 'denied'} 
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    <ScanLine className="w-5 h-5" /> 
                                    {cameraStatus === 'denied' ? 'Camera Denied' : 'Scan QR to Punch'}
                                </button>
                           )}
                           
                           {config.manualPunch && (
                                <button 
                                    onClick={handleManualPunch} 
                                    disabled={isPunchDisabled} 
                                    className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl border-4 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-all hover:scale-105 active:scale-95 ${isPunchDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Fingerprint className="w-12 h-12 mb-2 text-emerald-500" />
                                    <span className="font-bold text-lg">Check In</span>
                                </button>
                           )}
                           
                           {!config.manualPunch && !config.qrScan && (
                               <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                                   No attendance method enabled. Contact Admin.
                               </div>
                           )}
                       </div>
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

        {/* QR Scan Overlay Modal */}
        {isScanningQr && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-md bg-transparent flex flex-col items-center">
                    <h3 className="text-white text-xl font-bold mb-6">Scan QR Code</h3>
                    
                    <div className="relative w-64 h-64 border-4 border-emerald-500 rounded-2xl overflow-hidden shadow-2xl">
                        <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover" 
                            playsInline 
                            muted
                        />
                        <div className="absolute inset-0 border-2 border-white/20"></div>
                        {/* Scanning Line Animation */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 animate-[scan_2s_infinite]"></div>
                    </div>
                    
                    <p className="text-white/80 mt-6 text-center text-sm">
                        Point your camera at the Branch QR Code.<br/>
                        Ensure you are well lit.
                    </p>

                    <button 
                        onClick={() => setIsScanningQr(false)}
                        className="mt-8 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-full hover:bg-white/20 transition-colors"
                    >
                        Cancel Scan
                    </button>
                </div>
                
                <style>{`
                    @keyframes scan {
                        0% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                    }
                `}</style>
            </div>
        )}
      </div>
    );
  }

  // Fallback if no employee selected (should rarely happen with auto-select)
  return (
    <div className="text-center p-8 text-gray-500">
        Loading...
    </div>
  );
};

export default UserAttendance;
