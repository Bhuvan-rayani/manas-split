
import React, { useState } from 'react';

interface OnboardingProps {
  onJoin: (name: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      // Just store locally, don't need to save user to Firebase
      localStorage.setItem('trip_user_name', name.trim());
      onJoin(name.trim());
    } catch (error) {
      console.error("Error joining:", error);
      alert("Error saving your name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12 text-center border-4 border-[#f49221]">
        <div className="w-24 h-24 bg-[#f49221] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#f49221]/30 rotate-3">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-black mb-2 font-pt tracking-tighter uppercase">Manas Split</h1>
        <p className="text-gray-500 mb-10 font-medium">Smart expense tracking for your crew.</p>
        
        <form onSubmit={handleSubmit} className="space-y-8 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Identify Yourself</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Full Name"
              className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:outline-none focus:border-[#f49221] transition-all text-lg font-bold text-black"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f49221] hover:bg-[#d97e1a] text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-[#f49221]/30 disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? 'Authenticating...' : 'Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
