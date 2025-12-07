
import React from 'react';
import { Enquiry, Employee } from '../../types';

interface EnquiryAssignSelectProps {
    selectedEnquiry: Enquiry;
    employees: Employee[];
    handleAssignStaff: (empId: string) => void;
}

const EnquiryAssignSelect: React.FC<EnquiryAssignSelectProps> = ({ selectedEnquiry, employees, handleAssignStaff }) => {
  return (
      <div className="relative">
          <select
              value={selectedEnquiry.assignedTo || ''}
              onChange={(e) => handleAssignStaff(e.target.value)}
              className="w-full p-2.5 pl-3 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 cursor-pointer appearance-none"
          >
              <option value="">Select Employee</option>
              {employees.filter(emp => emp.status !== 'Inactive').map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
      </div>
  );
};

export default EnquiryAssignSelect;
