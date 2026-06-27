import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const ThemeContext = createContext();

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [savedTheme, setSavedTheme] = useState('light');
  const [savedFontSize, setSavedFontSize] = useState('Medium');
  const [loading, setLoading] = useState(true);

  // Apply theme to DOM
  const applyThemeToDOM = (t) => {
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Apply font size to DOM
  const applyFontSizeToDOM = (size) => {
    document.body.style.fontSize = size === 'Small' ? '13px' : size === 'Large' ? '17px' : '15px';
  };

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await api.get('/user-preferences');
        if (res.data) {
          const t = res.data.theme || 'light';
          const f = res.data.font_size || 'Medium';
          setSavedTheme(t);
          setSavedFontSize(f);
          applyThemeToDOM(t);
          applyFontSizeToDOM(f);
        }
      } catch (e) {
        console.error('Failed to load user preferences:', e);
      } finally {
        setLoading(false);
      }
    }
    
    // Check if user is logged in (has token)
    const token = localStorage.getItem('token');
    if (token) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ savedTheme, setSavedTheme, savedFontSize, setSavedFontSize, applyThemeToDOM, applyFontSizeToDOM, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
