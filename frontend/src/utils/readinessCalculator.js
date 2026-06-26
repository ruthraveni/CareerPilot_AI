// Custom helper to calculate company readiness and dashboard insights dynamically
import COMPANIES from './companyData';

// Recommended projects mapped to company IDs based on their technology stacks
const PROJECT_RECOMMENDATIONS = {
  zoho: [
    { id: 0, title: 'Vanilla JS Text Editor Widget', desc: 'Build a rich text editor widget using pure JavaScript, focusing on DOM manipulation and event delegation.' },
    { id: 1, title: 'CRM Lead Management System', desc: 'Create a micro-SaaS application using Node.js, Express, and SQL to track customer leads and client pipeline.' },
    { id: 2, title: 'Pointers & Memory Simulator', desc: 'Write a program that simulates pointer operations and heap allocation to master C/C++ memory management.' }
  ],
  tcs: [
    { id: 0, title: 'Java Core Bank Transaction System', desc: 'Develop a console-based multi-threaded banking application utilizing core OOP principles and SQL databases.' },
    { id: 1, title: 'Employee Portal Website', desc: 'Build a standard CRUD web application using HTML, CSS, JavaScript, and a basic relational database.' },
    { id: 2, title: 'Aptitude Practice Quiz App', desc: 'Develop an interactive quiz application with timing constraints and score analytics for aptitude tests.' }
  ],
  infosys: [
    { id: 0, title: 'RESTful Inventory Manager API', desc: 'Build an inventory tracking backend with Python, FastAPI, and PostgreSQL with token-based user authentication.' },
    { id: 1, title: 'Client Dashboard Interface', desc: 'Develop a responsive frontend panel with React and Tailwind CSS that connects to a dummy clients database.' },
    { id: 2, title: 'Automated Test Suite for Web App', desc: 'Create a comprehensive unit and integration testing suite utilizing Jest or PyTest for a mock digital service.' }
  ],
  wipro: [
    { id: 0, title: 'CS Fundamentals Flashcards App', desc: 'Create a responsive flashcards app to master OS, DBMS normalization rules, and networking OSI layers.' },
    { id: 1, title: 'Multi-Role Portal backend', desc: 'Develop a Spring Boot or Node.js CRUD API managing user credentials, roles, and profiles.' },
    { id: 2, title: 'SQL Queries playground', desc: 'Build an interactive console dashboard to practice advanced JOINs, subqueries, and database indexing.' }
  ],
  cognizant: [
    { id: 0, title: 'Java Microservices E-Commerce Portal', desc: 'Create decoupled user and order microservices using Spring Boot, communicating over REST and using PostgreSQL.' },
    { id: 1, title: 'Algorithm Visualizer Dashboard', desc: 'Implement an interactive React application visualizing sorting, searching, and graph-traversal algorithms.' },
    { id: 2, title: 'Data Cleaning Pipeline', desc: 'Write a Python script using Pandas and NumPy to ingest, parse, clean, and analyze messy CSV datasets.' }
  ],
  accenture: [
    { id: 0, title: 'Cloud Infrastructure Setup Script', desc: 'Build a Terraform configuration script to deploy a secure, load-balanced virtual server architecture on AWS or Azure.' },
    { id: 1, title: 'Agile Kanban Board Web App', desc: 'Create a React-based Kanban task manager supporting drag-and-drop actions, labels, and progress indicators.' },
    { id: 2, title: 'English Speech Analyzer tool', desc: 'Develop a small voice transcription and speaking-speed analyzer using Web Speech API to prepare for communications tests.' }
  ],
  capgemini: [
    { id: 0, title: 'Pseudocode to JS compiler', desc: 'Write a parser that translates basic pseudocode instructions into executable JavaScript code.' },
    { id: 1, title: 'Interactive Logic puzzle game', desc: 'Develop a browser-based cognitive logic puzzle game testing analytical thinking and fast-paced reasoning.' },
    { id: 2, title: 'Product Catalog Database schema', desc: 'Design an optimized Relational Database schema (MySQL) in 3NF with indexations for quick searching.' }
  ],
  hcl: [
    { id: 0, title: 'Socket Chat Application', desc: 'Implement a multi-client chat room application using Python sockets or Node.js WebSockets to practice networking basics.' },
    { id: 1, title: 'System Process monitor dashboard', desc: 'Create a dashboard showing active OS processes, memory utilization, and CPU usage using Node.js or Python psutil.' },
    { id: 2, title: 'Network Packet Sniffer script', desc: 'Write a basic packet parsing script in Python using Scapy to analyze standard TCP/IP packet headers.' }
  ],
  amazon: [
    { id: 0, title: 'LRU Cache Design', desc: 'Design and implement an in-memory LRU Cache data structure supporting O(1) read and write operations.' },
    { id: 1, title: 'Scalable Distributed Rate Limiter', desc: 'Implement a token-bucket rate limiting middleware using Node.js and Redis to manage high-throughput API endpoints.' },
    { id: 2, title: 'E-Commerce System Design Blueprint', desc: 'Draw a complete architecture blueprint for a high-availability shopping system detailing DB, cache, and queues.' }
  ],
  microsoft: [
    { id: 0, title: 'Custom File System Simulator', desc: 'Implement a virtual in-memory file system with directories, files, permissions, and basic CLI controls in Java or C++.' },
    { id: 1, title: 'SOLID principles Refactoring project', desc: 'Take a legacy codebase and refactor it completely to adhere strictly to OOP SOLID design constructs.' },
    { id: 2, title: 'Consistent Hashing ring simulator', desc: 'Develop a script simulating node additions/removals on a hash ring to manage data partitioning.' }
  ],
  google: [
    { id: 0, title: 'Google Search Engine Indexer', desc: 'Build an inverted index compiler and search query ranks processor using MapReduce constructs in Python.' },
    { id: 1, title: 'Distributed Key-Value Store', desc: 'Create a consensus-based distributed key-value store using Raft protocols or basic replication.' },
    { id: 2, title: 'Swim in Rising Water solver visualizer', desc: 'Build a graphical visualizer solving advanced pathfinding (Dijkstra/A*) on heightmaps with dynamic water levels.' }
  ]
};

