
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Search, Filter, Download, Trash2, Edit2, 
  TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle,
  Users, Clock, CheckCircle, RefreshCcw, X, Building2
} from 'lucide-react';
import { CorporateAccount } from '../../types';

interface Expense {
  id: string;
  title: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  date: string;
  paymentMethod: string;
  description: string;
  franchiseName?: string;
  transactionNumber?: string;
  ownerId?: string; 
}

const CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Maintenance', 'Software', 'Other', 'Sales', 'Service', 'Trip Income'];

const Expenses: React.FC = () => {
  const location = useLocation();
  const isAdminExpensesTab = location.pathname === '/admin/admin-expenses';
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [corporatesList, setCorporatesList] = useState<CorporateAccount[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterCorporate, setFilterCorporate] = useState('All'); // For Admin view

  // Partnership Settlement State
  const [settlementData, setSettlementData] = useState<Record<string, any>>({});
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, string>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'Expense',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    description: ''
  });

  // Load Data
  useEffect(() => {
    // Load Corporates
    try {
        const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        setCorporatesList(corps);
    } catch(e) {}

    // Load Settlements
    try {
        const settlements = JSON.parse(localStorage.getItem('partnership_settlements') || '{}');
        setSettlementData(settlements);
    } catch(e) {}

    // Load Expenses
    let allExpenses: Expense[] = [];
    
    if (isSuperAdmin) {
        // Load Admin Expenses
        try {
            const adminExp = JSON.parse(localStorage.getItem('office_expenses') || '[]');
            allExpenses = [...allExpenses, ...adminExp.map((e: any) => ({...e, franchiseName: 'Head Office', ownerId: 'admin'}))];
        } catch(e) {}

        // Load Corporate Expenses
        try {
            const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
            corps.forEach((c: any) => {
                const cExp = JSON.parse(localStorage.getItem(`office_expenses_${c.email}`) || '[]');
                allExpenses = [...allExpenses, ...cExp.map((e: any) => ({...e, franchiseName: c.companyName, ownerId: c.email}))];
            });
        } catch(e) {}
    } else {
        // Corporate View
        const key = `office_expenses_${sessionId}`;
        try {
            const cExp = JSON.parse(localStorage.getItem(key) || '[]');
            allExpenses = cExp.map((e: any) => ({...e, franchiseName: 'My Branch', ownerId: sessionId}));
        } catch(e) {}
    }
    
    setExpenses(allExpenses);
  }, [isSuperAdmin, sessionId]);

  // Handlers
  const handleOpenAddTransaction = () => {
      setEditingId(null);
      setFormData({
        title: '',
        amount: '',
        type: 'Expense',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        description: ''
      });
      setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.amount) return;

      const ownerId = isSuperAdmin ? 'admin' : sessionId; 
      const franchiseName = isSuperAdmin ? 'Head Office' : 'My Branch';
      
      const newExpense: Expense = {
          id: editingId || `TRX-${Date.now()}`,
          title: formData.title,
          amount: parseFloat(formData.amount),
          type: formData.type as 'Income' | 'Expense',
          category: formData.category,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          description: formData.description,
          ownerId: ownerId,
          franchiseName: franchiseName 
      };

      let storageKey = 'office_expenses';
      if (!isSuperAdmin) storageKey = `office_expenses_${sessionId}`;
      
      try {
          const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
          let updatedData;
          if (editingId) {
              updatedData = currentData.map((ex: Expense) => ex.id === editingId ? newExpense : ex);
          } else {
              updatedData = [newExpense, ...currentData];
          }
          localStorage.setItem(storageKey, JSON.stringify(updatedData));
          
          // Update State
          const expenseForState = { ...newExpense };

          if (editingId) {
              setExpenses(prev => prev.map(e => e.id === editingId ? expenseForState : e));
          } else {
              setExpenses(prev => [expenseForState, ...prev]);
          }
      } catch(e) {
          console.error("Error saving expense", e);
      }

      setIsModalOpen(false);
  };

  const handleDelete = (id: string, ownerId?: string) => {
      if(!window.confirm("Delete this transaction?")) return;
      
      let storageKey = 'office_expenses';
      if (ownerId && ownerId !== 'admin') storageKey = `office_expenses_${ownerId}`;
      else if (!isSuperAdmin) storageKey = `office_expenses_${sessionId}`;

      try {
          const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const updatedData = currentData.filter((e: Expense) => e.id !== id);
          localStorage.setItem(storageKey, JSON.stringify(updatedData));
          
          setExpenses(prev => prev.filter(e => e.id !== id));
      } catch(e) {}
  };

  // Partnership Handlers
  const handlePaymentMethodSelect = (key: string, method: string) => {
      setSelectedPaymentMethods(prev => ({ ...prev, [key]: method }));
  };

  const handleSettle = (key: string, amount: number) => {
      const method = selectedPaymentMethods[key] || 'Bank Transfer';
      const newSettlement = {
          status: 'Settled',
          paymentMethod: method,
          date: new Date().toISOString(),
          amount: amount
      };
      
      const updatedSettlements = { ...settlementData, [key]: newSettlement };
      setSettlementData(updatedSettlements);
      localStorage.setItem('partnership_settlements', JSON.stringify(updatedSettlements));
  };

  const handleUnsettle = (key: string) => {
      const updatedSettlements = { ...settlementData };
      delete updatedSettlements[key];
      setSettlementData(updatedSettlements);
      localStorage.setItem('partnership_settlements', JSON.stringify(updatedSettlements));
  };

  // derived state
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchTerm.toLowerCase()) || (exp.franchiseName && exp.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.transactionNumber && exp.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesType = typeFilter === 'All' || exp.type === typeFilter;
    const matchesMonth = exp.date.startsWith(monthFilter);
    
    // Add Corporate filter for Admin
    let matchesCorporate = true;
    if (isSuperAdmin && !isAdminExpensesTab && filterCorporate !== 'All') {
        if (filterCorporate === 'admin') matchesCorporate = exp.franchiseName === 'Head Office';
        else {
            const corp = corporatesList.find(c => c.email === filterCorporate);
            matchesCorporate = exp.franchiseName === (corp ? corp.companyName : '');
        }
    }

    // If viewing "Admin Expenses" specifically, only show 'admin' ownerId
    if (isSuperAdmin && isAdminExpensesTab) {
        if (exp.ownerId !== 'admin') return false;
    }

    return matchesSearch && matchesCategory && matchesType && matchesMonth && matchesCorporate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 

  const stats = useMemo(() => {
    const monthRecords = filteredExpenses;

    const totalIncome = monthRecords
      .filter(e => e.type === 'Income')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpense = monthRecords
      .filter(e => e.type === 'Expense')
      .reduce((sum, item) => sum + item.amount, 0);

    const balance = totalIncome - totalExpense;
    
    // Group for chart (Expenses Only)
    const categoryData: Record<string, number> = {};
    monthRecords
        .filter(e => e.type === 'Expense')
        .forEach(exp => {
           categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
        });
    
    const chartData = Object.keys(categoryData).map(key => ({
      name: key,
      value: categoryData[key]
    }));

    return { totalIncome, totalExpense, balance, chartData };
  }, [filteredExpenses]); 

  // Identify active corporate context for partnership display
  const activeCorporate = useMemo(() => {
      let corpId = '';
      if (isSuperAdmin) {
          if (filterCorporate !== 'All' && filterCorporate !== 'admin') {
              corpId = filterCorporate;
          }
      } else {
          // If logged in as corporate
          corpId = sessionId;
      }
      return corporatesList.find(c => c.email === corpId);
  }, [isSuperAdmin, filterCorporate, sessionId, corporatesList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isAdminExpensesTab ? 'Admin Expenses' : 'Finance & Expenses'}</h2>
          <p className="text-gray-500">
             {isAdminExpensesTab ? "Manage admin-specific expenses" : (isSuperAdmin ? "Consolidated financial report across all franchises" : "Track income, expenses, and partner distribution")}
          </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleOpenAddTransaction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
                <Plus className="w-5 h-5" /> New Transaction
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Income</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalIncome.toLocaleString()}</h3>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                 <ArrowUpCircle className="w-3 h-3" /> Income
              </p>
           </div>
           <div className="p-4 bg-green-50 rounded-full text-green-600">
              <TrendingUp className="w-6 h-6" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Expense</p>
              <h3 className="text-2xl font-bold text-gray-900">₹{stats.totalExpense.toLocaleString()}</h3>
              <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                 <ArrowDownCircle className="w-3 h-3" /> Expenses
              </p>
           </div>
           <div className="p-4 bg-red-50 rounded-full text-red-600">
              <TrendingDown className="w-6 h-6" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Net Balance</p>
              <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {stats.balance >= 0 ? '₹' : '-₹'}{Math.abs(stats.balance).toLocaleString()}
              </h3>
              <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${stats.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                 {stats.balance >= 0 ? 'Profit' : 'Loss'}
              </p>
           </div>
           <div className={`p-4 rounded-full ${stats.balance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet className="w-6 h-6" />
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
          </div>
          {isSuperAdmin && !isAdminExpensesTab && (
              <select value={filterCorporate} onChange={e => setFilterCorporate(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="All">All Corporates</option>
                  <option value="admin">Head Office</option>
                  {corporatesList.map(c => <option key={c.id} value={c.email}>{c.companyName}</option>)}
              </select>
          )}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="All">All Types</option>
              <option>Income</option>
              <option>Expense</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* PARTNERSHIP DISTRIBUTION SECTION (If corporate has partners and not viewing admin expenses) */}
      {!isAdminExpensesTab && activeCorporate && activeCorporate.partners && activeCorporate.partners.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Profit Sharing</h3>
                          <p className="text-blue-100 text-xs">{activeCorporate.companyName}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                       <div className="text-right hidden md:block">
                           <span className="block text-xs text-blue-100">Total Pool</span>
                           <span className={`block font-bold ${stats.balance >= 0 ? 'text-white' : 'text-red-200'}`}>
                               {stats.balance >= 0 ? '+' : ''}₹{stats.balance.toLocaleString()}
                           </span>
                       </div>
                       <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                          {monthFilter}
                       </span>
                  </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50">
                  {activeCorporate.partners.map((partner, index) => {
                      const shareAmount = (stats.balance * partner.percentage) / 100;
                      const isLoss = stats.balance < 0;
                      
                      // Settlement Key: CorporateID + Month + PartnerIndex
                      const settlementKey = `${activeCorporate.id}_${monthFilter}_${index}`;
                      const settlementInfo = settlementData[settlementKey]; // { status: 'Settled' | 'Pending', paymentMethod, date, amount }
                      const isSettled = settlementInfo?.status === 'Settled';

                      return (
                          <div key={index} className={`rounded-xl p-5 border shadow-sm transition-all relative overflow-hidden group hover:shadow-md ${
                              isLoss 
                                ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100' 
                                : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'
                          }`}>
                              {/* Header */}
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <span className={`text-xs font-bold uppercase tracking-wider ${isLoss ? 'text-red-400' : 'text-emerald-500'}`}>Partner</span>
                                      <h4 className="font-bold text-gray-900 text-lg">{partner.name}</h4>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded border ${isLoss ? 'bg-white text-red-600 border-red-200' : 'bg-white text-emerald-600 border-emerald-200'}`}>
                                      {partner.percentage}% Share
                                  </span>
                              </div>
                              
                              {/* Amount Display */}
                              <div className="mb-6">
                                   <span className={`text-3xl font-black tracking-tight ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                                      {isLoss ? '-₹' : '₹'}{Math.abs(shareAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                   </span>
                                   <p className={`text-xs font-medium mt-1 ${isLoss ? 'text-red-400' : 'text-emerald-500'}`}>
                                      {isLoss ? 'Liability Amount' : 'Dividend Amount'}
                                   </p>
                              </div>

                              {/* Settlement Controls */}
                              <div className="pt-4 border-t border-gray-200/50">
                                  {isSettled ? (
                                      <div className="flex flex-col gap-2">
                                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white px-3 py-2 rounded-lg border border-emerald-100 shadow-sm">
                                              <CheckCircle className="w-4 h-4 text-emerald-500" /> 
                                              Paid via {settlementInfo.paymentMethod}
                                          </div>
                                          <div className="flex justify-between items-center px-1">
                                              <span className="text-[10px] text-gray-400">{new Date(settlementInfo.date).toLocaleDateString()}</span>
                                              <button 
                                                  onClick={() => handleUnsettle(settlementKey)}
                                                  className="text-[10px] text-gray-400 hover:text-red-500 hover:underline flex items-center gap-1 transition-colors"
                                              >
                                                  <RefreshCcw className="w-3 h-3" /> Revert
                                              </button>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="space-y-3">
                                          <div className="flex justify-between items-center">
                                              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" /> Pending Settlement
                                              </span>
                                          </div>
                                          <div className="flex gap-2">
                                              <select 
                                                  className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full shadow-sm"
                                                  value={selectedPaymentMethods[settlementKey] || 'Bank Transfer'}
                                                  onChange={(e) => handlePaymentMethodSelect(settlementKey, e.target.value)}
                                              >
                                                  <option>Bank Transfer</option>
                                                  <option>Cash</option>
                                                  <option>Cheque</option>
                                                  <option>UPI</option>
                                              </select>
                                              <button 
                                                  onClick={() => handleSettle(settlementKey, shareAmount)}
                                                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition-colors whitespace-nowrap"
                                              >
                                                  Settle
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Method</th>
                          {isSuperAdmin && !isAdminExpensesTab && <th className="px-6 py-4">Franchise</th>}
                          <th className="px-6 py-4 text-right">Amount</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredExpenses.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                  <div className="font-bold text-gray-800">{item.title}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                                      {item.category}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{item.paymentMethod}</td>
                              {isSuperAdmin && !isAdminExpensesTab && (
                                  <td className="px-6 py-4">
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs border border-indigo-100 font-medium">
                                          {item.franchiseName || 'Head Office'}
                                      </span>
                                  </td>
                              )}
                              <td className={`px-6 py-4 text-right font-bold ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.type === 'Income' ? '+' : '-'}₹{item.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button 
                                          onClick={() => {
                                              setEditingId(item.id);
                                              setFormData({
                                                  title: item.title,
                                                  amount: item.amount.toString(),
                                                  type: item.type,
                                                  category: item.category,
                                                  date: item.date,
                                                  paymentMethod: item.paymentMethod,
                                                  description: item.description
                                              });
                                              setIsModalOpen(true);
                                          }}
                                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                                      >
                                          <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                          onClick={() => handleDelete(item.id, item.ownerId)}
                                          className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                      {filteredExpenses.length === 0 && (
                          <tr><td colSpan={isSuperAdmin && !isAdminExpensesTab ? 7 : 6} className="py-12 text-center text-gray-400">No transactions found.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 text-lg">{editingId ? 'Edit Transaction' : 'New Transaction'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button type="button" onClick={() => setFormData({...formData, type: 'Income'})} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Income</button>
                          <button type="button" onClick={() => setFormData({...formData, type: 'Expense'})} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Expense</button>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                          <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Office Rent" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label>
                              <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0.00" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                              <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                                  <option>Bank Transfer</option>
                                  <option>Cash</option>
                                  <option>UPI</option>
                                  <option>Cheque</option>
                                  <option>Card</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (Optional)</label>
                          <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="Additional details..." />
                      </div>

                      <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg mt-2">
                          {editingId ? 'Update Transaction' : 'Save Transaction'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Expenses;
