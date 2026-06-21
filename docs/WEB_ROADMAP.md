# VChat Web Migration Roadmap

This roadmap provides a phased approach to building `VChat-Web` to parallel the Android client. 

## Phase 1: Project Initialization & Architecture setup
- **Tech Stack Selection**: React (Next.js or Vite), TypeScript, TailwindCSS (optional, pending user preference), and Firebase Web SDK.
- **State Management setup**: Establish a pattern (e.g. Zustand) to handle global user state, active chats, and real-time listeners.
- **Firebase Initialization**: Connect `VChat-Web` to the existing Firebase project. Configure Auth, Firestore, and Storage.

## Phase 2: Authentication & Core Navigation
- Build Login, Register, and password recovery pages.
- Implement the primary App Layout (Sidebar/Navigation mimicking the bottom nav of the Android app).
- Create the User Profile view to update bio, status, and avatar.

## Phase 3: Social Graph & Networking
- Build the "Users" directory view to browse other users on the platform.
- Implement the Chat Request flow (Sending, receiving, accepting, rejecting).
- Build the Notifications view to manage incoming requests.

## Phase 4: Core Messaging Engine (1-on-1)
- Develop the Inbox (Chats list) with real-time updates.
- Develop the Active Chat view.
- Implement sending and receiving standard text messages.
- Implement Message status indicators (Sent/Delivered/Seen).
- Setup real-time Typing Indicators.

## Phase 5: Advanced Messaging Types
- Add support for Media/Image messages with Firebase Storage uploads.
- Add support for creating and voting on Polls.
- Implement replying to specific messages.
- Implement emoji reactions for messages.

## Phase 6: Group Chat Implementation
- Build the "Create Group" flow.
- Implement the Groups Inbox.
- Upgrade the Chat Engine to handle group permissions and multi-user tracking (seen by, delivered to maps).
- Develop the Group Info panel (managing members, admins, rules).

## Phase 7: Polish & Edge Cases
- Implement Message Forwarding.
- Implement Message Deletion and Starring.
- Add Context Menus for pinning, muting, and archiving chats.
- Handle offline capabilities and optimistic UI updates for the web.
