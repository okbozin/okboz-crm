
import React, { useState } from 'react';
import { Check, CreditCard, Zap, Shield, Download, AlertCircle, Package, FileText } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    price: '0',
    currency: '₹',
    period: '/mo',
    description: 'Perfect for small teams getting started.',
    features: ['Up to 5 Employees', 'Basic Attendance Tracking', '1 Branch Location', '30 Days Data Retention'],
    buttonText: 'Current Plan',
    active: false,
    highlight: false
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '2,499',
    currency: '₹',
    period: '/year',
    description: 'For growing businesses needing efficiency.',
    features: ['Up to 50 Employees', 'Automated Payroll', '5 Branch Locations', 'Unlimited History', 'Email & SMS Alerts', 'AI Assistant'],
    buttonText: 'Manage Subscription',
    active: true,
    highlight: true
  },
  {
    id: 'business',
    name: 'Business',
    price: '9,999',
    currency: '₹',
    period: '/year',
    description: 'Scale your operations without limits.',
    features: ['Unlimited Employees', 'Dedicated Account Manager', 'Unlimited Branches', 'API Access', 'Custom Reports', 'Priority Support'],
    buttonText: 'Upgrade to Business',
    active: false,
    highlight: false
  }
];

const BILLING_HISTORY: { id: string; date: string; amount: string; status: string; plan: string; }[] = [];

const Subscription: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlanAction = (planId: string) => {
    setLoading(planId);
    // Simulate API call
    setTimeout(() => {
      setLoading(null);
      if (planId !== 'pro') alert("Redirecting to payment gateway...");
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Subscription & Billing</h2>
        <p className="text-gray-500">Manage your plan, billing details, and invoices</p>
      </div>

      {/* Current Plan Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-8 items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
               <Zap className="w-8 h-8" />
            </div>
            <div>
               <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Professional Plan</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">ACTIVE</span>
               </div>
               <p className="text-gray-500 text-sm mt-1">Next billing date: <span className="font-medium text-gray-800">Oct 01, 2026</span></p>
               <p className="text-emerald-600 text-sm font-medium mt-1">Auto-renewal enabled</p>
            </div>
         </div>
         
         <div className="w-full md:w-1/2 space-y-3">
            <div className="flex justify-between text-sm mb-1">
               <span className="text-gray-600">Employee Limit</span>
               <span className="font-medium text-gray-900">12 / 50 Used</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
               <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '24%' }}></div>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
               <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Payroll Active</span>
               <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> 5 Branches</span>
            </div>
         </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {PLANS.map((plan) => (
            <div 
               key={plan.id} 
               className={`relative bg-white rounded-xl border p-6 flex flex-col transition-all hover:shadow-md ${plan.highlight ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/20' : 'border-gray-200'}`}
            >
               {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                     MOST POPULAR
                  </div>
               )}
               
               <div className="mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mt-1 min-h-[40px]">{plan.description}</p>
               </div>

               <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold text-gray-900">{plan.currency}{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
               </div>

               <div className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feat, idx) => (
                     <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.active ? 'text-emerald-500' : 'text-gray-400'}`} />
                        <span>{feat}</span>
                     </div>
                  ))}
               </div>

               <button
                  onClick={() => handlePlanAction(plan.id)}
                  disabled={plan.active || loading !== null}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                     plan.active 
                        ? 'bg-gray-100 text-gray-500 cursor-default' 
                        : plan.highlight 
                           ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                           : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
               >
                  {loading === plan.id ? 'Processing...' : plan.buttonText}
               </button>
            </div>
         ))}
      </div>

      {/* Billing History & Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Invoice History */}
         <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Invoice History
               </h3>
               <button className="text-sm text-emerald-600 font-medium hover:underline">Download All</button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                     <tr>
                        <th className="px-5 py-3">Invoice ID</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {BILLING_HISTORY.length > 0 ? (
                         BILLING_HISTORY.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-800">{inv.id}</td>
                            <td className="px-5 py-3 text-gray-600">{inv.date}</td>
                            <td className="px-5 py-3 text-gray-600">{inv.plan}</td>
                            <td className="px-5 py-3 font-medium text-gray-800">{inv.amount}</td>
                            <td className="px-5 py-3">
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{inv.status}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                                <button className="text-gray-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded transition-colors">
                                    <Download className="w-4 h-4" />
                                </button>
                            </td>
                            </tr>
                         ))
                     ) : (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 italic">No invoice history available.</td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Payment Method */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
               <CreditCard className="w-4 h-4 text-emerald-600" /> Payment Method
            </h3>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8"></div>
               <div className="flex justify-between items-start mb-6">
                  <CreditCard className="w-8 h-8 opacity-80" />
                  <span className="font-mono text-sm opacity-60">Debit Card</span>
               </div>
               <div className="font-mono text-xl tracking-widest mb-4">•••• •••• •••• 4242</div>
               <div className="flex justify-between items-end text-sm opacity-80">
                  <div className="flex flex-col">
                     <span className="text-[10px] uppercase">Card Holder</span>
                     <span className="font-medium">Senthil Kumar</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] uppercase">Expires</span>
                     <span className="font-medium">12/28</span>
                  </div>
               </div>
            </div>

            <div className="mt-auto space-y-3">
               <button className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors">
                  Change Payment Method
               </button>
               <div className="bg-blue-50 p-3 rounded-lg flex gap-2 text-xs text-blue-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>Your next invoice will be charged to this card automatically.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Subscription;
