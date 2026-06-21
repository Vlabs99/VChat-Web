# Firestore Database Schema

Based on the Android implementation (`firestore.rules` and Java models), the database schema is structured as follows:

## 1. Collection: `users`
**Document ID:** User UID (`{userId}`)

| Field | Type | Description |
|---|---|---|
| `uid` | String | Unique user ID |
| `username` | String | User's display name |
| `email` | String | User's email address |
| `profileImage` | String | URL to profile picture |
| `bio` | String | User bio/status |
| `isOnline` | Boolean | Online status indicator |
| `lastSeen` | Timestamp/Long | Last active timestamp |
| `typingTo` | String | ID of user currently being typed to |
| `friendshipState` | String | Current state of friendship |
| `stateLabel` | String | UI display label for state |

### Subcollection: `relationships` (under `users/{userId}`)
*Tracks bidirectional relationships between users.*

### Subcollection: `notifications` (under `users/{userId}`)
| Field | Type | Description |
|---|---|---|
| `notificationId` | String | Unique ID |
| `type` | String | e.g., 'chat_request', 'request_accepted' |
| `title`, `body` | String | Notification content |
| `fromUserId` | String | Triggering user |
| `requestId`, `chatId` | String | Contextual IDs |
| `isGroup`, `groupName`| Boolean/String | Group context |
| `isRead` | Boolean | Read status |
| `createdAt` | Timestamp/Long| Timestamp |

## 2. Collection: `chat_requests`
**Document ID:** Unique Request ID (`{requestId}`)

| Field | Type | Description |
|---|---|---|
| `requestId` | String | Unique ID |
| `senderId` | String | UID of sender |
| `receiverId` | String | UID of receiver |
| `status` | String | 'pending', 'accepted', 'rejected' |
| `timestamp` | Timestamp/Long| When request was sent |
| `chatId` | String | Resulting chat ID if accepted |

## 3. Collection: `chats`
**Document ID:** Unique Chat ID (`{chatId}`)

| Field | Type | Description |
|---|---|---|
| `chatId` | String | Unique chat ID |
| `chatName` | String | Name of the chat (mostly for groups) |
| `isGroup` | Boolean | True if group chat |
| `participants` | Map<String, Boolean> | UIDs of participants set to `true` |
| `admins` | Map<String, Boolean> | UIDs of group admins set to `true` |
| `lastMessage` | String | Preview text of last message |
| `lastMessageTimestamp`| Timestamp/Long| Timestamp of last message |
| `createdAt` | Timestamp/Long| When chat was created |
| `groupDescription` | String | Group info |
| `groupRules` | String | Group rules |

*Also contains multiple Maps tracking personal/group settings: `pinnedBy`, `archivedBy`, `mutedBy`, `unreadBy`, `deletedFor`, etc.*

### Subcollection: `messages` (under `chats/{chatId}`)
**Document ID:** Unique Message ID (`{messageId}`)

| Field | Type | Description |
|---|---|---|
| `messageId` | String | Unique ID |
| `senderId` | String | UID of sender |
| `messageText` | String | Text content |
| `timestamp` | Timestamp/Long| Send time |
| `status` | String | 'sent', 'delivered', 'seen' |
| `messageType` | String | 'text', 'image', 'contact', 'poll' |
| `mediaUrl`, `mediaName`| String | URL/Name for image/file types |
| `pollQuestion` | String | Question text (if poll) |
| `pollOptions` | List<String> | Poll choices |
| `pollVotes` | Map<String, Integer> | UID -> selected option index |
| `reactions` | Map<String, String> | UID -> emoji string |
| `replyToMessageId`| String | ID of message being replied to |
| `replyPreview` | String | Short text of replied message |
| `starredBy`, `deletedFor`, `deliveredTo`, `seenBy` | Map<String, Boolean> | User tracking maps |
