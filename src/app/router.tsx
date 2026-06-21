import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { PublicRoute } from '../components/auth/PublicRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Diagnostic } from '../pages/Diagnostic';
import { Chat } from '../pages/Chat';
import { Search } from '../pages/Search';
import { Groups } from '../pages/Groups';
import { Profile } from '../pages/Profile';
import { PendingRequests } from '../pages/PendingRequests';
import { Notifications } from '../pages/Notifications';
import { GroupSettings } from '../pages/GroupSettings';
import { StarredMessages } from '../pages/StarredMessages';
import { ContactInfo } from '../pages/ContactInfo';
import { CreateGroup } from '../pages/CreateGroup';

// Mock component to enable router configuration for future protected routes
const MockPage = ({ title }: { title: string }) => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-900">
    <h1 className="text-2xl font-semibold text-white">{title} Component Placeholder</h1>
  </div>
);

export const router = createBrowserRouter([
  // ---------------------------------------------------------
  // Diagnostic Route (Temporary)
  // ---------------------------------------------------------
  {
    path: '/diagnostic',
    element: <Diagnostic />,
  },
  // ---------------------------------------------------------
  // Public Routes (Only accessible when LOGGED OUT)
  // ---------------------------------------------------------
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <Login />,
          },
          {
            path: '/register',
            element: <Register />,
          },
        ],
      },
    ],
  },
  // ---------------------------------------------------------
  // Protected Routes (Only accessible when LOGGED IN)
  // ---------------------------------------------------------
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/chat',
        element: <Chat />,
      },
      {
        path: '/groups',
        element: <Groups />,
      },
      {
        path: '/search',
        element: <Search />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },
      {
        path: '/pending',
        element: <PendingRequests />,
      },
      {
        path: '/notifications',
        element: <Notifications />,
      },
      {
        path: '/group-settings',
        element: <GroupSettings />,
      },
      {
        path: '/contact-info',
        element: <ContactInfo />,
      },
      {
        path: '/create-group',
        element: <CreateGroup />,
      },
      {
        path: '/starred',
        element: <StarredMessages />,
      },
      {
        path: '/settings',
        element: <MockPage title="Settings" />,
      },
      // Automatically redirect authenticated root requests to the primary inbox
      {
        path: '/',
        element: <Navigate to="/chat" replace />,
      },
    ],
  },
  // ---------------------------------------------------------
  // Fallback Route
  // ---------------------------------------------------------
  {
    path: '*',
    element: <Navigate to="/" replace />, // Redirects to '/' which then evaluates auth state
  },
]);
