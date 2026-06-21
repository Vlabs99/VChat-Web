import { getUserProfile } from './userService';
import type { UserProfile } from '../types/user';
import type { ChatMetadata } from '../types/chat';

// Cache to prevent duplicate Firestore reads for the same UID during the session
const userCache = new Map<string, Promise<UserProfile | null>>();

export const resolverStats = {
  chatCountLoaded: 0,
  uniqueParticipantCount: 0,
  firestoreReads: 0,
  cacheHits: 0,
  cacheMisses: 0
};

export const resolveOtherParticipant = async (chat: ChatMetadata, currentUid: string): Promise<UserProfile | null> => {
  resolverStats.chatCountLoaded++;
  
  if (chat.isGroup) return null; // Only resolve for direct chats
  
  const participants = chat.participants || {};
  const otherUid = Object.keys(participants).find(uid => uid !== currentUid);
  
  if (!otherUid) return null;

  if (userCache.has(otherUid)) {
    resolverStats.cacheHits++;
    try {
      const result = await userCache.get(otherUid)!;
      return result;
    } catch (e) {
      // Should not happen as we catch it below, but just in case
      userCache.delete(otherUid);
      return null;
    }
  }

  resolverStats.cacheMisses++;
  resolverStats.firestoreReads++;
  resolverStats.uniqueParticipantCount++;

  const promise = getUserProfile(otherUid).catch((err) => {
    // If a fetch fails, remove that UID from cache
    userCache.delete(otherUid);
    console.error(`Failed to resolve participant ${otherUid}:`, err);
    return null; // Return null so the UI doesn't crash
  });
  
  userCache.set(otherUid, promise);
  
  return promise;
};

export const resetResolverStats = () => {
  resolverStats.chatCountLoaded = 0;
  resolverStats.uniqueParticipantCount = 0;
  resolverStats.firestoreReads = 0;
  resolverStats.cacheHits = 0;
  resolverStats.cacheMisses = 0;
};
