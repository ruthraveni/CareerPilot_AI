import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileProvider } from './context/ProfileContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Critical routes can be imported synchronously
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load non-critical and heavy feature pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const AIMentor = lazy(() => import('./pages/AIMentor'));
const History = lazy(() => import('./pages/History'));
const Interview = lazy(() => import('./pages/Interview'));
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'));
const CompanyList = lazy(() => import('./pages/CompanyList'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const FeatureDetail = lazy(() => import('./pages/FeatureDetail'));
const Admin = lazy(() => import('./pages/Admin'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--cp-bg)] text-[var(--cp-text)]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

import ErrorBoundaryPage from './components/ErrorBoundaryPage';

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorBoundaryPage />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "dashboard", element: <Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense> },
      { path: "admin", element: <Suspense fallback={<LoadingFallback />}><Admin /></Suspense> },
      { path: "profile", element: <Suspense fallback={<LoadingFallback />}><Profile /></Suspense> },
      { path: "mentor", element: <Suspense fallback={<LoadingFallback />}><AIMentor /></Suspense> },
      { path: "history", element: <Suspense fallback={<LoadingFallback />}><History /></Suspense> },
      { path: "interview", element: <Suspense fallback={<LoadingFallback />}><Interview /></Suspense> },
      { path: "resume", element: <Suspense fallback={<LoadingFallback />}><ResumeAnalyzer /></Suspense> },
      { path: "company", element: <Suspense fallback={<LoadingFallback />}><CompanyList /></Suspense> },
      { path: "company/:id", element: <Suspense fallback={<LoadingFallback />}><CompanyDetail /></Suspense> },
      { path: "settings", element: <Suspense fallback={<LoadingFallback />}><Settings /></Suspense> },
      { path: "feature/:featureId", element: <Suspense fallback={<LoadingFallback />}><FeatureDetail /></Suspense> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProfileProvider>
          <RouterProvider router={router} />
          <ToastContainer 
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </ProfileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
