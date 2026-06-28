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
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/company.css';

export default function Settings() {
  const navigate = useNavigate();
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [fontSize, setFontSize] = useState(localStorage.getItem('font-size') || 'Medium');

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [studyReminders, setStudyReminders] = useState(false);

  // AI Preferences
  const [prefDifficulty, setPrefDifficulty] = useState('Medium');
  const [prefLanguage, setPrefLanguage] = useState('English');
  const [prefRole, setPrefRole] = useState('Software Engineer');
  const [prefCompany, setPrefCompany] = useState('Google');

  // Load user details
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/profile');
        if (res.data) {
          setFullName(res.data.name || res.data.fullName);
          setEmail(res.data.email);
          setPrefRole(res.data.targetRole);
          setPrefCompany(res.data.dreamCompany);
        }
      } catch (e) {
        console.error('Failed to load profile details in settings:', e);
      }
    }
    loadProfile();
  }, []);

  // Handle Theme Toggle
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // Handle Font Size Change
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('font-size', size);
    // Simple global class toggle for final-year project detail
    document.body.style.fontSize = size === 'Small' ? '13px' : size === 'Large' ? '17px' : '15px';
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
      const [profileRes, interviewsRes, resumeRes] = await Promise.all([
        api.get('/profile'),
        api.get('/interview/interviews'),
        api.get('/resume/history')
      ]);

      const parsedResume = resumeRes.data || null;

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

  const sections = [
    { id: 'Account', label: 'Account Settings', icon: User },
    { id: 'Appearance', label: 'Appearance', icon: Eye },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'Privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'AI', label: 'AI Preferences', icon: Cpu },
    { id: 'System', label: 'System & Info', icon: Info },
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                  <div>
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

                  <div style={{ borderTop: '1px solid var(--cp-border)', marginTop: '16px', paddingTop: '16px' }}>
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

                  <div style={{ borderTop: '1px solid #fee2e2', marginTop: '24px', paddingTop: '16px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626', marginBottom: '6px' }}>Danger Zone</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)', marginBottom: '12px' }}>Permanently erase your credentials, transcripts, and dashboard progress.</p>
                    <button 
                      onClick={handleDeleteAccount}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        padding: '10px 20px',
                        borderRadius: '10px',
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '8px' }}>THEME MODE</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleThemeChange('light')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '10px',
                          border: theme === 'light' ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                          background: theme === 'light' ? 'var(--cp-primary-light)' : 'white',
                          color: theme === 'light' ? 'var(--cp-primary)' : 'var(--cp-text)',
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
                          border: theme === 'dark' ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                          background: theme === 'dark' ? 'var(--cp-primary-light)' : 'white',
                          color: theme === 'dark' ? 'var(--cp-primary)' : 'var(--cp-text)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🌙 Dark Theme
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '8px' }}>TEXT FONT SIZE</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Small', 'Medium', 'Large'].map(size => (
                        <button
                          key={size}
                          onClick={() => handleFontSizeChange(size)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: fontSize === size ? '2px solid var(--cp-primary)' : '1px solid var(--cp-border)',
                            background: fontSize === size ? 'var(--cp-primary-light)' : 'white',
                            color: fontSize === size ? 'var(--cp-primary)' : 'var(--cp-text)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PREFERRED RECRUITER LEVEL</label>
                    <select 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'white' }}
                      value={prefDifficulty}
                      onChange={(e) => setPrefDifficulty(e.target.value)}
                    >
                      <option value="Easy">Easy (Entry Level)</option>
                      <option value="Medium">Medium (Associate)</option>
                      <option value="Hard">Hard (Senior SDE)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>INTERVIEW LANGUAGE</label>
                    <select 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', padding: '10px', background: 'white' }}
                      value={prefLanguage}
                      onChange={(e) => setPrefLanguage(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PRIMARY TARGET ROLE</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', background: 'white' }}
                      value={prefRole}
                      onChange={(e) => setPrefRole(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '6px' }}>PRIMARY TARGET COMPANY</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', background: 'white' }}
                      value={prefCompany}
                      onChange={(e) => setPrefCompany(e.target.value)}
                    />
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

                  <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>Feedback & Support</h4>
                    <textarea 
                      placeholder="Write feedback, system reports, or feature requests here..."
                      rows={3}
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', background: 'white', resize: 'none', fontSize: '0.85rem' }}
                    />
                    <button 
                      onClick={() => toast.success('Thank you for your valuable feedback!')}
                      className="cpd-view-full-btn" 
                      style={{ marginTop: '8px', padding: '8px 20px', fontSize: '0.825rem' }}
                    >
                      Submit Feedback
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px', display: 'flex', justifyContent: 'between', fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>
                    <span>Build: #2026.06.24.01</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Help desk online at support@careerpilot.ai'); }} style={{ color: 'var(--cp-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      Get Help & Support
                    </a>
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
