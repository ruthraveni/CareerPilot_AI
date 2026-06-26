import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import api from '../utils/api';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import { toast } from 'react-toastify';

function Admin() {
  const { role, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileLoading && role !== 'admin') {
      toast.error('Access Denied');
      navigate('/dashboard');
    }
  }, [role, profileLoading, navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (role !== 'admin') return;
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch admin stats', error);
        toast.error('Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (role === 'admin') {
      fetchAdminData();
    }
  }, [role]);

  if (profileLoading || (role === 'admin' && loading)) {
    return (
      <div className="flex h-screen bg-[#0b0f19] items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null; // Redirect handles this
  }

  return (
    <div className="flex h-screen bg-[#0b0f19] overflow-hidden selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 relative">
        <div className="absolute top-0 left-1/4 w-1/2 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <TopNavbar />
        
        <main className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-400 mt-2">Monitor platform activity and AI usage.</p>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl transition-all hover:border-indigo-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200">Total Users</h3>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.total_users || 0}</p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl transition-all hover:border-purple-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200">Total AI Interactions</h3>
                </div>
                <p className="text-4xl font-bold text-white">{stats?.total_chats || 0}</p>
              </div>
            </div>

            {/* Recent Logs */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"/></svg>
                Recent AI Activity
              </h2>
              
              <div className="space-y-4">
                {stats?.recent_logs && stats.recent_logs.length > 0 ? (
                  stats.recent_logs.map((log, index) => (
                    <div key={index} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 transition-colors hover:bg-slate-800/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-indigo-400">{log.user.name} ({log.user.email})</span>
                        <span className="text-xs text-slate-500">{new Date(log.chat.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">
                        <span className="text-slate-500 font-semibold mr-2">{log.chat.sender === 'user' ? 'Prompt:' : 'AI:'}</span>
                        {log.chat.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">No recent AI activity found.</p>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default Admin;
