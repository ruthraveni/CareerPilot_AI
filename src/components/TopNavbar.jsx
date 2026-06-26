import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, LayoutDashboard, Settings as SettingsIcon, LogOut, Download } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { Link, useNavigate } from 'react-router-dom';

function TopNavbar({ title }) {
  const { name, profile_image, getInitials, loading, setProfile } = useProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    // Show the install prompt
    installPromptEvent.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPromptEvent(null);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    setProfile(null);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 h-16 flex items-center justify-between px-8">
      {/* Page Title / Welcome */}
      <div>
        <h1 className="text-xl font-bold text-white hidden sm:block tracking-tight">
          {title || "Welcome back"}
        </h1>
      </div>

      {/* Action Area */}
      <div className="flex items-center space-x-6 w-full sm:w-auto justify-end">
        {/* Search Bar */}
        <div className="relative max-w-xs w-full hidden md:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-400"
            placeholder="Search preparation, history..."
          />
        </div>

        {/* Install PWA Button (Conditional) */}
        {installPromptEvent && (
          <button 
            onClick={handleInstallClick}
            className="hidden md:flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 border border-indigo-500/50"
          >
            <Download className="h-4 w-4" />
            <span>Install App</span>
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-indigo-500 border-2 border-[#0b0f19] rounded-full"></span>
        </button>

        {/* User Info & Dropdown */}
        <div className="relative border-l border-white/10 pl-6" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 focus:outline-none hover:bg-white/5 p-1.5 rounded-xl transition-colors"
          >
            {loading ? (
              <div className="animate-pulse h-9 w-9 rounded-full bg-slate-800 shadow-sm border-2 border-slate-700"></div>
            ) : (
              <>
                {profile_image ? (
                  <img
                    className="h-9 w-9 rounded-full object-cover border-2 border-slate-700 shadow-sm"
                    src={profile_image}
                    alt={name}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm border-2 border-indigo-400/30">
                    {getInitials(name)}
                  </div>
                )}
                <div className="hidden lg:flex items-center space-x-2 text-left">
                  <p className="text-sm font-semibold text-white leading-tight truncate max-w-[150px]">{name}</p>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </>
            )}
          </button>

          {/* Dropdown Menu */}
          <div 
            className={`absolute right-0 mt-3 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 origin-top-right z-50 ${
              dropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="py-2">
             <Link
  to="/dashboard"
  onClick={() => setDropdownOpen(false)}
  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
>
  <LayoutDashboard className="w-4 h-4 text-white" />
  <span>Dashboard</span>
</Link>

<Link
  to="/settings"
  onClick={() => setDropdownOpen(false)}
  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
>
  <SettingsIcon className="w-4 h-4 text-white" />
  <span>Settings</span>
</Link>

              <div className="h-px bg-white/10 my-1"></div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
