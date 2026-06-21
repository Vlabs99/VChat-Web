# Feature Parity Inventory

This document outlines all features discovered in the VChat Android application (`VChatFresh`) that need to be implemented in `VChat-Web` to achieve 1:1 parity.

## 1. Authentication & Onboarding
- [ ] Splash / Initial Load (check auth state)
- [ ] Login (Email/Password or Provider depending on Firebase config)
- [ ] Registration / Account Creation

## 2. Navigation Structure
- [ ] Bottom Navigation / Sidebar tabs:
  - Chats (Recent conversations)
  - Groups (Group specific list)
  - Users (Discover/Global user list)
  - Profile (Current user settings)

## 3. Social / Friend System
- [ ] Discover users list (`UsersFragment`)
- [ ] Send Chat Requests (`PendingRequestsActivity`)
- [ ] Accept/Reject incoming requests
- [ ] View Friend/User Info (`FriendInfoActivity`)
- [ ] Block/Unblock users (`BlockedUsersActivity`)

## 4. Chat Management (Inbox)
- [ ] Display list of recent chats (`ChatsFragment`)
- [ ] Display list of groups (`GroupsFragment`)
- [ ] Chat Row Actions (BottomSheet/Context Menu)
- [ ] Pin/Unpin chats
- [ ] Mute/Unmute chats
- [ ] Archive chats
- [ ] Mark as read/unread

## 5. Direct Messaging & Group Chat (The Chat View)
- [ ] View Chat Thread (`ChatActivity`)
- [ ] Pagination/Infinite Scroll for messages (`ChatMessagePaginator`)
- [ ] Real-time typing indicators (`TypingManager`)
- [ ] Read Receipts (Sent, Delivered, Seen markers)
- [ ] Send Text Messages
- [ ] Send Media/Image Messages
- [ ] Send Polls
- [ ] Message Actions:
  - Reply to specific message (`ReplyManager`)
  - Forward message to others (`ForwardManager`)
  - React to message with Emoji
  - Star/Unstar message (`StarredMessagesActivity`)
  - Delete message (For me / For everyone)

## 6. Group Specific Features
- [ ] Create Group (`CreateGroupActivity`)
- [ ] Group Info Page (`GroupInfoActivity`)
- [ ] Add/Remove participants
- [ ] Promote/Demote Admins
- [ ] Edit Group Description & Rules
- [ ] Group Permissions Engine (`GroupPermissionManager`)

## 7. Notifications
- [ ] View in-app notifications (`NotificationsActivity`)
- [ ] Handle incoming push notifications
