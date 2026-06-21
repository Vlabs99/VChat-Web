import { doc, updateDoc, deleteField, getDocs, collection, query, where, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from '../types/user';

export const updateGroupMeta = async (chatId: string, name: string, description: string, rules: string) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    chatName: name,
    groupDescription: description,
    groupRules: rules
  });
};

export const setAdminOnlyMessaging = async (chatId: string, enabled: boolean) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    'groupSettings.onlyAdminsCanMessage': enabled
  });
};

export const setGroupMutedForUser = async (chatId: string, uid: string, muted: boolean) => {
  const chatRef = doc(db, 'chats', chatId);
  if (muted) {
    await updateDoc(chatRef, {
      [`mutedBy.${uid}`]: true
    });
  } else {
    await updateDoc(chatRef, {
      [`mutedBy.${uid}`]: deleteField()
    });
  }
};

export const setAdmin = async (chatId: string, uid: string, makeAdmin: boolean) => {
  const chatRef = doc(db, 'chats', chatId);
  if (makeAdmin) {
    await updateDoc(chatRef, {
      [`admins.${uid}`]: true
    });
  } else {
    await updateDoc(chatRef, {
      [`admins.${uid}`]: deleteField()
    });
  }
};

export const removeMember = async (chatId: string, uid: string) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`participants.${uid}`]: deleteField(),
    [`admins.${uid}`]: deleteField()
  });
};

export const addMember = async (chatId: string, uid: string) => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`participants.${uid}`]: true
  });
};

export const leaveGroup = async (chatId: string, uid: string) => {
  return removeMember(chatId, uid);
};

export const sendGroupSystemMessage = async (chatId: string, senderId: string, messageText: string) => {
  const messageId = crypto.randomUUID();
  const timestamp = Date.now();

  const message = {
    messageId,
    senderId: senderId || 'system',
    messageText,
    timestamp,
    status: 'sent',
    messageType: 'system'
  };

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'), messageId);
  await setDoc(messageRef, message);

  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) return;

  const data = chatSnap.data();
  const participants = data.participants || {};

  const updates: Record<string, any> = {
    lastMessage: messageText,
    lastMessageTimestamp: timestamp
  };

  for (const uid of Object.keys(participants)) {
    updates[`personalDeletedFor.${uid}`] = deleteField();
    updates[`deletedFor.${uid}`] = deleteField();
    updates[`groupDeletedFor.${uid}`] = deleteField();
  }

  await updateDoc(chatRef, updates);
};

export const resolveMembersByEmails = async (emails: string[]): Promise<string[]> => {
  if (emails.length === 0) return [];
  
  const uids: string[] = [];
  for (const email of emails) {
    if (!email) continue;
    const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const uid = snapshot.docs[0].id;
      if (!uids.includes(uid)) {
        uids.push(uid);
      }
    }
  }
  return uids;
};

export const fetchConnectedFriends = async (uid: string): Promise<UserProfile[]> => {
  const friendUids: string[] = [];

  const sentQuery = query(
    collection(db, 'chat_requests'),
    where('status', '==', 'accepted'),
    where('senderId', '==', uid)
  );
  
  const receivedQuery = query(
    collection(db, 'chat_requests'),
    where('status', '==', 'accepted'),
    where('receiverId', '==', uid)
  );

  const [sentSnap, receivedSnap] = await Promise.all([getDocs(sentQuery), getDocs(receivedQuery)]);

  sentSnap.forEach((doc) => {
    const receiver = doc.data().receiverId;
    if (receiver && !friendUids.includes(receiver)) friendUids.push(receiver);
  });

  receivedSnap.forEach((doc) => {
    const sender = doc.data().senderId;
    if (sender && !friendUids.includes(sender)) friendUids.push(sender);
  });

  if (friendUids.length === 0) return [];

  const users: UserProfile[] = [];
  
  // Note: in a massive app, batching is needed. For typical sizes, parallel point-reads are fine.
  const userPromises = friendUids.map(fuid => getDoc(doc(db, 'users', fuid)));
  const userSnaps = await Promise.all(userPromises);
  
  userSnaps.forEach((snap) => {
    if (snap.exists()) {
      users.push(snap.data() as UserProfile);
    }
  });

  return users;
};

export const createGroup = async (ownerUid: string, groupName: string, memberUids: string[]): Promise<void> => {
  const chatId = crypto.randomUUID();
  
  const participants: Record<string, boolean> = { [ownerUid]: true };
  for (const uid of memberUids) {
    if (uid) participants[uid] = true;
  }

  const admins: Record<string, boolean> = { [ownerUid]: true };

  const groupData = {
    chatId,
    chatName: groupName,
    isGroup: true,
    participants,
    admins,
    createdBy: ownerUid,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageTimestamp: 0,
    pinnedMessageId: "",
    pinnedMessageText: "",
    groupDescription: "",
    groupRules: "",
    groupSettings: {
      onlyAdminsCanEditGroupInfo: true
    }
  };

  const chatRef = doc(db, 'chats', chatId);
  await setDoc(chatRef, groupData);
};
