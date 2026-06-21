# Project Folder Structure

The `VChat-Web` application follows a modular, feature-based directory structure to separate concerns and maintain clean imports.

```text
VChat-Web/
├── docs/                   # Project analysis and planning documents
├── public/                 # Static assets (favicon, manifest, etc.)
├── src/
│   ├── assets/             # Images, SVGs, and global CSS files
│   ├── components/         # Reusable React components
│   │   ├── chat/           # Chat thread, message bubbles, input bar
│   │   ├── common/         # Buttons, inputs, avatars, spinners
│   │   ├── layout/         # Sidebar, Navigation, Topbar
│   │   └── modals/         # Create group, friend request modals
│   ├── hooks/              # Custom React hooks
│   │   ├── firebase/       # Hooks wrapping firestore listeners
│   │   └── ui/             # Hooks for UI state (e.g., useClickOutside)
│   ├── lib/                # Third-party library configurations
│   │   └── firebase/       # Firebase initialization and config (`firebase.ts`)
│   ├── models/             # TypeScript Interfaces mirroring Android POJOs
│   │   ├── UserModel.ts
│   │   ├── ChatModel.ts
│   │   ├── MessageModel.ts
│   │   └── ...
│   ├── pages/              # Route-level components
│   │   ├── auth/           # Login, Register
│   │   └── main/           # Inbox, Active Chat, Directory
│   ├── services/           # Pure TS files for Firestore/Auth operations
│   │   ├── authService.ts
│   │   ├── chatService.ts
│   │   └── ...
│   ├── store/              # Zustand state management
│   │   ├── useAuthStore.ts
│   │   ├── useChatStore.ts
│   │   └── ...
│   ├── utils/              # Helper functions
│   │   ├── dateUtils.ts    # Timestamp formatting
│   │   ├── converters.ts   # Firestore withConverter helpers
│   │   └── ...
│   ├── App.tsx             # Root component and Routing setup
│   └── main.tsx            # React DOM entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Key Guidelines
- **No business logic in components:** Components should only read from `store/` or call functions from `services/`.
- **Strict typing:** All data fetched from Firebase must pass through the `models/` interfaces. No `any` types for database structures.
- **Absolute imports:** The project should be configured to use `@/` to reference the `src/` directory to avoid messy relative paths (e.g., `import { useAuthStore } from '@/store/useAuthStore'`).
