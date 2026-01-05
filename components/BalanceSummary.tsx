
import React, { useState } from 'react';
import { Expense, Balance } from '../types';
import { getAIRecommendation } from '../services/ai';

interface BalanceSummaryProps {
  participants: string[];
  expenses: Expense[];
}

const BalanceSummary: React.FC<BalanceSummaryProps> = ({ participants, expenses }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const balances: Balance[] = participants.map(name => {
    let paid = 0;
    let owed = 0;
    expenses.forEach(exp => {
      if (exp.paidBy === name) paid += exp.amount;
      if (exp.splitBetween.includes(name)) {
        // Handle custom splits
        if (exp.splitType === 'custom' && exp.customSplits && exp.customSplits[name]) {
          owed += exp.customSplits[name];
        } else {
          owed += exp.perPersonAmount;
        }
      }
    });
    return { name, paid, owed, net: paid - owed };
  });

  const fetchAdvice = async () => {
    if (expenses.length === 0) return;
    setLoadingAi(true);
    const advice = await getAIRecommendation(expenses, balances);
    setAiAdvice(advice || null);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-8 mb-12">
      {/* AI Intelligence Card */}
      <div className="bg-black text-white rounded-3xl p-6 shadow-2xl border-b-4 border-[#f49221]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f49221] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold uppercase tracking-widest text-[10px] text-[#f49221]">Logical Intelligence</h3>
              <p className="font-pt text-sm font-bold">Smart Recommendations</p>
            </div>
          </div>
          <button 
            onClick={fetchAdvice}
            disabled={loadingAi}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${loadingAi ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="bg-gray-900/50 rounded-2xl p-4 min-h-[60px] flex items-center">
          <p className="text-gray-400 text-sm leading-relaxed italic">
            {aiAdvice || "Analyze trip data to see who should pay for the next expense to keep balances fair."}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b-2 border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-black uppercase tracking-widest text-xs">Settlement Dashboard</h2>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-[#f49221]"></div>
            <div className="h-2 w-2 rounded-full bg-black"></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Name</th>
                <th className="px-8 py-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Total Paid</th>
                <th className="px-8 py-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Fair Share</th>
                <th className="px-8 py-4 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Net Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {balances.map(b => (
                <tr key={b.name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6 font-bold text-black">{b.name}</td>
                  <td className="px-8 py-6 text-gray-600 font-medium">₹{b.paid.toFixed(2)}</td>
                  <td className="px-8 py-6 text-gray-600 font-medium">₹{b.owed.toFixed(2)}</td>
                  <td className={`px-8 py-6 font-black text-lg ${b.net > 0 ? 'text-green-600' : b.net < 0 ? 'text-[#f49221]' : 'text-gray-300'}`}>
                    {b.net > 0 ? `+₹${b.net.toFixed(2)}` : b.net < 0 ? `-₹${Math.abs(b.net).toFixed(2)}` : 'SETTLED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BalanceSummary;
