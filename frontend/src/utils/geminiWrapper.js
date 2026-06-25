import { generateContent } from './geminiService';
import { COMPANIES } from './companyData';

// Simple in-memory cache of the last 5 messages per company ID
// Each message entry is { role: 'user' | 'assistant', content: string }
const chatCache = {};

export async function askMentor(companyId, messageText) {
  const company = COMPANIES.find(c => c.id === companyId);
  const companyName = company ? company.name : 'the company';
  const fallbackAnswer = company?.fallbackAnswer || `Focus on core concepts, problem-solving, and resume preparation for ${companyName}.`;

  // Ensure cache exists for this company
  if (!chatCache[companyId]) {
    chatCache[companyId] = [];
  }

  const history = chatCache[companyId];

  // Create prompt with context of the company, previous messages (if any), and current message
  const historyContext = history.slice(-4).map(msg => `${msg.role === 'user' ? 'User' : 'Mentor'}: ${msg.content}`).join('\n');
  const prompt = `You are a placement preparation mentor helping a student prepare for an interview at ${companyName}.
Here is some information about ${companyName}:
Description: ${company?.description}
Hiring Process: ${company?.hiringProcess?.join(', ')}
Key Skills Needed: ${company?.skills?.join(', ')}
Hiring Difficulty: ${company?.difficulty}

Conversation history so far:
${historyContext}

Student's question: "${messageText}"

Provide a concise, helpful, and professional response in 2-3 sentences. Focus on placement tips, technical preparation, or roadmap guidance. Do not use markdown titles.`;

  // Add user message to local cache
  history.push({ role: 'user', content: messageText });
  if (history.length > 5) {
    history.shift(); // Keep only last 5 messages in cache
  }

  try {
    const res = await generateContent(prompt);
    if (res.error || !res.text) {
      throw new Error('Gemini API call failed or returned empty text');
    }
    
    const botResponse = res.text;
    
    // Add bot response to cache
    history.push({ role: 'assistant', content: botResponse });
    if (history.length > 5) {
      history.shift();
    }
    
    return { text: botResponse, isFallback: false };
  } catch (error) {
    console.warn('askMentor fell back to local knowledge:', error);
    
    // Provide a nice customized fallback response using company details if API fails
    let customFallback = fallbackAnswer;
    if (messageText.toLowerCase().includes('round') || messageText.toLowerCase().includes('process')) {
      customFallback = `${companyName}'s hiring process typically consists of: ${company?.hiringProcess?.join(' → ')}. Focus your preparation on these key steps!`;
    } else if (messageText.toLowerCase().includes('skill') || messageText.toLowerCase().includes('prepare')) {
      customFallback = `For ${companyName}, it is vital to master: ${company?.skills?.join(', ')}. Practice these daily on coding platforms.`;
    } else if (messageText.toLowerCase().includes('salary') || messageText.toLowerCase().includes('package')) {
      customFallback = `The average package at ${companyName} is around ${company?.avgPackage || 'competitive standard rates'}. This depends on the specific job role and performance.`;
    }

    // Add fallback bot response to cache
    history.push({ role: 'assistant', content: customFallback });
    if (history.length > 5) {
      history.shift();
    }
    
    return { text: customFallback, isFallback: true };
  }
}

export function getChatHistory(companyId) {
  return chatCache[companyId] || [];
}

export function clearChatHistory(companyId) {
  chatCache[companyId] = [];
}
