
import React, { useState, useEffect } from 'react';
import { History, GitBranch, CalendarDays, ListChecks } from 'lucide-react';

// Embedded data to prevent module resolution errors with JSON imports
const APP_VERSION_HISTORY = [
  {
    "version": "1.2.0",
    "date": "2024-07-28",
    "changes": [
      "Implemented App Version History page.",
      "Fixed `Uncaught ReferenceError: UserCircle is not defined` error in StaffList.",
      "Ensured default employee data is present in `constants.ts` to prevent data missing errors in `Layout.tsx`.",
      "Refined bulk attendance logic in `UserAttendance.tsx` to apply to current day if NOT_MARKED, and added consistent default locations for bulk present marks.",
      "Refactored employee sidebar link generation in `Layout.tsx` to dynamically include modules based on `allowedModules` configured in `StaffList.tsx`."
    ]
  },
  {
    "version": "1.1.0",
    "date": "2024-07-22",
    "changes": [
      "Added 'Mark All Present' and 'Mark All Absent' buttons for bulk attendance updates in Admin monthly view.",
      "Introduced API Key configuration for Google Maps in Settings, with auto-loading and error handling.",
      "Implemented persistent branding (Company Name, Primary Color) configurable via Admin Settings.",
      "Integrated `AiAssistant` component for Lead Management with dynamic message generation.",
      "Overhauled `Payroll.tsx` to include detailed payroll history and advance request approvals.",
      "Enhanced `UserSalary.tsx` with dynamic salary calculation based on attendance and advance deductions, and improved advance request flow with notifications.",
      "Added `SecurityAccount.tsx` for employee password changes and associated admin notifications.",
      "Introduced comprehensive `EmployeeSettings.tsx` for managing company-wide settings like departments, roles, shifts, attendance rules, holidays, and live tracking.",
      "Refactored navigation links and permissions in `Layout.tsx` for better role-based access control."
    ]
  },
  {
    "version": "1.0.0",
    "date": "2024-07-15",
    "changes": [
      "Initial release of OK BOZ CRM.",
      "Admin Dashboard with key metrics and quick access links.",
      "Staff Management with employee profiles, roles, and basic details.",
      "Attendance Tracking with punch-in/out and daily/monthly views.",
      "Basic Payroll Management.",
      "Branch Management with Google Maps integration and geofencing.",
      "Customer & Vendor Management (Leads, Enquiries, Vendor Attachment).",
      "Task Management for assigning and tracking employee tasks.",
      "Documents Management with file uploads.",
      "Cloud Sync (Firebase) for data persistence.",
      "Login functionality for Admin, Corporate, and Employee roles.",
      "Responsive UI with dark mode support."
    ]
  }
];

interface AppVersion {
  version: string;
  date: string;
  changes: string[];
}

const AppVersionHistory: React.FC = () => {
  const [history, setHistory] = useState<AppVersion[]>([]);

  useEffect(() => {
    // Sort history by date, newest first
    const sortedHistory = [...APP_VERSION_HISTORY].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistory(sortedHistory);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <GitBranch className="w-8 h-8 text-indigo-600" /> App Version History
        </h2>
        <p className="text-gray-500">Track application updates and new features.</p>
      </div>

      <div className="space-y-6">
        {history.map((version, index) => (
          <div key={version.version} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-baseline gap-3">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" /> Version {version.version}
                </h3>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-gray-400" /> {new Date(version.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {index === 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  LATEST
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-gray-500" /> Key Changes
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm pl-4">
                {version.changes.map((change, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2 text-indigo-500 text-lg leading-none">&bull;</span>
                    <span className="flex-1">{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppVersionHistory;
