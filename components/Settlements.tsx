
import React, { useState } from 'react';
import { Balance, Settlement, Trip } from '../types';
import { createSettlement, markSettlementAsPaid, deleteSettlement, uploadProof } from '../services/db';
import { AVATARS } from '../assets/avatars';

interface SettlementsProps {
  balances: Balance[];
  tripId: string;
  trackedSettlements: Settlement[];
  participants: string[];
  trip?: Trip;
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

const Settlements: React.FC<SettlementsProps> = ({ balances, tripId, trackedSettlements, participants, trip }) => {
  const [creatingSettlement, setCreatingSettlement] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customProofFile, setCustomProofFile] = useState<File | null>(null);
  const [submittingCustom, setSubmittingCustom] = useState(false);
  const [markingAsPaid, setMarkingAsPaid] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<{ [settlementId: string]: File }>({});
  // Calculate optimal settlements (who owes whom)
  const calculateSettlements = (): Transaction[] => {
    const debtors = balances.filter(b => b.net < 0).map(b => ({ name: b.name, amount: Math.abs(b.net) }));
    const creditors = balances.filter(b => b.net > 0).map(b => ({ name: b.name, amount: b.net }));
    
    const transactions: Transaction[] = [];
    
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      
      if (settleAmount > 0.01) { // Only if amount is significant
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: settleAmount
        });
      }
      
      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
      
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    
    return transactions;
  };

  const settlements = calculateSettlements();

  const handleCreateSettlement = async (txn: Transaction) => {
    const key = `${txn.from}-${txn.to}`;
    setCreatingSettlement(key);
    try {
      await createSettlement(tripId, txn.from, txn.to, txn.amount);
    } catch (error) {
      console.error('Error creating settlement:', error);
      alert('Failed to create settlement. Check Firebase permissions.');
    } finally {
      setCreatingSettlement(null);
    }
  };

  const handleMarkAsPaid = async (settlementId: string) => {
    setMarkingAsPaid(settlementId);
    try {
      let proofUrl: string | undefined;
      if (proofFiles[settlementId]) {
        try {
          proofUrl = await uploadProof(proofFiles[settlementId]);
        } catch (err) {
          console.error('Error uploading proof:', err);
          alert('Failed to upload proof image, but marking as paid anyway.');
        }
      }
      await markSettlementAsPaid(settlementId, proofUrl);
      // Clear the proof file after successful submission
      const updated = { ...proofFiles };
      delete updated[settlementId];
      setProofFiles(updated);
    } catch (error) {
      console.error('Error marking settlement as paid:', error);
      alert('Failed to mark as paid. Check Firebase permissions.');
    } finally {
      setMarkingAsPaid(null);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await deleteSettlement(settlementId);
    } catch (error) {
      console.error('Error deleting settlement:', error);
      alert('Failed to delete payment. Check Firebase permissions.');
    }
  };

  const handleCustomSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo || !customAmount) {
      alert('Please fill all fields');
      return;
    }
    if (customFrom === customTo) {
      alert('Cannot pay yourself!');
      return;
    }
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSubmittingCustom(true);
    try {
      let proofUrl: string | undefined;
      if (customProofFile) {
        try {
          proofUrl = await uploadProof(customProofFile);
        } catch (err) {
          console.error('Error uploading proof:', err);
          alert('Failed to upload proof image, but recording payment anyway.');
        }
      }
      await createSettlement(tripId, customFrom, customTo, amount, proofUrl);
      setShowCustomForm(false);
      setCustomFrom('');
      setCustomTo('');
      setCustomAmount('');
      setCustomProofFile(null);
    } catch (error) {
      console.error('Error creating custom settlement:', error);
      alert('Failed to create payment. Check Firebase permissions.');
    } finally {
      setSubmittingCustom(false);
    }
  };

  const unpaidSettlements = trackedSettlements.filter(s => !s.isPaid);
  const paidSettlements = trackedSettlements.filter(s => s.isPaid);

  if (settlements.length === 0 && unpaidSettlements.length === 0 && paidSettlements.length === 0) {
    return (
      <div className="mt-8 bg-gradient-to-br from-green-900 to-green-950 rounded-3xl p-8 text-center border-2 border-green-700">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-bold text-xl mb-2">All Settled!</h3>
        <p className="text-green-300 text-sm">Everyone is balanced. No payments needed.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Add Custom Payment Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-2xl font-bold">Settlements</h3>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className="bg-[#f49221] hover:bg-[#e58515] text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Custom Payment Form */}
      {showCustomForm && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-[#f49221] rounded-2xl p-6 shadow-2xl shadow-[#f49221]/20">
          <h4 className="text-white font-bold text-lg mb-4">Record a Payment</h4>
          <form onSubmit={handleCustomSettlement} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2 block">Who Paid</label>
                <select
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#f49221] outline-none"
                  required
                >
                  <option value="">Select person</option>
                  {participants.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2 block">Paid To</label>
                <select
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#f49221] outline-none"
                  required
                >
                  <option value="">Select person</option>
                  {participants.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm font-medium mb-2 block">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-[#f49221] outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm font-medium mb-2 block">Payment Proof (Optional)</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 hover:border-[#f49221] transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">
                      {customProofFile ? customProofFile.name : 'Upload screenshot or photo'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCustomProofFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {customProofFile && (
                  <button
                    type="button"
                    onClick={() => setCustomProofFile(null)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-3 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submittingCustom}
                className="bg-[#f49221] hover:bg-[#e58515] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex-1"
              >
                {submittingCustom ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomFrom('');
                  setCustomTo('');
                  setCustomAmount('');
                  setCustomProofFile(null);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tracked Settlements - Unpaid */}
      {unpaidSettlements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold">Pending Payments</h3>
            <span className="bg-red-900 text-red-300 text-xs font-bold px-3 py-1 rounded-full">
              {unpaidSettlements.length} Pending
            </span>
          </div>
          
          <div className="space-y-3">
            {unpaidSettlements.map((settlement) => (
              <div key={settlement.id} className="bg-gradient-to-r from-red-950 via-gray-900 to-red-900 rounded-2xl p-5 border-2 border-[#f49221]/50 shadow-lg hover:shadow-[#f49221]/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {trip?.memberAvatars && trip.memberAvatars[settlement.from] ? (
                      <img 
                        src={AVATARS.find(a => a.id === trip.memberAvatars![settlement.from])?.image || ''} 
                        alt={settlement.from}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {settlement.from[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-bold">{settlement.from}</div>
                      <div className="text-red-300 text-xs">owes</div>
                    </div>
                  </div>
                  
                  <div className="px-6">
                    <svg className="w-8 h-8 text-[#f49221]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 text-right">
                      <div className="text-white font-bold">{settlement.to}</div>
                      <div className="text-red-300 text-xs">receives</div>
                    </div>
                    {trip?.memberAvatars && trip.memberAvatars[settlement.to] ? (
                      <img 
                        src={AVATARS.find(a => a.id === trip.memberAvatars![settlement.to])?.image || ''} 
                        alt={settlement.to}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {settlement.to[0]}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 flex items-center gap-3">
                    <div className="bg-[#f49221] text-white font-bold px-4 py-2 rounded-xl text-lg">
                      ₹{settlement.amount.toFixed(2)}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${proofFiles[settlement.id] ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {proofFiles[settlement.id] ? '✓ Proof added' : 'Add proof'}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setProofFiles({ ...proofFiles, [settlement.id]: e.target.files[0] });
                              }
                            }}
                          />
                        </label>
                        {proofFiles[settlement.id] && (
                          <button
                            onClick={() => {
                              const updated = { ...proofFiles };
                              delete updated[settlement.id];
                              setProofFiles(updated);
                            }}
                            className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                            title="Remove proof"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(settlement.id)}
                        disabled={markingAsPaid === settlement.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Mark as paid"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        {markingAsPaid === settlement.id ? 'Saving...' : 'Paid'}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteSettlement(settlement.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-colors"
                      title="Delete payment"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Settlements */}
      {settlements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold">Suggested Settlements</h3>
            <span className="bg-[#f49221] text-white text-xs font-bold px-3 py-1 rounded-full">
              {settlements.length} Suggested
            </span>
          </div>
          
          <div className="space-y-3">
            {settlements.map((txn, idx) => {
              const key = `${txn.from}-${txn.to}`;
              const isTracked = unpaidSettlements.some(s => s.from === txn.from && s.to === txn.to && Math.abs(s.amount - txn.amount) < 0.01);
              
              if (isTracked) return null; // Skip if already tracked
              
              return (
                <div key={idx} className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 border-2 border-[#f49221]/30 hover:border-[#f49221] transition-all hover:shadow-xl hover:shadow-[#f49221]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {trip?.memberAvatars && trip.memberAvatars[txn.from] ? (
                        <img 
                          src={AVATARS.find(a => a.id === trip.memberAvatars![txn.from])?.image || ''} 
                          alt={txn.from}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {txn.from[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-white font-bold">{txn.from}</div>
                        <div className="text-gray-400 text-xs">should pay</div>
                      </div>
                    </div>
                    
                    <div className="px-6">
                      <svg className="w-8 h-8 text-[#f49221]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1 text-right">
                        <div className="text-white font-bold">{txn.to}</div>
                        <div className="text-gray-400 text-xs">receives</div>
                      </div>
                      {trip?.memberAvatars && trip.memberAvatars[txn.to] ? (
                        <img 
                          src={AVATARS.find(a => a.id === trip.memberAvatars![txn.to])?.image || ''} 
                          alt={txn.to}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {txn.to[0]}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6 flex items-center gap-3">
                      <div className="bg-[#f49221] text-white font-bold px-4 py-2 rounded-xl text-lg">
                        ₹{txn.amount.toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleCreateSettlement(txn)}
                        disabled={creatingSettlement === key}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                        title="Track this payment"
                      >
                        {creatingSettlement === key ? 'Adding...' : 'Track'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid Settlements */}
      {paidSettlements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold">Completed Payments</h3>
            <span className="bg-green-900 text-green-300 text-xs font-bold px-3 py-1 rounded-full">
              {paidSettlements.length} Completed
            </span>
          </div>
          
          <div className="space-y-3">
            {paidSettlements.map((settlement) => (
              <div key={settlement.id} className="bg-gradient-to-r from-green-950 to-green-900 rounded-2xl p-5 border-2 border-green-800 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {trip?.memberAvatars && trip.memberAvatars[settlement.from] ? (
                      <img 
                        src={AVATARS.find(a => a.id === trip.memberAvatars![settlement.from])?.image || ''} 
                        alt={settlement.from}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {settlement.from[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-bold">{settlement.from}</div>
                      <div className="text-green-300 text-xs">paid</div>
                    </div>
                  </div>
                  
                  <div className="px-6">
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 text-right">
                      <div className="text-white font-bold">{settlement.to}</div>
                      <div className="text-green-300 text-xs">received</div>
                    </div>
                    {trip?.memberAvatars && trip.memberAvatars[settlement.to] ? (
                      <img 
                        src={AVATARS.find(a => a.id === trip.memberAvatars![settlement.to])?.image || ''} 
                        alt={settlement.to}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {settlement.to[0]}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 flex items-center gap-3">
                    <div className="bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-lg">
                      ₹{settlement.amount.toFixed(2)}
                    </div>
                    <div className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      Paid
                    </div>
                    <button
                      onClick={() => handleDeleteSettlement(settlement.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-colors"
                      title="Delete payment"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {settlement.paidAt && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-green-400 text-xs">
                      Paid on {new Date(settlement.paidAt).toLocaleDateString()}
                    </div>
                    {settlement.proofImageUrl && (
                      <a
                        href={settlement.proofImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Proof
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
