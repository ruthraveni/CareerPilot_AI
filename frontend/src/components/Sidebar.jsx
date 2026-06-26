import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  History, 
  FileText, 
  Building2, 
  User, 
  Settings, 
  LogOut,
  BrainCircuit,
  Brain,
  Shield
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, role, profile_image, getInitials, loading, setProfile } = useProfile();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    setProfile(null);
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(role === 'admin' ? [{ name: 'Admin Dashboard', path: '/admin', icon: Shield }] : []),
    { name: 'AI Career Mentor', path: '/mentor', icon: Brain },
    { name: 'AI Mock Interview', path: '/interview', icon: Video },
    { name: 'Interview History', path: '/history', icon: History },
    { name: 'Resume Analyzer', path: '/resume', icon: FileText },
    { name: 'Company Preparation', path: '/company', icon: Building2 },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-slate-900 text-slate-400 border-r border-slate-800 flex flex-col justify-between">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-wide">
              CareerPilot <span className="text-blue-500">AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 py-6 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                    : 'hover:bg-slate-800/55 hover:text-slate-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/60 bg-slate-900/50 p-4">
        {/* Profile Info Block */}
        <div className="mb-3 px-2 flex items-center space-x-3">
          {loading ? (
            <div className="flex items-center space-x-3 animate-pulse w-full">
              <div className="h-9 w-9 rounded-full bg-slate-800 flex-shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3 bg-slate-800 rounded w-20" />
                <div className="h-2 bg-slate-800 rounded w-28" />
              </div>
            </div>
          ) : (
            <>
              {profile_image ? (
                <img src={profile_image} className="h-9 w-9 rounded-full object-cover border border-slate-700 flex-shrink-0" alt={name} />
              ) : (
                <div className="h-9 w-9 rounded-full bg-indigo-600 border border-indigo-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {getInitials(name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{name}</p>
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
