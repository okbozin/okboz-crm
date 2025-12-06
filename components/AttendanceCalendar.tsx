
import React from 'react';
import { DailyAttendance, AttendanceStatus } from '../types';
import { LogIn, LogOut, Clock, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

interface AttendanceCalendarProps {
  data: DailyAttendance[];
  stats: {
    present: number;
    absent: number;
    halfDay: number;
    paidLeave: number;
    weekOff: number;
  };
  onDateClick?: (day: DailyAttendance) => void;
}

interface DayCellProps {
  dayData: DailyAttendance | null | undefined;
  onClick?: (day: DailyAttendance) => void;
}

// Helper to calculate duration between two time strings (e.g. "09:30 AM", "06:30 PM")
const getDuration = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return null;
  try {
    const parseTime = (t: string) => {
      const [time, period] = t.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    const start = parseTime(checkIn);
    const end = parseTime(checkOut);
    
    // Handle overnight shifts if end is smaller than start (add 24 hours)
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    
    if (diff <= 0) return null;
    
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  } catch (e) {
    return null;
  }
};

const DayCell: React.FC<DayCellProps> = ({ dayData, onClick }) => {
  if (!dayData) return <div className="min-h-[110px] bg-gray-50/30 rounded-xl border border-transparent"></div>;

  const dayNumber = parseInt(dayData.date.split('-')[2], 10);
  const duration = getDuration(dayData.checkIn, dayData.checkOut);
  
  let containerClass = "bg-white border-dashed border-gray-200 hover:border-gray-300";
  let dateClass = "text-gray-400 font-medium";
  let statusBadge = null;

  switch (dayData.status) {
    case AttendanceStatus.PRESENT:
      containerClass = "bg-white border-solid border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 ring-1 ring-transparent hover:ring-emerald-200";
      dateClass = "text-gray-700 font-bold";
      statusBadge = (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${dayData.isLate ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {dayData.isLate ? 'LATE' : 'P'}
        </span>
      );
      break;
    case AttendanceStatus.ABSENT:
      containerClass = "bg-red-50/30 border-solid border-red-100 hover:border-red-200 hover:bg-red-50";
      dateClass = "text-red-800 font-bold";
      statusBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">A</span>;
      break;
    case AttendanceStatus.HALF_DAY:
      containerClass = "bg-amber-50/30 border-solid border-amber-100 hover:border-amber-200 hover:bg-amber-50";
      dateClass = "text-amber-800 font-bold";
      statusBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">HD</span>;
      break;
    case AttendanceStatus.PAID_LEAVE:
      containerClass = "bg-blue-50/30 border-solid border-blue-100 hover:border-blue-200 hover:bg-blue-50";
      dateClass = "text-blue-800 font-bold";
      statusBadge = <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">L</span>;
      break;
    case AttendanceStatus.WEEK_OFF:
      containerClass = "bg-slate-50 border-solid border-slate-100 opacity-70 hover:opacity-100";
      dateClass = "text-slate-400 font-medium";
      statusBadge = <span className="text-[9px] font-bold text-slate-400">OFF</span>;
      break;
    case AttendanceStatus.NOT_MARKED:
      containerClass = "bg-white border-dashed border-gray-200 hover:bg-gray-50";
      dateClass = "text-gray-300";
      break;
  }

  return (
    <div 
      onClick={() => onClick && onClick(dayData)}
      className={`relative min-h-[110px] rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer group ${containerClass}`}
    >
      {/* Header: Date & Badge */}
      <div className="flex justify-between items-start mb-1">
        <span className={`text-sm ${dateClass}`}>{dayNumber}</span>
        {statusBadge}
      </div>

      {/* Body: Times */}
      <div className="flex flex-col gap-1.5">
        {dayData.checkIn ? (
            <div className="flex items-center gap-1.5">
                <LogIn className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-medium text-gray-700 font-mono tracking-tight">{dayData.checkIn}</span>
            </div>
        ) : (
            dayData.status === AttendanceStatus.PRESENT ? <div className="h-4"></div> : null
        )}
        
        {dayData.checkOut ? (
            <div className="flex items-center gap-1.5">
                <LogOut className="w-3 h-3 text-red-400 shrink-0" />
                <span className="text-[10px] font-medium text-gray-700 font-mono tracking-tight">{dayData.checkOut}</span>
            </div>
        ) : (
            dayData.status === AttendanceStatus.PRESENT ? <div className="h-4"></div> : null
        )}
      </div>

      {/* Footer: Duration */}
      {duration && (
          <div className="mt-2 pt-1.5 border-t border-gray-100/50 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50/50 rounded-b-lg -mx-2 -mb-2 py-1">
              <Clock className="w-2.5 h-2.5" /> {duration}
          </div>
      )}
      
      {!duration && dayData.status !== AttendanceStatus.NOT_MARKED && dayData.status !== AttendanceStatus.WEEK_OFF && (
          <div className="mt-2 h-4"></div> // Spacer
      )}
    </div>
  );
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ data, stats, onDateClick }) => {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Safe date parsing to prevent timezone shifts
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    const date = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    return date.getDay();
  };

  const startDayOfWeek = data.length > 0 ? getDayOfWeek(data[0].date) : 0;
  
  const paddedData = [
    ...Array(startDayOfWeek).fill(null),
    ...data
  ];

  return (
    <div className="space-y-6">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-emerald-700">{stats.present}</span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Present</span>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-red-700">{stats.absent}</span>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Absent</span>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-orange-700">{data.filter(d => d.isLate).length}</span>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Late</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-amber-700">{stats.halfDay}</span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Half Day</span>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-blue-700">{stats.paidLeave}</span>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Leave</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {weekDays.map((day, idx) => (
            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-widest ${idx === 0 ? 'text-red-400' : 'text-gray-500'}`}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Body */}
        <div className="p-4 grid grid-cols-7 gap-3 bg-white">
          {paddedData.map((day, idx) => (
            <DayCell key={idx} dayData={day} onClick={onDateClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
