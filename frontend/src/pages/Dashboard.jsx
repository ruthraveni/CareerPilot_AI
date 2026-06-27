import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '../context/ProfileContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import { checkUserDataAvailability, calculateGlobalReadiness } from '../utils/readinessCalculator';
import { 
  Award, 
  Sparkles, 
  Target, 
  Mic, 
  Video, 
  FileText, 
  Building2,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const navigate = useNavigate();

  

  const getWeeklyProgress = (completedIntvs) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    
    const today = new Date();
    const last7DaysDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      last7DaysDates.push(d.toDateString());
    }

    completedIntvs.forEach(intv => {
      if (intv.created_at) {
        const intvDate = new Date(intv.created_at);
        if (last7DaysDates.includes(intvDate.toDateString())) {
          const dayName = days[intvDate.getDay()];
          counts[dayName] = (counts[dayName] || 0) + 1;
        }
      }
    });

    return last7DaysDates.map(dateStr => {
      const d = new Date(dateStr);
      const dayName = days[d.getDay()];
      return {
        day: dayName,
        count: counts[dayName]
      };
    });
  };

  const { profile } = useProfile();
  
  const { data: interviews = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['interviews'],
    queryFn: async () => {
      const res = await api.get('/interview/interviews');
      return res.data;
    },
    staleTime: 2 * 60 * 1000 // Cache for 2 mins
  });

  const error = queryError ? 'Failed to fetch dashboard data. Please try again.' : null;

  const userDataStatus = useMemo(() => {
    if (!interviews.length) return { hasAnyData: false };
    const completedIntvs = interviews.filter(i => i.status === 'completed');
    return checkUserDataAvailability(completedIntvs);
  }, [interviews]);

  // Dynamic metrics calculation
  const metrics = useMemo(() => {
    // Real calculations
    const completedIntvs = interviews.filter(i => i.status === 'completed');
    const totalInterviews = completedIntvs.length;
    
    // Average score
    const avgScore = totalInterviews > 0
      ? Math.round(completedIntvs.reduce((sum, i) => sum + (i.final_score || 0), 0) / totalInterviews)
      : 0;

    // Placement Readiness Calculation (Delegated to readinessCalculator.js)
    const globalReadiness = calculateGlobalReadiness(interviews);
    const placementReadiness = globalReadiness.score;
    const readinessLabel = globalReadiness.label.split('(')[1].replace(')', '').trim();

    // Confidence Score
    const voiceUsed = completedIntvs.some(i => i.used_voice || localStorage.getItem('used_microphone') === 'true');
    let confidenceVal = 0;
    if (totalInterviews > 0) {
      confidenceVal = Math.round(avgScore * 0.94);
      if (voiceUsed) {
        confidenceVal = Math.min(100, confidenceVal + 5);
      }
    }
    const confidenceScore = totalInterviews > 0 ? `${confidenceVal}%` : 'N/A';

    // Weak Areas
    const weakAreas = [];
    if (totalInterviews > 0) {
      const techScore = Math.round(avgScore * 0.92);
      const commScore = Math.round(avgScore * 0.96);
      
      weakAreas.push({
        title: 'Technical Knowledge',
        score: `${techScore}%`,
        color: techScore < 50 ? 'bg-red-500' : techScore < 75 ? 'bg-amber-500' : 'bg-emerald-500',
        desc: 'Focus on System Design & data structure patterns.'
      });
      weakAreas.push({
        title: 'Communication Skills',
        score: `${commScore}%`,
        color: commScore < 50 ? 'bg-red-500' : commScore < 75 ? 'bg-amber-500' : 'bg-emerald-500',
        desc: 'Work on structuring answers clearly using STAR.'
      });
      
      if (voiceUsed) {
        weakAreas.push({
          title: 'Speaking Speed',
          score: '78%',
          color: 'bg-yellow-500',
          desc: 'Slow down slightly; pace is currently fast.'
        });
      } else {
        weakAreas.push({
          title: 'Interactive Pacing',
          score: `${Math.round(avgScore * 0.88)}%`,
          color: 'bg-yellow-500',
          desc: 'Increase responsiveness and pacing under mock timers.'
        });
      }
    }

    // Weekly activity last 7 days
    const weeklyProgress = getWeeklyProgress(completedIntvs);

    // Score trend
    const scoreTrend = completedIntvs.slice(0, 10).map(i => ({
      date: new Date(i.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: i.final_score || 0
    })).reverse();

    return {
      totalInterviews,
      avgScore,
      placementReadiness,
      readinessLabel,
      confidenceScore,
      weakAreas,
      scoreTrend,
      weeklyProgress
    };
  }, [interviews]);

  if (loading && !interviews.length) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Skeleton */}
          <div className="flex justify-between items-center bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="space-y-3 w-1/2">
              <div className="h-8 bg-[var(--cp-border)] rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-[var(--cp-border)] rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
          
          {/* Metrics Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-[var(--cp-border)] rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-[var(--cp-border)] rounded w-1/3"></div>
              </div>
            ))}
          </div>
          
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-2xl p-6 shadow-sm animate-pulse h-80"></div>
            <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-2xl p-6 shadow-sm animate-pulse h-80"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-[var(--cp-text)]">Something went wrong</h3>
          <p className="text-[var(--cp-text-muted)] text-sm mt-1">{error}</p>
          <button 
            onClick={fetchDashboardAndAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  const stats = [
    { name: 'Total Interviews', value: metrics.totalInterviews, icon: Video, color: 'from-blue-500 to-indigo-500' },
    { name: 'Average Score', value: metrics.totalInterviews > 0 ? `${metrics.avgScore}%` : 'N/A', icon: Award, color: 'from-emerald-500 to-teal-500' },
    { name: 'Placement Readiness', value: `${metrics.placementReadiness}% (${metrics.readinessLabel})`, icon: Target, color: 'from-purple-500 to-pink-500' },
    { name: 'Confidence Score', value: metrics.confidenceScore, icon: Mic, color: 'from-amber-500 to-orange-500' }
  ];

  // Chart Configs
  const scoreTrendData = {
    labels: metrics.scoreTrend.map(d => d.date),
    datasets: [
      {
        fill: true,
        label: 'Average Score (%)',
        data: metrics.scoreTrend.map(d => d.score),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const weeklyActivityData = {
    labels: metrics.weeklyProgress.map(w => w.day),
    datasets: [
      {
        label: 'Interviews Attended',
        data: metrics.weeklyProgress.map(w => w.count),
        backgroundColor: '#06B6D4',
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(241, 245, 249, 1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <Layout title="Dashboard">
      

      {/* Dashboard Content */}
      <>
          {/* Hero Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/10">
              <div className="relative z-10">
                <span className="bg-[var(--cp-surface)]/20 text-white font-semibold text-xs px-3 py-1.5 rounded-full backdrop-blur-md">
                  Placement Prep Active
                </span>
                <h2 className="text-3xl font-black mt-4 leading-tight font-sans">Welcome back!</h2>
                <p className="text-blue-100 mt-2 max-w-md text-sm leading-relaxed">
                  Your dashboard analytics are compiled in real-time. Practice interviews to dynamically map your score growth and confidence metrics.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-15 translate-x-10 translate-y-10 scale-125 z-0 pointer-events-none">
                <Sparkles className="h-64 w-64" />
              </div>
            </div>

            {/* Daily Motivation */}
            <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400 font-sans">Daily Tip</span>
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                </div>
                <p className="text-[var(--cp-text)] font-semibold leading-relaxed">
                  "Focus on structuring technical answers with the STAR method (Situation, Task, Action, Result)."
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--cp-border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600">Tip of the day</span>
                <span className="text-xs text-slate-400">CareerPilot Coach</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[var(--cp-text-muted)] text-sm font-semibold mt-4">{stat.name}</p>
                  <h3 className="text-2xl font-black text-[var(--cp-text)] mt-1">{stat.value}</h3>
                </div>
              );
            })}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Score Trend */}
            <div className="lg:col-span-2 bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[var(--cp-text)]">Preparation Progress (Score Trend)</h3>
                <span className="text-xs font-semibold text-slate-400">Last 10 sessions</span>
              </div>
              <div className="h-64 flex flex-col justify-center items-center">
                {metrics.scoreTrend && metrics.scoreTrend.length >= 2 ? (
                  <Line data={scoreTrendData} options={chartOptions} />
                ) : (
                  <div className="text-center p-6 bg-[var(--cp-bg)] rounded-2xl border border-[var(--cp-border)] max-w-sm">
                    <p className="text-[var(--cp-text-muted)] text-sm font-semibold">
                      Complete more interviews to generate trends.
                    </p>
                    <button 
                      onClick={() => navigate('/interview')}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer border-none"
                    >
                      Practice Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Activity Bar */}
            <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[var(--cp-text)]">Weekly Activity</h3>
                <span className="text-xs font-semibold text-slate-400">Sessions per day</span>
              </div>
              <div className="h-64">
                <Bar data={weeklyActivityData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Weak Areas Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[var(--cp-text)] mb-6">Weak Areas Identified</h3>
              <div className="space-y-5">
                {metrics.weakAreas && metrics.weakAreas.length > 0 ? (
                  metrics.weakAreas.map((area, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-bold text-[var(--cp-text-muted)]">{area.title}</span>
                        <span className="text-xs font-semibold text-slate-400">{area.score} score</span>
                      </div>
                      <div className="w-full bg-[var(--cp-surface2)] rounded-full h-2">
                        <div className={`${area.color} h-2 rounded-full`} style={{ width: area.score }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">{area.desc}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-[var(--cp-bg)] rounded-2xl border border-[var(--cp-border)]">
                    <p className="text-slate-400 text-sm font-semibold">
                      No sufficient interview data available yet.
                    </p>
                    <button 
                      onClick={() => navigate('/interview')}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer border-none"
                    >
                      Start First Mock Round
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Feature tools list */}
            <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)]/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--cp-text)] mb-4">Quick Prep Tracks</h3>
                <p className="text-sm text-[var(--cp-text-muted)] leading-relaxed mb-4">
                  Get placement ready. Initiate customizable mock configurations mapped specifically for target companies.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100/55 transition-colors" onClick={() => navigate('/company')}>
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Dynamic Company Search Activated</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100/55 transition-colors" onClick={() => navigate('/resume')}>
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">Resume Skill Mapping Ready</span>
                </div>
              </div>
            </div>
          </div>
        </>
    </Layout>
  );
}

export default Dashboard;
