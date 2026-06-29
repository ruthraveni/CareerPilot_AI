import { useState, useEffect, useMemo } from 'react';
import { useBlocker } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { 
  calculateCompanyReadiness, 
  getCompletedProjects
} from '../utils/readinessCalculator';
import { useProfile } from '../context/ProfileContext';
import COMPANIES from '../utils/companyData';
import { 
  Target, 
  Award, 
  BrainCircuit, 
  Loader2, 
  AlertCircle, 
  Mail, 
  GraduationCap, 
  Briefcase, 
  CheckCircle, 
  Plus, 
  Trash2,
  Camera,
  Upload
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/company.css';

function ProfileSkeleton() {
  return (
    <Layout title="Student Profile">
      <div className="cp-page animate-pulse" style={{ padding: '0 0 40px 0' }}>
        {/* Header Hero Profile Card Skeleton */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden mb-8">
          <div className="h-32 bg-slate-200" />
          <div className="px-8 pb-6 relative">
            <div className="absolute -top-12 left-8">
              <div className="h-24 w-24 rounded-2xl border-4 border-white bg-slate-300 shadow-md" />
            </div>
            <div className="pt-16 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-slate-300 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
              <div className="h-10 bg-slate-200 rounded-xl w-32" />
            </div>
          </div>
        </div>

        {/* Content columns skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="h-5 bg-slate-300 rounded w-1/2" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-8 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-8 bg-slate-100 rounded w-full" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="h-5 bg-slate-300 rounded w-1/2" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="h-5 bg-slate-300 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Profile() {
  const { profile, setProfile, fetchProfile, getInitials, avatarUrl } = useProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Initialize form data when profile is loaded globally
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);
  
  // Custom skills state for editing
  const [newSkillText, setNewSkillText] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('languages'); 

  // Completed mock interviews
  const [completedInterviews, setCompletedInterviews] = useState([]);
  
  // Resume analysis state
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  
  // Image states
  const [imageError, setImageError] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  
  // Toast notifications
  const [toast, setToast] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      if (!profile) {
        await fetchProfile();
      }
      const interviewsRes = await api.get('/interview/interviews');
      setCompletedInterviews(interviewsRes.data || []);
      
      const resumeRes = await api.get('/resume/history');
      if (resumeRes.data) {
        setResumeAnalysis(resumeRes.data);
      }
      
      setError(null);
      setImageError(false);
    } catch (err) {
      setError('Failed to fetch profile settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute if form has dirty (unsaved) modifications
  const isDirty = useMemo(() => {
    if (!profile || !formData) return false;
    
    const textFields = [
      'name', 'email', 'careerGoal', 'collegeName', 
      'department', 'yearOfStudy', 'targetRole', 
      'dreamCompany', 'preferredDomain', 'leetcodeSolved', 'hackathonsAttended'
    ];
    
    for (const field of textFields) {
      if ((profile[field] ?? '') !== (formData[field] ?? '')) {
        return true;
      }
    }
    
    const arrayFields = ['languages', 'frameworks', 'databases', 'tools', 'softSkills', 'certifications'];
    for (const field of arrayFields) {
      const arr1 = profile[field] || [];
      const arr2 = formData[field] || [];
      if (arr1.length !== arr2.length) return true;
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return true;
      }
    }
    
    return false;
  }, [profile, formData]);

  // Prevent data loss - Browser reload or tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !saveLoading) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saveLoading]);

  // Prevent data loss - React Router internal transition
  const blocker = useBlocker(
    ({ nextLocation }) => isDirty && !saveLoading
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (confirmLeave) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Display Toast message
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast('');
    }, 4000);
  };

  // Save changes to backend
  const handleSave = async () => {
    // Validate inputs
    const name = formData.name ? formData.name.trim() : '';
    if (name.length < 3) {
      toast.warn('Name must be at least 3 characters.');
      return;
    }

    const email = formData.email ? formData.email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.warn('Please enter a valid email address.');
      return;
    }

    try {
      setSaveLoading(true);
      await api.put('/profile', formData);
      await fetchProfile(); // Refetch global profile
      setIsEditing(false);
      toast.success('Profile saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Cancel edits
  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  // File change handler (image upload)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast.warn('Only JPG, JPEG, PNG, and WEBP image formats are supported.');
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warn('Image size exceeds the 5 MB limit.');
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setSaveLoading(true);
      const res = await api.post('/profile/upload-image', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data && res.data.avatarUrl) {
        localStorage.setItem('user_avatar', res.data.avatarUrl);
      }
      await fetchProfile(); // Refetch global profile
      setImageError(false);
      // Wait for fetchProfile to finish, then we could clear preview. But let's just leave it or clear it.
      setPreviewImage(null);
      toast.success('Profile image uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload profile image.');
      setPreviewImage(null); // revert preview on error
    } finally {
      setSaveLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Remove profile image
  const handleRemoveImage = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setShowImageMenu(false);
    try {
      setSaveLoading(true);
      await api.delete('/profile/image');
      localStorage.removeItem('user_avatar');
      await fetchProfile(); // Refetch global profile
      setImageError(false);
      toast.success('Profile image removed successfully!');
    } catch (err) {
      toast.error('Failed to remove profile image.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper to extract initials is now obtained globally from useProfile

  // Input change helper
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add a skill to category
  const handleAddSkill = () => {
    if (!newSkillText.trim()) return;
    const currentList = formData[newSkillCategory] || [];
    if (!currentList.includes(newSkillText.trim())) {
      const updatedList = [...currentList, newSkillText.trim()];
      setFormData(prev => ({
        ...prev,
        [newSkillCategory]: updatedList
      }));
    }
    setNewSkillText('');
  };

  // Remove a skill from category
  const handleRemoveSkill = (category, skillToRemove) => {
    const currentList = formData[category] || [];
    const updatedList = currentList.filter(s => s !== skillToRemove);
    setFormData(prev => ({
      ...prev,
      [category]: updatedList
    }));
  };

  // Dynamic calculations for progress metrics
  const dynamicMetrics = useMemo(() => {
    // 1. Resume ATS Score
    let atsScore = null;
    let missingKeywords = [];
    if (resumeAnalysis) {
      atsScore = resumeAnalysis.ats_score || null;
      missingKeywords = resumeAnalysis.missing_keywords || [];
    }

    // 2. Mock Interviews Completed
    const completedCount = completedInterviews.filter(i => i.status === 'completed').length;

    // 3. Average Readiness Score
    const activeCompanies = COMPANIES.map(c => {
      return calculateCompanyReadiness(c.id, completedInterviews).readiness;
    }).filter(s => s !== null);

    const avgReadiness = activeCompanies.length > 0 
      ? Math.round(activeCompanies.reduce((acc, s) => acc + s, 0) / activeCompanies.length)
      : null;

    // 4. Milestone Completion
    let projectsCompletedCount = 0;
    let totalRecommendedProjects = 0;
    COMPANIES.forEach(c => {
      projectsCompletedCount += getCompletedProjects(c.id).length;
      totalRecommendedProjects += 3; 
    });

    const studyPlanPct = totalRecommendedProjects > 0
      ? Math.round((projectsCompletedCount / totalRecommendedProjects) * 100)
      : 0;

    // 5. Recommendations
    const recommendedCompanies = COMPANIES.filter(c => {
      const score = calculateCompanyReadiness(c.id, completedInterviews).readiness;
      return score !== null && score >= 60; 
    }).map(c => c.name).slice(0, 3);

    if (recommendedCompanies.length === 0) {
      recommendedCompanies.push('TCS', 'Infosys', 'Wipro'); 
    }

    return {
      atsScore,
      completedCount,
      avgReadiness,
      projectsCompletedCount,
      studyPlanPct,
      missingSkills: missingKeywords.slice(0, 5),
      recommendedCompanies
    };
  }, [completedInterviews, resumeAnalysis]);

  const getReadinessLevel = (score) => {
    if (score === null || score === undefined) return 'Beginner';
    if (score <= 40) return 'Beginner';
    if (score <= 70) return 'Improving';
    if (score <= 85) return 'Placement Ready';
    return 'Interview Ready';
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <Layout title="Student Profile">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Error Loading Profile</h3>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Student Profile">
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="cp-page" style={{ padding: '0 0 40px 0' }}>
        
        {/* Header Hero Profile Card */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-3xl overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-700 to-indigo-500 relative" />
          
          <div className="px-8 pb-6 relative">
            
            {/* Profile Avatar Wrapper */}
            <div className="absolute -top-12 left-8 group">
              <div 
                className="relative h-24 w-24 rounded-2xl border-4 border-white bg-slate-100 shadow-md overflow-hidden cursor-pointer flex items-center justify-center transition-all duration-200 hover:scale-105"
                onClick={() => !saveLoading && setShowImageMenu(!showImageMenu)}
              >
                {previewImage ? (
                  <img
                    className="h-full w-full object-cover opacity-70"
                    src={previewImage}
                    alt="Uploading preview"
                  />
                ) : avatarUrl && !imageError ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-3xl">
                    {getInitials(profile.name)}
                  </div>
                )}
                
                {/* Camera Overlay shown on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera className="text-white h-7 w-7" />
                </div>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                id="avatar-upload-file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                disabled={saveLoading}
              />

              {/* Dropdown Options Menu */}
              {showImageMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowImageMenu(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 animate-slide-up">
                    {!avatarUrl ? (
                      <button
                        onClick={() => {
                          setShowImageMenu(false);
                          document.getElementById('avatar-upload-file').click();
                        }}
                        disabled={saveLoading}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2"
                      >
                        <Upload size={14} /> Upload Photo
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowImageMenu(false);
                            document.getElementById('avatar-upload-file').click();
                          }}
                          disabled={saveLoading}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2"
                        >
                          <Upload size={14} /> Change Photo
                        </button>
                        <button
                          onClick={handleRemoveImage}
                          disabled={saveLoading}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Remove Photo
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="pt-16 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  {profile.name}
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                    {getReadinessLevel(dynamicMetrics.avgReadiness)}
                  </span>
                </h2>
                <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                  <Mail size={14} /> {profile.email} · <GraduationCap size={14} /> {profile.collegeName}
                </p>
              </div>

              {/* Action Buttons Top-Right */}
              {isEditing ? (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button 
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    onClick={handleCancel}
                    disabled={saveLoading}
                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  disabled={saveLoading}
                  className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors w-full md:w-auto shadow-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* LEFT COLUMN: Progress & AI Insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Progress Dashboard */}
            <div className="cpd-dash-card" style={{ background: 'var(--cp-surface)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--cp-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} color="var(--cp-primary)" />
                Progress Dashboard
              </h3>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Mock Interviews Completed</span>
                  <span className="font-bold">{dynamicMetrics.completedCount} Sessions</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${Math.min(100, (dynamicMetrics.completedCount / 10) * 100)}%` }}></div>
                </div>
              </div>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Resume ATS Score</span>
                  <span className="font-bold">{dynamicMetrics.atsScore !== null ? `${dynamicMetrics.atsScore}%` : 'No data available'}</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${dynamicMetrics.atsScore || 0}%`, backgroundColor: 'var(--cp-teal)' }}></div>
                </div>
              </div>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Career Readiness Percentage</span>
                  <span className="font-bold">{dynamicMetrics.avgReadiness !== null ? `${dynamicMetrics.avgReadiness}%` : 'No data available'}</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${dynamicMetrics.avgReadiness || 0}%`, backgroundColor: '#8b5cf6' }}></div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
                  Averaged across all target placements.
                </p>
              </div>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Roadmap Milestones Completion</span>
                  <span className="font-bold">{dynamicMetrics.studyPlanPct}%</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${dynamicMetrics.studyPlanPct}%`, backgroundColor: '#f59e0b' }}></div>
                </div>
              </div>
            </div>

            {/* 2. AI Insights */}
            <div className="cpd-dash-card" style={{ background: 'var(--cp-surface)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--cp-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BrainCircuit size={18} color="var(--cp-primary)" />
                AI Career Insights
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-teal)', marginBottom: '6px', textTransform: 'uppercase' }}>Strengths</h4>
                <div className="cpd-skills-chips">
                  <span className="cpd-skill-chip" style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--cp-teal-light)', color: 'var(--cp-teal)', border: 'none' }}>
                    Solid technical skills match
                  </span>
                  {dynamicMetrics.atsScore && dynamicMetrics.atsScore >= 75 && (
                    <span className="cpd-skill-chip" style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--cp-teal-light)', color: 'var(--cp-teal)', border: 'none' }}>
                      ATS-Optimized resume
                    </span>
                  )}
                  {dynamicMetrics.completedCount > 0 && (
                    <span className="cpd-skill-chip" style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--cp-teal-light)', color: 'var(--cp-teal)', border: 'none' }}>
                      Mock practice active
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-badge-hard)', marginBottom: '6px', textTransform: 'uppercase' }}>Areas to Improve</h4>
                <ul className="cpd-bullet-list" style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                  {!dynamicMetrics.atsScore && (
                    <li style={{ color: 'var(--cp-badge-hard)', fontSize: '0.8rem', padding: '2px 0' }}>⚠️ Resume has not been evaluated inside the Resume Analyzer.</li>
                  )}
                  {dynamicMetrics.completedCount === 0 && (
                    <li style={{ color: 'var(--cp-badge-hard)', fontSize: '0.8rem', padding: '2px 0' }}>⚠️ Practice mock rounds to build confidence and pacing.</li>
                  )}
                  {dynamicMetrics.projectsCompletedCount === 0 && (
                    <li style={{ color: 'var(--cp-badge-hard)', fontSize: '0.8rem', padding: '2px 0' }}>⚠️ Complete recommended projects inside company dashboards to gain practical edge.</li>
                  )}
                  {dynamicMetrics.atsScore && dynamicMetrics.atsScore > 0 && (
                    <li style={{ color: 'var(--cp-badge-hard)', fontSize: '0.8rem', padding: '2px 0' }}>⚠️ Work on resolving missing key skills matching target job profiles.</li>
                  )}
                </ul>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-text)', marginBottom: '6px', textTransform: 'uppercase' }}>Recommended Targets</h4>
                <div className="cpd-skills-chips">
                  {dynamicMetrics.recommendedCompanies.map(c => (
                    <span key={c} className="cp-badge Easy" style={{ fontSize: '0.75rem', textTransform: 'none' }}>{c}</span>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cp-text)', marginBottom: '6px', textTransform: 'uppercase' }}>Missing Keywords Needed</h4>
                <div className="cpd-skills-chips">
                  {dynamicMetrics.missingSkills.length > 0 ? (
                    dynamicMetrics.missingSkills.map(s => (
                      <span key={s} className="cp-badge Hard" style={{ fontSize: '0.72rem', textTransform: 'none' }}>{s}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>None! Resume matches key domains.</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Details Form & Skills chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Edit / View Info Form */}
            <div className="cpd-dash-card" style={{ background: 'var(--cp-surface)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--cp-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} color="var(--cp-primary)" />
                Academic & Career Profile
              </h3>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>FULL NAME</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.name === 'No data available' ? '' : (formData.name || '')}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                    <input 
                      type="email" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.email === 'No data available' ? '' : (formData.email || '')}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>COLLEGE NAME</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.collegeName === 'No data available' ? '' : (formData.collegeName || '')}
                      onChange={(e) => handleInputChange('collegeName', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>DEPARTMENT</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.department === 'No data available' ? '' : (formData.department || '')}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>YEAR OF STUDY</label>
                    <select 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', padding: '10px' }}
                      value={formData.yearOfStudy === 'No data available' ? '' : (formData.yearOfStudy || '')}
                      onChange={(e) => handleInputChange('yearOfStudy', e.target.value)}
                      disabled={saveLoading}
                    >
                      <option value="" disabled>Select Year of Study</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="Final Year (4th Year)">Final Year (4th Year)</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>TARGET JOB ROLE</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.targetRole === 'No data available' ? '' : (formData.targetRole || '')}
                      onChange={(e) => handleInputChange('targetRole', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>DREAM COMPANY</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.dreamCompany === 'No data available' ? '' : (formData.dreamCompany || '')}
                      onChange={(e) => handleInputChange('dreamCompany', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>PREFERRED DOMAIN</label>
                    <input 
                      type="text" 
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px' }}
                      value={formData.preferredDomain === 'No data available' ? '' : (formData.preferredDomain || '')}
                      onChange={(e) => handleInputChange('preferredDomain', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '4px' }}>CAREER OBJECTIVE/GOAL</label>
                    <textarea 
                      rows={3}
                      className="cpd-chat-input" 
                      style={{ width: '100%', borderRadius: '8px', resize: 'none' }}
                      value={formData.careerGoal === 'No data available' ? '' : (formData.careerGoal || '')}
                      onChange={(e) => handleInputChange('careerGoal', e.target.value)}
                      disabled={saveLoading}
                    />
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button 
                      onClick={handleSave} 
                      disabled={saveLoading}
                      className="cpd-view-full-btn flex items-center justify-center gap-2" 
                      style={{ flex: 1 }}
                    >
                      {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={handleCancel} 
                      disabled={saveLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>COLLEGE</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.collegeName}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>DEPARTMENT</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.department}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>YEAR</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.yearOfStudy}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>TARGET ROLE</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.targetRole}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>DREAM COMPANY</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.dreamCompany}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block' }}>DOMAIN</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--cp-text)' }}>{profile.preferredDomain}</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block', marginBottom: '4px' }}>CAREER OBJECTIVE</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--cp-text)', lineHeight: '1.5', margin: 0 }}>
                      {profile.careerGoal}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Skills Registry */}
            <div className="cpd-dash-card" style={{ background: 'var(--cp-surface)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--cp-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--cp-primary)" />
                Skills Registry
              </h3>

              {isEditing && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', background: 'var(--cp-surface2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--cp-border)' }}>
                  <input 
                    type="text" 
                    placeholder="Add custom skill..." 
                    className="cpd-chat-input" 
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', background: 'white' }}
                    value={newSkillText}
                    onChange={(e) => setNewSkillText(e.target.value)}
                    disabled={saveLoading}
                  />
                  <select 
                    className="cpd-chat-input" 
                    style={{ padding: '6px', fontSize: '0.8rem', background: 'white' }}
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value)}
                    disabled={saveLoading}
                  >
                    <option value="languages">Language</option>
                    <option value="frameworks">Framework</option>
                    <option value="databases">Database</option>
                    <option value="tools">Tool</option>
                    <option value="softSkills">Soft Skill</option>
                  </select>
                  <button 
                    onClick={handleAddSkill} 
                    className="cpd-chat-send" 
                    style={{ width: '32px', height: '32px' }}
                    disabled={saveLoading}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Skills list categories */}
              {['languages', 'frameworks', 'databases', 'tools', 'softSkills'].map(cat => {
                const label = cat === 'languages' ? 'Programming Languages' : 
                              cat === 'frameworks' ? 'Frameworks & Libraries' :
                              cat === 'databases' ? 'Databases' :
                              cat === 'tools' ? 'Tools & Platforms' : 'Soft Skills';
                const skillsList = (isEditing ? formData[cat] : profile[cat]) || [];

                return (
                  <div key={cat} style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {label}
                    </h4>
                    <div className="cpd-skills-chips">
                      {skillsList.map(skill => (
                        <span 
                          key={skill} 
                          className="cpd-skill-chip" 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '4px 10px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px' 
                          }}
                        >
                          {skill}
                          {isEditing && (
                            <button 
                              onClick={() => handleRemoveSkill(cat, skill)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                              disabled={saveLoading}
                            >
                              <Trash2 size={12} color="var(--cp-badge-hard)" />
                            </button>
                          )}
                        </span>
                      ))}
                      {skillsList.length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>No skills added.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 4. Achievements */}
            <div className="cpd-dash-card" style={{ background: 'var(--cp-surface)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--cp-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--cp-primary)" />
                Achievements & Credentials
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', background: 'var(--cp-surface2)', padding: '10px 14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hands-on Projects Completed</span>
                  <strong style={{ color: 'var(--cp-primary)', fontSize: '1rem' }}>
                    {dynamicMetrics.projectsCompletedCount + (profile?.projects || []).length} Projects
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', background: 'var(--cp-surface2)', padding: '10px 14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>LeetCode Problems Solved</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      className="cpd-chat-input" 
                      style={{ width: '80px', padding: '4px 8px', textAlign: 'right', background: 'white' }}
                      value={formData.leetcodeSolved || 0}
                      onChange={(e) => handleInputChange('leetcodeSolved', parseInt(e.target.value) || 0)}
                      disabled={saveLoading}
                    />
                  ) : (
                    <strong style={{ color: 'var(--cp-teal)', fontSize: '1rem' }}>
                      {profile.leetcodeSolved} Problems
                    </strong>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', background: 'var(--cp-surface2)', padding: '10px 14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hackathons Attended</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      className="cpd-chat-input" 
                      style={{ width: '80px', padding: '4px 8px', textAlign: 'right', background: 'white' }}
                      value={formData.hackathonsAttended || 0}
                      onChange={(e) => handleInputChange('hackathonsAttended', parseInt(e.target.value) || 0)}
                      disabled={saveLoading}
                    />
                  ) : (
                    <strong style={{ color: '#8b5cf6', fontSize: '1rem' }}>
                      {profile.hackathonsAttended} Events
                    </strong>
                  )}
                </div>

                {/* Certifications list */}
                <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '14px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Certifications & Licenses
                  </span>
                  
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(formData.certifications || []).map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="cpd-chat-input" 
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'white' }}
                            value={c}
                            onChange={(e) => {
                              const updated = [...formData.certifications];
                              updated[i] = e.target.value;
                              handleInputChange('certifications', updated);
                            }}
                            disabled={saveLoading}
                          />
                          <button 
                            onClick={() => {
                              const updated = formData.certifications.filter((_, idx) => idx !== i);
                              handleInputChange('certifications', updated);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            disabled={saveLoading}
                          >
                            <Trash2 size={14} color="var(--cp-badge-hard)" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const updated = [...(formData.certifications || []), 'New Certificate'];
                          handleInputChange('certifications', updated);
                        }}
                        disabled={saveLoading}
                        style={{
                          background: 'none',
                          border: '1px dashed var(--cp-primary)',
                          color: 'var(--cp-primary)',
                          padding: '6px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> Add Certification
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(profile.certifications || []).map((c, i) => (
                        <div 
                          key={i} 
                          style={{ 
                            fontSize: '0.82rem', 
                            color: 'var(--cp-text)', 
                            background: 'var(--cp-surface2)', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid var(--cp-border)',
                            fontWeight: 500
                          }}
                        >
                          📜 {c}
                        </div>
                      ))}
                      {(profile.certifications || []).length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>No certifications added.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Projects list */}
                <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '14px', marginTop: '14px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cp-text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Personal / Academic Projects
                  </span>
                  
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(formData.projects || []).map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            className="cpd-chat-input" 
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', background: 'white' }}
                            value={p}
                            onChange={(e) => {
                              const updated = [...(formData.projects || [])];
                              updated[i] = e.target.value;
                              handleInputChange('projects', updated);
                            }}
                            disabled={saveLoading}
                          />
                          <button 
                            onClick={() => {
                              const updated = (formData.projects || []).filter((_, idx) => idx !== i);
                              handleInputChange('projects', updated);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            disabled={saveLoading}
                          >
                            <Trash2 size={14} color="var(--cp-badge-hard)" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const updated = [...(formData.projects || []), 'New Project'];
                          handleInputChange('projects', updated);
                        }}
                        disabled={saveLoading}
                        style={{
                          background: 'none',
                          border: '1px dashed var(--cp-primary)',
                          color: 'var(--cp-primary)',
                          padding: '6px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> Add Project
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(profile.projects || []).map((p, i) => (
                        <div 
                          key={i} 
                          style={{ 
                            fontSize: '0.82rem', 
                            color: 'var(--cp-text)', 
                            background: 'var(--cp-surface2)', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid var(--cp-border)',
                            fontWeight: 500
                          }}
                        >
                          💻 {p}
                        </div>
                      ))}
                      {(profile.projects || []).length === 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)' }}>No projects added.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
          
        </div>

      </div>

      {/* Success Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 animate-slide-up">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}
    </Layout>
  );
}

export default Profile;
