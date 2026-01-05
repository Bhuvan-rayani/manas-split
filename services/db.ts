
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Expense, Trip, User, Settlement } from '../types';

const TRIPS_COLLECTION = 'trips';
const EXPENSES_COLLECTION = 'expenses';
const USERS_COLLECTION = 'users';
const SETTLEMENTS_COLLECTION = 'settlements';

export const createTrip = async (name: string, participants: string[], memberAvatars?: { [name: string]: string }): Promise<string> => {
  try {
    console.log('📝 Creating trip with:', { name, participants, hasAvatars: !!memberAvatars });
    
    const tripData = {
      name,
      participants,
      memberAvatars: memberAvatars || {},
      createdAt: Date.now()
    };
    
    console.log('📤 Sending to Firestore:', tripData);
    const docRef = await addDoc(collection(db, TRIPS_COLLECTION), tripData);
    console.log('✅ Trip created with ID:', docRef.id);
    return docRef.id;
  } catch (err: any) {
    console.error('❌ Create trip error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

export const getTrip = async (tripId: string): Promise<Trip | null> => {
  const docRef = doc(db, TRIPS_COLLECTION, tripId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Trip;
  }
  return null;
};

export const subscribeToTrip = (tripId: string, callback: (trip: Trip | null) => void) => {
  return onSnapshot(doc(db, TRIPS_COLLECTION, tripId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Trip);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Firestore Subscribe Error:", error);
    callback(null);
  });
};

export const subscribeToExpenses = (tripId: string, callback: (expenses: Expense[]) => void) => {
  // We remove orderBy('createdAt') here because it requires a manual composite index in Firebase.
  // We will sort client-side to ensure the app works out-of-the-box.
  const q = query(
    collection(db, EXPENSES_COLLECTION), 
    where('tripId', '==', tripId)
  );
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
    // Sort client-side by createdAt descending
    expenses.sort((a, b) => b.createdAt - a.createdAt);
    callback(expenses);
  }, (error) => {
    console.error("Firestore Expenses Subscribe Error:", error);
    callback([]);
  });
};

export const createExpense = async (tripId: string, expense: Omit<Expense, 'id' | 'createdAt' | 'tripId'>) => {
  console.log('📝 Creating expense:', { tripId, ...expense });
  const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
    ...expense,
    tripId,
    createdAt: Date.now()
  });
  console.log('✅ Expense created with ID:', docRef.id);
  return docRef;
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const docRef = doc(db, EXPENSES_COLLECTION, expenseId);
  await deleteDoc(docRef);
};

export const uploadProof = async (file: File): Promise<string> => {
  const storageRef = ref(storage, `proofs/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const addUser = async (name: string): Promise<User> => {
  const q = query(collection(db, USERS_COLLECTION), where("name", "==", name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, name: doc.data().name };
  }
  const docRef = await addDoc(collection(db, USERS_COLLECTION), {
    name,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, name };
};

// Settlement management
export const createSettlement = async (tripId: string, from: string, to: string, amount: number, proofImageUrl?: string): Promise<string> => {
  const docRef = await addDoc(collection(db, SETTLEMENTS_COLLECTION), {
    tripId,
    from,
    to,
    amount,
    isPaid: false,
    proofImageUrl: proofImageUrl || null,
    createdAt: Date.now()
  });
  return docRef.id;
};

export const markSettlementAsPaid = async (settlementId: string, proofImageUrl?: string): Promise<void> => {
  const docRef = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  const updateData: any = {
    isPaid: true,
    paidAt: Date.now()
  };
  if (proofImageUrl) {
    updateData.proofImageUrl = proofImageUrl;
  }
  await updateDoc(docRef, updateData);
};

export const deleteSettlement = async (settlementId: string): Promise<void> => {
  const docRef = doc(db, SETTLEMENTS_COLLECTION, settlementId);
  await deleteDoc(docRef);
};

export const updateTripMemberPhotos = async (tripId: string, memberPhotos: { [name: string]: File | string }): Promise<void> => {
  try {
    console.log('📸 Updating member photos for trip:', tripId);
    
    // Upload new photos and get URLs
    const photoUrls: { [name: string]: string } = {};
    for (const [participantName, photoData] of Object.entries(memberPhotos)) {
      if (photoData instanceof File) {
        console.log(`📸 Uploading photo for ${participantName}...`);
        const url = await uploadProof(photoData);
        photoUrls[participantName] = url;
        console.log(`✅ Photo uploaded for ${participantName}: ${url}`);
      } else if (typeof photoData === 'string' && photoData.length > 0) {
        photoUrls[participantName] = photoData;
      }
    }
    
    if (Object.keys(photoUrls).length === 0) {
      throw new Error('No valid photos to upload');
    }
    
    const docRef = doc(db, TRIPS_COLLECTION, tripId);
    console.log('📤 Updating Firestore with photos:', Object.keys(photoUrls));
    await updateDoc(docRef, { memberPhotos: photoUrls });
    console.log('✅ Trip photos updated successfully');
  } catch (err: any) {
    console.error('❌ Update trip photos error:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

export const subscribeToSettlements = (tripId: string, callback: (settlements: Settlement[]) => void) => {
  const q = query(
    collection(db, SETTLEMENTS_COLLECTION),
    where('tripId', '==', tripId)
  );
  return onSnapshot(q, (snapshot) => {
    const settlements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Settlement));
    callback(settlements);
  }, (error) => {
    console.error("Firestore Settlements Subscribe Error:", error);
    callback([]);
  });
};
