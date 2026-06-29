from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import logging
import json
import re
from pathlib import Path
from utils.ai_client import ai_client
import google.generativeai as genai
import os
import random
import uuid
import io
import wave
import traceback
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

_generation_cache = {}
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set; Gemini functionality will use fallback responses.")

class InterviewStartRequest(BaseModel):
    role: str
    company: str
    round_type: str
    question_count: int
    timer: int
    profile: Optional[dict] = None

class AnswerEvaluationRequest(BaseModel):
    interview_id: str
    question_index: int
    user_answer: str
    selected_language: Optional[str] = None
    source_code: Optional[str] = None
    voice_transcript: Optional[str] = None

# Built-in question database containing high-quality questions for all 11 companies and 6 rounds
QUESTION_BANK = {
    "general": {
        "Aptitude": {
            "easy": [
                {
                    "text": "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
                    "type": "mcq",
                    "options": ["150 meters", "120 meters", "90 meters", "180 meters"],
                    "correct_answer": "150 meters",
                    "difficulty": "easy"
                },
                {
                    "text": "What is the average of the first five prime numbers?",
                    "type": "mcq",
                    "options": ["5.6", "3.6", "5.0", "4.2"],
                    "correct_answer": "5.6",
                    "difficulty": "easy"
                },
                {
                    "text": "If 3 pipes can fill a tank in 6 hours, how many pipes are needed to fill it in 2 hours?",
                    "type": "mcq",
                    "options": ["6 pipes", "9 pipes", "12 pipes", "15 pipes"],
                    "correct_answer": "9 pipes",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "A person crosses a 600m long street in 5 minutes. What is his speed in km/hr?",
                    "type": "mcq",
                    "options": ["7.2 km/hr", "8.4 km/hr", "9.6 km/hr", "10.0 km/hr"],
                    "correct_answer": "7.2 km/hr",
                    "difficulty": "medium"
                },
                {
                    "text": "Two numbers are in the ratio 3:4. If their LCM is 240, find the smaller number.",
                    "type": "mcq",
                    "options": ["60", "80", "100", "120"],
                    "correct_answer": "60",
                    "difficulty": "medium"
                },
                {
                    "text": "A student has to obtain 33% of the total marks to pass. He got 125 marks and failed by 40 marks. What is the maximum mark?",
                    "type": "mcq",
                    "options": ["500", "600", "400", "450"],
                    "correct_answer": "500",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Three pipes A, B and C can fill a tank in 6 hours. After working at it together for 2 hours, C is closed and A and B can fill the remaining part in 7 hours. How many hours will C alone take to fill the tank?",
                    "type": "mcq",
                    "options": ["10 hours", "12 hours", "14 hours", "16 hours"],
                    "correct_answer": "14 hours",
                    "difficulty": "hard"
                },
                {
                    "text": "A card is drawn from a pack of 52 cards. What is the probability that the card drawn is a spade or a king?",
                    "type": "mcq",
                    "options": ["4/13", "3/13", "1/4", "2/13"],
                    "correct_answer": "4/13",
                    "difficulty": "hard"
                },
                {
                    "text": "Find the angle between the hour hand and the minute hand of a clock when the time is 3:25.",
                    "type": "mcq",
                    "options": ["47.5 degrees", "45.0 degrees", "42.5 degrees", "50.0 degrees"],
                    "correct_answer": "47.5 degrees",
                    "difficulty": "hard"
                }
            ]
        },
        "Technical": {
            "Frontend Developer": {
                "easy": [
                    {
                        "text": "Explain the difference between Virtual DOM and Real DOM in React.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    },
                    {
                        "text": "What is event delegation in JavaScript and why is it useful?",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "How would you optimize the performance of a React application (e.g. useMemo, useCallback, lazy loading)?",
                        "type": "descriptive",
                        "difficulty": "medium"
                    },
                    {
                        "text": "Explain the difference between absolute, relative, fixed, and sticky positioning in CSS.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "How does the browser render engine parse HTML, CSS, and JS to paint a page? Detail the critical rendering path.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    },
                    {
                        "text": "Design a custom state management system similar to Redux or Zustand from scratch in vanilla JavaScript.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            },
            "Backend Developer": {
                "easy": [
                    {
                        "text": "What is a REST API? Explain the difference between GET and POST requests.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    },
                    {
                        "text": "Explain the difference between SQL and NoSQL databases.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "What is database indexing? Explain how B-Trees speed up query ranges.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    },
                    {
                        "text": "Explain Spring Boot dependency injection and how the @Autowired annotation works under the hood.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "How does memory garbage collection work in languages like Java or JavaScript? Detail the generation spaces.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    },
                    {
                        "text": "Design a distributed lock mechanism using Redis to prevent race conditions in a microservices environment.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            },
            "Full Stack Developer": {
                "easy": [
                    {
                        "text": "Explain the concept of Model-View-Controller (MVC) architecture.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "How does JWT (JSON Web Token) authentication work between a frontend client and a backend server?",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "How would you handle session replication and state synchronization in a load-balanced clustering environment?",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            },
            "default": {
                "easy": [
                    {
                        "text": "What is object-oriented programming? Describe the core principles: inheritance, polymorphism, and encapsulation.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "Explain the difference between process-level and thread-level concurrency.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "Describe how database transactions guarantee ACID properties under high write loads.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            }
        },
        "Coding": {
            "easy": [
                {
                    "text": "Write a function to check if a given string is a palindrome.\n\nInput: 'racecar'\nOutput: true\n\nConstraints: O(n) time, O(1) space.",
                    "type": "coding",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Write an efficient function to find the longest substring without repeating characters.\n\nInput: 'abcabcbb'\nOutput: 3 ('abc')\n\nConstraints: O(n) time complexity.",
                    "type": "coding",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Implement an LRU (Least Recently Used) cache with O(1) time complexity for get and put operations.\n\nConstraints: Max cache capacity is N operations.",
                    "type": "coding",
                    "difficulty": "hard"
                }
            ]
        },
        "HR": {
            "easy": [
                {
                    "text": "Tell me about yourself and your academic background. Why should we hire you?",
                    "type": "descriptive",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Where do you see yourself in five years? How does this role align with your goals?",
                    "type": "descriptive",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Describe a situation where you had to work with a difficult team member. How did you handle it?",
                    "type": "descriptive",
                    "difficulty": "hard"
                }
            ]
        },
        "Behavioral": {
            "easy": [
                {
                    "text": "Describe a time when you had to work under tight constraints. Use the STAR method.",
                    "type": "descriptive",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Tell me about a time you took the initiative to solve a problem without being asked. What was the outcome?",
                    "type": "descriptive",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Tell me about a major project failure or mistake you made. How did you communicate it and what did you learn?",
                    "type": "descriptive",
                    "difficulty": "hard"
                }
            ]
        },
        "System Design": {
            "easy": [
                {
                    "text": "Design a simple URL shortening service (like Bitly) explaining database storage.",
                    "type": "descriptive",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Design a scalable real-time chat application (like Slack or WhatsApp) utilizing WebSockets.",
                    "type": "descriptive",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Design a high-throughput e-commerce checkout service (like Amazon) that handles high concurrency and prevents double charging.",
                    "type": "descriptive",
                    "difficulty": "hard"
                }
            ]
        }
    },
    # Company Specific Customizations
    "Zoho": {
        "Aptitude": {
            "easy": [
                {
                    "text": "In a seating arrangement, if A sits next to B but C cannot sit next to A, how many ways can 4 people sit in a row?",
                    "type": "mcq",
                    "options": ["12", "8", "6", "10"],
                    "correct_answer": "8",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "A vendor buys lemons at 6 for $10 and sells them at 4 for $9. What is his profit percentage?",
                    "type": "mcq",
                    "options": ["35%", "25%", "30%", "40%"],
                    "correct_answer": "35%",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "A, B, and C can complete a work in 10, 12, and 15 days respectively. They started working together, but A left 5 days before the completion of work. In how many days was the work completed?",
                    "type": "mcq",
                    "options": ["5.8 days", "6 days", "5.2 days", "6.4 days"],
                    "correct_answer": "5.8 days",
                    "difficulty": "hard"
                }
            ]
        },
        "Technical": {
            "default": {
                "easy": [
                    {
                        "text": "What is structure padding in C and why does the compiler perform it?",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "Explain the difference between pass-by-value and pass-by-reference using pointer operations in C/C++.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "Design a memory manager widget that runs custom malloc and free allocations on a statically allocated array buffer.",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            }
        }
    },
    "TCS": {
        "Aptitude": {
            "easy": [
                {
                    "text": "Fill in the blank: The team was _______ in their efforts to complete the task before the deadline.",
                    "type": "mcq",
                    "options": ["relentless", "reluctant", "negligent", "apathetic"],
                    "correct_answer": "relentless",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "A train crosses a 300m long bridge in 30 seconds running at 60 km/hr. What is the length of the train?",
                    "type": "mcq",
                    "options": ["200m", "250m", "150m", "300m"],
                    "correct_answer": "200m",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "If 6 men and 8 boys can do a piece of work in 10 days, while 26 men and 48 boys can do it in 2 days, the time taken by 15 men and 20 boys is?",
                    "type": "mcq",
                    "options": ["4 days", "5 days", "6 days", "8 days"],
                    "correct_answer": "4 days",
                    "difficulty": "hard"
                }
            ]
        }
    },
    "Google": {
        "Coding": {
            "easy": [
                {
                    "text": "Write a function to detect a cycle in a directed graph.\n\nConstraints: O(V + E) time, O(V) space complexity.",
                    "type": "coding",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Given a list of job intervals with start, end times and profit, find the maximum profit from non-overlapping jobs.\n\nConstraints: O(n log n) time complexity.",
                    "type": "coding",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Given an NxN grid representing water elevation, find the path from top-left to bottom-right that minimizes the maximum elevation encountered.\n\nConstraints: O(N^2 log N) time complexity.",
                    "type": "coding",
                    "difficulty": "hard"
                }
            ]
        }
    },
    "Amazon": {
        "Behavioral": {
            "easy": [
                {
                    "text": "Describe a situation where you took on a task that was outside of your job description. (Ownership Principle)",
                    "type": "descriptive",
                    "difficulty": "easy"
                }
            ],
            "medium": [
                {
                    "text": "Tell me about a time you disagreed with a colleague or manager. How did you handle the situation? (Have Backbone; Disagree and Commit)",
                    "type": "descriptive",
                    "difficulty": "medium"
                }
            ],
            "hard": [
                {
                    "text": "Tell me about a time you had to deep dive into a metric or problem to find the root cause. (Dive Deep Principle)",
                    "type": "descriptive",
                    "difficulty": "hard"
                }
            ]
        }
    },
    "Microsoft": {
        "Technical": {
            "default": {
                "easy": [
                    {
                        "text": "What are the SOLID principles in OOP? Explain them briefly.",
                        "type": "descriptive",
                        "difficulty": "easy"
                    }
                ],
                "medium": [
                    {
                        "text": "Explain thread synchronization primitives (mutex, semaphore, spinlock) and their overheads.",
                        "type": "descriptive",
                        "difficulty": "medium"
                    }
                ],
                "hard": [
                    {
                        "text": "How would you design a distributed cache system that is fault-tolerant and dynamically resizes?",
                        "type": "descriptive",
                        "difficulty": "hard"
                    }
                ]
            }
        }
    }
}

def validate_question_context(question_obj: dict, company: str, role: str, round_type: str) -> bool:
    """Validate that the question is actual, not a placeholder, and matches round/role parameters."""
    if not question_obj or not isinstance(question_obj, dict):
        return False
        
    text = question_obj.get("text", "")
    q_type = question_obj.get("type", "")
    q_lower = text.lower()
    
    if len(text.strip()) < 10:
        return False
        
    # Block placeholders
    placeholder_words = [
        "placeholder", "template", "fallback", "question 1", "question 2", 
        "dsa question", "general question", "advanced dsa", "question bank"
    ]
    for word in placeholder_words:
        if word in q_lower:
            return False
            
    # Reject formatting like "[Easy] Topic question"
    if q_lower.startswith("[") and "]" in q_lower:
        return False
        
    round_clean = round_type.replace(" Round", "").strip()
    
    # 8. Add validation before displaying questions.
    # If the selected round is Aptitude Round:
    # Block any question containing: React, Java, Python, Algorithm, DSA, Coding, System Design
    if round_clean == "Aptitude":
        if q_type != "mcq" or "options" not in question_obj or len(question_obj.get("options", [])) != 4:
            return False
        banned_words = ["react", "java", "python", "algorithm", "dsa", "coding", "system design"]
        for word in banned_words:
            if word in q_lower:
                return False
            for opt in question_obj.get("options", []):
                if word in opt.lower():
                    return False
            if word in str(question_obj.get("correct_answer", "")).lower():
                return False
                
    # 2. Coding Round: Always coding challenge
    elif round_clean == "Coding":
        if q_type != "coding" and "write" not in q_lower and "implement" not in q_lower:
            return False
            
    # 3. System Design: Architecture focused
    elif round_clean == "System Design":
        design_keywords = ["design", "architecture", "scale", "system", "load balancer", "cache", "latency", "distributed", "database", "sharding", "microservice", "rate limit", "throughput", "redundancy"]
        if not any(kw in q_lower for kw in design_keywords):
            return False
            
    # 4. Behavioral Round: STAR based
    elif round_clean == "Behavioral":
        star_keywords = ["time you", "situation", "have you ever", "how did you handle", "describe a time", "conflict", "disagreement", "mistake", "prioritize", "star method", "tell me about a time"]
        if not any(kw in q_lower for kw in star_keywords):
            return False
            
    # 5. Technical Round: Role specific
    elif round_clean == "Technical":
        role_lower = role.lower()
        if "frontend" in role_lower:
            frontend_keywords = ["html", "css", "javascript", "react", "dom", "api", "performance", "web", "browser", "hooks", "viewport", "rendering", "frontend"]
            banned_backend = ["spring boot", "hibernate", "jpa", "django", "postgresql", "backend"]
            if any(kw in q_lower for kw in banned_backend) and not any(kw in q_lower for kw in frontend_keywords):
                return False
        elif "backend" in role_lower:
            backend_keywords = ["java", "spring boot", "sql", "rest api", "microservices", "database", "concurrency", "thread", "orm", "backend", "django", "node"]
            if not any(kw in q_lower for kw in backend_keywords):
                return False
                
    return True

def get_fallback_question_for_all_inputs(role: str, company: str, round_type: str, difficulty: str, used_questions: set) -> dict:
    """Select a valid question from the QUESTION_BANK matching inputs, fall back gracefully."""
    round_clean = round_type.replace(" Round", "").strip()
    company_key = company.strip()
    difficulty_key = difficulty.lower()
    
    # Validation check inside fallback helper
    def is_valid(q):
        return validate_question_context(q, company, role, round_type)
        
    choices = []
    
    # 1. Try company-specific round and difficulty
    if company_key in QUESTION_BANK:
        if round_clean in QUESTION_BANK[company_key]:
            if difficulty_key in QUESTION_BANK[company_key][round_clean]:
                choices = [q for q in QUESTION_BANK[company_key][round_clean][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]
                
    # 2. Try company-specific round Technical role
    if not choices and company_key in QUESTION_BANK and round_clean == "Technical":
        role_key = "Frontend Developer" if "frontend" in role.lower() else ("Backend Developer" if "backend" in role.lower() else "Full Stack Developer")
        if "Technical" in QUESTION_BANK[company_key]:
            if role_key in QUESTION_BANK[company_key]["Technical"]:
                if difficulty_key in QUESTION_BANK[company_key]["Technical"][role_key]:
                    choices = [q for q in QUESTION_BANK[company_key]["Technical"][role_key][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]
            if not choices and "default" in QUESTION_BANK[company_key]["Technical"]:
                if difficulty_key in QUESTION_BANK[company_key]["Technical"]["default"]:
                    choices = [q for q in QUESTION_BANK[company_key]["Technical"]["default"][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]

    # 3. Try general round and difficulty
    if not choices:
        if round_clean in QUESTION_BANK["general"]:
            if round_clean == "Technical":
                role_key = "Frontend Developer" if "frontend" in role.lower() else ("Backend Developer" if "backend" in role.lower() else "Full Stack Developer")
                if role_key in QUESTION_BANK["general"]["Technical"]:
                    if difficulty_key in QUESTION_BANK["general"]["Technical"][role_key]:
                        choices = [q for q in QUESTION_BANK["general"]["Technical"][role_key][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]
                if not choices and "default" in QUESTION_BANK["general"]["Technical"]:
                    if difficulty_key in QUESTION_BANK["general"]["Technical"]["default"]:
                        choices = [q for q in QUESTION_BANK["general"]["Technical"]["default"][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]
            else:
                if difficulty_key in QUESTION_BANK["general"][round_clean]:
                    choices = [q for q in QUESTION_BANK["general"][round_clean][difficulty_key] if q.get("text") not in used_questions and is_valid(q)]

    # 4. Try any difficulty
    if not choices:
        if round_clean in QUESTION_BANK["general"]:
            if round_clean == "Technical":
                role_key = "Frontend Developer" if "frontend" in role.lower() else ("Backend Developer" if "backend" in role.lower() else "Full Stack Developer")
                for diff in ["easy", "medium", "hard"]:
                    choices.extend([q for q in QUESTION_BANK["general"]["Technical"].get(role_key, {}).get(diff, []) if q.get("text") not in used_questions and is_valid(q)])
            else:
                for diff in ["easy", "medium", "hard"]:
                    choices.extend([q for q in QUESTION_BANK["general"][round_clean].get(diff, []) if q.get("text") not in used_questions and is_valid(q)])

    # 5. Last resort static fallbacks specific to each round
    if not choices:
        if round_clean == "Aptitude":
            q = {
                "text": "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
                "type": "mcq",
                "options": ["150 meters", "120 meters", "90 meters", "180 meters"],
                "correct_answer": "150 meters",
                "difficulty": difficulty_key
            }
        elif round_clean == "Coding":
            q = {
                "text": "Write a function to check if a given string is a palindrome.\n\nInput: 'racecar'\nOutput: true\n\nConstraints: O(n) time, O(1) space.",
                "type": "coding",
                "difficulty": difficulty_key
            }
        elif round_clean == "System Design":
            q = {
                "text": "Design a highly available and scalable notification service that can handle millions of push notifications per day.",
                "type": "descriptive",
                "difficulty": difficulty_key
            }
        elif round_clean == "HR":
            q = {
                "text": "What are your greatest professional strengths, and how do you plan to address your weaknesses?",
                "type": "descriptive",
                "difficulty": difficulty_key
            }
        elif round_clean == "Behavioral":
            q = {
                "text": "Describe a time when you faced a conflict with a team member. How did you resolve it? Use the STAR method.",
                "type": "descriptive",
                "difficulty": difficulty_key
            }
        else: # Technical
            if "frontend" in role.lower():
                q = {
                    "text": "Explain the difference between Virtual DOM and Real DOM in React.",
                    "type": "descriptive",
                    "difficulty": difficulty_key
                }
            elif "backend" in role.lower():
                q = {
                    "text": "What is a REST API? Explain the difference between GET and POST requests.",
                    "type": "descriptive",
                    "difficulty": difficulty_key
                }
            else:
                q = {
                    "text": "What is object-oriented programming? Describe the core principles: inheritance, polymorphism, and encapsulation.",
                    "type": "descriptive",
                    "difficulty": difficulty_key
                }
    else:
        # Choose first available and copy it to prevent mutating bank
        q = dict(choices[0])
        
    # Personalize text if applicable
    if "our company" in q.get("text", "").lower():
        q["text"] = q["text"].replace("our company", company)
        
    used_questions.add(q.get("text"))
    return q

def evaluate_answer_dynamically(question_obj: dict, answer: str) -> dict:
    """Locally grade a user response (0-100) dynamically using precise NLP rules."""
    answer_clean = answer.strip()
    
    # Extract details
    q_type = question_obj.get("type", "descriptive")
    correct_ans = question_obj.get("correct_answer", "")
    
    # 1. MCQ Grading
    if q_type == "mcq":
        # clean answers for comparison
        a_clean = answer_clean.lower().replace(")", "").replace(".", "").strip()
        c_clean = correct_ans.lower().replace(")", "").replace(".", "").strip()
        
        # also match if answer starts with option prefix, e.g. "A" or "B"
        is_correct = False
        if a_clean == c_clean:
            is_correct = True
        elif len(a_clean) == 1 and c_clean.startswith(a_clean):
            is_correct = True
        elif len(c_clean) > 2 and a_clean in c_clean:
            is_correct = True
            
        if is_correct:
            return {
                "technical_score": 100,
                "communication_score": 95,
                "confidence_score": 98,
                "problem_solving_score": 100,
                "overall_score": 98,
                "suggestions": "Correct answer! Excellent job solving the aptitude challenge."
            }
        else:
            return {
                "technical_score": 20,
                "communication_score": 60,
                "confidence_score": 70,
                "problem_solving_score": 15,
                "overall_score": 41, # Keeping average in bounds
                "suggestions": f"Incorrect answer. The correct choice was: {correct_ans}."
            }

    # 2. Descriptive/Coding Grading
    if not answer_clean:
        return {
            "technical_score": 12,
            "communication_score": 10,
            "confidence_score": 10,
            "problem_solving_score": 10,
            "overall_score": 10,
            "suggestions": "The answer was completely empty. Please explain the concepts or provide code implementations."
        }
        
    words = answer_clean.split()
    unique_words = set(words)
    word_count = len(words)
    
    # Repetition / Gibberish checks
    repetition_ratio = len(unique_words) / word_count if word_count > 0 else 0
    is_gibberish = False
    
    if word_count > 4 and repetition_ratio < 0.35:
        is_gibberish = True
        
    avg_word_len = sum(len(w) for w in words) / word_count if word_count > 0 else 0
    if word_count > 0 and (avg_word_len > 15 or avg_word_len < 2.5) and not any(len(w) >= 3 for w in words):
        is_gibberish = True
        
    if is_gibberish:
        return {
            "technical_score": 15,
            "communication_score": 15,
            "confidence_score": 10,
            "problem_solving_score": 10,
            "overall_score": 12,
            "suggestions": "The response contains random letters, numbers, or heavy word repetition. Please write a structured answer."
        }
        
    # Scale ranges
    if len(answer_clean) < 20:
        base_score = 20 + int(len(answer_clean) * 0.9)  # 20-38 range
        feedback = "Very short answer. To expand, explain the core mechanism and mention some trade-offs or use-cases."
    elif len(answer_clean) < 80:
        base_score = 40 + int((len(answer_clean) - 20) * 0.45)  # 40-67 range
        feedback = "Partially correct response. You mentioned key concepts, but missing detailed implementation details or code structure."
    elif len(answer_clean) < 240:
        base_score = 70 + int((len(answer_clean) - 80) * 0.09)  # 70-84 range
        feedback = "Good answer! Well explained. Incorporate a code snippet, architectural block, or STAR elements to raise it to excellent."
    else:
        base_score = 85 + min(14, int((len(answer_clean) - 240) * 0.02))  # 85-99 range
        feedback = "Excellent answer! Very thorough details, good vocabulary, clear structure, and correct conceptual framework."
        
    # Seed dynamic variation
    seed_val = sum(ord(c) for c in answer_clean[:30])
    random.seed(seed_val)
    
    # Score variations
    tech_var = random.randint(-4, 4)
    comm_var = random.randint(-5, 5)
    conf_var = random.randint(-3, 6)
    prob_var = random.randint(-4, 4)
    
    tech_score = min(100, max(5, base_score + tech_var))
    comm_score = min(100, max(5, base_score + comm_var))
    conf_score = min(100, max(5, base_score + conf_var))
    prob_score = min(100, max(5, base_score + prob_var))
    
    # Cap limits for short/partial answers
    if len(answer_clean) < 20:
        tech_score = min(39, tech_score)
        comm_score = min(39, comm_score)
        conf_score = min(39, conf_score)
        prob_score = min(39, prob_score)
    elif len(answer_clean) < 80:
        tech_score = min(69, tech_score)
        comm_score = min(69, comm_score)
        conf_score = min(69, conf_score)
        prob_score = min(69, prob_score)
        
    overall = int((tech_score + comm_score + conf_score + prob_score) / 4)
    
    return {
        "technical_score": tech_score,
        "communication_score": comm_score,
        "confidence_score": conf_score,
        "problem_solving_score": prob_score,
        "overall_score": overall,
        "suggestions": feedback
    }

def generate_final_report_dynamically(questions: list, answers: list, feedbacks: list, company: str) -> dict:
    """Generate aggregate scoring metrics, company fit analysis, and recommended next companies."""
    if not feedbacks:
        return {
            "readiness_percentage": 0,
            "strengths": ["No answers submitted"],
            "weaknesses": ["Interview incomplete"],
            "improvement_areas": ["Attempt all questions"],
            "recommended_topics": ["General Placement Prep"],
            "company_fit_analysis": "Not enough data to calculate company fit.",
            "recommended_next_companies": ["TCS", "Infosys"]
        }
        
    avg_tech = sum(f.get("technical_score", 0) for f in feedbacks) / len(feedbacks)
    avg_comm = sum(f.get("communication_score", 0) for f in feedbacks) / len(feedbacks)
    avg_conf = sum(f.get("confidence_score", 0) for f in feedbacks) / len(feedbacks)
    avg_prob = sum(f.get("problem_solving_score", 0) for f in feedbacks) / len(feedbacks)
    avg_overall = int(sum(f.get("overall_score", 0) for f in feedbacks) / len(feedbacks))
    
    # Strengths
    strengths = []
    if avg_comm >= 75:
        strengths.append("Exceptional articulation, clarity, and verbal communication style")
    elif avg_comm >= 60:
        strengths.append("Clear delivery structure with coherent explanations")
    else:
        strengths.append("Maintained focus and composed pacing under strict timer limits")
        
    if avg_tech >= 75:
        strengths.append("Strong grasp of core technical definitions and architectural constructs")
    elif avg_prob >= 70:
        strengths.append("Logical and systematic analytical problem-solving approach")
    else:
        strengths.append("Consistent effort to cover the prompt requirements in answers")
        
    if avg_conf >= 75:
        strengths.append("Highly confident delivery and direct communication style")
    else:
        strengths.append("Polite and receptive response configuration")
        
    if len(strengths) < 2:
        strengths.append("Good conceptual base with structured points")
        
    # Weaknesses
    weaknesses = []
    if avg_tech < 70:
        weaknesses.append("Lack of depth in explaining internal compiler/framework mechanics")
    if avg_comm < 70:
        weaknesses.append("Descriptions are slightly brief; could expand with diagrams or samples")
    if avg_prob < 70:
        weaknesses.append("Struggled to identify edge cases or analyze Big O space constraints")
    if avg_conf < 70:
        weaknesses.append("Slightly hesitant phrasing or abbreviated explanations under timer constraints")
        
    if len(weaknesses) < 2:
        weaknesses.append("Could incorporate more industry-standard technical terminology")
        weaknesses.append("Should detail optimizations and alternative design approaches")
        
    # Recommended Topics
    recommended_topics = []
    if avg_tech < 75:
        recommended_topics.extend(["Data Structures & Algorithms", "Core Framework Internals"])
    if avg_prob < 75:
        recommended_topics.append("System Design Patterns")
    if avg_comm < 75:
        recommended_topics.append("STAR Method Communication")
        
    if not recommended_topics:
        recommended_topics = ["Memory Management Optimizations", "High Scalability Trade-offs", "Behavioral Leadership Principles"]
        
    recommended_topics = list(set(recommended_topics))[:3]
    
    # Company Fit Analysis
    # Custom message based on target company and scores
    company_lower = company.lower()
    fit_level = "High" if avg_overall >= 80 else ("Medium" if avg_overall >= 60 else "Low")
    
    if company_lower == "zoho":
        analysis = f"Zoho values practical scenario solving and logical thinking. Your overall score indicates a {fit_level} alignment. "
        if avg_prob >= 75:
            analysis += "Your strong problem-solving capacity makes you an excellent fit for Zoho's builder culture."
        else:
            analysis += "Focus on practical C/Java concepts and mathematical puzzle solving to improve Zoho alignment."
            
    elif company_lower == "google":
        analysis = f"Google interviews focus heavily on algorithms, data structures, and optimal complexity. Your alignment is evaluated as {fit_level}. "
        if avg_tech >= 80 and avg_prob >= 80:
            analysis += "Your excellent analytical scores match Google's high bar for engineers."
        else:
            analysis += "To target Google, practice hard LeetCode problems and optimize your code for both memory and runtimes."
            
    elif company_lower == "amazon":
        analysis = f"Amazon prioritizes their 16 Leadership Principles alongside DSA. Your alignment is {fit_level}. "
        if avg_comm >= 75:
            analysis += "Your high communication scores indicate strong STAR alignment for behavioral rounds."
        else:
            analysis += "Make sure to frame your experiences explicitly around Ownership, Customer Obsession, and Bias for Action."
            
    else:
        analysis = f"Your performance indicates a {fit_level} fit for {company}. "
        if avg_overall >= 75:
            analysis += f"You demonstrate the standard technical skills expected at {company}."
        else:
            analysis += f"Review {company}'s past recruitment patterns to target specific weak zones."
            
    # Recommended Next Companies
    if avg_overall >= 80:
        recommended_next = ["Google", "Microsoft", "Amazon"]
    elif avg_overall >= 60:
        recommended_next = ["Accenture", "Cognizant", "Zoho"]
    else:
        recommended_next = ["TCS", "Infosys", "Wipro"]
        
    # Remove current company if present
    if company in recommended_next:
        recommended_next.remove(company)
        
    return {
        "readiness_percentage": avg_overall,
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:3],
        "improvement_areas": strengths[1:3], # using index offsets for differences
        "recommended_topics": recommended_topics,
        "company_fit_analysis": analysis,
        "recommended_next_companies": recommended_next[:3]
    }

async def generate_gemini_questions(role: str, company: str, round_type: str, question_count: int, profile: Optional[dict] = None, ai_settings: Optional[dict] = None) -> list:
    """Generate high-quality interview questions utilizing Gemini and validation retry loops."""
    profile_info_str = ""
    if profile:
        name = profile.get("name") or "Not provided"
        college = profile.get("collegeName") or "Not provided"
        dept = profile.get("department") or "Not provided"
        year = profile.get("yearOfStudy") or "Not provided"
        target = profile.get("targetRole") or "Not provided"
        dream = profile.get("dreamCompany") or "Not provided"
        domain = profile.get("preferredDomain") or "Not provided"
        
        langs = ", ".join(profile.get("languages") or [])
        frameworks = ", ".join(profile.get("frameworks") or [])
        databases = ", ".join(profile.get("databases") or [])
        tools = ", ".join(profile.get("tools") or [])
        soft = ", ".join(profile.get("softSkills") or [])
        skills = f"Languages: {langs}, Frameworks: {frameworks}, DBs: {databases}, Tools: {tools}, Soft Skills: {soft}"
        
        certs = ", ".join(profile.get("certifications") or [])
        
        profile_info_str = (
            f"Candidate Profile Context:\n"
            f"- Name: {name}\n"
            f"- Education: {college}, {dept}, {year}\n"
            f"- Career Goal: Target Role: {target}, Dream Company: {dream}, Domain: {domain}\n"
            f"- Skills: {skills}\n"
            f"- Certifications: {certs}\n"
            "Use this profile context to personalize the interview questions where appropriate, making them relevant to the candidate's skills and background."
        )
    round_clean = round_type.replace(" Round", "").strip()
    
    # Pre-generate difficulty and number configurations for each index
    configs = []
    
    fixed_difficulty = None
    if ai_settings and ai_settings.get("preferred_recruiter_level"):
        lvl = ai_settings["preferred_recruiter_level"]
        if lvl == "Entry":
            fixed_difficulty = "easy"
        elif lvl == "Medium (Associate)":
            fixed_difficulty = "medium"
        elif lvl in ["Senior", "Lead"]:
            fixed_difficulty = "hard"
            
    for idx in range(question_count):
        if fixed_difficulty:
            diff = fixed_difficulty
        elif question_count == 5:
            diff = "easy" if idx < 2 else ("medium" if idx < 4 else "hard")
        else:
            pct = idx / question_count
            diff = "easy" if pct < 0.4 else ("medium" if pct < 0.8 else "hard")
        configs.append({"question_number": idx + 1, "difficulty": diff})
    
    # Company memory features customized by round
    company_style = ""
    company_lower = company.lower()
    if company_lower == "zoho":
        if round_clean == "Aptitude":
            company_style = "Focus on Zoho's style: practical mathematical puzzles, seating arrangements, profit/loss, and logical reasoning."
        else:
            company_style = "Focus on Zoho's style: practical coding scenarios, logical thinking, and real-world development challenges."
    elif company_lower == "tcs":
        if round_clean == "Aptitude":
            company_style = "Focus on TCS's campus placement pattern: verbal ability, quantitative aptitude, and logical puzzles."
        else:
            company_style = "Focus on TCS's typical technical and coding patterns."
    elif company_lower == "google":
        if round_clean == "Aptitude":
            company_style = "Focus on Google's style: analytical reasoning, pattern recognition, and logical brain teasers."
        else:
            company_style = "Focus on Google's high bar: advanced data structures, complex algorithms, and performance optimization."
    elif company_lower == "amazon":
        if round_clean == "Behavioral":
            company_style = "Integrate Amazon's 16 Leadership Principles (Ownership, Customer Obsession, Bias for Action, etc.)."
        else:
            company_style = "Focus on high scalability, complex data structures, and Amazon's Leadership Principles."
    elif company_lower == "microsoft":
        company_style = "Focus on Object-Oriented Design (OOP) principles and algorithmic problem solving."
    elif company_lower == "infosys":
        company_style = "Focus on SQL databases, OOP basics, and quantitative/logical aptitude."
    elif company_lower == "wipro":
        company_style = "Focus on aptitude, verbal comprehension, and basic technical communication."
        
    # Determine type and round specific instruction
    question_format_instruction = ""
    if round_clean == "Aptitude":
        question_format_instruction = (
            "Generate ONLY quantitative aptitude, logical reasoning, verbal ability, analytical reasoning, data interpretation, or pattern recognition questions. "
            "Do NOT under any circumstances generate coding problems, algorithm descriptions, DSA, or technical theory. "
            "Each question MUST be in multiple-choice format (MCQ) with exactly 4 options and a single correct answer. "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"Question text here\", \"type\": \"mcq\", \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], \"correct_answer\": \"Option A\", \"difficulty\": \"easy\"}"
        )
    elif round_clean == "Coding":
        question_format_instruction = (
            "Generate ONLY coding challenges (e.g., Arrays, Strings, Recursion, Sorting, Dynamic Programming). "
            "Format the text with 'Input:', 'Output:', and 'Constraints:' details. "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"Coding challenge details...\", \"type\": \"coding\", \"difficulty\": \"medium\"}"
        )
    elif round_clean == "System Design":
        question_format_instruction = (
            "Generate ONLY system architecture and design questions. "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"System design prompt...\", \"type\": \"descriptive\", \"difficulty\": \"medium\"}"
        )
    elif round_clean == "Behavioral":
        question_format_instruction = (
            "Generate ONLY STAR-method based behavioral questions. "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"Behavioral question...\", \"type\": \"descriptive\", \"difficulty\": \"medium\"}"
        )
    elif round_clean == "HR":
        question_format_instruction = (
            "Generate ONLY HR questions (e.g., tell me about yourself, strengths/weaknesses, conflicts, leadership). "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"HR question...\", \"type\": \"descriptive\", \"difficulty\": \"medium\"}"
        )
    else:  # Technical
        question_format_instruction = (
            f"Generate ONLY technical/theoretical questions specific to the {role} role. "
            f"For Frontend Developer: focus on HTML, CSS, JavaScript, React, DOM, Browser rendering, APIs, Performance optimization. "
            f"For Backend Developer: focus on Java, Spring Boot, REST API, SQL, Database design. "
            f"For Full Stack: focus on Frontend + Backend integration. "
            "Format each question exactly as a JSON object: "
            "{\"text\": \"Technical question...\", \"type\": \"descriptive\", \"difficulty\": \"medium\"}"
        )
        
    if ai_settings:
        if ai_settings.get("interview_language"):
            question_format_instruction += f"\nIMPORTANT: Generate all question text strictly in {ai_settings['interview_language']} language."
        if ai_settings.get("preferred_recruiter_level") == "Lead":
            question_format_instruction += "\nIMPORTANT: The candidate is applying for a 'Lead' level role. Focus heavily on system architecture, team leadership, high-level design tradeoffs, and complex scaling issues."

    global _generation_cache
    cache_key = f"{role}_{company}_{round_clean}_{question_count}_{fixed_difficulty}_{ai_settings.get('interview_language') if ai_settings else ''}"
    if cache_key in _generation_cache:
        logger.info(f"Using cached questions for {cache_key}")
        return _generation_cache[cache_key]

    difficulties = [cfg["difficulty"] for cfg in configs]
    
    prompt = (
        f"Generate exactly {question_count} interview questions for the following scenario:\n"
        f"- Company: {company}\n"
        f"- Role: {role}\n"
        f"- Interview Round: {round_clean}\n"
        f"- Required Difficulties in order: {difficulties}\n\n"
        f"{company_style}\n"
        f"{profile_info_str}\n"
        f"{question_format_instruction}\n"
        f"Return the output as a raw JSON array of objects. Do not include markdown formatting or json block wrappers."
    )
    
    generated = []
    if GEMINI_API_KEY:
        for retry in range(3):
            try:
                text = await ai_client.generate_content(
                    prompt=prompt,
                    user_id="system",
                    endpoint="/interview/generate_questions",
                    model_name="gemini-2.5-flash"
                )
                text = text.strip()
                if text.startswith("```"):
                    text = re.sub(r"^```[a-z]*\n?", "", text)
                    text = re.sub(r"\n?```$", "", text)
                    
                items = json.loads(text)
                if isinstance(items, list) and len(items) == question_count:
                    for i, item in enumerate(items):
                        if isinstance(item, dict):
                            item["difficulty"] = difficulties[i]
                            if round_clean == "Aptitude":
                                item["type"] = "mcq"
                            elif round_clean == "Coding":
                                item["type"] = "coding"
                            else:
                                item["type"] = "descriptive"
                            generated.append(item)
                    if len(generated) == question_count:
                        _generation_cache[cache_key] = generated
                        return generated
            except Exception as e:
                logger.warning(f"Batch generation failed (Retry {retry + 1}/3): {e}")
                generated = []
                
    # Fallback if Gemini could not generate a valid batch
    logger.error("Using fallback questions for batch generation.")
    used_questions = set()
    for diff in difficulties:
        q = get_fallback_question_for_all_inputs(role, company, round_clean, diff, used_questions)
        q["difficulty"] = diff
        generated.append(q)
        used_questions.add(q.get("text"))
        
    return generated[:question_count]

async def evaluate_gemini_answer(question_obj: dict, answer: str, interview: dict = None, source_code: str = None, language: str = None, transcript: str = None) -> dict:
    """Evaluate candidate answer using Gemini and return structured scores and suggestions."""
    q_text = question_obj.get("text", "")
    q_type = question_obj.get("type", "descriptive")
    
    company = interview.get("company", "the company") if interview else "the company"
    role = interview.get("role", "the role") if interview else "the role"
    round_type = interview.get("round_type", "the round") if interview else "the round"
    
    # MCQ always evaluated locally for 100% deterministic accuracy
    if q_type == "mcq":
        return evaluate_answer_dynamically(question_obj, answer)
        
    try:
        if source_code:
            prompt = (
                f"You are an expert technical interviewer at {company} evaluating a candidate's coding performance.\n\n"
                f"Role: {role}\n"
                f"Round: {round_type}\n"
                f"Question: {q_text}\n"
                f"Candidate's Selected Language: {language}\n"
                f"Candidate's Source Code:\n```{language}\n{source_code}\n```\n"
                f"Candidate's Verbal Explanation (Voice Transcript): {transcript if transcript else 'None'}\n"
                f"Candidate's Final Answer Text: {answer}\n\n"
                f"Evaluate their code for correctness, logic, syntax, time complexity, space complexity, and edge cases. Evaluate their communication skills based on the voice transcript.\n"
                f"Perform a strict analysis and output a raw JSON object containing these exact keys:\n"
                f"  - technical_score (0-100 integer)\n"
                f"  - communication_score (0-100 integer)\n"
                f"  - confidence_score (0-100 integer, based on directness and assertiveness)\n"
                f"  - problem_solving_score (0-100 integer)\n"
                f"  - overall_score (0-100 integer)\n"
                f"  - suggestions (detailed summary of improvements, concepts missed, time/space complexity, and strengths)\n"
                f"Do not include markdown wrappers or backticks."
            )
        else:
            prompt = (
                f"You are an expert interviewer at {company} evaluating a candidate's answer to the following question.\n\n"
                f"Role: {role}\n"
                f"Round: {round_type}\n"
                f"Question: {q_text}\n"
                f"Candidate's Answer: {answer}\n\n"
                f"Perform a strict analysis and output a raw JSON object containing these exact keys:\n"
                f"  - technical_score (0-100 integer)\n"
                f"  - communication_score (0-100 integer)\n"
                f"  - confidence_score (0-100 integer, based on directness and assertiveness)\n"
                f"  - problem_solving_score (0-100 integer)\n"
                f"  - overall_score (0-100 integer)\n"
                f"  - suggestions (detailed summary of improvements, concepts missed, and strengths)\n"
                f"Do not include markdown wrappers or backticks."
            )
            
        text = await ai_client.generate_content(
            prompt=prompt,
            user_id="system",
            endpoint="/interview/evaluate_answer",
            model_name="gemini-2.5-flash"
        )
        text = text.strip()
        
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
                
        return json.loads(text)
    except Exception as e:
        logger.error("Gemini evaluation failed, falling back: %s", e)
        return evaluate_answer_dynamically(question_obj, answer)

async def generate_final_report(questions: list, answers: list, company: str, role: str) -> dict:
    """Compile final synthesis verdict using Gemini evaluating all answers together."""
    try:
        context = f"Analyze the following mock interview session for {company} (Role: {role}) and generate a final evaluation report:\n"
        for i in range(len(questions)):
            q_text = questions[i].get("text", "") if isinstance(questions[i], dict) else questions[i]
            
            ans_data = answers[i]
            ans_text = ans_data
            if isinstance(ans_data, dict):
                ans_text = ans_data.get("user_answer", "")
                if ans_data.get("source_code"):
                    ans_text += f"\nCode ({ans_data.get('selected_language')}):\n{ans_data.get('source_code')}"
            
            context += f"Q: {q_text}\nA: {ans_text}\n\n"
                
        prompt = (
            f"{context}\n"
            f"Generate a raw JSON object with these exact keys:\n"
            f"  - readiness_percentage (0-100 integer, overall score)\n"
            f"  - strengths (array of 2-3 short strings)\n"
            f"  - weaknesses (array of 2-3 short strings)\n"
            f"  - improvement_areas (array of 2-3 short strings)\n"
            f"  - recommended_topics (array of 2-3 short strings)\n"
            f"  - company_fit_analysis (1-2 sentences on company fit)\n"
            f"  - communication_feedback (1-2 sentences)\n"
            f"  - coding_quality (string: N/A if not coding round, else feedback)\n"
            f"  - time_complexity_analysis (string: N/A if not coding round, else feedback)\n"
            f"  - space_complexity_analysis (string: N/A if not coding round, else feedback)\n"
            f"Do not include markdown wrappers."
        )
        
        text = await ai_client.generate_content(
            prompt=prompt,
            user_id="system",
            endpoint="/interview/generate_report",
            model_name="gemini-2.5-flash"
        )
        text = text.strip()
        
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
                
        return json.loads(text)
    except Exception as e:
        logger.error("Gemini final report synthesis failed, falling back: %s", e)
        return generate_final_report_dynamically(questions, answers, [], company)

@router.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "ok"}

@router.get("/interviews")
async def get_interviews(current_user: dict = Depends(get_current_user)):
    interviews_col = get_collection("interviews")
    cursor = interviews_col.find({"user_id": current_user["id"]}).sort("created_at", -1)
    interviews = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        interviews.append(doc)
    return interviews

@router.post("/start")
async def start_interview(request: InterviewStartRequest, current_user: dict = Depends(get_current_user)):
    try:
        interviews_col = get_collection("interviews")
        ai_settings_col = get_collection("ai_settings")
        settings = await ai_settings_col.find_one({"user_id": current_user["id"]})
        
        if settings:
            if settings.get("primary_target_role"):
                request.role = settings["primary_target_role"]
            if settings.get("primary_target_company"):
                request.company = settings["primary_target_company"]
                
        questions = await generate_gemini_questions(request.role, request.company, request.round_type, request.question_count, request.profile, settings)
        
        if not questions:
            raise Exception("Failed to generate questions. Gemini API returned an empty list.")
            
        first_diff = questions[0].get("difficulty", "easy") if isinstance(questions[0], dict) else "easy"
        
        users_col = get_collection("users")
        user_record = await users_col.find_one({"_id": ObjectId(current_user["id"])})
        user_name = user_record.get("name") if user_record else "Unknown"
        
        new_interview = {
            "user_id": current_user["id"],
            "user_name": user_name,
            "role": request.role,
            "company": request.company,
            "round_type": request.round_type,
            "question_count": request.question_count,
            "timer": request.timer,
            "status": "in_progress",
            "questions": questions,
            "answers": ["" for _ in range(request.question_count)],
            "profile": request.profile,
            "current_difficulty": first_diff,
            "created_at": datetime.utcnow()
        }
        result = await interviews_col.insert_one(new_interview)
        return {
            "interview_id": str(result.inserted_id),
            "questions": questions,
            "timer": request.timer
        }
    except Exception as e:
        logger.exception("Failed to start interview session")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate")
async def evaluate_answer(request: AnswerEvaluationRequest, current_user: dict = Depends(get_current_user)):
    logger.info("Received evaluation request: interview_id=%s, question_index=%s", request.interview_id, request.question_index)
    try:
        interviews_col = get_collection("interviews")
        feedback_col = get_collection("interview_feedback")
        
        interview = await interviews_col.find_one({"_id": ObjectId(request.interview_id), "user_id": current_user["id"]})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview session not found")
            
        answers = list(interview.get("answers", []))
        if not (0 <= request.question_index < len(answers)):
            raise HTTPException(status_code=400, detail="Invalid question index")
            
        # Update answer - support both string and object
        answer_data = request.user_answer
        if request.selected_language or request.source_code or request.voice_transcript:
            answer_data = {
                "user_answer": request.user_answer,
                "selected_language": request.selected_language,
                "source_code": request.source_code,
                "voice_transcript": request.voice_transcript
            }
            
        answers[request.question_index] = answer_data
        await interviews_col.update_one({"_id": ObjectId(request.interview_id)}, {"$set": {"answers": answers}})
        
        # Grading - Deferred to end of interview
        # Simply return success and progress
        response_data = {
            "interview_id": request.interview_id,
            "question_index": request.question_index,
            "message": "Answer saved successfully."
        }
        
        is_last = (request.question_index == len(answers) - 1)
        
        if is_last:
            final_report = await generate_final_report(
                interview["questions"], 
                answers, 
                interview.get("company", "Generic"),
                interview.get("role", "Candidate")
            )
            
            await interviews_col.update_one(
                {"_id": ObjectId(request.interview_id)},
                {"$set": {
                    "status": "completed",
                    "final_score": final_report.get("readiness_percentage", 70),
                    "final_report": final_report
                }}
            )
            
            progress_col = get_collection("progress")
            await progress_col.insert_one({
                "user_id": current_user["id"],
                "interview_id": request.interview_id,
                "score": final_report.get("readiness_percentage", 70),
                "company": interview.get("company", "Generic"),
                "created_at": datetime.utcnow()
            })
            
            response_data["final_report"] = final_report
            response_data["is_last"] = True
        else:
            response_data["is_last"] = False
            
        return response_data
    except Exception as e:
        logger.exception("Unexpected error in evaluate answer route")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    interviews_col = get_collection("interviews")
    # Company readiness aggregation
    pipeline = [
        {"$match": {"user_id": current_user["id"], "status": "completed"}},
        {"$group": {
            "_id": "$company",
            "avg_readiness": {"$avg": "$final_report.readiness_percentage"}
        }},
        {"$project": {"company": "$_id", "readiness": "$avg_readiness", "_id": 0}}
    ]
    readiness = await interviews_col.aggregate(pipeline).to_list(length=None)
    
    recent = await interviews_col.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(10).to_list(length=10)
    trend = []
    for doc in recent:
        trend.append({
            "date": doc.get("created_at").isoformat(),
            "company": doc.get("company"),
            "readiness": doc.get("final_report", {}).get("readiness_percentage"),
            "overall": doc.get("final_report", {}).get("overall_score")
        })
    return {"readiness_by_company": readiness, "recent_trends": trend}

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    temp_filename = f"temp_{current_user['id']}_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())
        
    if not openai_client:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        return {"text": ""}
        
    try:
        with open(temp_filename, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        os.remove(temp_filename)
        return {"text": transcript.text}
    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        logger.error("Whisper transcription failed: %s", e)
        return {"text": "Audio transcription failed. Fallback triggered."}
