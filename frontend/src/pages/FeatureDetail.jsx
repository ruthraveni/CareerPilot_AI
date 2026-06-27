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
    <div className="cp-page min-h-screen pb-20">
      {/* Simple Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Bot size={24} color="white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
            CareerPilot AI
          </span>
        </div>
        <Link 
          to="/"
          className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          Return to Home
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        
        {/* Feature Hero */}
        <div className="text-center mb-16">
          <div 
            className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-sm"
            style={{ background: feature.iconBg }}
          >
            {feature.icon}
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{feature.title}</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {feature.intro}
          </p>
        </div>

        {/* Detailed Description */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
            About this Feature
          </h2>
          <p className="text-slate-700 leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Key Features & Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Key Features */}
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Key Capabilities</h3>
            <ul className="space-y-4">
              {feature.keyFeatures.map((kf, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm leading-relaxed">{kf}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits */}
          <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 mb-4">Student Benefits</h3>
            <p className="text-indigo-800 text-sm leading-relaxed">
              {feature.benefits}
            </p>
          </div>
        </div>

        {/* How it Works & Why Useful */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">How it works</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {feature.howItWorks}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Why it is useful</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {feature.whyUseful}
              </p>
            </div>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="flex justify-center border-t border-slate-200 pt-12">
          <Link 
            to="/"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-semibold transition-all transform hover:-translate-y-1 shadow-lg shadow-slate-200"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
        </div>

      </main>
    </div>
  );
}
