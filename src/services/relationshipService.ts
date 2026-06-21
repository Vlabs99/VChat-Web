import { doc, getDoc, onSnapshot, writeBatch, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { RelationshipDocument } from '../types/relationship';
import { resolveCanonicalState } from './relationshipResolver';
import { getUserProfile } from './userService';

export const getRelationshipState = async (myUid: string, peerUid: string): Promise<string> => {
  const relRef = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const snap = await getDoc(relRef);
  
  if (!snap.exists()) {
    return resolveCanonicalState('', '', myUid);
  }
  
  const data = snap.data() as RelationshipDocument;
  return resolveCanonicalState(data.state, data.blockedBy, myUid);
};

export const subscribeToRelationship = (
  myUid: string, 
  peerUid: string, 
  callback: (canonicalState: string, rawDoc: RelationshipDocument | null) => void
) => {
  const relRef = doc(db, `users/${myUid}/relationships/${peerUid}`);
  
  return onSnapshot(relRef, (snap) => {
    if (!snap.exists()) {
      callback(resolveCanonicalState('', '', myUid), null);
      return;
    }
    
    const data = snap.data() as RelationshipDocument;
    const canonicalState = resolveCanonicalState(data.state, data.blockedBy, myUid);
    callback(canonicalState, data);
  });
};

// --- Phase 6B-2: Friend Request Workflow ---

export const generateChatId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const clearPendingRequestsBetween = async (uidA: string, uidB: string, excludeRequestId?: string) => {
  const batch = writeBatch(db);
  const reqRef = collection(db, 'chat_requests');

  const q1 = query(reqRef, where('status', '==', 'pending'), where('senderId', '==', uidA), where('receiverId', '==', uidB));
  const q2 = query(reqRef, where('status', '==', 'pending'), where('senderId', '==', uidB), where('receiverId', '==', uidA));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  let hasUpdates = false;

  const processDoc = (d: any) => {
    if (excludeRequestId && d.id === excludeRequestId) return;
    batch.update(d.ref, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
    hasUpdates = true;
  };

  snap1.forEach(processDoc);
  snap2.forEach(processDoc);

  if (hasUpdates) {
    await batch.commit();
  }
};

export const createInAppNotificationForReceiver = (batch: any, receiverId: string, fromUserId: string, title: string, body: string, type: string, chatId?: string) => {
  const notifRef = doc(collection(db, `users/${receiverId}/notifications`));
  batch.set(notifRef, {
    notificationId: notifRef.id,
    type,
    title,
    body,
    fromUserId,
    isRead: false,
    createdAt: serverTimestamp(),
    ...(chatId ? { chatId } : {})
  });
};

export const createInAppNotificationForSender = (batch: any, senderId: string, fromUserId: string, title: string, body: string, type: string, chatId?: string) => {
  const notifRef = doc(collection(db, `users/${senderId}/notifications`));
  batch.set(notifRef, {
    notificationId: notifRef.id,
    type,
    title,
    body,
    fromUserId,
    isRead: false,
    createdAt: serverTimestamp(),
    ...(chatId ? { chatId } : {})
  });
};

export const sendFriendRequest = async (myUid: string, peerUid: string) => {
  const currentState = await getRelationshipState(myUid, peerUid);
  if (currentState === 'BLOCKED' || currentState === 'BLOCKED YOU') {
    throw new Error('Cannot send friend request: User is blocked');
  }

  const batch = writeBatch(db);
  
  // 1. Create chat_request
  const reqRef = doc(collection(db, 'chat_requests'));
  batch.set(reqRef, {
    requestId: reqRef.id,
    senderId: myUid,
    receiverId: peerUid,
    status: 'pending',
    timestamp: serverTimestamp()
  });

  // 2. Mirrored relationship docs
  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'pending',
    blockedBy: '',
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  // 3. Generate In-App Notification
  const myProfile = await getUserProfile(myUid);
  const displayName = myProfile?.email || 'Someone';
  createInAppNotificationForReceiver(
    batch, 
    peerUid, 
    myUid, 
    'New chat request', 
    `${displayName} sent you a chat request`, 
    'REQUEST'
  );

  await batch.commit();
};

export const acceptFriendRequest = async (requestId: string, myUid: string, peerUid: string) => {
  const batch = writeBatch(db);
  const chatId = generateChatId(myUid, peerUid);

  // 1. Ensure chat doc exists
  const chatRef = doc(db, 'chats', chatId);
  batch.set(chatRef, {
    chatId,
    isGroup: false,
    participants: {
      [myUid]: true,
      [peerUid]: true
    },
    createdAt: serverTimestamp(),
    lastMessage: '',
    lastMessageTimestamp: 0
  }, { merge: true });

  // 2. Update chat_request status
  const reqRef = doc(db, 'chat_requests', requestId);
  batch.update(reqRef, {
    status: 'accepted',
    chatId,
    updatedAt: serverTimestamp()
  });

  // 3. Update mirrored relationships
  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'friend',
    blockedBy: '',
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  // 4. Generate In-App Notification
  createInAppNotificationForSender(
    batch, 
    peerUid, // the original sender who gets notified
    myUid, // the person accepting the request
    'Request accepted', 
    'Your chat request was accepted', 
    'ACCEPTED',
    chatId
  );

  await batch.commit();

  // 5. Cancel other pending requests between them
  await clearPendingRequestsBetween(myUid, peerUid, requestId);
};

export const rejectFriendRequest = async (requestId: string, myUid: string, peerUid: string) => {
  const batch = writeBatch(db);
  
  const reqRef = doc(db, 'chat_requests', requestId);
  batch.update(reqRef, {
    status: 'rejected',
    updatedAt: serverTimestamp()
  });

  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'removed',
    blockedBy: '',
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  await batch.commit();
};

export const removeFriend = async (myUid: string, peerUid: string) => {
  const batch = writeBatch(db);
  
  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'removed',
    blockedBy: '',
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  await batch.commit();

  await clearPendingRequestsBetween(myUid, peerUid);
};

export const getActiveRequestId = async (myUid: string, peerUid: string): Promise<string | null> => {
  const reqRef = collection(db, 'chat_requests');
  // Check if we are receiver
  const q = query(reqRef, where('status', '==', 'pending'), where('receiverId', '==', myUid), where('senderId', '==', peerUid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }
  // Check if we are sender
  const q2 = query(reqRef, where('status', '==', 'pending'), where('senderId', '==', myUid), where('receiverId', '==', peerUid));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    return snap2.docs[0].id;
  }
  return null;
};

export const blockUser = async (myUid: string, peerUid: string) => {
  const batch = writeBatch(db);
  
  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'blocked',
    blockedBy: myUid,
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  await batch.commit();

  await clearPendingRequestsBetween(myUid, peerUid);
};

export const unblockUser = async (myUid: string, peerUid: string) => {
  const batch = writeBatch(db);
  
  const relA = doc(db, `users/${myUid}/relationships/${peerUid}`);
  const relB = doc(db, `users/${peerUid}/relationships/${myUid}`);
  
  const relData = {
    state: 'removed',
    blockedBy: '',
    initiatedBy: myUid,
    updatedAt: serverTimestamp()
  };

  batch.set(relA, { ...relData, peerUid });
  batch.set(relB, { ...relData, peerUid: myUid });

  await batch.commit();
};

export const getFriends = async (uid: string): Promise<import('../types/user').UserProfile[]> => {
  const relsRef = collection(db, `users/${uid}/relationships`);
  const q = query(relsRef, where('state', '==', 'friend'));
  const snap = await getDocs(q);
  const friends: import('../types/user').UserProfile[] = [];
  for (const doc of snap.docs) {
    const profile = await getUserProfile(doc.id);
    if (profile) friends.push(profile);
  }
  return friends;
};
