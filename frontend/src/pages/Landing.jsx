import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { 
  Bot, 
  FileText, 
  Code2, 
  LineChart, 
  ArrowRight,
  Target,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Star
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['global-stats'],
    queryFn: async () => {
      // The API endpoint may require authentication, but this is a landing page.
      // If the user is unauthenticated, the interceptor might redirect to login.
      // Let's call it and catch errors just in case, or use a public endpoint if available.
      // Since it's /api/ratings/global-stats we'll try to fetch.
      try {
        const res = await api.get('/ratings/global-stats');
        return res.data;
      } catch (err) {
        return { average: 0, total: 0 };
      }
    },
    staleTime: 60000, // 1 min
    refetchOnWindowFocus: false,
  });

  const renderStars = () => {
    if (isLoading || !stats) return null;
    if (stats.total === 0) return null;
    
    const stars = [];
    const rating = stats.average;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          fill={i <= rating ? '#fbbf24' : 'transparent'}
          color={i <= rating ? '#fbbf24' : '#64748b'}
          className={i <= rating ? 'text-amber-400' : 'text-slate-400'}
        />
      );
    }
    return <div className="stars flex gap-1">{stars}</div>;
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <Target className="nav-icon" />
          <span>CareerPilot <strong>AI</strong></span>
        </div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#companies">Companies</a>
          <a href="#how-it-works">How it Works</a>
      
        </div>
        <div className="nav-auth">
          <button className="nav-login" onClick={() => navigate('/login')}>Log In</button>
          <button className="nav-signup" onClick={() => navigate('/register')}>Sign Up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section" id="home">
        <div className="hero-content">
          <h1 className="hero-title">
             CareerPilot AI for Smarter <span className="text-gradient">Placement Preparation</span>
          </h1>
          <p className="hero-subtitle">
            CareerPilot AI helps you prepare for company-specific interviews with AI-powered practice, personalized study plans, and real-time readiness tracking.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('features').scrollIntoView()}>
              Explore Features
            </button>
          </div>
          
          <div className="hero-social-proof">
            <div className="avatars">
              <img src="https://images.media.io/gemini-ai-passport-prompt/2.png" alt="Student" className="avatar avatar-1" />
              <img src="https://ai.tenorshare.com/images/article/imagedetector/passport-size-photo-prompt-gemini-3.jpg" alt="Student" className="avatar avatar-2" />
              <img src="https://images.tenorshare.ai/article/diagrimo/gemini-ai-prompt-for-id-picture-11.jpg" alt="Student" className="avatar avatar-3" />
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGbd8QC5wp5BShuuREN3SWM1A4sP1bVJjUcqD2XPWvjaDWBIH3Ok8Yh1s&s=10" alt="Student" className="avatar avatar-4" />
            </div>
            <div className="reviews">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-24 bg-white/20 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-white/10 rounded animate-pulse"></div>
                </div>
              ) : stats?.total > 0 ? (
                <>
                  {renderStars()}
                  <p>{stats.average.toFixed(1)}/5 from {stats.total} student{stats.total !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <p className="text-sm text-slate-300">No ratings yet. Be the first to rate!</p>
              )}
            </div>
          </div>
        </div>

        {/* Removed Dashboard Preview Glass Card as requested */}
      </header>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-badge">FEATURES</div>
        <h2 className="section-title">Everything you need to crack placements</h2>
        <p className="section-subtitle">AI-powered tools and resources designed to make your preparation smarter, faster and more effective.</p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-purple"><Bot size={24} /></div>
            <h3>AI Interview Simulator</h3>
            <p>Practice company-specific interviews with AI-powered questions and real-time feedback.</p>
            <Link to="/feature/interview-simulator">Learn more &rarr;</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-green"><FileText size={24} /></div>
            <h3>Aptitude & Quizzes</h3>
            <p>Improve your aptitude skills with topic-wise quizzes and detailed performance analysis.</p>
            <Link to="/feature/aptitude">Learn more &rarr;</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-blue"><Code2 size={24} /></div>
            <h3>DSA Practice</h3>
            <p>Solve coding problems, track progress and improve with AI-based recommendations.</p>
            <Link to="/feature/dsa">Learn more &rarr;</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon icon-orange"><TrendingUp size={24} /></div>
            <h3>Readiness Score</h3>
            <p>Get a dynamic readiness score based on your performance and target company.</p>
            <Link to="/feature/readiness">Learn more &rarr;</Link>
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="companies-section" id="companies">
        <h3 className="companies-title">Popular Companies</h3>
        <div className="companies-logos">
          <div className="company-logo logo-zoho">
            <span>ZOHO</span>
          </div>
          <div className="company-logo logo-tcs">
            <span className="text-red-500 font-black">tcs</span>
            <small>TATA CONSULTANCY SERVICES</small>
          </div>
          <div className="company-logo logo-infosys">
            <span className="text-blue-500 font-bold text-xl tracking-wider">Infosys</span>
          </div>
          <div className="company-logo logo-wipro">
            <span className="font-bold text-xl">wipro</span>
          </div>
          <div className="company-logo logo-accenture">
            <span className="font-bold text-xl">accenture</span><span className="text-purple-500">&gt;</span>
          </div>
          <div className="company-logo logo-cognizant">
            <span className="text-blue-400 font-bold text-xl">Cognizant</span>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="cta-section">
        <div className="cta-card glass-card">
          <div className="cta-content">
            <h2>Ready to start your placement journey?</h2>
            <p>Join thousands of students who are preparing smarter and getting placed in their dream companies.</p>
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Start Now - It's Free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="nav-logo">
              <Target className="nav-icon" />
              <span>CareerPilot <strong>AI</strong></span>
            </div>
            <p className="footer-desc">AI-powered placement preparation platform for the next generation of achievers.</p>
          </div>
          <div className="footer-links">
            <div className="link-column">
              <h4>Quick Links</h4>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#companies">Companies</a>
              <a href="#how-it-works">How it Works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="link-column">
              <h4>Resources</h4>
              <a href="#blog">Blog</a>
              <a href="#tips">Placement Tips</a>
              <a href="#experiences">Interview Experiences</a>
              <a href="#help">Help Center</a>
              <a href="#contact">Contact Us</a>
            </div>
            <div className="link-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#refund">Refund Policy</a>
            </div>
            <div className="link-column">
              <h4>Follow Us</h4>
              <div className="social-links">
                <a href="#linkedin" className="social-icon">in</a>
                <a href="#twitter" className="social-icon">tw</a>
                <a href="#instagram" className="social-icon">ig</a>
                <a href="#youtube" className="social-icon">yt</a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} CareerPilot AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
