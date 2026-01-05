
import React, { useState, useMemo } from 'react';
import { PaymentMethod, SplitType } from '../types';
import { createExpense } from '../services/db';

interface ExpenseFormProps {
  tripId: string;
  participants: string[];
  onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ tripId, participants, onClose }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('fair');
  const [customAmounts, setCustomAmounts] = useState<{ [name: string]: string }>({});
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [loading, setLoading] = useState(false);

  const perPerson = useMemo(() => {
    if (splitType === 'custom') return 0;
    const val = parseFloat(amount);
    return isNaN(val) || splitBetween.length === 0 ? 0 : val / splitBetween.length;
  }, [amount, splitBetween, splitType]);

  const customTotal = useMemo(() => {
    return Object.values(customAmounts).reduce((sum: number, val) => sum + (parseFloat(val as string) || 0), 0);
  }, [customAmounts]);

  const customValidation = useMemo(() => {
    const total = parseFloat(amount);
    if (isNaN(total) || splitType !== 'custom') return { valid: true, message: '' };
    const diff = Math.abs(customTotal - total);
    if (diff > 0.01) {
      return { valid: false, message: `Custom amounts (₹${customTotal.toFixed(2)}) don't match total (₹${total})` };
    }
    return { valid: true, message: '✓ Custom amounts match total' };
  }, [customTotal, amount, splitType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !paidBy || splitBetween.length === 0) return alert("Please fill all required fields.");
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return alert("Please enter a valid amount greater than 0.");
    }
    
    if (splitType === 'custom' && !customValidation.valid) {
      return alert(customValidation.message);
    }
    
    setLoading(true);
    try {
      const expenseData: any = {
        title,
        amount: parsedAmount,
        paidBy,
        splitBetween,
        perPersonAmount: perPerson,
        splitType,
        paymentMethod: method
      };
      
      // Only include customSplits if it's a custom split
      if (splitType === 'custom') {
        expenseData.customSplits = Object.fromEntries(
          Object.entries(customAmounts).map(([k, v]) => [k, parseFloat(v as string) || 0])
        );
      }
      
      await createExpense(tripId, expenseData);
      onClose();
    } catch (err) { 
      console.error("Error creating expense:", err);
      alert("Failed to save transaction. Check your backend/permissions."); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 border-4 border-[#f49221]">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-black font-pt uppercase tracking-tight">Add Transaction</h2>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Expense Item</label>
              <input type="text" placeholder="e.g. Flight Tickets" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#f49221] outline-none font-bold text-black" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Amount (INR)</label>
              <input type="number" placeholder="0.00" className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#f49221] outline-none font-bold text-black" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Who Paid?</label>
              <select className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#f49221] outline-none bg-white font-bold text-black" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                <option value="">Select Member</option>
                {participants.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Payment Channel</label>
              <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                {(['UPI', 'Cash'] as PaymentMethod[]).map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)} className={`flex-1 py-3 text-xs rounded-xl font-bold transition-all uppercase tracking-widest ${method === m ? 'bg-white shadow-xl text-[#f49221]' : 'text-gray-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Split Type</label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl">
                <button type="button" onClick={() => setSplitType('fair')} className={`px-4 py-2 text-[10px] rounded-lg font-bold transition-all uppercase tracking-widest ${splitType === 'fair' ? 'bg-white shadow-lg text-[#f49221]' : 'text-gray-400'}`}>
                  Fair Split
                </button>
                <button type="button" onClick={() => setSplitType('custom')} className={`px-4 py-2 text-[10px] rounded-lg font-bold transition-all uppercase tracking-widest ${splitType === 'custom' ? 'bg-white shadow-lg text-[#f49221]' : 'text-gray-400'}`}>
                  Custom Split
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-3 ml-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Distributed Among</label>
              <button type="button" onClick={() => setSplitBetween([...participants])} className="text-[10px] font-bold text-[#f49221] uppercase tracking-widest">Select Everyone</button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {participants.map(name => (
                <label key={name} className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${splitBetween.includes(name) ? 'bg-[#f49221]/10 border-[#f49221]' : 'bg-white border-gray-100'}`}>
                  <input type="checkbox" className="hidden" checked={splitBetween.includes(name)} onChange={() => setSplitBetween(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name])} />
                  <span className={`text-xs font-black uppercase tracking-tight ${splitBetween.includes(name) ? 'text-black' : 'text-gray-400'}`}>{name}</span>
                </label>
              ))}
            </div>
          </div>

          {splitType === 'custom' && splitBetween.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">Custom Amounts Per Person</label>
              <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
                {splitBetween.map(name => (
                  <div key={name} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                    <span className="text-sm font-bold text-black flex-1">{name}</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-28 pl-8 pr-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#f49221] outline-none font-bold text-sm text-black"
                        value={customAmounts[name] || ''}
                        onChange={(e) => setCustomAmounts({ ...customAmounts, [name]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 p-3 rounded-xl text-xs font-bold ${customValidation.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {customValidation.message || `Total: ₹${customTotal.toFixed(2)} / ₹${amount || '0'}`}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-[#f49221] text-white font-bold py-6 rounded-2xl shadow-2xl shadow-[#f49221]/40 transition-all uppercase tracking-[0.2em] disabled:opacity-50 text-sm">
            {loading ? 'Processing...' : 'Secure Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