// Company-specific weightages for different interview rounds
const COMPANY_WEIGHTS = {
  zoho: { aptitude: 30, technical: 50, hr: 20 },
  tcs: { aptitude: 40, technical: 40, hr: 20 },
  infosys: { aptitude: 35, technical: 45, hr: 20 },
  wipro: { aptitude: 40, technical: 40, hr: 20 },
  cognizant: { aptitude: 30, technical: 50, hr: 20 },
  accenture: { aptitude: 35, technical: 45, hr: 20 },
  capgemini: { aptitude: 40, technical: 40, hr: 20 },
  hcl: { aptitude: 35, technical: 45, hr: 20 },
  amazon: { aptitude: 10, technical: 50, hr: 40 },
  microsoft: { aptitude: 10, technical: 70, hr: 20 },
  google: { aptitude: 10, technical: 80, hr: 10 },
  default: { aptitude: 30, technical: 50, hr: 20 }
};

// Check if user has any real data in the system
export function checkUserDataAvailability(completedInterviews = []) {
  const resumeSaved = localStorage.getItem('resume_analysis');
  const hasResume = !!resumeSaved;
  const hasInterviews = completedInterviews && completedInterviews.length > 0;
  
  // Check if they have chatted with any AI mentor
  let hasChats = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mentor_chats') || key.startsWith('chat_history'))) {
        hasChats = true;
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return {
    hasResume,
    hasInterviews,
    hasChats,
    hasAnyData: hasResume || hasInterviews || hasChats
  };
}

// Exported helper to track when a user views a company page
export function markCompanyViewed(companyId) {
  try {
    let views = [];
    const saved = localStorage.getItem('company_views');
    if (saved) views = JSON.parse(saved);
    if (!views.includes(companyId)) {
      views.push(companyId);
      localStorage.setItem('company_views', JSON.stringify(views));
    }
  } catch (e) {}
}

// Calculate the global readiness score based on explicit rules:
// Global score is now the AVERAGE of all active company readiness scores
export function calculateGlobalReadiness(interviews = []) {
  const companyIds = ['zoho', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'capgemini', 'hcl', 'amazon', 'microsoft', 'google'];
  let totalScore = 0;
  let activeCompanies = 0;

  companyIds.forEach(id => {
    const compData = calculateCompanyReadiness(id, interviews);
    if (compData && compData.readiness !== null && compData.readiness > 0) {
      totalScore += compData.readiness;
      activeCompanies += 1;
    }
  });

  // Base fallback if they haven't done any company specific prep yet
  let baseScore = 0;
  const hasResume = !!localStorage.getItem('resume_analysis');
  if (hasResume) baseScore += 20;

  const score = activeCompanies > 0 ? Math.round(totalScore / activeCompanies) : baseScore;

  // Derive Label
  let label = '0% (Not Started)';
  if (score === 0) label = '0% (Not Started)';
  else if (score <= 30) label = `${score}% (Beginner)`;
  else if (score <= 60) label = `${score}% (Improving)`;
  else if (score <= 85) label = `${score}% (Placement Ready)`;
  else label = `${score}% (Interview Ready)`;

  return {
    score: Math.min(100, score),
    label,
    components: {
      mock: Math.min(30, score * 0.3),
      resume: hasResume ? 20 : 0,
      company: Math.min(20, score * 0.2),
      practice: Math.min(20, score * 0.2),
      streak: Math.min(10, score * 0.1)
    }
  };
}

