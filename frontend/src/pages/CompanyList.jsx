import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import COMPANIES from '../utils/companyData';
import api from '../utils/api';
import { 
  checkUserDataAvailability, 
  calculateCompanyReadiness 
} from '../utils/readinessCalculator';
import { Search, Building2, Award, Zap, CheckCircle, Filter, Info, Eye, EyeOff } from 'lucide-react';
import '../styles/company.css';

export default function CompanyList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [completedInterviews, setCompletedInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userDataStatus, setUserDataStatus] = useState({ hasAnyData: false });

  // Fetch completed mock interviews to check real data
  useEffect(() => {
    async function loadData() {
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
  }, []);

  // Recalculate user data status when completedInterviews loads
  useEffect(() => {
    const status = checkUserDataAvailability(completedInterviews);
    setUserDataStatus(status);
  }, [completedInterviews]);

  // Calculate each company's readiness and mode
  const companiesWithReadiness = useMemo(() => {
    return COMPANIES.map(company => {
      const calc = calculateCompanyReadiness(company.id, completedInterviews);
      return {
        ...company,
        readiness: calc.readiness,
        readinessMode: calc.mode
      };
    });
  }, [completedInterviews]);

  // Filter companies based on search query and difficulty filter
  const filteredCompanies = useMemo(() => {
    return companiesWithReadiness.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            company.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty = difficultyFilter === 'All' || company.difficulty === difficultyFilter;
      return matchesSearch && matchesDifficulty;
    });
  }, [companiesWithReadiness, searchQuery, difficultyFilter]);

  // Calculate dynamic insights based on calculated readiness scores
  const stats = useMemo(() => {
    const total = COMPANIES.length;
    const hardCount = COMPANIES.filter(c => c.difficulty === 'Hard').length;
    const mediumCount = COMPANIES.filter(c => c.difficulty === 'Medium').length;
    const easyCount = COMPANIES.filter(c => c.difficulty === 'Easy').length;

    // Get all valid calculated readiness scores
    const activeScores = companiesWithReadiness
      .map(c => c.readiness)
      .filter(score => score !== null);

    const avgReadiness = activeScores.length > 0 
      ? Math.round(activeScores.reduce((acc, s) => acc + s, 0) / activeScores.length)
      : null;

    return {
      total,
      avgReadiness,
      hardCount,
      easyMediumCount: easyCount + mediumCount
    };
  }, [companiesWithReadiness]);

  const handleDifficultyToggle = () => {
    const filters = ['All', 'Easy', 'Medium', 'Hard'];
    const nextIdx = (filters.indexOf(difficultyFilter) + 1) % filters.length;
    setDifficultyFilter(filters[nextIdx]);
  };

  return (
    <Layout title="Company Preparation">
      <div className="cp-page">
        
        

        {/* Hero Section */}
        <section className="cp-hero">
          <div className="cp-hero-label">Placement Preparation</div>
          <h1>Prepare For Your <span>Dream Company</span></h1>
          <p>Get interview rounds, study plans, AI guidance, resources, and readiness analysis.</p>
          
          <div className="cp-hero-search-row">
            <div className="cp-search-box">
              <Search className="cp-search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by company name or skills (e.g. SQL, Java)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="cp-filter-btn" onClick={handleDifficultyToggle}>
              <Filter size={18} />
              <span>Difficulty: {difficultyFilter}</span>
            </button>
          </div>
        </section>

        {/* Quick Stats Section */}
        <section className="cp-stats-section">
          <h2>Quick Insights</h2>
          <div className="cp-stats-grid">
            <div className="cp-stat-card">
              <div className="cp-stat-icon pink">
                <Building2 size={24} />
              </div>
              <div>
                <div className="cp-stat-num">{stats.total}</div>
                <div className="cp-stat-label">Companies Tracked</div>
              </div>
            </div>

            <div className="cp-stat-card">
              <div className="cp-stat-icon purple">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="cp-stat-num">
                  {stats.avgReadiness !== null ? `${stats.avgReadiness}%` : 'N/A'}
                </div>
                <div className="cp-stat-label">Average Readiness Score</div>
              </div>
            </div>

            <div className="cp-stat-card">
              <div className="cp-stat-icon red">
                <Award size={24} />
              </div>
              <div>
                <div className="cp-stat-num">{stats.hardCount}</div>
                <div className="cp-stat-label">Hard Companies (Tier-1)</div>
              </div>
            </div>

            <div className="cp-stat-card">
              <div className="cp-stat-icon green">
                <Zap size={24} />
              </div>
              <div>
                <div className="cp-stat-num">{stats.easyMediumCount}</div>
                <div className="cp-stat-label">Easy & Medium Targets</div>
              </div>
            </div>
          </div>
        </section>

        {/* Company Grid Section */}
        <section className="cp-companies-section">
          <h2>Target Companies</h2>
          {filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cp-text-muted)', background: 'var(--cp-surface)', borderRadius: '14px', border: '1px solid var(--cp-border)' }}>
              No companies match your search or filter criteria. Try clearing them!
            </div>
          ) : (
            <div className="cp-grid">
              {filteredCompanies.map((company) => {
                // Determine dasharray for readiness circle if valid
                const hasScore = company.readiness !== null;
                const radius = 22;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = hasScore 
                  ? circumference - (company.readiness / 100) * circumference
                  : circumference;

                return (
                  <div
                    key={company.id}
                    className="cp-card"
                    onClick={() => navigate(`/company/${company.id}`)}
                  >
                    <div className="cp-card-header">
                      <div 
                        className="cp-card-logo" 
                        style={{ borderTop: `4px solid ${company.logoColor || '#4f46e5'}` }}
                      >
                        <span style={{ color: company.logoColor || '#4f46e5', fontWeight: 800 }}>
                          {company.logoText}
                        </span>
                      </div>
                      <span className={`cp-badge ${company.difficulty}`}>
                        {company.difficulty}
                      </span>
                    </div>

                    <h3 className="cp-card-name">{company.name}</h3>
                    <div className="cp-card-sub">{company.jobRoles.slice(0, 2).join(' • ')}</div>

                    <div className="cp-card-metrics">
                      <div className="cp-card-prep">
                        Prep Time
                        <strong>{company.prepTime}</strong>
                      </div>

                      {/* Circular Readiness Chart */}
                      <div className="cp-circle">
                        {hasScore ? (
                          <>
                            <svg width="56" height="56">
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                fill="transparent"
                                stroke="var(--cp-border)"
                                strokeWidth="4"
                              />
                              <circle
                                cx="28"
                                cy="28"
                                r={radius}
                                fill="transparent"
                                stroke="var(--cp-primary)"
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="cp-circle-val">{company.readiness}%</div>
                          </>
                        ) : (
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            border: '2px dashed var(--cp-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            color: 'var(--cp-text-muted)',
                            fontWeight: 700,
                            textAlign: 'center',
                            lineHeight: '1.1'
                          }}>
                            No Data
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score Source/Mode Tag */}
                    {hasScore && (
                      <div style={{
                        fontSize: '0.68rem',
                        color: company.readinessMode === 'Demo' ? '#b45309' : 'var(--cp-teal)',
                        background: company.readinessMode === 'Demo' ? 'var(--cp-medium-bg)' : 'var(--cp-teal-light)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        alignSelf: 'flex-start',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em'
                      }}>
                        {company.readinessMode === 'Demo' ? 'Demo Data' : 'Calculated'}
                      </div>
                    )}

                    <button 
                      className="cp-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/company/${company.id}`);
                      }}
                    >
                      View Preparation
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
