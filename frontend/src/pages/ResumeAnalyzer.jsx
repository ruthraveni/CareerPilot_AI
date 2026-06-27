import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import {
  Upload, FileText, Loader2, CheckCircle, AlertCircle,
  Star, Zap, TrendingUp, Target, Award, ChevronRight,
  BarChart3, BookOpen, Lightbulb, XCircle, ArrowLeft, RefreshCw, Bookmark, Cpu
} from 'lucide-react';
import RatingWidget from '../components/RatingWidget';

/* ───────────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────────── */

function ATSScoreRing({ score, label, radius = 45, strokeWidth = 8, size = "w-28 h-28" }) {
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center p-4 bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl shadow-sm">
      <div className={`relative ${size}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-[var(--cp-text)]">{score}%</span>
        </div>
      </div>
      <span className="mt-3 text-xs font-black text-[var(--cp-text-muted)] uppercase tracking-widest text-center">{label}</span>
    </div>
  );
}

function SkillBadge({ skill, type }) {
  const styles = {
    strong: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    intermediate: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    missing: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${styles[type]}`}>
      {skill}
    </span>
  );
}

function SectionCard({ title, items, icon, colorClass, borderClass }) {
  return (
    <div className={`bg-[var(--cp-surface)] border ${borderClass} rounded-2xl p-6 shadow-sm`}>
      <h4 className={`font-black text-xs uppercase tracking-wider mb-4 flex items-center gap-2 ${colorClass}`}>
        {icon} {title}
      </h4>
      <ul className="space-y-3">
        {items && items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass.includes('emerald') ? 'bg-emerald-500' : colorClass.includes('rose') ? 'bg-rose-500' : 'bg-slate-500'}`} />
            <p className="text-[var(--cp-text-muted)] text-sm font-semibold leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Main Page
   ─────────────────────────────────────────────── */

function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Frontend Developer');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/resume/history');
        if (res.data) {
          setResult(res.data);
        }
      } catch (err) {
        console.error('Failed to load resume history:', err);
      }
    };
    loadHistory();
  }, []);

  const ACCEPTED = '.pdf,.doc,.docx,.txt';

  const handleFile = (selectedFile) => {
    setError('');
    setResult(null);
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      setError('Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be under 5 MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a resume file first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_role', targetRole);

      const res = await api.post('/resume/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to analyze resume. Please try again.';
      setError(msg);
      console.error('Resume analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <Layout title="Resume Analyzer">
      <div className="max-w-4xl mx-auto space-y-8 px-4">


        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--cp-surface)]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-[var(--cp-surface)]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-200" />
                  <span className="text-indigo-200 text-xs font-black uppercase tracking-widest">ATS Similarity Platform</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
                <h1 className="text-3xl font-black tracking-tight">AI Resume Analyzer</h1>
                <div className="text-slate-800">
                  <RatingWidget featureId="resume_analyzer" featureName="AI Resume Analyzer" />
                </div>
              </div>
              <p className="text-indigo-100 text-sm font-medium max-w-md leading-relaxed mt-2">
                Scan your resume against specific target roles. Check keyword density, structural quality, and receive customized tips.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: <Zap className="w-4 h-4" />, label: 'Health Dashboard' },
                { icon: <Target className="w-4 h-4" />, label: 'Role Alignment' },
                { icon: <Cpu className="w-4 h-4" />, label: 'Deep Scans' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-[var(--cp-surface)]/10 rounded-xl px-3.5 py-2 text-xs font-black border border-white/5">
                  {icon}{label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration + Upload Card */}
        {!result && (
          <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-black text-[var(--cp-text)] flex items-center gap-2.5">
              <Upload className="w-5 h-5 text-indigo-500" />
              Analyze Configuration
            </h2>

            {/* Target Role Selector */}
            <div>
              <label className="block text-sm font-black text-[var(--cp-text-muted)] mb-2 uppercase tracking-wider">Target Career Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-4 py-3.5 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm shadow-sm"
              >
                <option>Frontend Developer</option>
                <option>Backend Developer</option>
                <option>Full Stack Developer</option>
                <option>Java Developer</option>
                <option>Data Analyst</option>
              </select>
            </div>

            {/* Drop Zone */}
            <div>
              <label className="block text-sm font-black text-[var(--cp-text-muted)] mb-2 uppercase tracking-wider">Upload Resume Document</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-10 text-center
                  ${dragOver
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : file
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-350 bg-[var(--cp-bg)] hover:border-indigo-455 hover:bg-indigo-50/40'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />

                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-black text-emerald-800 text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 font-bold mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="text-xs text-rose-500 hover:text-rose-700 underline font-black"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                      <FileText className="w-7 h-7 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-black text-[var(--cp-text-muted)] text-sm">Drop your resume document here</p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">or click to browse local storage</p>
                      <p className="text-[10px] text-slate-350 font-bold mt-2">Supports PDF, DOCX, DOC, TXT (Max 5 MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Analyze Trigger */}
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800
                text-white font-black py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing ATS Scan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Analyze Resume Details</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-[var(--cp-surface2)] rounded-xl w-48" />
            <div className="h-4 bg-[var(--cp-surface2)] rounded-xl w-full" />
            <div className="h-4 bg-[var(--cp-surface2)] rounded-xl w-3/4" />
            <div className="h-4 bg-[var(--cp-surface2)] rounded-xl w-5/6" />
          </div>
        )}

        {/* Results Screen */}
        {result && !loading && (
          <div className="space-y-6">

            {/* Resume Health Dashboard */}
            <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-md p-6">
              <h3 className="text-md font-black text-[var(--cp-text)] mb-6 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" /> Resume Health Dashboard
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <ATSScoreRing score={result.ats_score} label="ATS Score" size="w-20 h-20" />
                <ATSScoreRing score={result.role_match_percentage} label="Role Match" size="w-20 h-20" />
                <ATSScoreRing score={result.skill_match_percentage} label="Skill Coverage" size="w-20 h-20" />
                <ATSScoreRing score={result.keyword_match_percentage} label="Keyword Match" size="w-20 h-20" />
                <ATSScoreRing score={result.section_completeness_percentage} label="Completeness" size="w-20 h-20" />
              </div>
            </div>

            {/* Metadata and Experience Summary */}
            <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-[var(--cp-text)] text-sm uppercase tracking-wider">Candidate Analysis Summary</h3>
                    <span className="text-xs font-semibold text-slate-400">Targeting: <span className="text-indigo-600 font-bold">{result.target_role}</span></span>
                  </div>
                </div>
                {result.fingerprint && (
                  <span className="text-[10px] font-bold text-slate-450 bg-[var(--cp-surface2)] px-2.5 py-1 rounded-lg">
                    Comparison Fingerprint: {result.fingerprint.slice(0, 12)}...
                  </span>
                )}
              </div>
              <p className="text-[var(--cp-text-muted)] text-sm leading-relaxed font-semibold leading-relaxed">{result.experience_summary}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-bold pt-2 border-t border-[var(--cp-border)]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {result.filename}
                </span>
                <span>·</span>
                <span>{new Date(result.analyzed_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Score Breakdown */}
            {result.score_breakdown && result.score_breakdown.length > 0 && (
              <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Target className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-black text-[var(--cp-text)] text-sm uppercase tracking-wider">Weight Breakdown (Out of 100)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {result.score_breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-[var(--cp-bg)] border border-[var(--cp-border)]">
                      <span className="text-xs font-bold text-[var(--cp-text-muted)]">{item.category}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${item.score === item.max ? 'bg-emerald-100 text-emerald-800' : item.score > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-800'}`}>
                        {item.score} / {item.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Level Detection Tabs */}
            <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Star className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-black text-[var(--cp-text)] text-sm uppercase tracking-wider">Skill Level Detection</h3>
              </div>

              {/* Strong Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Strong Skills (Role Aligned)</h4>
                <div className="flex flex-wrap gap-2">
                  {result.strong_skills && result.strong_skills.length > 0 ? (
                    result.strong_skills.map((s, i) => <SkillBadge key={i} skill={s} type="strong" />)
                  ) : (
                    <span className="text-xs font-semibold text-slate-450 italic">None detected. Add required skills for this role.</span>
                  )}
                </div>
              </div>

              {/* Intermediate Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Intermediate Skills (Other Detected)</h4>
                <div className="flex flex-wrap gap-2">
                  {result.intermediate_skills && result.intermediate_skills.length > 0 ? (
                    result.intermediate_skills.map((s, i) => <SkillBadge key={i} skill={s} type="intermediate" />)
                  ) : (
                    <span className="text-xs font-semibold text-slate-450 italic">None detected.</span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-rose-700 uppercase tracking-widest">Missing Skills (Role Required)</h4>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills && result.missing_skills.length > 0 ? (
                    result.missing_skills.map((s, i) => <SkillBadge key={i} skill={s} type="missing" />)
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 italic">Excellent! You have met all key skills.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths, Improvements, High Impact Suggestions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SectionCard 
                title="Top Strengths" 
                items={result.strengths} 
                icon={<CheckCircle className="w-4 h-4" />}
                colorClass="text-emerald-700"
                borderClass="border-emerald-100 bg-emerald-50/10"
              />
              <SectionCard 
                title="Areas to Improve" 
                items={result.improvements} 
                icon={<TrendingUp className="w-4 h-4" />}
                colorClass="text-amber-700"
                borderClass="border-amber-100 bg-amber-50/10"
              />
              <SectionCard 
                title="High Impact Suggestions" 
                items={result.high_impact_suggestions} 
                icon={<Zap className="w-4 h-4" />}
                colorClass="text-rose-700"
                borderClass="border-rose-100 bg-rose-50/10"
              />
            </div>

            {/* Personalized Recommendations Section */}
            <div className="bg-[var(--cp-surface)] rounded-3xl border border-[var(--cp-border)] shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-black text-[var(--cp-text)] text-sm uppercase tracking-wider">Personalized Recommendations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Projects */}
                <div className="p-4 bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl">
                  <h4 className="text-xs font-black text-[var(--cp-text-muted)] uppercase tracking-widest mb-2">Recommended Projects</h4>
                  <ul className="list-disc list-inside text-sm font-semibold text-[var(--cp-text-muted)] space-y-1.5 leading-relaxed">
                    {result.recommended_projects && result.recommended_projects.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>

                {/* Certifications */}
                <div className="p-4 bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl">
                  <h4 className="text-xs font-black text-[var(--cp-text-muted)] uppercase tracking-widest mb-2">Recommended Certifications</h4>
                  <ul className="list-disc list-inside text-sm font-semibold text-[var(--cp-text-muted)] space-y-1.5 leading-relaxed">
                    {result.recommended_certifications && result.recommended_certifications.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Learning Paths */}
                <div className="p-4 bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl md:col-span-2">
                  <h4 className="text-xs font-black text-[var(--cp-text-muted)] uppercase tracking-widest mb-2">Recommended Learning Path</h4>
                  <ul className="list-disc list-inside text-sm font-semibold text-[var(--cp-text-muted)] space-y-1.5 leading-relaxed">
                    {result.recommended_learning_paths && result.recommended_learning_paths.map((lp, idx) => (
                      <li key={idx}>{lp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl mb-8 p-6 text-center shadow-sm">
              <h4 className="text-[var(--cp-text)] font-bold mb-2">How was your experience?</h4>
              <p className="text-[var(--cp-text-muted)] text-sm mb-4">Your feedback helps us improve the AI Resume Analyzer.</p>
              <div className="flex justify-center">
                <RatingWidget featureId="resume_analyzer" featureName="AI Resume Analyzer" />
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center pt-4">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ResumeAnalyzer;
