import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProfileProvider } from './context/ProfileContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AIMentor from './pages/AIMentor';
import History from './pages/History';
import Interview from './pages/Interview';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';
import Settings from './pages/Settings';

import Landing from './pages/Landing';

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/profile", element: <Profile /> },
  { path: "/mentor", element: <AIMentor /> },
  { path: "/history", element: <History /> },
  { path: "/interview", element: <Interview /> },
  { path: "/resume", element: <ResumeAnalyzer /> },
  { path: "/company", element: <CompanyList /> },
  { path: "/company/:id", element: <CompanyDetail /> },
  { path: "/settings", element: <Settings /> },
  { path: "*", element: <Navigate to="/" replace /> }
]);

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
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
  );
}

export default App;
