import { collection, query, orderBy, getDocs, doc, writeBatch, onSnapshot, limit, updateDoc, deleteDoc, deleteField, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Message } from '../types/message';

// Store raw docs for diagnostic reporting
export const _diagnosticRawMessages: any[] = [];

export const getChatMessages = async (chatId: string): Promise<Message[]> => {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  
  // Create a query ordered by timestamp ascending
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  const querySnapshot = await getDocs(q);
  
  const messages: Message[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    _diagnosticRawMessages.push(data); // for debug
    
    messages.push({
      messageId: doc.id,
      ...data
    } as Message);
  });

  return messages;
};

export const sendMessage = async (chatId: string, senderId: string, text: string, replyToMessageId: string = '', replyPreview: string = ''): Promise<Message> => {
  const batch = writeBatch(db);
  
  // 1. Create message document
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();
  
  const messageData = {
    messageId: newMessageRef.id,
    senderId,
    messageText: text,
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: 'text',
    mediaUrl: '',
    mediaName: '',
    replyToMessageId,
    replyPreview,
    pollQuestion: '',
    pollOptions: [],
    pollVotes: {},
    reactions: {},
    seenBy: {
      [senderId]: true
    },
    deliveredTo: {
      [senderId]: true
    },
    starredBy: {},
    deletedFor: {}
  };
  
  batch.set(newMessageRef, messageData);
  
  // 2. Update parent chat metadata
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: text,
    lastMessageTimestamp: timestamp
  });
  
  await batch.commit();
  
  return messageData as Message;
};

