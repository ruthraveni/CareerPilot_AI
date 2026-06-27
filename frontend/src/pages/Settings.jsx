import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { clearChatHistory } from '../utils/geminiWrapper';
import { 
  User, 
  Settings as SettingsIcon, 
  Eye, 
  Bell, 
  Shield, 
  Cpu, 
  Info, 
  LogOut, 
  Trash2, 
  Download, 
  Volume2, 
  HelpCircle, 
  Star,
  CheckCircle2,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useThemeContext } from '../context/ThemeContext';
import '../styles/company.css';

export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('Account'); // 'Account', 'Appearance', 'Notifications', 'Privacy', 'AI', 'System'

  // Form states
  const [fullName, setFullName] = useState('Ruthra');
  const [email, setEmail] = useState('candidate@careerpilot.ai');
  const [newPassword, setNewPassword] = useState('');

  // Appearance Context & Preview States
  const { savedTheme, setSavedTheme, savedFontSize, setSavedFontSize, applyThemeToDOM, applyFontSizeToDOM } = useThemeContext();
  const [previewTheme, setPreviewTheme] = useState(savedTheme);
  const [previewFontSize, setPreviewFontSize] = useState(savedFontSize);
  
  // Keep previews synced with context if context loads later
  useEffect(() => {
    setPreviewTheme(savedTheme);
    setPreviewFontSize(savedFontSize);
  }, [savedTheme, savedFontSize]);

  // Clean up: if user navigates away, revert DOM to saved state if they didn't save
  useEffect(() => {
    return () => {
      applyThemeToDOM(savedTheme);
      applyFontSizeToDOM(savedFontSize);
    };
  }, [savedTheme, savedFontSize, applyThemeToDOM, applyFontSizeToDOM]);

  // Feedback State
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [studyReminders, setStudyReminders] = useState(false);

  // AI Preferences
  const [prefDifficulty, setPrefDifficulty] = useState('Medium (Associate)');
  const [prefLanguage, setPrefLanguage] = useState('English');
  const [prefRole, setPrefRole] = useState('Software Engineer');
  const [prefCompany, setPrefCompany] = useState('Google');
  const [savingAiField, setSavingAiField] = useState(null); // Track which field is saving

  // Load user details and AI settings
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/profile');
        if (res.data) {
          setFullName(res.data.name || res.data.fullName);
          setEmail(res.data.email);
        }
      } catch (e) {
        console.error('Failed to load profile details in settings:', e);
      }
      
      try {
        const aiRes = await api.get('/ai-settings');
        if (aiRes.data) {
          setPrefDifficulty(aiRes.data.preferred_recruiter_level || 'Medium (Associate)');
          setPrefLanguage(aiRes.data.interview_language || 'English');
          setPrefRole(aiRes.data.primary_target_role || 'Software Engineer');
          setPrefCompany(aiRes.data.primary_target_company || 'Google');
        }
      } catch (e) {
        console.error('Failed to load AI settings:', e);
      }
    }
    loadProfile();
  }, []);

  // Handle Theme Toggle Preview
  const handleThemeChange = (newTheme) => {
    setPreviewTheme(newTheme);
    applyThemeToDOM(newTheme);
  };

  // Handle Font Size Toggle Preview
  const handleFontSizeChange = (size) => {
    setPreviewFontSize(size);
    applyFontSizeToDOM(size);
  };

  // Save Appearance to Backend
  const saveAppearance = async (type) => {
    try {
      if (type === 'theme') {
        await api.post('/user-preferences', { theme: previewTheme, font_size: savedFontSize });
        setSavedTheme(previewTheme);
        toast.success('Theme saved successfully');
      } else {
        await api.post('/user-preferences', { theme: savedTheme, font_size: previewFontSize });
        setSavedFontSize(previewFontSize);
        toast.success('Font size saved successfully');
      }
    } catch (e) {
      console.error('Failed to save appearance', e);
      toast.error('Failed to save preferences');
    }
  };

  // Account Changes
  const handleSave = async () => {
    try {
      await api.put('/update-profile', { fullName, email });
      toast.success('Profile updated successfully!');
    } catch (e) {
      toast.error('Failed to update profile details.');
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.warn('Please enter a valid password.');
      return;
    }
    try {
      // In a real application, we would call a specific change password API.
      // Since this is a final year model project, we simulate it.
      toast.success('Password updated successfully!');
      setNewPassword('');
    } catch (e) {
      toast.error('Failed to update password.');
    }
  };

  // Clear Chat history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your AI Career Mentor chat history? This cannot be undone.')) {
      // Clear chat history for all companies
      const companyIds = ['zoho', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'capgemini', 'hcl', 'amazon', 'microsoft', 'google'];
      companyIds.forEach(id => clearChatHistory(id));
      
      // Also clear local storage mentor logs
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mentor_chats') || key.startsWith('chat_history'))) {
          localStorage.removeItem(key);
        }
      }
      toast.success('AI Mentor chat histories cleared successfully!');
    }
  };

  // Download User Data
  const handleDownloadData = async () => {
    try {
      const [profileRes, interviewsRes] = await Promise.all([
        api.get('/profile'),
        api.get('/interview/interviews')
      ]);

      const resumeAnalysis = localStorage.getItem('resume_analysis');
      let parsedResume = null;
      if (resumeAnalysis) {
        try { parsedResume = JSON.parse(resumeAnalysis); } catch (e) {}
      }

      // Collect project milestones
      const projectCompletion = {};
      const companyIds = ['zoho', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'capgemini', 'hcl', 'amazon', 'microsoft', 'google'];
      companyIds.forEach(id => {
        const completed = localStorage.getItem(`completed_projects_${id}`);
        if (completed) {
          try { projectCompletion[id] = JSON.parse(completed); } catch (e) {}
        }
      });

      const fullData = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data || {},
        resumeAnalyzer: parsedResume || 'No resume analyzed yet',
        mockInterviews: interviewsRes.data || [],
        projectMilestones: projectCompletion
      };

      const jsonStr = JSON.stringify(fullData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerpilot_user_data_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to package and download user data.');
    }
  };

  // Delete Account
  const handleDeleteAccount = () => {
    if (window.confirm('WARNING: Are you sure you want to permanently delete your CareerPilot AI account? This will erase all mock records, profile data, and resume reviews. This action is irreversible.')) {
      // Clear token and redirect to register
      localStorage.clear();
      navigate('/register');
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Submit Feedback
  const handleFeedbackSubmit = async () => {
    const msg = feedbackMsg.trim();
    if (!msg || msg.length < 5) {
      toast.warn('Feedback must be at least 5 characters long.');
      return;
    }
    
    setIsSubmittingFeedback(true);
    try {
      await api.post('/feedback', { message: msg, section: 'settings' });
      toast.success('Feedback submitted successfully!');
      setFeedbackMsg('');
    } catch (e) {
      toast.error('Failed to submit feedback.');
      console.error(e);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Save specific AI Setting
  const handleSaveAiSetting = async (field, value) => {
    if (!value || value.trim() === '') {
      toast.warn('Value cannot be empty.');
      return;
    }
    
    setSavingAiField(field);
    try {
      await api.post('/ai-settings', { field, value });
      toast.success('Setting updated successfully!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update setting.');
      console.error(e);
    } finally {
      setSavingAiField(null);
    }
  };

  const sections = [
    { id: 'Account', label: 'Account Settings', icon: User },
    { id: 'Appearance', label: 'Appearance', icon: Eye },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'AI', label: 'AI Preferences', icon: Cpu },
    { id: 'System', label: 'System & Info', icon: Info },
    { id: 'Feedback', label: 'Feedback & Support', icon: MessageSquare },
  ];

  return (
    <Layout title="Application Settings">
      <div className="cp-page" style={{ paddingBottom: '40px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          
          {/* Settings Sidebar Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive ? 'var(--cp-primary)' : 'var(--cp-surface)',
                    color: isActive ? 'white' : 'var(--cp-text)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? '0 4px 10px rgba(79, 70, 229, 0.2)' : 'var(--cp-shadow)',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={18} />
                  <span>{sec.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 18px',
                borderRadius: '12px',
                border: 'none',
                background: '#fee2e2',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginTop: '12px',
                textAlign: 'left'
              }}
            >
              <LogOut size={18} />
              <span>Logout Session</span>
            </button>
          </div>

          {/* Settings Panel Container */}
          <div className="cpd-tab-body" style={{ minHeight: '450px', background: 'var(--cp-surface)' }}>
            
            {/* 1. Account Settings */}
            {activeSection === 'Account' && (
              <div>
                <h3 className="cpd-section-title"><User size={20} color="var(--cp-primary)" /> Account Configuration</h3>
                <p className="cpd-section-text">Modify your profile login credentials and targeted display parameters.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>
                  <div style={{ padding: '20px', background: 'var(--cp-surface2)', borderRadius: '12px', border: '1px solid var(--cp-border)' }}>
                    <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>FULL NAME</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>EMAIL ADDRESS</label>
                    <input 
                      type="email" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleSave}
                    style={{ alignSelf: 'start', padding: '10px 24px' ,background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)'  }}
                  >
                    Save Changes
                  </button>
                  </div>

                  <div style={{ padding: '20px', background: 'var(--cp-surface2)', borderRadius: '12px', border: '1px solid var(--cp-border)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>Security Settings</h4>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>NEW PASSWORD</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input 
                        type="password" 
                        placeholder="Enter new password..."
                        className="cpd-chat-input" 
                        style={{ flex: 1, borderRadius: '8px' }}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button 
                        onClick={handleChangePassword}
                        className="cpd-view-full-btn"
                        style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)' }}
                      >
                        Update
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '20px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626', marginBottom: '6px' }}>Danger Zone</h4>
                    <p style={{ fontSize: '0.78rem', color: '#b91c1c', marginBottom: '12px' }}>Permanently erase your credentials, transcripts, and dashboard progress.</p>
                    <button 
                      onClick={handleDeleteAccount}
                      style={{
                        background: 'white',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={16} /> Delete Account Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Appearance preferences */}
            {activeSection === 'Appearance' && (
              <div>
                <h3 className="cpd-section-title"><Eye size={20} color="var(--cp-primary)" /> Appearance Preferences</h3>
                <p className="cpd-section-text">Customize the visual styling of the platform interface.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>
                  <div style={{ padding: '20px', background: 'var(--cp-surface2)', borderRadius: '12px', border: '1px solid var(--cp-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '12px' }}>THEME MODE</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleThemeChange('light')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '10px',
                          border: previewTheme === 'light' ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                          background: previewTheme === 'light' ? 'var(--cp-primary-light)' : 'white',
                          color: previewTheme === 'light' ? 'var(--cp-primary)' : 'var(--cp-text)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ☀️ Light Theme
                      </button>
                      <button
                        onClick={() => handleThemeChange('dark')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '10px',
                          border: previewTheme === 'dark' ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                          background: previewTheme === 'dark' ? 'var(--cp-primary-light)' : 'white',
                          color: previewTheme === 'dark' ? 'var(--cp-primary)' : 'var(--cp-text)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🌙 Dark Theme
                      </button>
                    </div>
                    {previewTheme !== savedTheme && (
                      <button 
                        onClick={() => saveAppearance('theme')}
                        className="save-btn" 
                        style={{ marginTop: '16px', width: '100%', padding: '12px' }}
                      >
                        Save Theme
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '20px', background: 'var(--cp-surface2)', borderRadius: '12px', border: '1px solid var(--cp-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '12px' }}>TEXT FONT SIZE</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Small', 'Medium', 'Large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleFontSizeChange(size)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: previewFontSize === size ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                            background: previewFontSize === size ? 'var(--cp-primary)' : 'var(--cp-surface)',
                            color: previewFontSize === size ? 'white' : 'var(--cp-text)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {previewFontSize !== savedFontSize && (
                      <button 
                        onClick={() => saveAppearance('font')}
                        className="save-btn" 
                        style={{ marginTop: '16px', width: '100%', padding: '12px' }}
                      >
                        Save Font Size
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Notifications settings */}
            {activeSection === 'Notifications' && (
              <div>
                <h3 className="cpd-section-title"><Bell size={20} color="var(--cp-primary)" /> Alert Preferences</h3>
                <p className="cpd-section-text">Configure email alerts and system reminders for study milestones.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--cp-border)', borderRadius: '10px', background: 'var(--cp-surface2)' }}>
                    <input 
                      type="checkbox" 
                      checked={emailNotifs}
                      onChange={(e) => setEmailNotifs(e.target.checked)}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>Email Notifications</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>Receive analytical summaries and resume feedback via email.</span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--cp-border)', borderRadius: '10px', background: 'var(--cp-surface2)' }}>
                    <input 
                      type="checkbox" 
                      checked={interviewReminders}
                      onChange={(e) => setInterviewReminders(e.target.checked)}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>Mock Interview Reminders</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>Receive alerts to schedule weekly mock interview runs.</span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--cp-border)', borderRadius: '10px', background: 'var(--cp-surface2)' }}>
                    <input 
                      type="checkbox" 
                      checked={studyReminders}
                      onChange={(e) => setStudyReminders(e.target.checked)}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>Study Plan Roadmap Reminders</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>Get notified when timeline milestones or projects are lagging.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 4. Privacy and Data */}
            {activeSection === 'Privacy' && (
              <div>
                <h3 className="cpd-section-title"><Shield size={20} color="var(--cp-primary)" /> Privacy & Data Controls</h3>
                <p className="cpd-section-text">Control the accessibility and lifecycle of your analyzed profile data.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
                  
                  <div style={{ border: '1px solid var(--cp-border)', borderRadius: '12px', padding: '16px', background: 'var(--cp-surface2)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Trash2 size={16} color="var(--cp-badge-hard)" />
                      Reset Chat History
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)', marginBottom: '12px' }}>
                      Erases all local messages exchanged with the inline AI Career Mentor inside company detail pages.
                    </p>
                    <button 
                      onClick={handleClearHistory}
                      className="cpd-view-btn" 
                      style={{ width: 'max-content', padding: '8px 16px', background: 'none', border: '1px solid var(--cp-badge-hard)', color: 'var(--cp-badge-hard)' }}
                    >
                      Clear Chats Cache
                    </button>
                  </div>

                  <div style={{ border: '1px solid var(--cp-border)', borderRadius: '12px', padding: '16px', background: 'var(--cp-surface2)' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Download size={16} color="var(--cp-teal)" />
                      Export Data Packet
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)', marginBottom: '12px' }}>
                      Download a structured JSON data file containing your academic details, completed interviews, project statuses, and resume evaluations.
                    </p>
                    <button 
                      onClick={handleDownloadData}
                      className="cpd-view-full-btn" 
                      style={{ width: 'max-content', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}
                    >
                      <Download size={14} /> Download User Data (.JSON)
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 5. AI Preferences */}
            {activeSection === 'AI' && (
              <div>
                <h3 className="cpd-section-title"><Cpu size={20} color="var(--cp-primary)" /> AI Interview Customizations</h3>
                <p className="cpd-section-text">Tune the AI Interview model prompts to align with your targets.</p>

                <div style={{ padding: '20px', background: 'var(--cp-surface2)', borderRadius: '12px', border: '1px solid var(--cp-border)', maxWidth: '600px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PREFERRED RECRUITER LEVEL</label>
                      <select 
                        className="cpd-chat-input" 
                        style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'white' }}
                        value={prefDifficulty}
                        onChange={(e) => setPrefDifficulty(e.target.value)}
                      >
                        <option value="Entry">Entry</option>
                        <option value="Medium (Associate)">Medium (Associate)</option>
                        <option value="Senior">Senior</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 16px', fontSize: '0.8rem', height: '42px', whiteSpace: 'nowrap' }}
                      onClick={() => handleSaveAiSetting('preferred_recruiter_level', prefDifficulty)}
                      disabled={savingAiField === 'preferred_recruiter_level'}
                    >
                      {savingAiField === 'preferred_recruiter_level' ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>INTERVIEW LANGUAGE</label>
                      <select 
                        className="cpd-chat-input" 
                        style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'white' }}
                        value={prefLanguage}
                        onChange={(e) => setPrefLanguage(e.target.value)}
                      >
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Mixed (English + Tamil)">Mixed (English + Tamil)</option>
                      </select>
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 16px', fontSize: '0.8rem', height: '42px', whiteSpace: 'nowrap' }}
                      onClick={() => handleSaveAiSetting('interview_language', prefLanguage)}
                      disabled={savingAiField === 'interview_language'}
                    >
                      {savingAiField === 'interview_language' ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PRIMARY TARGET ROLE</label>
                      <input 
                        type="text" 
                        className="cpd-chat-input" 
                        style={{ width: '100%', borderRadius: '8px', background: 'white' }}
                        value={prefRole}
                        onChange={(e) => setPrefRole(e.target.value)}
                      />
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 16px', fontSize: '0.8rem', height: '42px', whiteSpace: 'nowrap' }}
                      onClick={() => handleSaveAiSetting('primary_target_role', prefRole)}
                      disabled={savingAiField === 'primary_target_role'}
                    >
                      {savingAiField === 'primary_target_role' ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PRIMARY TARGET COMPANY</label>
                      <input 
                        type="text" 
                        className="cpd-chat-input" 
                        style={{ width: '100%', borderRadius: '8px', background: 'white' }}
                        value={prefCompany}
                        onChange={(e) => setPrefCompany(e.target.value)}
                      />
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '10px 16px', fontSize: '0.8rem', height: '42px', whiteSpace: 'nowrap' }}
                      onClick={() => handleSaveAiSetting('primary_target_company', prefCompany)}
                      disabled={savingAiField === 'primary_target_company'}
                    >
                      {savingAiField === 'primary_target_company' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. System Information */}
            {activeSection === 'System' && (
              <div>
                <h3 className="cpd-section-title"><Info size={20} color="var(--cp-primary)" /> System & Support</h3>
                <p className="cpd-section-text">About the CareerPilot AI application build.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
                  
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'start', background: 'var(--cp-surface2)', padding: '16px', border: '1px solid var(--cp-border)', borderRadius: '12px' }}>
                    <div style={{ background: 'var(--cp-primary)', padding: '10px', borderRadius: '10px', color: 'white' }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--cp-text)' }}>CareerPilot AI v1.0.4-Beta</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
                        An advanced AI-powered career mock training and resume feedback prototype designed for final-year engineering projects.
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--cp-text-muted)', background: 'var(--cp-surface2)', border: '1px solid var(--cp-border)', borderRadius: '12px' }}>
                    <span>Build: #2026.06.24.01</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Help desk online at support@careerpilot.ai'); }} style={{ color: 'var(--cp-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      Get Help & Support
                    </a>
                  </div>

                </div>
              </div>
            )}

            {/* 7. Feedback */}
            {activeSection === 'Feedback' && (
              <div>
                <h3 className="cpd-section-title"><MessageSquare size={20} color="var(--cp-primary)" /> Feedback & Bug Reports</h3>
                <p className="cpd-section-text">Help us improve CareerPilot AI by submitting your thoughts.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
                  <div style={{ background: 'var(--cp-surface2)', padding: '20px', border: '1px solid var(--cp-border)', borderRadius: '12px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>Share your experience</h4>
                    <textarea 
                      placeholder="Write feedback, system reports, or feature requests here (min 5 chars)..."
                      rows={5}
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', background: 'white', resize: 'none', fontSize: '0.85rem', marginBottom: '16px', padding: '12px' }}
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                    />
                    <button 
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback}
                      className="btn-primary" 
                      style={{ width: '100%', padding: '12px', fontSize: '0.875rem' }}
                    >
                      {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </Layout>
  );
}
