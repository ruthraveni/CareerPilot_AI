import React, { useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Bot, FileText, Code2, TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';
import '../styles/company.css';

const FEATURE_DATA = {
  'interview-simulator': {
    title: 'AI Interview Simulator',
    icon: <Bot size={48} color="var(--cp-primary)" />,
    iconBg: 'var(--cp-primary-light)',
    intro: 'Master your behavioral and technical rounds with highly realistic, company-specific AI mock interviews.',
    description: 'The AI Interview Simulator leverages advanced Large Language Models to simulate real-world hiring environments. It intelligently adapts to your profile, the target role, and the specific company you are aiming for, throwing unexpected behavioral scenarios and deeply technical questions just like a human recruiter would.',
    keyFeatures: [
      'Role-Specific Scenarios: Tailored to SWE, Data Science, Product Management, etc.',
      'Company Culture Alignment: Questions inspired by Amazon LPs, Google Googlyness, etc.',
      'Real-time Voice Interaction: Speak your answers naturally and get transcriptions.',
      'Comprehensive Grading: Objective evaluation across Technical, Communication, and Confidence metrics.'
    ],
    benefits: 'Students can eliminate interview anxiety, polish their storytelling skills, and identify critical knowledge gaps before walking into a real, high-stakes placement interview.',
    howItWorks: 'Simply select your target company and role, choose the interview type (e.g., HR, Technical), and begin. The AI acts as the recruiter, asking sequential questions based on your previous answers. Once completed, a detailed analytical scorecard is instantly generated.',
    whyUseful: 'Mock interviews with human peers often lack technical depth or objective feedback. Our AI is tirelessly available 24/7, offering unbiased, industry-standard evaluations every single time.'
  },
  'aptitude': {
    title: 'Aptitude & Quizzes',
    icon: <FileText size={48} color="#0d9488" />,
    iconBg: '#f0fdfa',
    intro: 'Sharpen your quantitative, logical, and verbal reasoning skills through targeted, adaptive assessments.',
    description: 'Most top-tier companies screen candidates through rigorous aptitude rounds. Our Aptitude & Quizzes module provides an extensive library of industry-standard questions categorized by difficulty and topic, ensuring you are never caught off-guard during preliminary online assessments.',
    keyFeatures: [
      'Categorized Topics: Quantitative Analysis, Logical Reasoning, and Verbal Ability.',
      'Adaptive Difficulty: Questions scale in difficulty based on your performance.',
      'Time-Bound Practice: Simulate the pressure of actual online assessment platforms.',
      'Detailed Solutions: Step-by-step explanations for every mathematical and logical problem.'
    ],
    benefits: 'By practicing under timed conditions, students drastically improve their problem-solving speed and accuracy—the two most critical factors in clearing Day 1 company cut-offs.',
    howItWorks: 'Navigate to the aptitude section, select a specific topic or opt for a mixed-bag assessment. Answer the multiple-choice questions within the stipulated time limit. Review your mistakes and learn the optimal shortcuts from the solutions provided post-quiz.',
    whyUseful: 'Consistent practice with our categorized quiz banks helps hardwire the mental shortcuts needed to solve complex puzzles rapidly, ensuring you easily clear initial screening rounds.'
  },
  'dsa': {
    title: 'DSA Practice',
    icon: <Code2 size={48} color="#2563eb" />,
    iconBg: '#eff6ff',
    intro: 'Conquer coding interviews with structured Data Structures and Algorithms roadmaps.',
    description: 'Data Structures and Algorithms form the backbone of software engineering interviews. This feature curates the most frequently asked coding problems from FAANG and top product companies, organizing them into logical, progressive learning paths.',
    keyFeatures: [
      'Curated Problem Lists: Blind 75, Neetcode 150, and company-specific tags.',
      'Integrated IDE Support: Write, compile, and test your code directly within the platform.',
      'AI Code Review: Get immediate feedback on Time & Space complexity optimizations.',
      'Progress Tracking: Visually monitor your journey from Arrays and Strings to Advanced Graphs and DP.'
    ],
    benefits: 'Students transition from memorizing code to genuinely understanding algorithmic patterns, significantly boosting their ability to solve unseen problems during whiteboarding sessions.',
    howItWorks: 'Choose a learning path or a specific data structure. Read the problem statement, write your optimal solution in the embedded editor, and submit it against our hidden test cases. If stuck, request an AI hint that guides you without revealing the full answer.',
    whyUseful: 'Mastering DSA requires pattern recognition rather than brute memorization. Our platform enforces structured learning, ensuring you tackle prerequisite concepts before facing advanced algorithmic challenges.'
  },
  'readiness': {
    title: 'Readiness Score',
    icon: <TrendingUp size={48} color="#ea580c" />,
    iconBg: '#fff7ed',
    intro: 'Know exactly where you stand with a unified, data-driven employability metric.',
    description: 'The Readiness Score is an intelligent metric that aggregates your performance across all modules—Resume Analyzer, AI Mock Interviews, and Aptitude tests. It provides a real-time, objective assessment of how prepared you are to crack your target companies.',
    keyFeatures: [
      'Holistic Aggregation: Combines technical scores, communication ratings, and resume ATS matches.',
      'Company Benchmarking: Compares your score against the historical cut-offs of your target companies.',
      'Actionable Insights: Pinpoints your exact weak areas (e.g., "Improve System Design").',
      'Historical Trending: Visual graphs tracking your improvement trajectory over time.'
    ],
    benefits: 'Students gain absolute clarity on their preparation level, allowing them to focus their limited time on high-impact weak areas rather than blindly studying already-mastered topics.',
    howItWorks: 'As you interact with the platform (taking quizzes, uploading resumes, completing interviews), the scoring engine silently updates your profile. The global readiness dashboard visualizes this data into a simple 0-100 metric.',
    whyUseful: 'Uncertainty is the biggest enemy of interview preparation. The Readiness Score eliminates guesswork, providing a concrete mathematical probability of your success based on empirical data.'
  }
};

export default function FeatureDetail() {
  const { featureId } = useParams();
  const feature = FEATURE_DATA[featureId];

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [featureId]);

  if (!feature) {
    return <Navigate to="/" replace />;
  }

  return (
    <div 
      className="min-h-screen pb-20 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--cp-bg)',
        color: 'var(--cp-text)',
        backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.12), transparent 25%), radial-gradient(circle at 85% 30%, rgba(147, 51, 234, 0.12), transparent 25%)'
      }}
    >
      {/* Navbar matching Landing style but theme-aware */}
      <nav className="flex justify-between items-center px-8 py-5 sticky top-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--cp-surface) 80%, transparent)', borderColor: 'var(--cp-border)' }}>
        <div className="flex items-center gap-2 text-xl font-bold">
          <Bot className="text-indigo-500" />
          <span>CareerPilot <strong className="text-indigo-500">AI</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{ backgroundColor: 'var(--cp-surface2)', border: '1px solid var(--cp-border)', color: 'var(--cp-text)' }}
          >
            ← Return to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-16">
        
        {/* Premium Hero Section */}
        <div className="text-center mb-20 flex flex-col items-center">
          <div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/10"
            style={{ background: feature.iconBg, border: '1px solid var(--cp-border)' }}
          >
            {feature.icon}
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--cp-text)' }}>
            {feature.title}
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--cp-text-muted)' }}>
            {feature.intro}
          </p>
        </div>

        {/* Glassmorphism Details Section */}
        <div 
          className="rounded-3xl p-8 md:p-12 mb-12 shadow-2xl backdrop-blur-xl transition-colors duration-300"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--cp-surface) 60%, transparent)', 
            border: '1px solid var(--cp-border)'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: About & Benefits */}
            <div className="space-y-10">
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3" style={{ color: 'var(--cp-text)' }}>
                  <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                  About this Feature
                </h2>
                <p className="text-lg leading-relaxed" style={{ color: 'var(--cp-text-muted)' }}>
                  {feature.description}
                </p>
              </div>

              <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'var(--cp-primary-light)', borderColor: 'var(--cp-border)' }}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--cp-primary)' }}>
                  <TrendingUp size={24} />
                  Student Benefits
                </h3>
                <p className="text-md leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                  {feature.benefits}
                </p>
              </div>
            </div>

            {/* Right Column: Key Features */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--cp-text)' }}>
                <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                Key Capabilities
              </h2>
              <ul className="space-y-6">
                {feature.keyFeatures.map((kf, idx) => (
                  <li key={idx} className="flex items-start gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-1" style={{ backgroundColor: 'var(--cp-surface)', borderColor: 'var(--cp-border)' }}>
                    <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-md font-medium leading-relaxed" style={{ color: 'var(--cp-text)' }}>{kf}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* How It Works & Why Useful */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="p-8 md:p-10 rounded-3xl border shadow-lg backdrop-blur-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--cp-surface) 80%, transparent)', borderColor: 'var(--cp-border)' }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--cp-text)' }}>How it works</h3>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--cp-text-muted)' }}>
              {feature.howItWorks}
            </p>
          </div>
          <div className="p-8 md:p-10 rounded-3xl border shadow-lg backdrop-blur-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--cp-surface) 80%, transparent)', borderColor: 'var(--cp-border)' }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--cp-text)' }}>Why it is useful</h3>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--cp-text-muted)' }}>
              {feature.whyUseful}
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex justify-center pb-12">
          <Link 
            to="/"
            className="flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-xl text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ← Return to Home
          </Link>
        </div>

      </main>
    </div>
  );
}