export const sendImageMessage = async (
  chatId: string, 
  senderId: string, 
  isGroup: boolean,
  file: File,
  caption: string = ''
): Promise<Message> => {
  const batch = writeBatch(db);
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();
  
  // Upload to Firebase Storage
  const storageRef = ref(storage, `chats/${chatId}/images/${newMessageRef.id}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  const messageData: any = {
    messageId: newMessageRef.id,
    senderId,
    messageText: caption,
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: 'image',
    mediaUrl: downloadUrl,
    mediaName: file.name,
    replyToMessageId: '',
    replyPreview: '',
    pollQuestion: '',
    pollOptions: [],
    pollVotes: {},
    reactions: {},
    seenBy: {
      [senderId]: true
    },
    deliveredTo: {
      [senderId]: true
    },
    starredBy: {},
    deletedFor: {}
  };
  
  if (isGroup) {
    messageData.deliveredTo = { [senderId]: true };
    messageData.seenBy = { [senderId]: true };
  } else {
    delete messageData.deliveredTo;
    messageData.seenBy = { [senderId]: true };
  }
  
  batch.set(newMessageRef, messageData);
  
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: caption ? `🖼 ${caption}` : "🖼 Image",
    lastMessageTimestamp: timestamp
  });
  
  await batch.commit();
  
  return messageData as Message;
};

export const sendEventMessage = async (
  chatId: string, 
  senderId: string, 
  isGroup: boolean,
  title: string, 
  date: string, 
  time: string, 
  location: string, 
  note: string
): Promise<Message> => {
  const batch = writeBatch(db);
  
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();
  
  let eventText = `📅 EVENT\nTitle: ${title}\nDate: ${date}\nTime: ${time}`;
  if (location) {
    eventText += `\nLocation: ${location}`;
  }
  if (note) {
    eventText += `\nNote: ${note}`;
  }
  
  const messageData = {
    messageId: newMessageRef.id,
    senderId,
    messageText: eventText,
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: 'event',
    mediaUrl: '',
    mediaName: '',
    replyToMessageId: '',
    replyPreview: '',
    pollQuestion: '',
    pollOptions: [],
    pollVotes: {},
    reactions: {},
    seenBy: {
      [senderId]: true
    },
    deliveredTo: {
      [senderId]: true
    },
    starredBy: {},
    deletedFor: {}
  };
  
  if (isGroup) {
    messageData.deliveredTo = { [senderId]: true };
    messageData.seenBy = { [senderId]: true };
  } else {
    // For direct chats, Android omits deliveredTo initially or sets it empty, 
    // but the factory sets the sender as seen.
    delete (messageData as any).deliveredTo;
    messageData.seenBy = { [senderId]: true };
  }
  
  batch.set(newMessageRef, messageData);
  
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: "📅 Event",
    lastMessageTimestamp: timestamp
  });
  
  await batch.commit();
  
  return messageData as Message;
};

export const sendContactMessage = async (
  chatId: string, 
  senderId: string, 
  isGroup: boolean,
  name: string, 
  number: string
): Promise<Message> => {
  const batch = writeBatch(db);
  
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();
  
  const contactText = `📞 ${name} - ${number}`;
  
  const messageData = {
    messageId: newMessageRef.id,
    senderId,
    messageText: contactText,
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: 'contact',
    mediaUrl: '',
    mediaName: '',
    replyToMessageId: '',
    replyPreview: '',
    pollQuestion: '',
    pollOptions: [],
    pollVotes: {},
    reactions: {},
    seenBy: {
      [senderId]: true
    },
    deliveredTo: {
      [senderId]: true
    },
    starredBy: {},
    deletedFor: {}
  };
  
  if (isGroup) {
    messageData.deliveredTo = { [senderId]: true };
    messageData.seenBy = { [senderId]: true };
  } else {
    // For direct chats, Android omits deliveredTo initially
    delete (messageData as any).deliveredTo;
    messageData.seenBy = { [senderId]: true };
  }
  
  batch.set(newMessageRef, messageData);
  
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: "📞 Contact",
    lastMessageTimestamp: timestamp
  });
  
  await batch.commit();
  
  return messageData as Message;
};

export const sendPollMessage = async (
  chatId: string, 
  senderId: string, 
  isGroup: boolean,
  question: string, 
  o1: string, 
  o2: string, 
  o3: string, 
  o4: string
): Promise<Message> => {
  const batch = writeBatch(db);
  
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();
  
  const options: string[] = [o1, o2];
  if (o3) options.push(o3);
  if (o4) options.push(o4);
  
  const messageData = {
    messageId: newMessageRef.id,
    senderId,
    messageText: '',
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: 'poll',
    mediaUrl: '',
    mediaName: '',
    replyToMessageId: '',
    replyPreview: '',
    pollQuestion: question,
    pollOptions: options,
    pollVotes: {},
    reactions: {},
    seenBy: {
      [senderId]: true
    },
    deliveredTo: {
      [senderId]: true
    },
    starredBy: {},
    deletedFor: {}
  };
  
  if (isGroup) {
    messageData.deliveredTo = { [senderId]: true };
    messageData.seenBy = { [senderId]: true };
  } else {
    delete (messageData as any).deliveredTo;
    messageData.seenBy = { [senderId]: true };
  }
  
  batch.set(newMessageRef, messageData);
  
  const chatRef = doc(db, 'chats', chatId);
  batch.update(chatRef, {
    lastMessage: "📊 Poll",
    lastMessageTimestamp: timestamp
  });
  
  await batch.commit();
  
  return messageData as Message;
};

export const subscribeToMessages = (chatId: string, messageLimit: number, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  
  // Query messages descending to get the newest ones first up to the limit
  const q = query(
    messagesRef, 
    orderBy('timestamp', 'desc'), 
    limit(messageLimit)
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        messageId: doc.id,
        ...data
      } as Message);
    });

    // Reverse the array so the oldest fetched is at the top, newest at the bottom
    callback(messages.reverse());
  });
};

export const deleteMessageForMe = async (chatId: string, messageId: string, uid: string): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  await updateDoc(messageRef, {
    [`deletedFor.${uid}`]: true
  });
};

export const deleteMessageForEveryone = async (chatId: string, messageId: string): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  const snap = await getDoc(messageRef);
  
  if (snap.exists()) {
    const data = snap.data();
    if (data.messageType === 'image' && data.mediaName) {
      const storageRef = ref(storage, `chats/${chatId}/images/${messageId}_${data.mediaName}`);
      try {
        await deleteObject(storageRef);
      } catch (err) {
        console.error('Failed to delete image from storage:', err);
      }
    }
  }
  
  await deleteDoc(messageRef);
};

export const reactToMessage = async (chatId: string, messageId: string, uid: string, emoji: string): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  await updateDoc(messageRef, {
    [`reactions.${uid}`]: emoji
  });
};

export const voteOnPoll = async (chatId: string, messageId: string, uid: string, optionIndex: number | null): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  await updateDoc(messageRef, {
    [`pollVotes.${uid}`]: optionIndex === null ? deleteField() : optionIndex
  });
};

export const forwardMessage = async (original: Message, targetChatId: string, currentUserId: string, isGroup: boolean): Promise<void> => {
  const batch = writeBatch(db);
  const messagesRef = collection(db, `chats/${targetChatId}/messages`);
  const newMessageRef = doc(messagesRef);
  const timestamp = Date.now();

  let forwardedText = "↪ Forwarded message";
  if (original.messageType === 'poll') {
    forwardedText = original.pollQuestion ? `↪ 📊 ${original.pollQuestion}` : "↪ 📊 Forwarded poll";
  } else if (original.messageType === 'event') {
    forwardedText = "↪ 📅 Forwarded event";
  } else if (original.messageType === 'contact') {
    forwardedText = `↪ 📞 ${original.messageText || ''}`;
  } else if (original.messageType === 'image') {
    forwardedText = original.messageText ? `↪ 🖼 ${original.messageText}` : "↪ 🖼 Forwarded image";
  } else {
    forwardedText = original.messageText ? `↪ ${original.messageText}` : "↪ Forwarded message";
  }

  const messageData: any = {
    messageId: newMessageRef.id,
    senderId: currentUserId,
    messageText: forwardedText,
    timestamp: timestamp,
    timestampRaw: timestamp,
    status: 'sent',
    messageType: original.messageType || 'text',
    pollVotes: {},
    reactions: {},
    starredBy: {},
    deletedFor: {}
  };

  if (original.mediaUrl) messageData.mediaUrl = original.mediaUrl;
  if (original.mediaName) messageData.mediaName = original.mediaName;
  if (original.pollQuestion) messageData.pollQuestion = original.pollQuestion;
  if (original.pollOptions) messageData.pollOptions = original.pollOptions;

  if (isGroup) {
    messageData.deliveredTo = { [currentUserId]: true };
    messageData.seenBy = { [currentUserId]: true };
  }

  batch.set(newMessageRef, messageData);

  const chatRef = doc(db, 'chats', targetChatId);
  batch.update(chatRef, {
    lastMessage: '↪ Forwarded',
    lastMessageTimestamp: timestamp
  });

  await batch.commit();
};

export const pinMessage = async (chatId: string, message: Message): Promise<void> => {
  let preview = message.messageText || '';
  if (message.messageType === 'poll') {
    preview = message.pollQuestion ? `📊 ${message.pollQuestion}` : '📊 Poll';
  } else if (message.messageType === 'event') {
    preview = '📅 Event';
  } else if (message.messageType === 'contact') {
    preview = '📞 Contact';
  } else if (message.messageType === 'image') {
    preview = '🖼 Image';
  }

  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    pinnedMessageId: message.messageId,
    pinnedMessageText: preview
  });
};

export const unpinMessage = async (chatId: string): Promise<void> => {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    pinnedMessageId: '',
    pinnedMessageText: ''
  });
};

export const starMessage = async (chatId: string, messageId: string, uid: string): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  await updateDoc(messageRef, {
    [`starredBy.${uid}`]: true
  });
};

export const unstarMessage = async (chatId: string, messageId: string, uid: string): Promise<void> => {
  const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
  await updateDoc(messageRef, {
    [`starredBy.${uid}`]: deleteField()
  });
};
