import type { UserProfile } from './user';

export interface ChatMetadata {
  chatId: string;
  chatName?: string;
  isGroup: boolean;
  participants: Record<string, boolean>;
  admins?: Record<string, boolean>;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  createdAt?: number;
  createdBy?: string;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
  personalArchivedBy?: Record<string, boolean>;
  groupArchivedBy?: Record<string, boolean>;
  archivedBy?: Record<string, boolean>;
  personalPinnedBy?: Record<string, boolean>;
  pinnedBy?: Record<string, boolean>;
  personalMutedBy?: Record<string, boolean>;
  groupMutedBy?: Record<string, boolean>;
  mutedBy?: Record<string, boolean>;
  groupDescription?: string;
  groupRules?: string;
  groupSettings?: {
    onlyAdminsCanEditGroupInfo?: boolean;
    onlyAdminsCanMessage?: boolean;
  };
  resolvedParticipant?: UserProfile;
}