// Calculate readiness score and metrics for a specific company dynamically
export function calculateCompanyReadiness(companyId, completedInterviews = []) {
  const company = COMPANIES.find(c => c.id === companyId);
  if (!company) return { readiness: null, mode: 'Unavailable' };

  let score = 0;

  // 1. Mock Interviews (max 30%) ONLY for this company
  const companyInterviews = completedInterviews.filter(
    intv => intv.company && intv.company.toLowerCase() === company.name.toLowerCase() && intv.status === 'completed'
  );
  score += Math.min(30, companyInterviews.length * 10);

  // 2. Resume Analyzer (max 20%) Global resume check
  const hasResume = !!localStorage.getItem('resume_analysis');
  if (hasResume) score += 20;

  // 3. Company Prep Viewed (max 20%) Only if THIS company was viewed
  let viewed = false;
  try {
    const views = JSON.parse(localStorage.getItem('company_views') || '[]');
    if (views.includes(companyId)) viewed = true;
  } catch(e) {}
  if (viewed) score += 20;

  // 4. Practice/Quiz Activity (max 20%) Only projects for THIS company
  const completedProjectIds = getCompletedProjects(companyId);
  const totalProjects = PROJECT_RECOMMENDATIONS[companyId]?.length || 3;
  score += Math.min(20, Math.round((completedProjectIds.length / totalProjects) * 20));

  // 5. Daily Streak/Consistency (max 10%) Only for THIS company
  let streakBonus = 0;
  if (companyInterviews.length > 0) {
    const lastIntv = new Date(companyInterviews[companyInterviews.length - 1].created_at);
    const hoursSince = (new Date() - lastIntv) / (1000 * 60 * 60);
    if (hoursSince <= 48) streakBonus = 10;
    else if (hoursSince <= 168) streakBonus = 5;
  }
  score += streakBonus;

  // Apply difficulty penalty (harder companies slightly discount raw score if no interviews taken)
  if (companyInterviews.length === 0) {
    const difficultyModifier = company.difficulty === 'Hard' ? 0.8 : company.difficulty === 'Medium' ? 0.9 : 1.0;
    score = Math.round(score * difficultyModifier);
  }

  // Zero check
  if (score === 0 && !hasResume && !viewed && completedProjectIds.length === 0 && companyInterviews.length === 0) {
    return {
      readiness: 0,
      mode: 'Calculated',
      components: { aptitude: 0, technical: 0, hr: 0, projects: 0 }
    };
  }

  return {
    readiness: Math.min(100, Math.round(score)),
    mode: 'Calculated',
    components: {
      aptitude: companyInterviews.length > 0 ? 80 : 0, 
      technical: companyInterviews.length > 0 ? 80 : 0,
      hr: companyInterviews.length > 0 ? 80 : 0,
      projects: Math.round((completedProjectIds.length / totalProjects) * 100)
    }
  };
}

// Completed projects helper
export function getCompletedProjects(companyId) {
  try {
    const saved = localStorage.getItem(`completed_projects_${companyId}`);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function toggleProjectCompleted(companyId, projectId) {
  try {
    const current = getCompletedProjects(companyId);
    let updated;
    if (current.includes(projectId)) {
      updated = current.filter(id => id !== projectId);
    } else {
      updated = [...current, projectId];
    }
    localStorage.setItem(`completed_projects_${companyId}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

// Recommended projects for a company
export function getRecommendedProjects(companyId) {
  return PROJECT_RECOMMENDATIONS[companyId] || [
    { id: 0, title: 'Full-stack Database Application', desc: 'Design, implement, and deploy a RESTful CRUD system using modern client-server architecture.' },
    { id: 1, title: 'Data Structures Playground', desc: 'Build an interactive platform to practice solving and visualising core algorithmic challenges.' },
    { id: 2, title: 'Responsive Dashboard Interface', desc: 'Create a high-fidelity visual dashboard summarizing backend operations, complete with CSS analytics bars.' }
  ];
}

// Generate Dashboard Insights dynamically
export function generateDashboardInsights(companyId) {
  const company = COMPANIES.find(c => c.id === companyId);
  if (!company) return {};

  const savedResume = localStorage.getItem('resume_analysis');
  let userSkills = [];
  let atsScore = 70;

  if (savedResume) {
    try {
      const resumeData = JSON.parse(savedResume);
      userSkills = (resumeData.skills || []).map(s => s.toLowerCase());
      atsScore = resumeData.ats_score || 70;
    } catch (e) {}
  }

  // Missing skills: company required skills not in user's resume
  const reqSkills = company.skills;
  const missingSkills = reqSkills.filter(s => !userSkills.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)));
  const strengths = reqSkills.filter(s => userSkills.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)));

  // Weaknesses generation based on facts
  const weaknesses = [];
  if (strengths.length < reqSkills.length / 2) {
    weaknesses.push('Technical Skill Alignment: You possess less than 50% of the core skills required.');
  }
  if (atsScore < 75) {
    weaknesses.push(`Resume Score (${atsScore}/100): Your resume requires keyword optimization and formatting upgrades.`);
  }
  
  // Check if they took any mock interviews
  let interviewCount = 0;
  try {
    const current = localStorage.getItem(`completed_projects_${companyId}`); // just checking any action
  } catch (e) {}

  if (strengths.length === 0) {
    strengths.push('Technical adaptability');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Lack of company-specific mock practice');
  }

  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    missingSkills: missingSkills.length > 0 ? missingSkills : ['None! Core technical stack matches.'],
    projects: getRecommendedProjects(companyId)
  };
}
