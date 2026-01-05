
import React, { useState } from 'react';
import { Expense } from '../types';
import { deleteExpense } from '../services/db';

interface ExpenseListProps {
  expenses: Expense[];
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    setDeletingId(expenseId);
    try {
      await deleteExpense(expenseId);
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Check Firebase permissions.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl overflow-hidden shadow-2xl shadow-[#f49221]/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-[#f49221] to-[#e58515] text-white backdrop-blur-xl">
              <tr>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Description</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Value</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Paid By</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Split</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Proof</th>
                <th className="px-6 py-5 font-bold uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-white/10 transition-all border-l-4 border-transparent hover:border-[#f49221] backdrop-blur-sm group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-white text-base">{exp.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(exp.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-5 font-bold text-lg text-white">₹{exp.amount.toFixed(2)}</td>
                  <td className="px-6 py-5">
                    <div className="text-gray-300 font-medium">{exp.paidBy}</div>
                    <div className="text-xs text-gray-600">({exp.paymentMethod})</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-gray-300 font-medium text-sm">{exp.splitBetween.length} person{exp.splitBetween.length !== 1 ? 's' : ''}</div>
                    {exp.splitType === 'custom' ? (
                      <div className="text-xs text-purple-400 font-bold mt-1">CUSTOM SPLIT</div>
                    ) : (
                      <div className="text-xs text-[#f49221] font-bold mt-1">₹{exp.perPersonAmount.toFixed(2)} each</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {exp.proofImageUrl ? (
                      <button 
                        onClick={() => setSelectedImage(exp.proofImageUrl!)}
                        className="bg-[#f49221] hover:bg-[#e58515] text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">No proof</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deletingId === exp.id}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete expense"
                    >
                      {deletingId === exp.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-6 z-[60] backdrop-blur-xl" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button className="absolute -top-16 right-0 text-white hover:text-[#f49221] transition-colors p-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={selectedImage} alt="Payment Proof" className="max-h-[80vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(244,146,33,0.3)] border-4 border-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
