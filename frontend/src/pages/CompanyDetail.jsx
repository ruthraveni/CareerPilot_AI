import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import COMPANIES from '../utils/companyData';
import api from '../utils/api';
import { askMentor, getChatHistory } from '../utils/geminiWrapper';
import { 
  checkUserDataAvailability, 
  calculateCompanyReadiness,
  getCompletedProjects,
  toggleProjectCompleted,
  getRecommendedProjects,
  generateDashboardInsights,
  markCompanyViewed
} from '../utils/readinessCalculator';
import { 
  ArrowLeft, 
  ChevronRight, 
  BookOpen, 
  Video, 
  Globe, 
  Book, 
  Send, 
  CheckCircle, 
  Briefcase, 
  FileText, 
  Calendar,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Cpu,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import '../styles/company.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find company
  const company = useMemo(() => {
    return COMPANIES.find(c => c.id === id);
  }, [id]);

  const [activeTab, setActiveTab] = useState('Overview');
  const [completedInterviews, setCompletedInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDataStatus, setUserDataStatus] = useState({ hasAnyData: false });
  const [completedProjectIds, setCompletedProjectIds] = useState([]);

  // Overview / Sub-state
  const [selectedPlan, setSelectedPlan] = useState('7-Day'); // '7-Day', '14-Day', '30-Day'
  const [selectedQuestionCategory, setSelectedQuestionCategory] = useState('Technical'); // 'Aptitude', 'Technical', 'Coding', 'HR'
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(null); // for showing hints

  // AI Mentor Chat State
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch completed mock interviews
  useEffect(() => {
    async function loadData() {
      if (!company) return;
      try {
        setLoading(true);
        const res = await api.get('/interview/interviews');
        setCompletedInterviews(res.data || []);
      } catch (e) {
        console.error('Failed to load completed interviews:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Load project completions from localStorage
    if (company) {
      markCompanyViewed(company.id);
      setCompletedProjectIds(getCompletedProjects(company.id));
    }
  }, [company]);

  // Recalculate user data status when completedInterviews loads
  useEffect(() => {
    const status = checkUserDataAvailability(completedInterviews);
    setUserDataStatus(status);
  }, [completedInterviews]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Initialize chat history on tab select
  useEffect(() => {
    if (activeTab === 'AI Mentor' && company) {
      const history = getChatHistory(company.id);
      if (history.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Hi! I'm your CareerPilot AI Mentor for ${company.name}. I can help you prepare for interview rounds, technical topics, salary expectations, and roadmaps. Ask me anything!`
          }
        ]);
      } else {
        setMessages(history);
      }
    }
  }, [activeTab, company]);

  if (!company) {
    return (
      <Layout title="Company Prep Error">
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <AlertCircle size={48} color="red" style={{ margin: '0 auto 16px' }} />
          <h2>Company Not Found</h2>
          <p>The company you are looking for does not exist in our system.</p>
          <button onClick={() => navigate('/company')} className="cpd-back-btn" style={{ margin: '16px auto 0' }}>
            <ArrowLeft size={16} /> Back to Companies
          </button>
        </div>
      </Layout>
    );
  }

  // Calculate dynamic readiness score
  const readinessData = useMemo(() => {
    // Pass completedProjectIds dependency implicitly by recalculating when it changes
    return calculateCompanyReadiness(company.id, completedInterviews);
  }, [company.id, completedInterviews, completedProjectIds]);

  const hasScore = readinessData.readiness !== null;
  const companyReadiness = readinessData.readiness;
  const companyReadinessMode = readinessData.mode;

  // Generate dynamic dashboard insights
  const dashboardInsights = useMemo(() => {
    return generateDashboardInsights(company.id);
  }, [company.id, completedProjectIds]);

  // Handle project checkbox toggle
  const handleProjectToggle = (projectId) => {
    const updated = toggleProjectCompleted(company.id, projectId);
    setCompletedProjectIds(updated);
  };

  // Handle send message to AI Mentor
  const handleSendMessage = async (text) => {
    const msgText = text || inputValue;
    if (!msgText.trim()) return;

    if (!text) {
      setInputValue('');
    }

    const userMsg = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const response = await askMentor(company.id, msgText);

    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
  };

  // Readiness circle calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasScore 
    ? circumference - (companyReadiness / 100) * circumference
    : circumference;

  // Chart configs for Dashboard tab (using dynamic skills matching)
  const savedResume = localStorage.getItem('resume_analysis');
  let userSkills = [];
  try {
    if (savedResume) {
      userSkills = (JSON.parse(savedResume).skills || []).map(s => s.toLowerCase());
    }
  } catch (e) {}

  const skillGapData = {
    labels: company.skills,
    datasets: [
      {
        label: 'Required Level',
        data: company.skills.map(() => 9),
        backgroundColor: 'rgba(100, 116, 139, 0.2)',
        borderColor: 'rgba(100, 116, 139, 0.5)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Your Level',
        data: company.skills.map(skill => {
          // If skill is matched in userSkills, they get a high score, otherwise 0!
          const matched = userSkills.some(us => us.includes(skill.toLowerCase()) || skill.toLowerCase().includes(us));
          return matched ? 8.5 : 0;
        }),
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        borderColor: '#4f46e5',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  // Progress history based on actual user mock interviews
  const companyCompletedInterviews = completedInterviews.filter(
    i => i.company && i.company.toLowerCase() === company.name.toLowerCase() && i.status === 'completed'
  );

  const progressHistoryData = useMemo(() => {
    let labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Current'];
    let data = [30, 38, 42, 48, 52, hasScore ? companyReadiness : 55];

    if (companyCompletedInterviews.length > 0) {
      // If they have real interview records, map them chronologically
      labels = companyCompletedInterviews.slice(-6).reverse().map((_, idx) => `Test ${idx + 1}`);
      data = companyCompletedInterviews.slice(-6).reverse().map(i => i.final_score || 0);
    }

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: companyCompletedInterviews.length > 0 ? 'Mock Scores Trend (%)' : 'Projected Readiness Trend (%)',
          data,
          borderColor: '#0891b2',
          backgroundColor: 'rgba(8, 145, 178, 0.1)',
          tension: 0.3,
          pointBackgroundColor: '#0891b2',
          pointRadius: 4,
        }
      ]
    };
  }, [companyCompletedInterviews, companyReadiness, hasScore]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 11 },
          color: 'var(--cp-text-muted)'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: { color: 'var(--cp-border)' },
        ticks: { color: 'var(--cp-text-muted)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--cp-text-muted)' }
      }
    }
  };

  const progressChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 11 },
          color: 'var(--cp-text-muted)'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'var(--cp-border)' },
        ticks: { color: 'var(--cp-text-muted)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--cp-text-muted)' }
      }
    }
  };

  // Rendering Functions for Tabs
  const renderTabBody = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="cpd-two-col">
            <div>
              <h3 className="cpd-section-title">Hiring Process</h3>
              <p className="cpd-section-text">
                {company.name} implements a robust hiring mechanism designed to evaluate technical depth, problem-solving abilities, and behavioral suitability.
              </p>
              
              <div className="cpd-process-steps">
                {company.hiringProcess.map((step, idx) => (
                  <React.Fragment key={step}>
                    <div className="cpd-process-step">
                      <div className="cpd-process-dot">{idx + 1}</div>
                      <div className="cpd-process-label">{step}</div>
                    </div>
                    {idx < company.hiringProcess.length - 1 && (
                      <div className="cpd-process-arrow">→</div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <h3 className="cpd-section-title">Eligibility Criteria</h3>
              <ul className="cpd-bullet-list">
                {company.eligibility.map((el, i) => (
                  <li key={i}>{el}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="cpd-section-title">Target Job Roles</h3>
              <div className="cpd-roles-row">
                {company.jobRoles.map(role => (
                  <span key={role} className="cpd-role-chip">{role}</span>
                ))}
              </div>

              <h3 className="cpd-section-title">Why Join {company.name}?</h3>
              <ul className="cpd-why-list">
                {company.whyJoin.map((wj, i) => (
                  <li key={i}>
                    <span className="dot">✓</span>
                    <span>{wj}</span>
                  </li>
                ))}
              </ul>

              <h3 className="cpd-section-title" style={{ marginTop: '24px' }}>Preparation Tips</h3>
              <ul className="cpd-tips-list">
                {company.tips.map((tip, i) => (
                  <li key={i}>
                    <span className="tip-icon">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'Interview Rounds':
        return (
          <div className="cpd-rounds-list">
            <h3 className="cpd-section-title">Detailed Round Breakdown</h3>
            {company.hiringProcess.map((roundName, idx) => {
              let desc = "Evaluation of fundamental skills, aptitude, or core concepts.";
              if (roundName.toLowerCase().includes('aptitude') || roundName.toLowerCase().includes('written') || roundName.toLowerCase().includes('online test')) {
                desc = "Typically consists of multiple-choice questions covering quantitative aptitude, logical reasoning, verbal ability, and sometimes basic coding snippets. Speed and accuracy are highly tested.";
              } else if (roundName.toLowerCase().includes('technical')) {
                desc = "Deep dive into Data Structures, Algorithms, Object-Oriented Programming (OOP) principles, Database Management Systems (DBMS), SQL, and Operating Systems. Expect live coding or whiteboard problem-solving.";
              } else if (roundName.toLowerCase().includes('manager') || roundName.toLowerCase().includes('system') || roundName.toLowerCase().includes('onsite')) {
                desc = "Focused on past projects, architectural decisions, coding efficiency, and design principles. You may be asked to design components, databases, or API contracts.";
              } else if (roundName.toLowerCase().includes('hr') || roundName.toLowerCase().includes('googliness') || roundName.toLowerCase().includes('behavioral')) {
                desc = "Assesses communication skills, career aspirations, salary expectations, cultural fit, and behavioral scenarios. Familiarize yourself with the company culture and values.";
              }

              return (
                <div className="cpd-round-card" key={roundName}>
                  <div className="cpd-round-num">{idx + 1}</div>
                  <div>
                    <h4 className="cpd-round-title">{roundName}</h4>
                    <p className="cpd-round-desc">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'Study Plan':
        const planKey = selectedPlan === '7-Day' ? 'days7' : selectedPlan === '14-Day' ? 'days14' : 'days30';
        const planItems = company.studyPlan[planKey] || [];

        return (
          <div>
            <div className="cpd-plan-tabs">
              {['7-Day', '14-Day', '30-Day'].map(plan => (
                <button
                  key={plan}
                  className={`cpd-plan-tab ${selectedPlan === plan ? 'active' : ''} ${plan === '7-Day' ? 'd7' : plan === '14-Day' ? 'd14' : 'd30'}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan} Roadmap
                </button>
              ))}
            </div>

            <div className="cpd-timeline">
              {planItems.map((item, idx) => (
                <div className="cpd-timeline-item" key={idx}>
                  <div className="cpd-timeline-day">{item.day || item.week}</div>
                  <div className="cpd-timeline-topic">{item.topic}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Top Questions':
        const qList = company.topQuestions[selectedQuestionCategory] || [];

        return (
          <div>
            <div className="cpd-q-tabs">
              {['Aptitude', 'Technical', 'Coding', 'HR'].map(cat => (
                <button
                  key={cat}
                  className={`cpd-q-tab ${selectedQuestionCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedQuestionCategory(cat);
                    setActiveQuestionIdx(null);
                  }}
                >
                  {cat} Questions
                </button>
              ))}
            </div>

            <div className="cpd-q-list">
              {qList.map((question, idx) => (
                <div className="cpd-q-card" key={idx} style={{ flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                    <div className="cpd-q-num">{idx + 1}</div>
                    <div style={{ fontWeight: 600, flex: 1 }}>{question}</div>
                    <button
                      onClick={() => setActiveQuestionIdx(activeQuestionIdx === idx ? null : idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--cp-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {activeQuestionIdx === idx ? 'Hide Help' : 'Reveal Strategy'}
                    </button>
                  </div>
                  
                  {activeQuestionIdx === idx && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      background: 'var(--cp-surface2)',
                      borderLeft: '3px solid var(--cp-primary)',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      color: 'var(--cp-text-muted)',
                      lineHeight: '1.5'
                    }}>
                      <strong>Response Tips:</strong> For this type of question at {company.name}, make sure to structure your response using the STAR method if behavioral, or focus on time-space efficiency if coding. Double check the core CS fundamentals surrounding this topic.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'Resources':
        return (
          <div>
            <div className="cpd-res-section">
              <h3><Video size={18} /> High-Quality Video Playlists</h3>
              <div className="cpd-res-grid">
                <a href="https://www.youtube.com/@LoveBabbar" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon red">
                    <Video size={20} color="#ef4444" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Love Babbar DSA Course</div>
                    <div className="cpd-res-type">YouTube Playlist (Full DSA)</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.youtube.com/@KunalKushwaha" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon red">
                    <Video size={20} color="#ef4444" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Kunal Kushwaha Java & Git</div>
                    <div className="cpd-res-type">YouTube Playlist (Practical DSA)</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.youtube.com/@ApnaCollegeOfficial" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon red">
                    <Video size={20} color="#ef4444" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Apna College Placement Series</div>
                    <div className="cpd-res-type">YouTube Playlist (C++/Java)</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.youtube.com/@CodeWithHarry" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon red">
                    <Video size={20} color="#ef4444" />
                  </div>
                  <div>
                    <div className="cpd-res-name">CodeWithHarry Coding Lessons</div>
                    <div className="cpd-res-type">YouTube Playlist (Web Dev & Python)</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>
              </div>
            </div>

            <div className="cpd-res-section">
              <h3><Globe size={18} /> Essential Websites & Coding Platforms</h3>
              <div className="cpd-res-grid">
                <a href="https://www.geeksforgeeks.org" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon blue">
                    <Globe size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="cpd-res-name">GeeksforGeeks</div>
                    <div className="cpd-res-type">CS Concepts & Interview Archives</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon blue">
                    <Globe size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="cpd-res-name">LeetCode</div>
                    <div className="cpd-res-type">Coding Problem Platform</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.hackerrank.com" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon blue">
                    <Globe size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="cpd-res-name">HackerRank</div>
                    <div className="cpd-res-type">Aptitude & Coding Practice</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.interviewbit.com" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon blue">
                    <Globe size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="cpd-res-name">InterviewBit</div>
                    <div className="cpd-res-type">Structured Placement Preparation</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon blue">
                    <Globe size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Roadmap.sh</div>
                    <div className="cpd-res-type">Developer Learning Roadmaps</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>
              </div>
            </div>

            <div className="cpd-res-section">
              <h3><Book size={18} /> Recommended Books</h3>
              <div className="cpd-res-grid">
                <a href="https://amzn.in/d/d1qj3K9" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon amber">
                    <Book size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Cracking the Coding Interview</div>
                    <div className="cpd-res-type">By Gayle Laakmann McDowell</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>

                <a href="https://www.manning.com/books/grokking-algorithms" target="_blank" rel="noopener noreferrer" className="cpd-res-card">
                  <div className="cpd-res-icon amber">
                    <Book size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <div className="cpd-res-name">Grokking Algorithms</div>
                    <div className="cpd-res-type">By Aditya Bhargava</div>
                  </div>
                  <ChevronRight className="cpd-res-arrow" size={16} />
                </a>
              </div>
            </div>
          </div>
        );

      case 'AI Mentor':
        const suggestions = [
          `What are the most common coding topics for ${company.name}?`,
          `Tell me about ${company.name}'s HR round expectations.`,
          `Provide a mock question on arrays for ${company.name}.`,
          `How is the work-life balance and work culture at ${company.name}?`
        ];

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="cpd-chat-wrapper">
              <div className="cpd-chat-header">
                <div className="cpd-chat-header-icon">🤖</div>
                <div className="cpd-chat-header-text">
                  <strong>CareerPilot AI Mentor</strong>
                  <span>Customized helper for {company.name}</span>
                </div>
              </div>

              <div className="cpd-chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`cpd-chat-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    <div className="cpd-chat-avatar">
                      {msg.role === 'user' ? 'U' : 'M'}
                    </div>
                    <div className="cpd-chat-bubble">
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="cpd-chat-msg bot">
                    <div className="cpd-chat-avatar">M</div>
                    <div className="cpd-chat-bubble" style={{ padding: '8px 16px' }}>
                      <div className="cpd-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="cpd-chat-suggestions">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    className="cpd-suggestion"
                    onClick={() => handleSendMessage(s)}
                    disabled={isTyping}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="cpd-chat-input-row">
                <input
                  type="text"
                  placeholder={`Ask a mentor about preparing for ${company.name}...`}
                  className="cpd-chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  disabled={isTyping}
                />
                <button
                  className="cpd-chat-send"
                  onClick={() => handleSendMessage()}
                  disabled={isTyping || !inputValue.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'Dashboard':
        return (
          <div className="cpd-dash-grid">
            {/* Readiness Card */}
            <div className="cpd-dash-card">
              <h3>Company Readiness Overview</h3>
              <div className="cpd-readiness-big">
                <div className="cpd-readiness-pct">
                  {hasScore ? `${companyReadiness}%` : 'N/A'}
                </div>
                <div className="cpd-readiness-sub">Overall Readiness Score</div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--cp-text-muted)', textAlign: 'center', margin: '0' }}>
                {hasScore ? (
                  `Your score matches ${Math.round(companyReadiness * 0.3)}% skills alignment, ${Math.round(companyReadiness * 0.25)}% resume ATS evaluation, and your mock interview results.`
                ) : (
                  'Not enough user data available to calculate readiness. Please upload your resume or complete a mock interview.'
                )}
              </p>
            </div>

            {/* Progress Card */}
            <div className="cpd-dash-card">
              <h3>Preparation Milestones</h3>
              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Skills Alignment (30% max)</span>
                  <span>{hasScore ? `${readinessData.components.skills} %` : 'N/A'}</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${hasScore ? (readinessData.components.skills / 30) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Resume ATS Matching (25% max)</span>
                  <span>{hasScore ? `${Math.round(readinessData.components.ats)} %` : 'N/A'}</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${hasScore ? (readinessData.components.ats / 25) * 100 : 0}%`, backgroundColor: 'var(--cp-teal)' }}></div>
                </div>
              </div>

              <div className="cpd-progress-item">
                <div className="cpd-progress-label">
                  <span>Completed Projects Progress (20% max)</span>
                  <span>{hasScore ? `${Math.round(readinessData.components.projects)} %` : 'N/A'}</span>
                </div>
                <div className="cpd-progress-bar">
                  <div className="cpd-progress-fill" style={{ width: `${hasScore ? (readinessData.components.projects / 20) * 100 : 0}%`, backgroundColor: '#f59e0b' }}></div>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses (Requirement 5) */}
            <div className="cpd-dash-card" style={{ gridColumn: 'span 2' }}>
              <div className="cpd-two-col" style={{ gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--cp-teal)', fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase' }}>Strengths</h4>
                  <ul className="cpd-bullet-list">
                    {dashboardInsights.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--cp-badge-hard)', fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase' }}>Weaknesses / Gaps</h4>
                  <ul className="cpd-bullet-list" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    {dashboardInsights.weaknesses.map((weak, i) => (
                      <li key={i} style={{ color: 'var(--cp-badge-hard)' }}>⚠️ {weak}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Missing Skills & Project Checklist (Requirement 5) */}
            <div className="cpd-dash-card" style={{ gridColumn: 'span 2' }}>
              <div className="cpd-two-col" style={{ gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase' }}>Missing Stack Keywords</h4>
                  <div className="cpd-skills-chips" style={{ marginTop: '8px' }}>
                    {dashboardInsights.missingSkills.map((skill, i) => (
                      <span key={i} className="cp-badge Hard" style={{ fontSize: '0.78rem', textTransform: 'none' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Recommended Hands-on Projects
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--cp-text-muted)', marginBottom: '12px' }}>
                    Check off projects you have completed. Completing projects directly increases your readiness score!
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dashboardInsights.projects.map((proj) => {
                      const isCompleted = completedProjectIds.includes(proj.id);
                      return (
                        <label 
                          key={proj.id} 
                          style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            alignItems: 'start', 
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            background: 'var(--cp-surface)',
                            border: '1px solid var(--cp-border)',
                            borderRadius: '8px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isCompleted} 
                            onChange={() => handleProjectToggle(proj.id)}
                            style={{ marginTop: '3px' }}
                          />
                          <div>
                            <strong style={{ display: 'block', color: isCompleted ? 'var(--cp-teal)' : 'var(--cp-text)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {proj.title}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>
                              {proj.desc}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Gaps Chart */}
            <div className="cpd-dash-card" style={{ height: '300px' }}>
              <h3>Skill Gaps Analysis</h3>
              <div style={{ height: '220px', position: 'relative' }}>
                <Bar data={skillGapData} options={chartOptions} />
              </div>
            </div>

            {/* Progress Trend Chart */}
            <div className="cpd-dash-card" style={{ height: '300px' }}>
              <h3>Readiness Progress Trend</h3>
              <div style={{ height: '220px', position: 'relative' }}>
                <Line data={progressHistoryData} options={progressChartOptions} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title={`${company.name} Preparation`}>
      <div className="cpd-page">
        
        

        {/* Breadcrumb & Navigation Header */}
        <header className="cpd-header">
          <button onClick={() => navigate('/company')} className="cpd-back-btn">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          
          <div className="cpd-breadcrumb">
            <span onClick={() => navigate('/dashboard')}>Home</span>
            <ChevronRight className="sep" size={12} />
            <span onClick={() => navigate('/company')}>Company Preparation</span>
            <ChevronRight className="sep" size={12} />
            <span className="active">{company.name}</span>
          </div>
        </header>

        {/* Hero Band with Company Details */}
        <section className="cpd-hero-band">
          <div className="cpd-hero-logo">
            <span style={{ color: company.logoColor || '#4f46e5', fontWeight: 800, fontSize: '1.25rem' }}>
              {company.logoText}
            </span>
          </div>

          <div className="cpd-hero-info">
            <div className="cpd-hero-name-row">
              <h2 className="cpd-hero-name">{company.name}</h2>
            </div>
            <p className="cpd-hero-desc">{company.description}</p>
          </div>

          {/* Large Circular Readiness Chart */}
          <div className="cpd-readiness-circle">
            {hasScore ? (
              <>
                <svg width="100" height="100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#0891b2"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="cpd-readiness-val">
                  <span className="pct">{companyReadiness}%</span>
                  <span className="lbl">READINESS</span>
                </div>
              </>
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.625rem',
                color: 'rgba(255,255,255,0.6)',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '1.2',
                padding: '4px'
              }}>
                Not enough data available
              </div>
            )}
          </div>
        </section>

        {/* Meta Bar */}
        <section className="cpd-meta-bar">
          <div className="cpd-meta-item">
            <div className="cpd-meta-label">HIRING DIFFICULTY</div>
            <div className={`cpd-meta-value ${company.difficulty}`}>{company.difficulty}</div>
          </div>
          <div className="cpd-meta-item">
            <div className="cpd-meta-label">PREPARATION DURATION</div>
            <div className="cpd-meta-value">{company.prepTime}</div>
          </div>
          <div className="cpd-meta-item">
            <div className="cpd-meta-label">AVERAGE PACKAGE</div>
            <div className="cpd-meta-value" style={{ color: 'var(--cp-teal)' }}>{company.avgPackage}</div>
          </div>
          <div className="cpd-meta-item">
            <div className="cpd-meta-label">INTERVIEW ROUNDS</div>
            <div className="cpd-meta-value">{company.totalRounds} Rounds</div>
          </div>
        </section>

        {/* Skills Chip Bar */}
        <section className="cpd-skills-bar">
          <h3>Core Technical & Professional Skills Required</h3>
          <div className="cpd-skills-chips">
            {company.skills.map(skill => (
              <span key={skill} className="cp-skill-chip">{skill}</span>
            ))}
          </div>
        </section>

        {/* Tabs Navigation Bar */}
        <nav className="cpd-tabs-bar">
          {['Overview', 'Interview Rounds', 'Study Plan', 'Top Questions', 'Resources', 'AI Mentor', 'Dashboard'].map(tab => (
            <button
              key={tab}
              className={`cpd-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Tab Content Section */}
        <section className="cpd-tab-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cp-text-muted)' }}>
              Loading preparation module details...
            </div>
          ) : (
            renderTabBody()
          )}
        </section>
      </div>
    </Layout>
  );
}
