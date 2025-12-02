
import React, { useState, useEffect } from 'react';
import { 
  Settings, Loader2, ArrowRight, ArrowRightLeft, 
  MessageCircle, Copy, Mail, Car, User, Edit2,
  CheckCircle, Building2, Save, X, Phone, Truck
} from 'lucide-react';
import Autocomplete from '../../components/Autocomplete';

// Types
type TripType = 'Local' | 'Rental' | 'Outstation';
type OutstationSubType = 'RoundTrip' | 'OneWay';
type VehicleType = 'Sedan' | 'SUV';
type CallerType = 'Customer' | 'Vendor';
type EnquiryCategory = 'Transport' | 'General';

interface RentalPackage {
  id: string;
  name: string;
  hours: number;
  km: number;
  priceSedan: number;
  priceSuv: number;
}

interface PricingRules {
  localBaseFare: number;
  localBaseKm: number;
  localPerKmRate: number;
  localWaitingRate: number;
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  outstationMinKmPerDay: number;
  outstationBaseRate: number;
  outstationExtraKmRate: number;
  outstationDriverAllowance: number;
  outstationNightAllowance: number;
}

const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, priceSedan: 200, priceSuv: 300 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, priceSedan: 400, priceSuv: 600 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, priceSedan: 800, priceSuv: 1100 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, priceSedan: 1600, priceSuv: 2200 },
];

const DEFAULT_PRICING_SEDAN: PricingRules = {
  localBaseFare: 200, localBaseKm: 5, localPerKmRate: 20, localWaitingRate: 2,
  rentalExtraKmRate: 15, rentalExtraHrRate: 100,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 13,
  outstationDriverAllowance: 400, outstationNightAllowance: 300 
};

const DEFAULT_PRICING_SUV: PricingRules = {
  localBaseFare: 300, localBaseKm: 5, localPerKmRate: 25, localWaitingRate: 3,
  rentalExtraKmRate: 18, rentalExtraHrRate: 150,
  outstationMinKmPerDay: 300, outstationBaseRate: 0, outstationExtraKmRate: 17,
  outstationDriverAllowance: 500, outstationNightAllowance: 400 
};

