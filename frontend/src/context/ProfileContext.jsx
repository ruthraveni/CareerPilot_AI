import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setProfile(null);
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.get('/profile');
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to fetch profile in global context:", err);
      // Fallback: Priority 2 (Registered account data from localStorage)
      const cachedName = localStorage.getItem('user_name');
      const cachedEmail = localStorage.getItem('user_email');
      if (cachedName || cachedEmail) {
        setProfile({
          name: cachedName || "User",
          email: cachedEmail || "",
          role: localStorage.getItem('user_role') || "user",
          avatarUrl: null
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Compute Priority 1 & Priority 2 fallbacks natively
  const name = profile?.name && profile.name !== "No data available" 
    ? profile.name 
    : (localStorage.getItem('user_name') || "");

  const email = profile?.email && profile.email !== "No data available" 
    ? profile.email 
    : (localStorage.getItem('user_email') || "");

  const role = profile?.role || localStorage.getItem('user_role') || "user";

  const profile_image = profile?.avatarUrl || null;

  // Global helper for generating initial avatars
  const getInitials = (fullName) => {
    if (!fullName || fullName === 'No data available' || fullName.trim() === '') return '??';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      setProfile, 
      loading, 
      fetchProfile,
      name,
      email,
      role,
      profile_image,
      getInitials
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
