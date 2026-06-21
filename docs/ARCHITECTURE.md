# VChat-Web Architecture Strategy

This document outlines the technical architecture for `VChat-Web`, designed to act as a companion client to the existing Android application, fully utilizing the same Firebase backend.

## 1. Authentication Strategy
- **Provider:** Firebase Authentication.
- **Persistence:** `browserLocalPersistence` to ensure users remain logged in across tabs and sessions (similar to WhatsApp Web).
- **Synchronization:** The root of the React application will subscribe to Firebase's `onAuthStateChanged()`. This listener will immediately sync the Firebase User object to the `useAuthStore` (Zustand).
- **Guards:** React Router will use a Higher-Order Component or wrapper (`<ProtectedRoute>`) to redirect unauthenticated users to `/login`.

## 2. State Management Architecture (Zustand)
Zustand will be used for lightweight, fast, global state management. The state will be separated into domain-specific stores:
- **`useAuthStore`**: Stores the current Firebase `User` object, auth loading state, and the enriched Firestore `UserModel` for the current user.
- **`useChatStore`**: Maintains the global list of active chats (the inbox view), total unread counts, and the currently selected `chatId`.
- **`useMessageStore`**: Manages the message history *only* for the currently active chat. This keeps memory usage low. Also manages typing indicator states.
- **`useGroupStore`**: Manages group-specific data (rules, permissions) to decouple group logic from standard 1-on-1 chats.
- **`useRelationshipStore`**: Stores pending requests, friends list, and blocked users.

## 3. Firestore Access Strategy
To ensure 1:1 parity with the Android app, `VChat-Web` must respect the existing data models.
- **Data Models (TypeScript Interfaces):** We will create TypeScript interfaces in `src/models/` that mirror the exact shape of the Java POJOs (e.g., `UserModel.java` -> `UserModel.ts`).
- **Firestore Converters:** We will heavily utilize Firebase's `withConverter()` function. This ensures that raw Firestore documents are strictly cast into our TypeScript models when read, and safely mapped back when written.
- **Timestamp Handling:** We will standardize on converting Firebase `Timestamp` objects to milliseconds (number) at the converter level to match the flexible timestamp parsing used in the Android app (`getLastSeenRaw`, `parseTimeValue`).

## 4. Realtime Listener Strategy (onSnapshot)
Realtime listeners must be managed carefully to avoid memory leaks and excessive Firestore reads (which cost money).
- **Global Listeners (Attached on Auth Success):**
  1. `users/{uid}`: To listen to real-time updates of the current user's own profile (e.g., status changes).
  2. `users/{uid}/notifications`: For in-app push notifications.
  3. `chats` (where `participants.{uid} == true`): To power the real-time inbox/sidebar.
- **Contextual Listeners (Attached on Component Mount):**
  1. `chats/{chatId}/messages`: When a user clicks a chat, a listener is attached to that specific message subcollection. When the user navigates away or clicks another chat, the previous listener is **detached** before attaching the new one.
  2. `users/{friendUid}`: When viewing a specific friend's info or chatting with them, to track their `isOnline` and `lastSeen` status in real-time.

## 5. Service Layer Architecture
Direct Firebase calls inside React components lead to messy code. All Firebase interactions will be abstracted into pure functions inside `src/services/`:
- **`authService.ts`**: Login, register, logout, password reset.
- **`userService.ts`**: Update profile, fetch user by ID, manage friend requests.
- **`chatService.ts`**: Create chat, update chat settings.
- **`messageService.ts`**: Send text/media/poll, delete message, react to message.
- **`storageService.ts`**: Upload images/files and return download URLs.

## 6. Routing Structure (React Router)
The application will operate as a Single Page Application (SPA) with a persistent sidebar layout (similar to WhatsApp Web).
- `/login` - Authentication page
- `/register` - Account creation
- `/` - Main application wrapper (Protected Route)
  - `/` (Index) - Blank state ("Select a chat to start messaging")
  - `/chat/:chatId` - The active conversation view
  - `/groups` - Dedicated view for group chats
  - `/users` - Global user discovery / friends list
  - `/settings` - Profile and app settings
