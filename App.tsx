
import React, { useState, useEffect, useMemo } from 'react';
import { Trip, Expense, Balance, Settlement } from './types';
import { subscribeToTrip, subscribeToExpenses, subscribeToSettlements } from './services/db';
import { isFirebaseConfigured } from './firebase';
import { AVATARS } from './assets/avatars';
import Onboarding from './components/Onboarding';
import TripManager from './components/TripManager';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Settlements from './components/Settlements';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('trip_user_name'));
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate balances
  const balances: Balance[] = useMemo(() => {
    if (!trip) return [];
    return trip.participants.map(name => {
      let paid = 0;
      let owed = 0;
      
      // Calculate from expenses
      expenses.forEach(exp => {
        if (exp.paidBy === name) paid += exp.amount;
        if (exp.splitBetween.includes(name)) {
          if (exp.splitType === 'custom' && exp.customSplits && exp.customSplits[name]) {
            owed += exp.customSplits[name];
          } else {
            owed += exp.perPersonAmount;
          }
        }
      });
      
      // Adjust for paid settlements
      const paidSettlements = settlements.filter(s => s.isPaid);
      paidSettlements.forEach(settlement => {
        if (settlement.from === name) {
          // This person paid someone, reduce what they owe
          paid += settlement.amount;
        }
        if (settlement.to === name) {
          // This person received payment, increase what they're owed
          owed += settlement.amount;
        }
      });
      
      return { name, paid, owed, net: paid - owed };
    });
  }, [trip, expenses, settlements]);

  // Initialize trip ID from localStorage after component mounts
  useEffect(() => {
    const storedTripId = localStorage.getItem('current_trip_id');
    if (storedTripId) {
      setCurrentTripId(storedTripId);
    }
  }, []);

  useEffect(() => {
    if (!currentTripId) {
      setTrip(null);
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setDbError(null);
    localStorage.setItem('current_trip_id', currentTripId);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
      setDbError("Connection timeout. Please check your internet connection and try again.");
      setCurrentTripId(null);
      localStorage.removeItem('current_trip_id');
    }, 5000); // 5 second timeout
    
    const unsubTrip = subscribeToTrip(currentTripId, (data) => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      if (!data) {
        setDbError("Trip not found. Verify the Trip ID or check if it was deleted.");
        setCurrentTripId(null);
        localStorage.removeItem('current_trip_id');
      } else {
        setTrip(data);
        setDbError(null);
      }
    });

    const unsubExpenses = subscribeToExpenses(currentTripId, (data) => {
      setExpenses(data);
    });

    const unsubSettlements = subscribeToSettlements(currentTripId, (data) => {
      setSettlements(data);
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubTrip();
      unsubExpenses();
      unsubSettlements();
    };
  }, [currentTripId]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
        <div className="max-w-md bg-white p-10 rounded-[2rem] shadow-2xl border-2 border-[#f49221]">
          <div className="w-20 h-20 bg-[#f49221] text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-black mb-4 font-pt">Configuration Required</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">The application needs valid Firebase credentials to function. Check your setup.</p>
        </div>
      </div>
    );
  }

  if (!userName) return <Onboarding onJoin={setUserName} />;
  
  if (!currentTripId || dbError) {
    return (
      <div className="min-h-screen bg-white pt-10 px-4">
        {dbError && (
          <div className="max-w-md mx-auto mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-3">
             <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {dbError}
          </div>
        )}
        <TripManager onTripSelected={setCurrentTripId} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f49221] border-t-transparent mb-4 shadow-lg shadow-[#f49221]/20"></div>
        <p className="text-black font-bold uppercase tracking-widest text-[10px] mb-6">Connecting to Firebase...</p>
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          Clear & Restart
        </button>
      </div>
    );
  }

  if (!trip && currentTripId) {
    // Still waiting for trip data
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f49221] border-t-transparent mb-4 shadow-lg shadow-[#f49221]/20"></div>
        <p className="text-black font-bold uppercase tracking-widest text-[10px] mb-6">Loading trip...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a0a00] to-black pb-20 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f49221] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#e58515] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[#f49221] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-[#f49221]/80 to-[#e58515]/80 border-b border-white/10 shadow-2xl shadow-[#f49221]/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/pics/manas.png" alt="Manas Split Logo" className="w-10 h-10 rounded-xl shadow-lg hover:scale-110 transition-transform object-cover" />
            <h1 className="text-xl font-bold text-white tracking-tight">Manas Split</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentTripId(null);
                localStorage.removeItem('current_trip_id');
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-sm font-medium transition-all border border-white/30 hover:border-white/50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Trips
            </button>
            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white font-bold border-2 border-white/40 shadow-lg hover:scale-110 transition-transform cursor-pointer">
              {userName?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8 backdrop-blur-sm bg-white/5 rounded-3xl p-6 border border-white/10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-[#f49221] to-white bg-clip-text text-transparent mb-3">Dashboard</h2>
          <p className="text-gray-300 text-sm">An overview of your group's expenses and balances.</p>
          <button 
            onClick={() => { navigator.clipboard.writeText(currentTripId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="mt-3 text-xs text-gray-400 hover:text-[#f49221] transition-colors backdrop-blur-sm bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:border-[#f49221]/50"
          >
            Trip: {trip.name} • ID: {currentTripId.substring(0, 12)}... {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-1 h-8 bg-gradient-to-b from-[#f49221] to-[#e58515] rounded-full"></span>
              Balances
            </h3>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#f49221] to-[#e58515] hover:from-[#e58515] hover:to-[#f49221] text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-[#f49221]/50 hover:shadow-xl hover:shadow-[#f49221]/60 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Expense
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map(balance => (
              <div key={balance.name} className="group relative backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:border-[#f49221]/50 transition-all hover:shadow-2xl hover:shadow-[#f49221]/30 hover:scale-105 duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#f49221]/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {trip.memberAvatars && trip.memberAvatars[balance.name] ? (
                        <img 
                          src={AVATARS.find(a => a.id === trip.memberAvatars![balance.name])?.image || ''} 
                          alt={balance.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#f49221]/50"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#f49221]/20 rounded-full flex items-center justify-center text-[#f49221] font-bold border-2 border-[#f49221]/50">
                          {balance.name[0]}
                        </div>
                      )}
                      <h4 className="text-white font-bold text-lg">{balance.name}</h4>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md ${balance.net < -0.01 ? 'bg-red-500/30 text-red-200 border border-red-400/30' : balance.net > 0.01 ? 'bg-[#f49221]/30 text-[#f49221] border border-[#f49221]/30' : 'bg-gray-500/30 text-gray-300 border border-gray-400/30'}`}>
                      {balance.net < -0.01 ? 'Owes' : balance.net > 0.01 ? 'Gets Back' : 'Settled'}
                    </span>
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-r from-[#f49221] via-[#ff9d3d] to-[#e58515] bg-clip-text text-transparent mb-3 drop-shadow-lg">
                    ₹{Math.abs(balance.net).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <span className="w-2 h-2 bg-[#f49221] rounded-full animate-pulse"></span>
                    Paid: <span className="text-[#f49221] font-bold">₹{balance.paid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Settlements balances={balances} tripId={trip.id} trackedSettlements={settlements} participants={trip.participants} trip={trip} />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-1 h-8 bg-gradient-to-b from-[#f49221] to-[#e58515] rounded-full"></span>
              Recent Expenses
            </h3>
            <span className="backdrop-blur-md bg-white/10 border border-white/20 text-gray-300 text-sm px-4 py-2 rounded-full font-medium">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</span>
          </div>
          
          {expenses.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border-2 border-dashed border-[#f49221]/30 rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#f49221]/20 to-[#e58515]/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-[#f49221]/30">
                <svg className="w-10 h-10 text-[#f49221]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-300 text-xl font-semibold mb-2">No expenses yet</p>
              <p className="text-gray-500 text-sm mb-8">Get started by adding your first expense.</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#f49221] to-[#e58515] hover:from-[#e58515] hover:to-[#f49221] text-white px-8 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-xl shadow-[#f49221]/50 hover:shadow-2xl hover:shadow-[#f49221]/60 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Expense
              </button>
            </div>
          ) : (
            <ExpenseList expenses={expenses} />
          )}
        </div>
      </main>

      <button 
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#f49221] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 shadow-[#f49221]/40 border-4 border-white"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {showForm && (
        <ExpenseForm 
          tripId={trip.id}
          participants={trip.participants}
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
};

export default App;
