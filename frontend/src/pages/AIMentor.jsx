import { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../utils/api';
import { Send, Brain, Code, FileSearch, Compass, ListTodo, User, Loader2 } from 'lucide-react';

function AIMentor() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingText, setLoadingText] = useState('Typing...');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    { text: "Create SDE roadmap for Amazon", icon: Compass, action: "I'd like to create a career roadmap for an Amazon SDE role. Can you outline the phases, topics to cover, and timeline?" },
    { text: "Analyze Java/Spring skill gap", icon: Code, action: "Can you help me analyze my skill gaps in Java and Spring Boot for a Backend Developer position?" },
    { text: "TCS study plan (14 Days)", icon: ListTodo, action: "Create a detailed 14-day study plan to prepare for the TCS NQT placement drive." },
    { text: "Resume strategy tips", icon: FileSearch, action: "What are the top 5 resume improvement strategies to pass ATS scanners for product companies?" }
  ];

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mentor/history');
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      } else {
        // Fallback welcoming message if history is empty
        setMessages([
          {
            sender: 'ai',
            text: "Hello! I'm your AI Career Mentor. I'm here to help you design a career roadmap, analyze your skills, prepare study plans, or review your resume strategies. What are you targeting today?",
            timestamp: new Date()
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    const userMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Determine dynamic loading text
    let dynamicText = 'Analyzing your profile...';
    const msgLower = textToSend.toLowerCase();
    if (msgLower.includes('roadmap') || msgLower.includes('path')) {
      dynamicText = 'Generating roadmap...';
    } else if (msgLower.includes('study') || msgLower.includes('plan')) {
      dynamicText = 'Preparing study plan...';
    } else if (msgLower.includes('resume') || msgLower.includes('cv')) {
      dynamicText = 'Reviewing resume...';
    } else if (msgLower.includes('interview') || msgLower.includes('placement')) {
      dynamicText = 'Gathering interview tips...';
    }
    
    setLoadingText(dynamicText);
    setIsTyping(true);

    try {
      const response = await api.post('/mentor/chat', { message: textToSend });
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: response.data.text,
        timestamp: response.data.timestamp
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Error connecting to AI mentor. Please check backend connection.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <Layout title="AI Career Mentor">
        <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-3xl overflow-hidden shadow-sm">
          {/* Header Skeleton */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-[var(--cp-border)] p-2.5 rounded-xl h-10 w-10 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--cp-border)] rounded w-32 animate-pulse"></div>
                <div className="h-2 bg-[var(--cp-border)] rounded w-24 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Messages Skeleton */}
          <div className="flex-1 p-6 space-y-6">
            <div className="flex justify-start items-end space-x-2">
              <div className="h-8 w-8 rounded-full bg-[var(--cp-border)] animate-pulse"></div>
              <div className="h-24 bg-[var(--cp-border)] rounded-2xl w-3/4 animate-pulse"></div>
            </div>
            <div className="flex justify-end items-end space-x-2">
              <div className="h-16 bg-[var(--cp-border)] rounded-2xl w-1/2 animate-pulse"></div>
              <div className="h-8 w-8 rounded-full bg-[var(--cp-border)] animate-pulse"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="AI Career Mentor">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] bg-[var(--cp-surface)] border border-[var(--cp-border)] rounded-3xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">AI CAREER COACH</h3>
              <p className="text-xs text-blue-400 font-semibold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
                <span>Active consultation</span>
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-[var(--cp-surface)]/10 px-3 py-1 rounded-full text-slate-300">
            Persistent History Enabled
          </span>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--cp-bg)]/50">
          {messages.map((message, i) => {
            const isAI = message.sender === 'ai';
            return (
              <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-end space-x-2`}>
                {isAI && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-sm border whitespace-pre-line ${
                  isAI 
                    ? 'bg-[var(--cp-surface)] text-[var(--cp-text)] border-[var(--cp-border)]/80 rounded-bl-none' 
                    : 'bg-blue-600 text-white border-blue-700 rounded-br-none'
                }`}>
                  {message.text}
                </div>
                {!isAI && (
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-[var(--cp-text-muted)]" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Brain className="h-4 w-4 text-blue-600" />
              </div>
              <div className="bg-[var(--cp-surface)] border border-[var(--cp-border)]/85 rounded-2xl rounded-bl-none px-5 py-3.5 shadow-sm flex items-center space-x-3">
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                <span className="text-sm font-medium text-[var(--cp-text-muted)]">{loadingText}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Grid */}
        <div className="px-6 py-4 bg-[var(--cp-surface)] border-t border-[var(--cp-border)]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested Mentor Tasks</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedPrompts.map((prompt, i) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt.action)}
                  className="flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border border-[var(--cp-border)]/70 hover:border-blue-500 hover:bg-blue-50/20 text-left text-xs font-semibold text-[var(--cp-text-muted)] hover:text-blue-700 transition-all duration-200"
                >
                  <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{prompt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[var(--cp-surface)] border-t border-[var(--cp-border)] flex items-center space-x-3">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-[var(--cp-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Ask your mentor about plans, roadmap suggestions, resume improvement..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-md transition-colors flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default AIMentor;
