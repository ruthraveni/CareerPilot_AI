import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { 
  Video, ChevronRight, Play, Loader2, Award, ArrowLeft, Mic, Square, 
  Clock, Target, AlertTriangle, Building, Briefcase, ChevronDown, ChevronUp, Check, X, 
  StopCircle, CheckCircle2, Lightbulb, PlusCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import RatingWidget from '../components/RatingWidget';

function Interview() {
  const [role, setRole] = useState('Frontend Developer');
  const [company, setCompany] = useState('Google');
  const [roundType, setRoundType] = useState('Technical Round');
  const [questionCount, setQuestionCount] = useState(5);
  const [timerLimit, setTimerLimit] = useState(60);
  
  const [interviewId, setInterviewId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null);
  const [finished, setFinished] = useState(false);
  const [finalReport, setFinalReport] = useState(null);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Dynamic history tracking for real-time analytics
  const [scoresHistory, setScoresHistory] = useState([]);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [feedbacksList, setFeedbacksList] = useState([]);
  const [showReview, setShowReview] = useState(false);

  const mapRoundType = (round) => {
    const mapping = {
      'Aptitude Round': 'Aptitude',
      'Technical Round': 'Technical',
      'Coding Round': 'Coding',
      'HR Round': 'HR',
      'Behavioral Round': 'Behavioral',
      'System Design Round': 'System Design'
    };
    return mapping[round] || round;
  };

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      // Auto-submit MCQ or submit descriptive answer if timer runs out
      if (mapRoundType(roundType) === 'Aptitude') {
        const fallbackAns = userAnswer || "No Option Selected";
        handleSubmitAnswer(fallbackAns);
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, roundType]);

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await api.post('/interview/start', { 
        role, 
        company,
        round_type: mapRoundType(roundType),
        question_count: Number(questionCount),
        timer: Number(timerLimit)
      });
      
      setInterviewId(response.data.interview_id);
      setQuestions(response.data.questions);
      setCurrentIdx(0);
      setFinished(false);
      setFinalReport(null);
      setFeedbackState(null);
      setUserAnswer('');
      setScoresHistory([]);
      setSubmittedAnswers([]);
      setFeedbacksList([]);
      setShowReview(false);
      
      setTimeLeft(Number(timerLimit));
      setTimerActive(true);
    } catch (err) {
      toast.error('Failed to start interview session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (forcedAnswer = null) => {
    const answerToSubmit = forcedAnswer !== null ? forcedAnswer : userAnswer;
    if (!answerToSubmit.trim()) {
      toast.warn('Please provide or select an answer before submitting.');
      return;
    }
    
    setTimerActive(false);
    
    try {
      setSubmitting(true);
      const response = await api.post('/interview/evaluate', {
        interview_id: interviewId,
        question_index: currentIdx,
        user_answer: answerToSubmit
      });
      
      // Save stats
      setSubmittedAnswers(prev => [...prev, answerToSubmit]);
      setScoresHistory(prev => [...prev, response.data.overall_score]);
      setFeedbacksList(prev => [...prev, response.data]);
      setFeedbackState(response.data);
      
      // Replace questions array dynamically if adaptive list returned
      if (response.data.questions) {
        setQuestions(response.data.questions);
      }

      if (response.data.is_last) {
        setFinalReport(response.data.final_report);
        setFinished(true);
      }
    } catch (err) {
      const message = err?.response?.data?.detail || 'Failed to submit answer.';
      console.error('Submit answer error:', err);
      toast.error(message);
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setFeedbackState(null);
    setUserAnswer('');
    setCurrentIdx(prev => prev + 1);
    setTimeLeft(timerLimit);
    setTimerActive(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      toast.error('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleAudioUpload = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    try {
      setTranscribing(true);
      const response = await api.post('/interview/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUserAnswer(prev => (prev ? prev + ' ' : '') + response.data.text);
    } catch (err) {
      toast.error('Transcription failed.');
    } finally {
      setTranscribing(false);
    }
  };

  // Helper to render customized company gradient logo
  const getCompanyLogo = (companyName) => {
    const colors = {
      Google: "from-blue-500 via-red-500 to-yellow-500",
      Microsoft: "from-red-500 via-green-500 to-blue-500",
      Amazon: "from-orange-400 to-yellow-600",
      Zoho: "from-blue-600 to-emerald-500",
      TCS: "from-indigo-600 to-blue-800",
      Infosys: "from-blue-500 to-sky-400",
      Wipro: "from-purple-500 to-indigo-600",
      Cognizant: "from-cyan-500 to-blue-600",
      Accenture: "from-purple-600 to-pink-500",
      Capgemini: "from-blue-700 to-sky-600",
      HCL: "from-blue-800 to-indigo-900"
    };
    
    const bgGrad = colors[companyName] || "from-slate-500 to-slate-700";
    return (
      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${bgGrad} flex items-center justify-center text-white font-black text-xl shadow-md border border-white/10`}>
        {companyName.charAt(0)}
      </div>
    );
  };

  // SVG Trend Chart component
  const RenderTrendChart = ({ history }) => {
    if (history.length === 0) return null;
    const padding = 20;
    const chartHeight = 100;
    const chartWidth = 340;
    
    const points = history.map((score, index) => {
      const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(1, history.length - 1);
      const y = chartHeight - padding - (score * (chartHeight - 2 * padding)) / 100;
      return { x, y, score };
    });
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    return (
      <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-2xl p-5 shadow-sm">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Performance Trend</h5>
        <div className="relative">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full overflow-visible">
            {/* Grid lines */}
            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3,3" />
            <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#F1F5F9" strokeWidth="2" strokeDasharray="3,3" />
            
            {/* Main Path */}
            {points.length > 1 && (
              <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}
            
            {/* Value Circles */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
                <text x={p.x} y={p.y - 10} fontSize="9" fontWeight="bold" fill="#4338CA" textAnchor="middle">
                  {p.score}%
                </text>
                <text x={p.x} y={chartHeight - 2} fontSize="8" fontWeight="bold" fill="#94A3B8" textAnchor="middle">
                  Q{i+1}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const currentQuestion = questions[currentIdx];
  const questionText = typeof currentQuestion === 'object' ? currentQuestion.text : currentQuestion;
  const isMcq = typeof currentQuestion === 'object' && currentQuestion.options && currentQuestion.options.length > 0;
  const diffBadgeColor = (diff) => {
    const d = (diff || "easy").toLowerCase();
    if (d === 'hard') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (d === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <Layout title="AI Mock Interview Simulator">
      <div className="max-w-4xl mx-auto px-4 py-2">
        {!interviewId ? (
          <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-[var(--cp-text)] tracking-tight">Configure Interview Simulator</h3>
              </div>
              <RatingWidget featureId="interview_simulator" featureName="AI Mock Interview Simulator" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[var(--cp-text-muted)] mb-2">Target Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm"
                  >
                    <option>Zoho</option>
                    <option>TCS</option>
                    <option>Infosys</option>
                    <option>Wipro</option>
                    <option>Accenture</option>
                    <option>Cognizant</option>
                    <option>Capgemini</option>
                    <option>Amazon</option>
                    <option>Microsoft</option>
                    <option>Google</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--cp-text-muted)] mb-2">Target Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm"
                  >
                    <option>Frontend Developer</option>
                    <option>Backend Developer</option>
                    <option>Full Stack Developer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--cp-text-muted)] mb-2">Interview Round</label>
                <select
                  value={roundType}
                  onChange={(e) => setRoundType(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm"
                >
                  <option>Aptitude Round</option>
                  <option>Technical Round</option>
                  <option>Coding Round</option>
                  <option>System Design Round</option>
                  <option>Behavioral Round</option>
                  <option>HR Round</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--cp-text-muted)] mb-2">Timer per Question</label>
                <select
                  value={timerLimit}
                  onChange={(e) => setTimerLimit(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm"
                >
                  <option value={60}>60 Seconds</option>
                  <option value={90}>90 Seconds</option>
                  <option value={120}>120 Seconds</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[var(--cp-text-muted)] mb-2">Total Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--cp-border)] rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-[var(--cp-text-muted)] text-sm"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 mt-8"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Preparing AI Simulator...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Interview</span>
                </>
              )}
            </button>
          </div>
        ) : finished && finalReport ? (
          <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-tr from-indigo-500 to-indigo-700 p-4 rounded-3xl text-white w-max mx-auto mb-4 shadow-md">
                <Award className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-[var(--cp-text)] tracking-tight">Interview Completed</h2>
              <p className="text-[var(--cp-text-muted)] font-semibold mt-1">Verdict analysis for {company} • {role}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[var(--cp-bg)] rounded-2xl p-6 border border-[var(--cp-border)] flex flex-col items-center justify-center md:col-span-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Readiness Score</span>
                <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  {finalReport.readiness_percentage}%
                </div>
                <div className="mt-2 text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                  {finalReport.readiness_percentage >= 85 ? 'Interview Ready' : (finalReport.readiness_percentage >= 70 ? 'Placement Ready' : (finalReport.readiness_percentage >= 40 ? 'Improving' : 'Beginner'))}
                </div>
              </div>

              <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-6 md:col-span-2 space-y-2">
                <h4 className="font-black text-indigo-900 text-xs uppercase tracking-wider">Company Fit Analysis</h4>
                <p className="text-[var(--cp-text-muted)] text-sm font-semibold leading-relaxed">
                  {finalReport.company_fit_analysis}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-6">
                <h4 className="font-black text-emerald-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Core Strengths
                </h4>
                <ul className="space-y-2 text-emerald-900 text-sm font-semibold">
                  {finalReport.strengths && finalReport.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-rose-50/40 border border-rose-100/50 rounded-2xl p-6">
                <h4 className="font-black text-rose-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Areas for Growth
                </h4>
                <ul className="space-y-2 text-rose-900 text-sm font-semibold">
                  {finalReport.weaknesses && finalReport.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-amber-50/40 border border-amber-100/50 rounded-2xl p-6">
                <h4 className="font-black text-amber-900 text-xs uppercase tracking-wider mb-3">Recommended Study Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {finalReport.recommended_topics && finalReport.recommended_topics.map((t, i) => (
                    <span key={i} className="bg-[var(--cp-surface)] border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/40 border border-blue-100/50 rounded-2xl p-6">
                <h4 className="font-black text-blue-900 text-xs uppercase tracking-wider mb-3">Next Target Recommendations</h4>
                <div className="flex flex-wrap gap-2">
                  {finalReport.recommended_next_companies && finalReport.recommended_next_companies.map((c, i) => (
                    <span key={i} className="bg-[var(--cp-surface)] border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapsible Review Answers */}
            <div className="border border-[var(--cp-border)] rounded-2xl mb-8 overflow-hidden">
              <button
                onClick={() => setShowReview(prev => !prev)}
                className="w-full bg-[var(--cp-bg)] hover:bg-[var(--cp-surface2)] px-6 py-4 flex justify-between items-center transition-all"
              >
                <span className="font-black text-[var(--cp-text)] text-sm">Review Questions & Submissions</span>
                {showReview ? <ChevronUp className="h-5 w-5 text-[var(--cp-text-muted)]" /> : <ChevronDown className="h-5 w-5 text-[var(--cp-text-muted)]" />}
              </button>
              
              {showReview && (
                <div className="p-6 border-t border-[var(--cp-border)] space-y-6 bg-[var(--cp-bg)]/50">
                  {questions.map((q, idx) => {
                    const qText = typeof q === 'object' ? q.text : q;
                    const isQMcq = typeof q === 'object' && q.options;
                    const ans = submittedAnswers[idx] || "No response recorded";
                    const fdb = feedbacksList[idx] || {};
                    return (
                      <div key={idx} className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--cp-border)]">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            Question {idx + 1}
                          </span>
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {fdb.overall_score || 0}% Score
                          </span>
                        </div>
                        <p className="font-bold text-[var(--cp-text)] text-sm">{qText}</p>
                        
                        {isQMcq && (
                          <div className="p-3 bg-[var(--cp-bg)] rounded-xl border border-[var(--cp-border)] space-y-2 text-xs">
                            <span className="font-black text-slate-400 uppercase tracking-widest block">MCQ Options:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--cp-text-muted)] font-semibold">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`p-2 rounded-lg border ${opt === q.correct_answer ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-[var(--cp-surface)] border-[var(--cp-border)]'}`}>
                                  {opt}
                                </div>
                              ))}
                            </div>
                            <div className="text-[var(--cp-text-muted)] font-bold pt-1">
                              Correct Choice: <span className="text-emerald-700">{q.correct_answer}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Your Answer:</span>
                          <div className="bg-[var(--cp-bg)] p-4 rounded-xl border border-[var(--cp-border)] text-sm text-[var(--cp-text-muted)] font-semibold whitespace-pre-wrap leading-relaxed">
                            {ans}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                          <div className="bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/50 text-center">
                            <span className="text-[10px] text-indigo-500 font-black uppercase block">Technical</span>
                            <span className="text-lg font-black text-indigo-700">{fdb.technical_score || 0}</span>
                          </div>
                          <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/50 text-center">
                            <span className="text-[10px] text-emerald-500 font-black uppercase block">Communication</span>
                            <span className="text-lg font-black text-emerald-700">{fdb.communication_score || 0}</span>
                          </div>
                          <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50 text-center">
                            <span className="text-[10px] text-amber-500 font-black uppercase block">Confidence</span>
                            <span className="text-lg font-black text-amber-700">{fdb.confidence_score || 0}</span>
                          </div>
                          <div className="bg-purple-50/40 p-2.5 rounded-xl border border-purple-100/50 text-center">
                            <span className="text-[10px] text-purple-500 font-black uppercase block">Problem Solve</span>
                            <span className="text-lg font-black text-purple-700">{fdb.problem_solving_score || 0}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">Evaluator Analysis:</span>
                          <p className="text-sm font-semibold text-[var(--cp-text-muted)] mt-1 italic leading-relaxed">
                            {fdb.suggestions}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl mb-8 p-6 text-center shadow-sm">
              <h4 className="text-[var(--cp-text)] font-bold mb-2">How was your experience?</h4>
              <p className="text-[var(--cp-text-muted)] text-sm mb-4">Your feedback helps us improve the AI Interview Simulator.</p>
              <div className="flex justify-center">
                <RatingWidget featureId="interview_simulator" featureName="AI Mock Interview Simulator" />
              </div>
            </div>

            <button
              onClick={() => setInterviewId(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-md"
            >
              Return to Configuration
            </button>
          </div>
        ) : (
          <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-[var(--cp-bg)] border-b border-[var(--cp-border)] p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {getCompanyLogo(company)}
                  <div>
                    <h4 className="font-black text-[var(--cp-text)] leading-tight">{company}</h4>
                    <span className="text-xs font-semibold text-[var(--cp-text-muted)]">{company} • {mapRoundType(roundType)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black border px-2.5 py-1 rounded-lg uppercase tracking-wider ${diffBadgeColor(currentQuestion?.difficulty)}`}>
                    {currentQuestion?.difficulty || "easy"}
                  </span>
                  
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-sm ${timeLeft <= 10 && !feedbackState ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-[var(--cp-text-muted)]'}`}>
                    <Clock className="w-4 h-4" />
                    {timeLeft}s
                  </div>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5 mt-2">
                <span>PROGRESS</span>
                <span>{currentIdx + 1} / {questions.length} QUESTIONS</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${Math.round(((currentIdx + 1) / questions.length) * 100)}%` }}></div>
              </div>
            </div>

            {feedbackState ? (
              // Per-Question Feedback Card (Real-time Analytics between questions)
              <div className="p-8 space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-[var(--cp-text)]">Answer Evaluation Result</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Feedback Analytics</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Metrics Breakdown</span>
                        <div className="text-3xl font-black text-indigo-600">
                          {feedbackState.overall_score}%
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold text-[var(--cp-text-muted)] mb-1">
                            <span>TECHNICAL KNOWLEDGE</span>
                            <span>{feedbackState.technical_score}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${feedbackState.technical_score}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold text-[var(--cp-text-muted)] mb-1">
                            <span>COMMUNICATION CLARITY</span>
                            <span>{feedbackState.communication_score}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${feedbackState.communication_score}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold text-[var(--cp-text-muted)] mb-1">
                            <span>CONFIDENCE RATING</span>
                            <span>{feedbackState.confidence_score}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: `${feedbackState.confidence_score}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold text-[var(--cp-text-muted)] mb-1">
                            <span>PROBLEM SOLVING</span>
                            <span>{feedbackState.problem_solving_score}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${feedbackState.problem_solving_score}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 border-t border-[var(--cp-border)]/50 pt-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Adaptive Difficulty</span>
                        <span className="text-xs font-black uppercase text-indigo-700">{feedbackState.current_difficulty || "medium"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Improvement Rate</span>
                        <span className={`text-xs font-black ${scoresHistory.length > 1 && (scoresHistory[scoresHistory.length-1] - scoresHistory[scoresHistory.length-2]) >= 0 ? 'text-emerald-600' : 'text-[var(--cp-text-muted)]'}`}>
                          {scoresHistory.length > 1 ? (
                            (scoresHistory[scoresHistory.length-1] - scoresHistory[scoresHistory.length-2]) >= 0 ? 
                            `+${scoresHistory[scoresHistory.length-1] - scoresHistory[scoresHistory.length-2]}% Improvement` : 
                            `${scoresHistory[scoresHistory.length-1] - scoresHistory[scoresHistory.length-2]}% Drop`
                          ) : "First Question"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <RenderTrendChart history={scoresHistory} />
                </div>

                <div className="bg-[var(--cp-bg)] border border-[var(--cp-border)] rounded-2xl p-6 space-y-2">
                  <h5 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Evaluation & Suggestions</h5>
                  <p className="text-sm text-[var(--cp-text-muted)] font-semibold italic leading-relaxed">
                    "{feedbackState.suggestions}"
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--cp-border)] flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-8 rounded-xl transition-all shadow-md flex items-center space-x-2"
                  >
                    <span>Proceed to Next Question</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Question Answering Screen
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-[var(--cp-text)] leading-tight">
                    {questionText}
                  </h2>
                </div>

                {timeLeft === 0 && !feedbackState && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-bold">Time is up! Submitting current answer...</span>
                  </div>
                )}

                {/* Input Panel based on MCQ or Descriptive */}
                {isMcq ? (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        disabled={submitting}
                        onClick={() => setUserAnswer(opt)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between font-bold text-sm leading-relaxed ${userAnswer === opt ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm' : 'bg-[var(--cp-surface)] hover:bg-[var(--cp-bg)] border-[var(--cp-border)] text-[var(--cp-text-muted)]'}`}
                      >
                        <span>{opt}</span>
                        {userAnswer === opt && (
                          <div className="h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative mb-6">
                    <textarea
                      className="w-full h-40 p-5 pr-40 border border-[var(--cp-border)] rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-medium text-[var(--cp-text-muted)] disabled:opacity-50 text-sm leading-relaxed"
                      placeholder={transcribing ? 'Transcribing audio...' : 'Type your answer here or use the microphone...'}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={submitting || transcribing || feedbackState}
                    />
                    
                    <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                      {recording ? (
                        <button 
                          className="flex items-center space-x-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors animate-pulse" 
                          onClick={stopRecording} 
                          disabled={submitting || feedbackState}
                        >
                          <Square className="h-3.5 w-3.5" />
                          <span>Stop Recording</span>
                        </button>
                      ) : (
                        <button 
                          onClick={startRecording} 
                          disabled={transcribing || submitting || feedbackState} 
                          className="flex items-center space-x-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span>{transcribing ? 'Transcribing...' : 'Record Answer'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-[var(--cp-border)] flex justify-between items-center">
                  <button
                    onClick={() => setInterviewId(null)}
                    className="flex items-center text-[var(--cp-text-muted)] hover:text-[var(--cp-text)] text-sm font-semibold transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    <span>Exit Simulator</span>
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(null)}
                    disabled={submitting || transcribing || !userAnswer.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Grading answer...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Interview;
