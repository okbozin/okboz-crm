
import { AttendanceStatus, DailyAttendance, Employee } from './types';

export const MOCK_EMPLOYEES: Employee[] = [];

// Define a common COLORS array for consistent chart/status colors
export const COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#64748b', // Slate
  '#e879f9', // Fuchsia
];

// Generate attendance helper (Kept for functional logic if needed for real employees)
export const generateMockAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  if (!employee) return [];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const attendance: DailyAttendance[] = [];

  // Determine the current day for the generated month.
  const today = new Date();
  let simulatedCurrentDay = 32; // Default to fill all (past months)

  if (year === today.getFullYear() && month === today.getMonth()) {
    simulatedCurrentDay = today.getDate(); // For current real month, fill up to today
  } else if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
    simulatedCurrentDay = 0; // Future months should be empty
  } else {
    simulatedCurrentDay = daysInMonth; // Past months should be full
  }

  const employeeJoiningDate = new Date(employee.joiningDate);
  employeeJoiningDate.setHours(0,0,0,0); // Normalize to start of day

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const currentDayDate = new Date(year, month, i);
    currentDayDate.setHours(0,0,0,0); // Normalize

    // 1. Pre-Joining check
    if (currentDayDate < employeeJoiningDate) {
      attendance.push({ date: dateStr, status: AttendanceStatus.NOT_MARKED });
      continue;
    }
    
    // 2. Future check
    if (i > simulatedCurrentDay) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
        });
        continue;
    }

    // 3. Current Day (Today) check - Force NOT_MARKED initially so user must punch in
    const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
    if (isToday) {
        attendance.push({
            date: dateStr,
            status: AttendanceStatus.NOT_MARKED,
            isLate: false,
        });
        continue;
    }

    const dayOfWeek = new Date(year, month, i).getDay();
    let status = AttendanceStatus.PRESENT;
    let isLate = false;

    if (dayOfWeek === 0 || employee.weekOff === new Date(year, month, i).toLocaleDateString('en-US', { weekday: 'long' })) { 
      status = AttendanceStatus.WEEK_OFF;
    } else {
        // Default to present for generated history unless overridden by real data storage
        status = AttendanceStatus.PRESENT;
    }

    attendance.push({
      date: dateStr,
      status,
      isLate,
      checkIn: status === AttendanceStatus.PRESENT ? '09:30 AM' : undefined,
      checkOut: status === AttendanceStatus.PRESENT ? '06:30 PM' : undefined,
    });
  }
  return attendance;
};

// Helper to get consistent "random" attendance for a specific employee
export const getEmployeeAttendance = (employee: Employee, year: number, month: number): DailyAttendance[] => {
  // 1. Try to get REAL data from storage first
  try {
    const key = `attendance_data_${employee.id}_${year}_${month}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading attendance from storage", e);
  }

  // 2. Fallback to Mock generation if no real data found
  return generateMockAttendance(employee, year, month);
};

export const MOCK_ATTENDANCE_NOV_2025: DailyAttendance[] = [];