export const VehicleEnquiries: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsVehicleType, setSettingsVehicleType] = useState<VehicleType>('Sedan');
  
  // Enquiry State
  const [callerType, setCallerType] = useState<CallerType>('Customer');
  const [enquiryCategory, setEnquiryCategory] = useState<EnquiryCategory>('Transport');

  const [tripType, setTripType] = useState<TripType>('Local');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [outstationSubType, setOutstationSubType] = useState<OutstationSubType>('RoundTrip');
  
  const [transportDetails, setTransportDetails] = useState({
    drop: '', estKm: '', waitingMins: '', packageId: '',
    destination: '', days: '1', estTotalKm: '', nights: '0'
  });

  const [customerDetails, setCustomerDetails] = useState({
    name: '', phone: '', email: '', pickup: '', requirements: ''
  });

  const [isMapReady, setIsMapReady] = useState(false);
  const [dropCoords, setDropCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destCoords, setDestCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);

  const [rentalPackages] = useState<RentalPackage[]>(DEFAULT_RENTAL_PACKAGES);
  const [pricing, setPricing] = useState<Record<VehicleType, PricingRules>>({
    Sedan: DEFAULT_PRICING_SEDAN,
    SUV: DEFAULT_PRICING_SUV
  });

  const [generatedMessage, setGeneratedMessage] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Map loader
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsMapReady(true);
    } else {
        const interval = setInterval(() => {
            if (window.google && window.google.maps) {
                setIsMapReady(true);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }
  }, []);

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPricing(prev => ({
      ...prev,
      [settingsVehicleType]: {
        ...prev[settingsVehicleType],
        [name]: parseFloat(value) || 0
      }
    }));
  };

  // Calculation Logic
  useEffect(() => {
      let total = 0;
      const rules = pricing[vehicleType];
      let details = '';

      if (tripType === 'Local') {
          const base = rules.localBaseFare;
          const km = parseFloat(transportDetails.estKm) || 0;
          const extraKm = Math.max(0, km - rules.localBaseKm) * rules.localPerKmRate;
          const wait = (parseFloat(transportDetails.waitingMins) || 0) * rules.localWaitingRate;
          total = base + extraKm + wait;
          details = `Local Trip: ${km}km`;
      } else if (tripType === 'Rental') {
          const pkg = rentalPackages.find(p => p.id === transportDetails.packageId);
          if (pkg) {
              total = vehicleType === 'Sedan' ? pkg.priceSedan : pkg.priceSuv;
              details = `Rental: ${pkg.name}`;
          }
      } else {
          // Outstation
          const days = parseFloat(transportDetails.days) || 1;
          const km = parseFloat(transportDetails.estTotalKm) || 0;
          const driver = rules.outstationDriverAllowance * days;
          
          if (outstationSubType === 'RoundTrip') {
              const minKm = days * rules.outstationMinKmPerDay;
              const chargeKm = Math.max(km, minKm);
              total = (chargeKm * rules.outstationExtraKmRate) + driver;
              const nights = (parseFloat(transportDetails.nights) || 0) * rules.outstationNightAllowance;
              total += nights;
              details = `Round Trip: ${days} days, ${km} km`;
          } else {
              total = rules.outstationBaseRate + (km * rules.outstationExtraKmRate) + driver;
              details = `One Way: ${km} km`;
          }
      }

      setEstimatedCost(total);

      // Generate Message Based on Enquiry Type
      let msg = '';

      if (enquiryCategory === 'General') {
          msg = `Hello ${customerDetails.name || 'Sir/Madam'},
Thank you for contacting OK BOZ. 

Regarding your enquiry:
"${customerDetails.requirements || 'General Requirement'}"

We have received your request and our team will get back to you shortly with more details.

For immediate assistance, feel free to call us.

Regards,
OK BOZ Support Team`;
      } else {
          // Transport Estimate Message
          msg = `Hello ${customerDetails.name || 'Customer'},
Here is your ${tripType} estimate from OK BOZ! 🚕

*${tripType} Trip Estimate*
🚘 Vehicle: ${vehicleType}
📍 Pickup: ${customerDetails.pickup || 'TBD'}
${tripType === 'Local' ? `📍 Drop: ${transportDetails.drop}` : ''}
${tripType === 'Outstation' ? `🌍 Destination: ${transportDetails.destination}` : ''}
📝 Details: ${details}
${tripType === 'Local' ? `⏳ Waiting Time: ${transportDetails.waitingMins} mins` : ''}

💰 *Base Fare: ₹${total.toFixed(0)} (Includes ${tripType === 'Local' ? rules.localBaseKm + ' km' : 'charges'})*
💰 *Total Estimate: ₹${total.toFixed(0)}*

Note: Tax, Toll and permit will be extra.

Book now with OK BOZ! 🚕`;
      }

      setGeneratedMessage(msg);

  }, [tripType, vehicleType, outstationSubType, transportDetails, customerDetails, pricing, rentalPackages, enquiryCategory, callerType]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column: Input Form */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Car className="w-6 h-6 text-emerald-600" /> Vehicle Enquiry
        </h2>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" /> Caller Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                      <input 
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                          value={customerDetails.name} 
                          onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} 
                          placeholder="Caller Name"
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                      <input 
                          className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                          value={customerDetails.phone} 
                          onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} 
                          placeholder="9566348085"
                      />
                  </div>
              </div>
              
              {/* Caller Type Toggle */}
              <div className="flex gap-2">
                  <button 
                    onClick={() => setCallerType('Customer')}
                    className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center justify-center gap-2 ${callerType === 'Customer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <User className="w-4 h-4" /> Customer
                  </button>
                  <button 
                    onClick={() => setCallerType('Vendor')}
                    className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center justify-center gap-2 ${callerType === 'Vendor' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Truck className="w-4 h-4" /> Vendor
                  </button>
              </div>

              {/* Enquiry Category Toggle */}
              <div className="flex gap-2">
                  <button 
                    onClick={() => setEnquiryCategory('Transport')}
                    className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${enquiryCategory === 'Transport' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    Transport Enquiry
                  </button>
                  <button 
                    onClick={() => setEnquiryCategory('General')}
                    className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${enquiryCategory === 'General' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    General Enquiry
                  </button>
              </div>

              <div className="bg-green-50 text-green-700 p-3 rounded-lg flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Details Locked</span>
                  <button className="text-green-800 hover:underline">Change</button>
              </div>
          </div>
          
          {/* Conditional Rendering based on Enquiry Type */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
              
              {enquiryCategory === 'Transport' ? (
                <>
                  {/* Settings Toggle */}
                  <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Pickup Location</label>
                      <button 
                          type="button"
                          onClick={() => setShowSettings(!showSettings)}
                          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium border px-2 py-1 rounded"
                      >
                          <Settings className="w-3 h-3" /> {showSettings ? 'Close Config' : 'Rates'}
                      </button>
                  </div>

                  {!isMapReady ? (
                      <div className="p-3 bg-gray-50 text-gray-500 text-sm rounded-lg flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading Google Maps...
                      </div>
                  ) : (
                      <Autocomplete 
                          placeholder="Search Google Maps for Pickup"
                          onAddressSelect={addr => setCustomerDetails({...customerDetails, pickup: addr})}
                          setNewPlace={setPickupCoords}
                      />
                  )}

                  {/* SETTINGS PANEL */}
                  {showSettings && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Edit2 className="w-3 h-3" /> Fare Configuration</h3>
                        <div className="flex bg-white rounded border">
                            <button onClick={() => setSettingsVehicleType('Sedan')} className={`px-3 py-1 text-xs font-bold ${settingsVehicleType === 'Sedan' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>Sedan</button>
                            <button onClick={() => setSettingsVehicleType('SUV')} className={`px-3 py-1 text-xs font-bold ${settingsVehicleType === 'SUV' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>SUV</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-emerald-600 uppercase">Local Rules ({settingsVehicleType})</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">Base Fare (₹)</label>
                                <input type="number" name="localBaseFare" value={pricing[settingsVehicleType].localBaseFare} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Base Km Included</label>
                                <input type="number" name="localBaseKm" value={pricing[settingsVehicleType].localBaseKm} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Extra Km Rate (₹/km)</label>
                                <input type="number" name="localPerKmRate" value={pricing[settingsVehicleType].localPerKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Waiting Charge (₹/min)</label>
                                <input type="number" name="localWaitingRate" value={pricing[settingsVehicleType].localWaitingRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-orange-600 uppercase">Outstation Rules ({settingsVehicleType})</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">Min Km / Day</label>
                                <input type="number" name="outstationMinKmPerDay" value={pricing[settingsVehicleType].outstationMinKmPerDay} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Per Km Rate (₹/km)</label>
                                <input type="number" name="outstationExtraKmRate" value={pricing[settingsVehicleType].outstationExtraKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Base Rate (One Way Only)</label>
                                <input type="number" name="outstationBaseRate" value={pricing[settingsVehicleType].outstationBaseRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Driver Allowance (₹/day)</label>
                                <input type="number" name="outstationDriverAllowance" value={pricing[settingsVehicleType].outstationDriverAllowance} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Driver Night Allowance (₹/night)</label>
                                <input type="number" name="outstationNightAllowance" value={pricing[settingsVehicleType].outstationNightAllowance} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-blue-600 uppercase">Rental Rules ({settingsVehicleType})</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-500">Extra Hr Rate (₹/hr)</label>
                                <input type="number" name="rentalExtraHrRate" value={pricing[settingsVehicleType].rentalExtraHrRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Extra Km Rate (₹/km)</label>
                                <input type="number" name="rentalExtraKmRate" value={pricing[settingsVehicleType].rentalExtraKmRate} onChange={handlePricingChange} className="w-full p-1.5 border rounded text-xs" />
                            </div>
                          </div>
                          <div className="pt-4">
                            <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-1.5 rounded text-xs font-medium hover:bg-slate-900">Done</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vehicle & Trip Type */}
                  <div className="flex gap-4">
                      <div className="flex bg-gray-100 p-1 rounded-lg flex-1">
                          {['Local', 'Rental', 'Outstation'].map(type => (
                              <button
                                  key={type}
                                  onClick={() => setTripType(type as TripType)}
                                  className={`flex-1 py-2 text-xs font-bold transition-colors rounded ${tripType === type ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                              >
                                  {type}
                              </button>
                          ))}
                      </div>
                      <div className="flex gap-2">
                          {['Sedan', 'SUV'].map(type => (
                              <button
                                  key={type}
                                  onClick={() => setVehicleType(type as VehicleType)}
                                  className={`px-4 py-2 text-xs font-bold rounded-lg border ${vehicleType === type ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200'}`}
                              >
                                  {type}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Dynamic Inputs */}
                  {tripType === 'Local' && (
                      <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop Location</label>
                            {!isMapReady ? (
                                <div className="p-3 bg-gray-50 text-gray-500 text-sm rounded-lg flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                </div>
                            ) : (
                                <Autocomplete 
                                    placeholder="Search Google Maps for Drop"
                                    onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, drop: addr }))}
                                    setNewPlace={(place) => setDropCoords(place)}
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est Distance (KM)</label>
                                <input 
                                    type="number" 
                                    value={transportDetails.estKm}
                                    onChange={e => setTransportDetails({...transportDetails, estKm: e.target.value})}
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Wait Time (Mins)</label>
                                <input 
                                    type="number" 
                                    value={transportDetails.waitingMins}
                                    onChange={e => setTransportDetails({...transportDetails, waitingMins: e.target.value})}
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                      </>
                  )}

                  {tripType === 'Outstation' && (
                      <div className="space-y-4">
                          <div className="flex gap-4">
                              <button onClick={() => setOutstationSubType('RoundTrip')} className={`flex-1 py-2 text-xs font-bold border rounded-lg ${outstationSubType === 'RoundTrip' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-gray-500'}`}>Round Trip</button>
                              <button onClick={() => setOutstationSubType('OneWay')} className={`flex-1 py-2 text-xs font-bold border rounded-lg ${outstationSubType === 'OneWay' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-gray-500'}`}>One Way</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                                  {!isMapReady ? (
                                      <div className="p-3 bg-gray-50 text-gray-500 text-sm rounded-lg flex items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin" /> Loading Maps...
                                      </div>
                                  ) : (
                                      <Autocomplete 
                                          placeholder="Destination City"
                                          onAddressSelect={(addr) => setTransportDetails(prev => ({ ...prev, destination: addr }))}
                                          setNewPlace={(place) => setDestCoords(place)}
                                      />
                                  )}
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Days</label>
                                  <input 
                                      type="number" 
                                      value={transportDetails.days}
                                      onChange={e => setTransportDetails({...transportDetails, days: e.target.value})}
                                      className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Km</label>
                                  <input 
                                      type="number" 
                                      value={transportDetails.estTotalKm}
                                      onChange={e => setTransportDetails({...transportDetails, estTotalKm: e.target.value})}
                                      className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                              </div>
                          </div>
                      </div>
                  )}
                </>
              ) : (
                 /* GENERAL ENQUIRY VIEW */
                 <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirements / Query</label>
                        <textarea 
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                            placeholder="Enter detailed requirements here..."
                            value={customerDetails.requirements}
                            onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                        />
                    </div>
                 </div>
              )}

              {enquiryCategory === 'Transport' && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirement Details</label>
                    <textarea 
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" 
                        placeholder="Special requests, extra luggage, etc..."
                        rows={2}
                        value={customerDetails.requirements}
                        onChange={e => setCustomerDetails({...customerDetails, requirements: e.target.value})}
                    />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> Assign Enquiry To</label>
                      <div className="flex gap-2">
                          <select className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-white"><option>Head Office</option></select>
                          <select className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-white"><option>All Branches</option></select>
                          <select className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-white"><option>Select Staff</option></select>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-2">
                  <button className="flex-1 py-3 border border-blue-200 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                      <ArrowRight className="w-4 h-4" /> Schedule
                  </button>
                  <button className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-colors flex items-center justify-center gap-2">
                      <ArrowRight className="w-4 h-4" /> Book Now
                  </button>
              </div>
              <div className="flex gap-4">
                  <button className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                      <X className="w-4 h-4" /> Cancel
                  </button>
                  <button className="flex-1 py-3 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> Save Enquiry
                  </button>
              </div>
          </div>
        </div>
      </div>

      {/* Right Column: Estimate Card */}
      <div className="w-full lg:w-96 space-y-6">
          {enquiryCategory === 'Transport' && (
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Estimated Cost</p>
                    <h3 className="text-4xl font-bold mb-4">₹{estimatedCost.toLocaleString()}</h3>
                    
                    <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-sm">
                        <span className="font-bold">Total</span>
                        <span className="font-bold">₹{estimatedCost.toLocaleString()}</span>
                    </div>
                </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4 text-gray-400" /> Client Message
                  </h4>
                  <button 
                      onClick={() => {navigator.clipboard.writeText(generatedMessage); alert("Copied!")}}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                  >
                      <Copy className="w-3 h-3" /> Copy
                  </button>
              </div>
              <textarea 
                  value={generatedMessage}
                  readOnly
                  className="w-full h-64 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 resize-none focus:outline-none mb-4"
              />
              <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={() => {
                          const url = `https://wa.me/${customerDetails.phone.replace(/\D/g, '')}?text=${encodeURIComponent(generatedMessage)}`;
                          window.open(url, '_blank');
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
                  >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button 
                      onClick={() => {
                          const url = `mailto:${customerDetails.email}?subject=${encodeURIComponent(tripType + ' Estimate')}&body=${encodeURIComponent(generatedMessage)}`;
                          window.location.href = url;
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
                  >
                      <Mail className="w-4 h-4" /> Email
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
