export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  profileImage: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: number; // UNIX timestamp or similar
  typingTo?: string;
  friendshipState?: string;
  stateLabel?: string;
}
