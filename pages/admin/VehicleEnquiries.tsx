
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, Search, Filter, MapPin, 
  Phone, User, Calendar 
} from 'lucide-react';
import { Enquiry, Employee, UserRole } from '../../types';

interface VehicleEnquiriesProps {
  role?: UserRole; // Optional prop if not passed from routes directly
}

const VehicleEnquiries: React.FC<VehicleEnquiriesProps> = ({ role }) => {
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // --- Data Loading ---
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem('global_enquiries_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [allStaff, setAllStaff] = useState<Employee[]>(() => {
    // Simplified staff loading for this fallback page
    const saved = localStorage.getItem('staff_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter for Transport related enquiries
  const vehicleEnquiries = enquiries.filter(e => e.enquiryCategory === 'Transport' || e.tripType);

  const filteredList = vehicleEnquiries.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Car className="w-8 h-8 text-orange-600" /> Vehicle Enquiries
          </h2>
          <p className="text-gray-500">Dedicated view for transport requests</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search vehicle requests..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
          </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                  <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Vehicle</th>
                      <th className="px-6 py-4">Route / Package</th>
                      <th className="px-6 py-4">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredList.map(enq => (
                      <tr key={enq.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{enq.name}</div>
                              <div className="text-xs text-gray-500">{enq.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
                                  {enq.tripType || 'General'}
                              </span>
                          </td>
                          <td className="px-6 py-4">{enq.vehicleType || '-'}</td>
                          <td className="px-6 py-4 text-gray-600">
                              {enq.transportData?.pickup ? `${enq.transportData.pickup} -> ` : ''}
                              {enq.transportData?.drop || enq.transportData?.destination || '-'}
                          </td>
                          <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                                  {enq.status}
                              </span>
                          </td>
                      </tr>
                  ))}
                  {filteredList.length === 0 && (
                      <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500">No vehicle enquiries found.</td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default VehicleEnquiries;
