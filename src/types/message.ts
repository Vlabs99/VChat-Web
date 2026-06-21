export interface Message {
  messageId: string;
  senderId: string;
  messageText: string;
  timestamp: number | any;
  status: string;
  messageType: string;
  mediaUrl?: string;
  mediaName?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  pollVotes?: Record<string, number>;
  reactions?: Record<string, string>;
  starredBy?: Record<string, boolean>;
  deletedFor?: Record<string, boolean>;
  deliveredTo?: Record<string, boolean>;
  seenBy?: Record<string, boolean>;
  replyToMessageId?: string;
  replyPreview?: string;
}
