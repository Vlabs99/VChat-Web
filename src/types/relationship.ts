export interface RelationshipDocument {
  state: string; // "friend", "pending", "removed", "blocked", "blocked_by_user"
  blockedBy: string; // uid
  peerUid: string; // uid
  initiatedBy: string; // uid
  updatedAt: number | any; // server timestamp
}

export interface ChatRequest {
  requestId: string;
  senderId: string;
  receiverId: string;
  status: string; // "pending", "accepted", "rejected", "cancelled"
  timestamp: number | any;
  chatId?: string;
}

export const CANON_FRIEND = "friend";
export const CANON_PENDING = "pending";
export const CANON_REMOVED = "removed";
export const CANON_BLOCKED = "blocked";
export const CANON_BLOCKED_BY_USER = "blocked_by_user";
export const CANON_UNKNOWN = "unknown";

export const STATE_FRIEND = "friend";
export const STATE_FRIENDS = "friends";
export const STATE_PENDING = "pending";
export const STATE_REMOVED = "removed";
export const STATE_BLOCKED = "blocked";

export const VIEW_FRIENDS = "friends";
export const VIEW_PENDING_OUT = "pending_outgoing";
export const VIEW_PENDING_IN = "pending_incoming";
export const VIEW_REMOVED = "removed";
export const VIEW_BLOCKED_BY_ME = "blocked_by_me";
export const VIEW_BLOCKED_ME = "blocked_me";
