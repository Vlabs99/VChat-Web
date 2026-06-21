import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, deleteField, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { ChatMetadata } from '../types/chat';

export const getUserChats = async (uid: string): Promise<ChatMetadata[]> => {
  const chatsRef = collection(db, 'chats');
  
  // We query the maps field 'participants' for the user's uid
  const q = query(
    chatsRef, 
    where(`participants.${uid}`, '==', true)
  );

  const querySnapshot = await getDocs(q);
  
  const chats: ChatMetadata[] = [];
  querySnapshot.forEach((doc) => {
    chats.push({
      chatId: doc.id,
      ...doc.data()
    } as ChatMetadata);
  });

  // Sort client-side to avoid requiring a composite index on a dynamic map key
  return chats.sort((a, b) => {
    const timeA = a.lastMessageTimestamp || a.createdAt || 0;
    const timeB = b.lastMessageTimestamp || b.createdAt || 0;
    return timeB - timeA; // Descending (newest first)
  });
};

export const isPinnedForUser = (chat: ChatMetadata, uid: string) => {
  return !!(chat.personalPinnedBy?.[uid] || chat.pinnedBy?.[uid]);
};

export const isArchivedForUser = (chat: ChatMetadata, uid: string) => {
  return !!(chat.personalArchivedBy?.[uid] || chat.groupArchivedBy?.[uid] || chat.archivedBy?.[uid]);
};

export const isMutedForUser = (chat: ChatMetadata, uid: string) => {
  return !!(chat.personalMutedBy?.[uid] || chat.groupMutedBy?.[uid] || chat.mutedBy?.[uid]);
};

export const subscribeToUserChats = (uid: string, callback: (chats: ChatMetadata[]) => void) => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef, 
    where(`participants.${uid}`, '==', true)
  );

  return onSnapshot(q, (querySnapshot) => {
    const chats: ChatMetadata[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({
        chatId: doc.id,
        ...doc.data()
      } as ChatMetadata);
    });

    // Sort client-side using Android parity logic
    chats.sort((a, b) => {
      const aPinned = isPinnedForUser(a, uid);
      const bPinned = isPinnedForUser(b, uid);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      const aArchived = isArchivedForUser(a, uid);
      const bArchived = isArchivedForUser(b, uid);
      if (aArchived !== bArchived) return aArchived ? 1 : -1;

      const timeA = a.lastMessageTimestamp || a.createdAt || 0;
      const timeB = b.lastMessageTimestamp || b.createdAt || 0;
      return timeB - timeA; // Descending (newest first)
    });

    callback(chats);
  });
};

export const archiveChat = async (chatId: string, uid: string, isGroup: boolean) => {
  const field = isGroup ? `groupArchivedBy.${uid}` : `personalArchivedBy.${uid}`;
  return updateDoc(doc(db, 'chats', chatId), {
    [field]: true
  });
};

export const unarchiveChat = async (chatId: string, uid: string, isGroup: boolean) => {
  const field = isGroup ? `groupArchivedBy.${uid}` : `personalArchivedBy.${uid}`;
  return updateDoc(doc(db, 'chats', chatId), {
    [field]: deleteField()
  });
};

export const muteChat = async (chatId: string, uid: string, isGroup: boolean) => {

  const actualField = isGroup ? `groupMutedBy.${uid}` : `personalMutedBy.${uid}`;
  return updateDoc(doc(db, 'chats', chatId), {
    [actualField]: true
  });
};

export const unmuteChat = async (chatId: string, uid: string, isGroup: boolean) => {
  const field = isGroup ? `groupMutedBy.${uid}` : `personalMutedBy.${uid}`;
  return updateDoc(doc(db, 'chats', chatId), {
    [field]: deleteField()
  });
};

export const ensureDirectChat = async (myUid: string, peerUid: string): Promise<string> => {
  const { generateChatId } = await import('./relationshipService');
  const chatId = generateChatId(myUid, peerUid);
  const chatRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      chatId,
      isGroup: false,
      participants: {
        [myUid]: true,
        [peerUid]: true
      },
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTimestamp: 0
    });
  }
  return chatId;
};
