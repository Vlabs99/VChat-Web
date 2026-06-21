import {
  CANON_FRIEND,
  CANON_PENDING,
  CANON_REMOVED,
  CANON_BLOCKED,
  CANON_BLOCKED_BY_USER,
  CANON_UNKNOWN,
  STATE_FRIEND,
  STATE_FRIENDS,
  STATE_PENDING,
  STATE_REMOVED,
  STATE_BLOCKED,
  VIEW_FRIENDS,
  VIEW_PENDING_OUT,
  VIEW_PENDING_IN,
  VIEW_REMOVED,
  VIEW_BLOCKED_BY_ME,
  VIEW_BLOCKED_ME
} from '../types/relationship';
import type { UserProfile } from '../types/user';

export const normalizeState = (rawState?: string | null): string => {
  if (!rawState) return CANON_UNKNOWN;
  const value = rawState.trim().toLowerCase();
  
  if (!value || value === 'unavailable' || value === 'unknown') return CANON_UNKNOWN;
  if (value === STATE_FRIEND || value === STATE_FRIENDS) return CANON_FRIEND;
  if (value === STATE_PENDING) return CANON_PENDING;
  if (value === STATE_REMOVED) return CANON_REMOVED;
  if (value === STATE_BLOCKED || value === 'blocked_by_me') return CANON_BLOCKED;
  if (value === 'blocked_by_user' || value === 'blocked_me') return CANON_BLOCKED_BY_USER;
  
  return CANON_UNKNOWN;
};

export const resolveCanonicalState = (rawState: string | undefined | null, blockedBy: string | undefined | null, myUid: string): string => {
  const normalized = normalizeState(rawState);
  
  if (normalized === CANON_BLOCKED) {
    if (myUid && myUid === blockedBy) {
      return CANON_BLOCKED;
    }
    return CANON_BLOCKED_BY_USER;
  }
  
  return normalized;
};

export const applyCanonicalToUser = (
  user: UserProfile | null, 
  canonicalState: string, 
  myUid: string, 
  initiatedBy: string
): void => {
  if (!user) return;
  
  if (canonicalState === CANON_FRIEND) {
    user.friendshipState = VIEW_FRIENDS;
    user.stateLabel = 'FRIEND';
    return;
  }
  
  if (canonicalState === CANON_PENDING) {
    if (myUid === initiatedBy) {
      user.friendshipState = VIEW_PENDING_OUT;
      user.stateLabel = 'REQUEST SENT';
    } else {
      user.friendshipState = VIEW_PENDING_IN;
      user.stateLabel = 'REQUEST RECEIVED';
    }
    return;
  }
  
  if (canonicalState === CANON_REMOVED) {
    user.friendshipState = VIEW_REMOVED;
    user.stateLabel = 'NOT FRIENDS';
    return;
  }
  
  if (canonicalState === CANON_BLOCKED) {
    user.friendshipState = VIEW_BLOCKED_BY_ME;
    user.stateLabel = 'BLOCKED';
    return;
  }
  
  if (canonicalState === CANON_BLOCKED_BY_USER) {
    user.friendshipState = VIEW_BLOCKED_ME;
    user.stateLabel = 'BLOCKED YOU';
    return;
  }
  
  // Default fallback
  user.friendshipState = VIEW_REMOVED;
  user.stateLabel = 'NOT FRIENDS';
};
