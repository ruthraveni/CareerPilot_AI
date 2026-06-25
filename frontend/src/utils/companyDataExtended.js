// Extended company data with static difficulty, prepTime, readinessPercentage, and full resources
export const companies = [
  {
    id: 'zoho',
    name: 'Zoho',
    logo: '/assets/logos/zoho.png',
    difficulty: 'Medium',
    prepTime: '3 weeks',
    readinessPercentage: 68,
    hiringProcess: 'Online test → Technical interview → HR interview',
    importantSkills: ['JavaScript', 'Data Structures', 'Problem Solving'],
    rounds: ['Aptitude', 'Logical reasoning', 'Technical round', 'HR round'],
    fallbackQuestions: {
      Technical: {
        Easy: ['Explain closures in JavaScript.', 'Reverse a string without using built‑in functions.'],
        Medium: ['Explain React reconciliation.', 'What is memoization in JavaScript?'],
        Hard: ['Design a scalable notification system for a SaaS product.']
      },
      HR: { Easy: ['Tell me about a time you disagreed with a teammate.'] }
    },
    resources: {
      videos: ['Love Babbar', 'Kunal Kushwaha', 'Apna College', 'CodeWithHarry'],
      websites: ['GeeksforGeeks', 'LeetCode', 'HackerRank', 'InterviewBit', 'Roadmap.sh'],
      books: ['Cracking the Coding Interview', 'Grokking Algorithms']
    },
    readiness: {
      percentage: 68,
      skillGaps: ['System Design', 'Performance Optimization'],
      missingSkills: ['Docker', 'Kubernetes'],
      recommendedProjects: ['Build a CRUD app with authentication', 'Implement a real‑time chat']
    }
  },
  {
    id: 'tcs',
    name: 'TCS',
    logo: '/assets/logos/tcs.png',
    difficulty: 'Easy',
    prepTime: '2 weeks',
    readinessPercentage: 60,
    hiringProcess: 'Online test → Technical interview → HR interview',
    importantSkills: ['Java', 'OOP', 'SQL'],
    rounds: ['Aptitude', 'Technical', 'HR'],
    fallbackQuestions: {},
    resources: {
      videos: ['Love Babbar', 'Kunal Kushwaha', 'Apna College', 'CodeWithHarry'],
      websites: ['GeeksforGeeks', 'LeetCode', 'HackerRank', 'InterviewBit', 'Roadmap.sh'],
      books: ['Cracking the Coding Interview', 'Grokking Algorithms']
    },
    readiness: { percentage: 60, skillGaps: [], missingSkills: [], recommendedProjects: [] }
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: '/assets/logos/amazon.png',
    difficulty: 'Hard',
    prepTime: '6 weeks',
    readinessPercentage: 75,
    hiringProcess: 'Online assessment → System design interview → Leadership principles interview',
    importantSkills: ['Data Structures', 'System Design', 'Leadership'],
    rounds: ['Online assessment', 'Technical rounds', 'Behavioral rounds'],
    fallbackQuestions: {},
    resources: {
      videos: ['Love Babbar', 'Kunal Kushwaha', 'Apna College', 'CodeWithHarry'],
      websites: ['GeeksforGeeks', 'LeetCode', 'HackerRank', 'InterviewBit', 'Roadmap.sh'],
      books: ['Cracking the Coding Interview', 'Grokging Algorithms']
    },
    readiness: { percentage: 75, skillGaps: ['Distributed Systems'], missingSkills: ['AWS', 'Scalable Architecture'], recommendedProjects: ['Build a scalable API', 'Implement caching strategies'] }
  },
  {
    id: 'google',
    name: 'Google',
    logo: '/assets/logos/google.png',
    difficulty: 'Hard',
    prepTime: '8 weeks',
    readinessPercentage: 80,
    hiringProcess: 'Phone screen → Onsite technical rounds → System design → Behavioral',
    importantSkills: ['Algorithms', 'System Design', 'Coding Efficiency'],
    rounds: ['Phone screen', 'Technical rounds', 'System design', 'Behavioral'],
    fallbackQuestions: {},
    resources: {
      videos: ['Love Babbar', 'Kunal Kushwaha', 'Apna College', 'CodeWithHarry'],
      websites: ['GeeksforGeeks', 'LeetCode', 'HackerRank', 'InterviewBit', 'Roadmap.sh'],
      books: ['Cracking the Coding Interview', 'Grokking Algorithms']
    },
    readiness: { percentage: 80, skillGaps: [], missingSkills: [], recommendedProjects: [] }
  }
];
