
import React from 'react';
import { Truck } from 'lucide-react';

const DriverMonitoring: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Truck className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-700">Driver Monitoring</h2>
      <p className="mt-2 text-sm">This module is coming soon or has been moved to Live Tracking.</p>
    </div>
  );
};

export default DriverMonitoring;
