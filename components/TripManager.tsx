
import React, { useState } from 'react';
import { createTrip } from '../services/db';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { AVATARS } from '../assets/avatars';

interface TripManagerProps {
  onTripSelected: (tripId: string) => void;
}

const TripManager: React.FC<TripManagerProps> = ({ onTripSelected }) => {
  const [view, setView] = useState<'selection' | 'create' | 'join'>('selection');
  const [tripName, setTripName] = useState('');
  const [participants, setParticipants] = useState<string[]>(['', '']);
  const [memberAvatars, setMemberAvatars] = useState<{ [name: string]: string }>({});
  const [showAvatarPicker, setShowAvatarPicker] = useState<string | null>(null);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testFirebase = async () => {
    try {
      console.log('Testing Firebase connection...');
      const testCollection = collection(db, 'trips');
      const snapshot = await getDocs(testCollection);
      console.log('✅ Firebase connected successfully. Found', snapshot.size, 'trips');
      return { success: true, error: null };
    } catch (err: any) {
      console.error('❌ Firebase connection error:', err);
      let errorMsg = 'Unknown error';
      if (err.code === 'permission-denied') {
        errorMsg = '❌ PERMISSION DENIED - Firebase security rules are NOT allowing access. Your rules may not have been saved properly.';
      } else if (err.code === 'unavailable') {
        errorMsg = 'Firebase service unavailable. Check your internet connection.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      console.error('Detailed error:', err);
      return { success: false, error: errorMsg };
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = participants.filter(x => x.trim() !== '');
    if (!tripName || p.length < 2) return alert("Trip name and 2+ people needed.");
    
    setError('');
    console.log("Creating trip with:", { tripName, participants: p });
    
    // Test Firebase connection first
    const result = await testFirebase();
    if (!result.success) {
      setError(`Firebase Error: ${result.error}`);
      return;
    }
    
    setLoading(true);
    
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Connection timeout after 8 seconds. Firebase security rules may be blocking writes.");
    }, 8000);
    
    try {
      // Create trip with avatars
      console.log('🚀 Starting trip creation...');
      const id = await createTrip(tripName, p, memberAvatars);
      clearTimeout(timeout);
      console.log("✅ Trip created successfully with ID:", id);
      onTripSelected(id);
    } catch (err: any) { 
      clearTimeout(timeout);
      setLoading(false);
      console.error("❌ Create trip error:", err);
      
      let errorMsg = "Error creating trip: ";
      if (err.code === 'permission-denied') {
        errorMsg += "❌ Permission denied. Firebase rules are STILL not set correctly. Please check Firebase Console Firestore Rules.";
      } else if (err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += "Unknown error. Check browser console (F12) for details.";
      }
      setError(errorMsg);
    }
  };

  if (view === 'create') {
    return (
      <>
        <div className="max-w-md mx-auto p-10 bg-white rounded-[2.5rem] shadow-2xl mt-12 border-4 border-black">
          <h2 className="text-3xl font-bold mb-8 text-black font-pt uppercase tracking-tight">New Trip</h2>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-800 text-sm">
              <p className="font-bold mb-2">⚠️ Error</p>
              <p className="text-xs leading-relaxed">{error}</p>
              {error.includes('security rules') && (
                <p className="mt-3 text-xs">
                  <strong>Fix:</strong> Go to Firebase Console → Firestore Database → Rules and set:<br/>
                  <code className="block mt-1 bg-red-100 p-2 rounded">allow read, write: if true;</code>
                </p>
              )}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-6">
            <input required className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-[#f49221] outline-none font-bold text-black placeholder-gray-400" placeholder="Destination Name" value={tripName} onChange={e => setTripName(e.target.value)} />
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Participants</label>
              {participants.map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    {p.trim() && memberAvatars[p] && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-[#f49221]">
                        <img 
                          src={AVATARS.find(a => a.id === memberAvatars[p])?.image || ''} 
                          alt={p}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <input required className="flex-1 px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-[#f49221] outline-none text-black placeholder-gray-400 font-bold" placeholder={`Friend ${i+1}`} value={p} onChange={e => {
                      const n = [...participants]; n[i] = e.target.value; setParticipants(n);
                    }} />
                  </div>
                  {p.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(p)}
                      className="ml-2 text-xs text-[#f49221] font-bold hover:underline"
                    >
                      {memberAvatars[p] ? '✓ Change Avatar' : '+ Add Avatar (Optional)'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setParticipants([...participants, ''])} className="text-xs text-[#f49221] font-bold uppercase tracking-wider hover:underline ml-1">+ Add Participant</button>
            <div className="pt-8 flex flex-col gap-4">
              <button type="submit" disabled={loading} className="w-full py-5 bg-[#f49221] text-white rounded-2xl font-bold shadow-xl shadow-[#f49221]/20 uppercase tracking-widest disabled:opacity-50">
                {loading ? 'Creating Trip...' : 'Launch Trip'}
              </button>
              <button type="button" onClick={() => setView('selection')} disabled={loading} className="w-full py-4 px-4 border-2 border-black rounded-2xl font-bold text-black uppercase tracking-widest text-xs disabled:opacity-50">Back</button>
            </div>
          </form>
        </div>

        {showAvatarPicker && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border-2 border-[#f49221]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-black">Choose Avatar</h3>
                <button onClick={() => setShowAvatarPicker(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setMemberAvatars({ ...memberAvatars, [showAvatarPicker]: avatar.id });
                      setShowAvatarPicker(null);
                    }}
                    className="w-full aspect-square rounded-2xl overflow-hidden hover:scale-110 transition-all border-2 border-transparent hover:border-[#f49221]"
                  >
                    <img src={avatar.image} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAvatarPicker(null)}
                className="w-full py-3 bg-gray-100 text-black rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (view === 'join') {
    return (
      <div className="max-w-md mx-auto p-10 bg-white rounded-[2.5rem] shadow-2xl mt-12 border-4 border-black text-center">
        <h2 className="text-3xl font-bold mb-8 text-black font-pt uppercase">Join Trip</h2>
        <input className="w-full px-6 py-5 border-2 border-gray-100 rounded-2xl focus:border-[#f49221] outline-none mb-8 text-center font-mono text-xl text-black placeholder-gray-400" placeholder="PASTE TRIP ID" value={joinId} onChange={e => setJoinId(e.target.value)} />
        <div className="flex flex-col gap-4">
          <button onClick={() => joinId && onTripSelected(joinId)} className="w-full py-5 bg-black text-white rounded-2xl font-bold shadow-xl uppercase tracking-widest">Connect</button>
          <button onClick={() => setView('selection')} className="w-full py-4 font-bold text-gray-400 uppercase tracking-widest text-xs">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto mt-20 text-center p-12 bg-white rounded-[3.5rem] shadow-2xl border-2 border-gray-50">
        <div className="w-28 h-28 bg-[#f49221] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-[#f49221]/40 -rotate-3 border-4 border-white">
          <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-black mb-3 font-pt tracking-tighter uppercase">Manas Split</h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-14">Simplified Group Finance</p>
        <div className="space-y-5">
          <button onClick={() => setView('create')} className="w-full py-6 bg-[#f49221] text-white rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-2xl shadow-[#f49221]/30 flex items-center justify-center gap-3 uppercase tracking-widest">
            New Expedition
          </button>
          <button onClick={() => setView('join')} className="w-full py-6 bg-black text-white rounded-2xl font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
            Connect to Trip
          </button>
        </div>
      </div>

      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border-2 border-[#f49221]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-black">Choose Avatar</h3>
              <button onClick={() => setShowAvatarPicker(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setMemberAvatars({ ...memberAvatars, [showAvatarPicker]: avatar.id });
                    setShowAvatarPicker(null);
                  }}
                  className="w-full aspect-square rounded-2xl overflow-hidden hover:scale-110 transition-all border-2 border-transparent hover:border-[#f49221]"
                >
                  <img src={avatar.image} alt="avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAvatarPicker(null)}
              className="w-full py-3 bg-gray-100 text-black rounded-xl font-bold hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TripManager;
