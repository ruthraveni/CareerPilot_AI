from fastapi import APIRouter, Depends, HTTPException
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId

import os
import json
from dotenv import load_dotenv
import time
import asyncio
import re

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# In-memory caching and rate limiting
_response_cache = {}  # {(user_id, message_lower): (response, timestamp)}
_rate_limiter = {}    # {user_id: [timestamps]}
CACHE_TTL = 120
RATE_LIMIT_WINDOW = 60
MAX_REQUESTS_PER_MINUTE = 5

def check_rate_limit(user_id: str) -> bool:
    now = time.time()
    if user_id not in _rate_limiter:
        _rate_limiter[user_id] = []
    _rate_limiter[user_id] = [ts for ts in _rate_limiter[user_id] if now - ts < RATE_LIMIT_WINDOW]
    if len(_rate_limiter[user_id]) >= MAX_REQUESTS_PER_MINUTE:
        return False
    _rate_limiter[user_id].append(now)
    return True

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.get("/history")
async def get_mentor_history(current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    return user.get("mentor_chats", [])

async def generate_gemini_response(message: str, history: list) -> str:
    import google.generativeai as genai
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
    else:
        return "I am currently running in offline mode. Please configure GEMINI_API_KEY to enable my AI capabilities."
        
    # Build prompt with history
    context = """You are an expert AI Career Mentor, Software Engineer, Coding Mentor, Placement Trainer, and Interview Coach. Answer every user query directly, accurately, and in detail. Provide practical, actionable guidance and complete coding solutions when requested.
Do NOT reply with generic introductory or conversational filler like "I'm here to help you navigate your career", "Could you provide more context?", or "What specific area would you like to focus on today?" unless the user's question is genuinely unclear.

Follow these exact structural guidelines:
1. For Coding Questions: ALWAYS provide Explanation, Approach, Code solution, Time Complexity, Space Complexity, and Example input/output when applicable.
2. For Career Questions: ALWAYS provide Detailed roadmap, Timeline, Skills required, and Preparation strategy.
3. For Company Preparation (Zoho, TCS, Amazon, Infosys, Wipro, Cognizant, etc.): ALWAYS provide Interview rounds, Important topics, Frequently asked questions, and Preparation plan.
4. For Communication Skills & Resume Improvement: Provide practical, actionable plans.
5. For Technical Concepts (DSA, Java, Python, React, SQL, OS, DBMS, etc.): Provide full technical explanations directly.

Conversation History:
"""
    for msg in history[-10:]: # use last 10 messages for context
        role = "User" if msg["sender"] == "user" else "Mentor"
        context += f"{role}: {msg['text']}\n"
        
    context += f"User: {message}\nMentor:"
    
    import logging
    import traceback
    model_instance = genai.GenerativeModel('gemini-2.5-flash')
    
    max_retries = 2
    for attempt in range(max_retries):
        try:
            logging.info(f"Gemini API Request Attempt {attempt+1}...")
            response = await model_instance.generate_content_async(context, generation_config={"temperature": 0.2})
            logging.info(f"Gemini API Raw Response Object: {response}")
            
            try:
                text = response.text
                if text:
                    return text.strip()
            except ValueError as ve:
                logging.error(f"Gemini API Safety/Blocked Error: {ve}")
                return "I'm sorry, I cannot provide a response to that due to safety filters."
                
            logging.warning(f"Gemini API returned empty text property on attempt {attempt+1}")
        except Exception as e:
            error_msg = str(e)
            logging.error(f"Gemini API Exception caught (Attempt {attempt+1}): {error_msg}")
            logging.error(traceback.format_exc())
            
            if attempt < max_retries - 1:
                # Check for 429 delay
                match = re.search(r'Please retry in (\d+\.\d+)s', error_msg)
                if match:
                    delay = float(match.group(1))
                    logging.info(f"429 Quota Exceeded. Sleeping for {delay} seconds before retry...")
                    await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(1) # default delay
            else:
                raise Exception(f"Gemini API failed after retries: {error_msg}")
                
    raise Exception("API returned empty responses after retries.")

def fallback_intent_engine(message: str) -> str:
    msg_lower = message.lower()
    
    # Check for specific company queries
    if "zoho" in msg_lower:
        return """### How to Crack Zoho: A Comprehensive Guide

Zoho is known for its rigorous technical interviews focused heavily on programming fundamentals rather than fancy frameworks. Here is a step-by-step 30-day preparation plan:

**1. Understand the Interview Rounds:**
*   **Round 1: C Programming & Aptitude:** Output prediction, memory management (pointers), and logical reasoning.
*   **Round 2: Advanced Programming:** You will be given complex problems (like designing a simple game or text editor logic) and asked to code them from scratch in C/C++/Java. No IDEs, standard library usage is often restricted.
*   **Round 3: Advanced System Design (Role Dependent):** Usually for experienced roles, focusing on architecture and scaling.
*   **Round 4 & 5: HR and General Technical:** Culture fit, project discussions, and behavioral checks.

**2. Important DSA Topics:**
*   Arrays and Strings (Crucial)
*   Recursion and Backtracking
*   Matrix manipulation
*   Data Structures from scratch (Implementing stacks/queues using arrays)

**3. Aptitude Topics:**
*   Time & Work, Speed & Distance
*   Puzzles and Logical Deductions
*   Number theory

**4. 30-Day Preparation Plan:**
*   **Days 1-10:** Deep dive into C/C++ fundamentals. Master pointers, arrays, and string manipulations without using standard libraries (e.g., implement `strlen`, `strcpy` yourself).
*   **Days 11-20:** Solve previous Zoho round 2 questions. Practice writing clean, modular code on paper or a whiteboard.
*   **Days 21-25:** Aptitude and C output prediction questions.
*   **Days 26-30:** Mock interviews, reviewing your own projects, and preparing for HR behavioral questions.
"""
    
    elif "communication" in msg_lower:
        return """### Improving Your Communication Skills

Strong communication is just as critical as technical skills for advancing your career. Here is a practical roadmap to improve:

**1. Daily Speaking Exercises:**
*   **The Mirror Technique:** Spend 5 minutes daily explaining a technical concept to yourself in the mirror.
*   **Record Yourself:** Record a 2-minute video answering "Tell me about yourself." Watch it back to identify filler words (um, like) and body language issues.

**2. Reading & Writing Habits:**
*   Read industry blogs, newsletters, or tech articles daily to expand your professional vocabulary.
*   Practice writing clear, concise emails or documentation for your personal projects.

**3. Mock Interview Practice:**
*   Use peer-to-peer mock interview platforms like Pramp or interviewing.io.
*   Practice the **STAR Method** (Situation, Task, Action, Result) for behavioral questions to keep your answers structured and impactful.

**4. Confidence-Building Tips:**
*   Join local tech meetups or Toastmasters to practice public speaking in a low-stakes environment.
*   Slow down your speech. Speaking slightly slower projects confidence and gives you time to think.
"""

    elif "coding questions" in msg_lower or "understand" in msg_lower and "coding" in msg_lower:
        return """### How to Understand and Approach Coding Questions

Struggling to understand coding problems is completely normal. Use this structured framework to break them down:

**1. Problem Understanding Techniques:**
*   **Read it Twice:** Read the problem statement without looking at the code. The second time, highlight keywords (e.g., "sorted array" usually means binary search).
*   **Explain it to a 5-Year-Old:** Try to restate the problem in plain English. If you can't, you don't understand it yet.

**2. Input/Output Analysis:**
*   Always start by writing down the given inputs and the expected outputs.
*   Create your own edge cases: What if the array is empty? What if there are negative numbers? What if the input is massive?

**3. Breaking Problems into Smaller Parts:**
*   Don't try to solve the whole problem at once. Break it into actionable steps.
*   Write comments in your editor outlining the steps *before* you write any actual code.

**4. Pattern Recognition Methods:**
*   Instead of memorizing solutions, learn standard patterns: Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, Cyclic Sort, etc.
*   When you read a new problem, ask yourself: "Which of the patterns does this look like?"

**5. Practice Strategy:**
*   Focus on quality over quantity. Solving 50 questions and deeply understanding multiple approaches is better than rushing through 300 questions.
"""
    
    elif "roadmap" in msg_lower or "path" in msg_lower:
        return """### Career Roadmap Generation
To build an effective roadmap, you must master the fundamentals before moving to advanced concepts.

1.  **Phase 1: Core Fundamentals (Months 1-2):** Master a primary language (Python, Java, or C++) and Data Structures & Algorithms.
2.  **Phase 2: Domain Skills (Months 3-4):** Choose your specialization (Frontend, Backend, Data Science) and learn the standard frameworks.
3.  **Phase 3: Portfolio Building (Month 5):** Build 2-3 significant projects that solve real-world problems. Deploy them to the cloud.
4.  **Phase 4: Interview Prep (Month 6):** Focus entirely on LeetCode patterns, System Design, and Mock Interviews.

*If you tell me your specific target role (e.g., Backend Developer), I can give you a much more detailed step-by-step roadmap!*"""

    elif "study" in msg_lower or "plan" in msg_lower or "schedule" in msg_lower:
        return """### Effective Study Plan Strategy
Consistency is more important than intensity. Here is a standard 4-hour daily study block plan for tech preparation:

*   **Hour 1: Theory & Concepts.** Read documentation, watch tutorials, or study system design concepts.
*   **Hours 2-3: Hands-on Practice.** Write code. This could be LeetCode, building a feature for your project, or debugging.
*   **Hour 4: Review & Documentation.** Push your code to GitHub, write a brief blog post, or review the optimal solutions for the problems you solved.

*Adjust these ratios based on how close you are to your interview dates.*"""

    elif "resume" in msg_lower or "cv" in msg_lower:
        return """### Top Resume Improvement Strategies
To pass ATS (Applicant Tracking Systems) and impress recruiters, your resume must be flawless:

1.  **Format Cleanly:** Avoid complex multi-column layouts, graphics, or photos. Use standard sections (Experience, Education, Projects, Skills).
2.  **Quantify Everything:** Don't say "Improved database." Say "Reduced query latency by 40% by implementing Redis caching."
3.  **Action Verbs:** Start every bullet point with strong verbs: *Architected, Spearheaded, Developed, Optimized.*
4.  **Tailor Your Keywords:** Match the skills on your resume directly to the job description you are applying for.
5.  **Keep it to One Page:** Unless you have 10+ years of experience, keep it concise."""

    elif "interview" in msg_lower or "placement" in msg_lower or "tcs" in msg_lower or "infosys" in msg_lower:
        return """### General Placement & Interview Preparation
Preparing for placements requires a balanced approach between technical depth and aptitude speed.

**1. Quantitative & Logical Aptitude:**
Service-based companies (TCS, Infosys, Wipro) heavily emphasize this round. Practice Speed Math, Profit & Loss, Syllogisms, and Data Interpretation.

**2. Core CS Subjects:**
You must be prepared to answer standard questions on:
*   Object-Oriented Programming (Polymorphism, Inheritance, Encapsulation)
*   Database Management Systems (Normalization, ACID properties, Joins)
*   Operating Systems (Deadlocks, Paging, Scheduling algorithms)
*   Computer Networks (OSI Model, TCP/IP, HTTP vs HTTPS)

**3. Coding Round:**
Practice standard array, string, and math puzzles. Focus on writing code that compiles on the first run, as platform constraints can be strict.

**4. Behavioral (HR) Round:**
Prepare your "Tell me about yourself" pitch. Have 3 distinct stories ready that demonstrate leadership, overcoming failure, and teamwork."""
        
    else:
        return """### I'm here to help you navigate your career!

I am your dedicated AI Career Mentor. I can provide highly detailed guidance on:
*   **Company Preparation** (e.g., *How to crack Zoho, Amazon, or TCS*)
*   **Communication Skills** (e.g., *How to improve my speaking and confidence*)
*   **Coding & Interviews** (e.g., *How to approach coding problems, System Design tips*)
*   **Career Roadmaps** (e.g., *Create a 6-month Backend developer plan*)
*   **Resume Strategies** (e.g., *How to pass ATS filters*)

**What specific area would you like to focus on today?**"""

@router.post("/chat")
async def chat_with_mentor(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    history = user.get("mentor_chats", [])
    
    user_msg_obj = {
        "sender": "user",
        "text": request.message,
        "timestamp": datetime.utcnow()
    }
    
    user_id = str(current_user["id"])
    msg_lower = request.message.lower().strip()
    
    # 0. Check Rate Limit & Cache
    if not check_rate_limit(user_id):
        import logging
        logging.warning(f"Rate limit exceeded for user {user_id}")
        return {
            "sender": "ai",
            "text": "You are sending messages too quickly. Please wait a minute before trying again.",
            "timestamp": datetime.utcnow()
        }
        
    cache_key = (user_id, msg_lower)
    now = time.time()
    if cache_key in _response_cache:
        cached_reply, timestamp = _response_cache[cache_key]
        if now - timestamp < CACHE_TTL:
            import logging
            logging.info(f"Cache hit for user {user_id} on message: {msg_lower}")
            return {
                "sender": "ai",
                "text": cached_reply,
                "timestamp": datetime.utcnow()
            }
            
    # 1. Save user message to database
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$push": {"mentor_chats": user_msg_obj}}
    )
    
    # 2. Generate Response
    try:
        if GEMINI_API_KEY:
            reply = await generate_gemini_response(request.message, history)
        else:
            reply = fallback_intent_engine(request.message)
    except Exception as e:
        import logging
        logging.error(f"Mentor Chat Error: {e}")
        reply = f"I'm currently experiencing technical difficulties processing your request. Please try again later. (Error details: {str(e)})"
    
    ai_msg_obj = {
        "sender": "ai",
        "text": reply,
        "timestamp": datetime.utcnow()
    }
    
    # 3. Save AI response to database
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$push": {"mentor_chats": ai_msg_obj}}
    )
    
    # 4. Update Cache if successful
    if not reply.startswith("I'm currently experiencing technical difficulties") and not reply.startswith("I am currently running in offline mode"):
        _response_cache[cache_key] = (reply, time.time())
        
    return ai_msg_obj

@router.get("/test-gemini")
async def test_gemini_endpoint():
    try:
        import google.generativeai as genai
        import traceback
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content("Create a detailed 14-day study plan for TCS NQT")
        return {
            "status": "success",
            "text": getattr(response, 'text', 'No text generated'),
            "raw_response": str(response)
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }
