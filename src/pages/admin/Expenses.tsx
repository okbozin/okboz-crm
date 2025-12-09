
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
