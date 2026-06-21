import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { UserProfile } from '../types/user';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  
  return null;
};

export const searchUserByEmail = async (email: string): Promise<UserProfile[]> => {
  if (!email.trim()) return [];
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.trim()));
  
  const querySnapshot = await getDocs(q);
  const results: UserProfile[] = [];
  
  querySnapshot.forEach((doc) => {
    results.push(doc.data() as UserProfile);
  });
  
  return results;
};

export const updateTypingStatus = async (uid: string, chatIdOrEmpty: string): Promise<void> => {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    typingTo: chatIdOrEmpty
  });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, data);
};

export const uploadProfileImage = async (uid: string, file: File): Promise<string> => {
  const randomUuid = crypto.randomUUID();
  const storageRef = ref(storage, `profile_images/${uid}/${randomUuid}_${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
