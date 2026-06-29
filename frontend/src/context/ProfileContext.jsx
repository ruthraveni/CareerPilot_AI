import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const ProfileContext = createContext(null);

export const ProfileProvider = ({ children }) => {
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading: loading, refetch: fetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
    enabled: !!token,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Provide a setProfile function for legacy components to update the query cache (e.g. on logout)
  const setProfile = (newData) => {
    queryClient.setQueryData(['profile'], newData);
  };

  // Compute Priority 1 & Priority 2 fallbacks natively
  const name = profile?.name && profile.name !== "No data available" 
    ? profile.name 
    : (localStorage.getItem('user_name') || "");

  const email = profile?.email && profile.email !== "No data available" 
    ? profile.email 
    : (localStorage.getItem('user_email') || "");

  const role = profile?.role || localStorage.getItem('user_role') || "user";

  const avatarUrl = profile?.avatarUrl || localStorage.getItem('user_avatar') || "";

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
      avatarUrl,
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
