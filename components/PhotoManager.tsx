import React, { useState, useEffect } from 'react';
import { updateTripMemberPhotos } from '../services/db';
import { Trip } from '../types';

interface PhotoManagerProps {
  trip: Trip;
  onClose: () => void;
  onPhotosUpdated: () => void;
}

const PhotoManager: React.FC<PhotoManagerProps> = ({ trip, onClose, onPhotosUpdated }) => {
  const [updatedPhotos, setUpdatedPhotos] = useState<{ [name: string]: File | string }>(trip.memberPhotos || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Sync state when trip prop changes
  useEffect(() => {
    setUpdatedPhotos(trip.memberPhotos || {});
  }, [trip.id]);

  const handlePhotoChange = (participantName: string, file: File) => {
    setUpdatedPhotos({
      ...updatedPhotos,
      [participantName]: file
    });
  };

  const handleRemovePhoto = (participantName: string) => {
    const updated = { ...updatedPhotos };
    delete updated[participantName];
    setUpdatedPhotos(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      // Build photos to update - include all photos (File or string)
      const photosToUpdate: { [name: string]: File | string } = {};
      
      for (const [name, photo] of Object.entries(updatedPhotos)) {
        const photoValue = photo as File | string;
        // Include if it's a File (new upload) or if it's a string URL
        if (photoValue instanceof File || typeof photoValue === 'string') {
          photosToUpdate[name] = photoValue;
        }
      }

      if (Object.keys(photosToUpdate).length === 0) {
        console.log('No photos to update');
        onClose();
        return;
      }

      console.log('📸 Updating photos:', Object.keys(photosToUpdate));
      await updateTripMemberPhotos(trip.id, photosToUpdate);
      console.log('✅ Photos updated successfully');
      onPhotosUpdated();
      onClose();
    } catch (err: any) {
      console.error('❌ Photo update error:', err);
      setError(err.message || 'Failed to update photos');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-[#f49221]">
        <div className="sticky top-0 bg-white border-b-2 border-gray-100 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Update Member Photos</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {trip.participants.map((participant) => (
            <div key={participant} className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {updatedPhotos[participant] ? (
                  updatedPhotos[participant] instanceof File ? (
                    <img
                      src={URL.createObjectURL(updatedPhotos[participant] as File)}
                      alt={participant}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-[#f49221]"
                    />
                  ) : (
                    <img
                      src={updatedPhotos[participant] as string}
                      alt={participant}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-[#f49221]"
                    />
                  )
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xl border-2 border-gray-300">
                    {participant[0]}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="font-bold text-black mb-2">{participant}</p>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#f49221] cursor-pointer hover:text-[#e58515] transition-colors bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-[#f49221]/30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {updatedPhotos[participant] ? 'Change' : 'Add'} Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handlePhotoChange(participant, e.target.files[0]);
                      }
                    }}
                    disabled={loading}
                  />
                </label>
                {updatedPhotos[participant] && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(participant)}
                    disabled={loading}
                    className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-100 p-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-black rounded-lg font-bold uppercase text-xs tracking-wider hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#f49221] to-[#e58515] hover:from-[#e58515] hover:to-[#f49221] text-white rounded-lg font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoManager;
