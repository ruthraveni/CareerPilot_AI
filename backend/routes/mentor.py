from fastapi import APIRouter, Depends, HTTPException
from utils.auth_deps import get_current_user
from config.database import get_collection
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from utils.ai_client import ai_client, health_state

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

async def generate_gemini_response(message: str, history: list, user_id: str) -> str:
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
    
    return await ai_client.generate_content(
        prompt=context,
        user_id=user_id,
        endpoint="/mentor/chat"
    )

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
            
    # 1. Generate Response first before saving history
    reply = await generate_gemini_response(request.message, history, user_id)
    
    user_msg_obj = {
        "sender": "user",
        "text": request.message,
        "timestamp": datetime.utcnow()
    }
    
    ai_msg_obj = {
        "sender": "ai",
        "text": reply,
        "timestamp": datetime.utcnow()
    }
    
    # 2. Save both user message and AI response to database atomically on success
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$push": {"mentor_chats": {"$each": [user_msg_obj, ai_msg_obj]}}}
    )
    
    # 3. Update Cache
    _response_cache[cache_key] = (reply, time.time())
        
    return ai_msg_obj

@router.get("/health/ai")
async def get_ai_health():
    return {
        "total_requests": health_state.total_requests,
        "successful_requests": health_state.successful_requests,
        "failed_requests": health_state.failed_requests,
        "consecutive_failures": health_state.consecutive_failures,
        "circuit_open": health_state.circuit_open,
        "success_rate": f"{(health_state.successful_requests / max(1, health_state.total_requests) * 100):.2f}%"
    }

class CompanyChatRequest(BaseModel):
    message: str
    company_id: str
    company_context: str
    history_context: str = ""

# For deduplication
_pending_company_queries = {}

@router.post("/company-chat")
async def company_chat_endpoint(request: CompanyChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    # Rate Limiting
    if not check_rate_limit(user_id):
        import logging
        logging.warning(f"Rate limit exceeded for user {user_id} on company-chat")
        return {"text": "You are sending messages too quickly. Please wait a minute before trying again.", "isFallback": True}
        
    msg_lower = request.message.lower().strip()
    cache_key = (request.company_id, msg_lower)
    
    import logging
    
    # 1. Deduplication (Wait if same request is already processing)
    loop = asyncio.get_running_loop()
    if cache_key in _pending_company_queries:
        logging.info(f"Deduplication: Waiting for existing query for {cache_key}")
        try:
            return await _pending_company_queries[cache_key]
        except Exception as e:
            logging.error(f"Deduplication existing query failed: {e}")
            pass

    fut = loop.create_future()
    _pending_company_queries[cache_key] = fut
    
    try:
        # 2. Global MongoDB Cache
        cache_col = get_collection("global_qa_cache")
        cached_doc = await cache_col.find_one({"company_id": request.company_id, "message_lower": msg_lower})
        
        if cached_doc:
            logging.info(f"MongoDB Global Cache hit for {cache_key}")
            response_data = {"text": cached_doc["response"], "isFallback": False}
            fut.set_result(response_data)
            return response_data
            
        # 3. Call AI Client
        prompt = f"""You are a placement preparation mentor helping a student prepare for an interview.
Here is some information about the company:
{request.company_context}

Conversation history so far:
{request.history_context}

Student's question: "{request.message}"

Provide a concise, helpful, and professional response in 2-3 sentences. Focus on placement tips, technical preparation, or roadmap guidance. Do not use markdown titles."""
        
        logging.info(f"Calling AI Client for company {request.company_id}...")
        try:
            bot_response = await ai_client.generate_content(
                prompt=prompt,
                user_id=user_id,
                endpoint="/mentor/company/chat"
            )
            
            # Save to global cache
            await cache_col.insert_one({
                "company_id": request.company_id,
                "message_lower": msg_lower,
                "original_message": request.message,
                "response": bot_response,
                "timestamp": datetime.utcnow()
            })
            
            response_data = {"text": bot_response, "isFallback": False}
            fut.set_result(response_data)
            return response_data
            
        except Exception as api_err:
            error_msg = str(api_err).lower()
            if "429" in error_msg or "quota" in error_msg:
                logging.error("Gemini Quota Exceeded (429) during company-chat.")
            else:
                logging.error(f"Gemini API Error during company-chat: {api_err}")
            raise api_err
            
    except Exception as final_e:
        # 4. Fallback system
        logging.warning("Using algorithmic fallback response for company-chat.")
        company_name = request.company_id.replace('-', ' ').title()
        
        fallback = f"Focus on core concepts, problem-solving, and resume preparation for {company_name}."
        if "round" in msg_lower or "process" in msg_lower:
            fallback = f"Make sure to thoroughly review the standard hiring rounds for {company_name}. Practice coding, aptitude, and behavioral questions!"
        elif "skill" in msg_lower or "prepare" in msg_lower:
            fallback = f"For {company_name}, mastering Data Structures, Algorithms, and Core CS Fundamentals is vital. Keep practicing!"
        elif "salary" in msg_lower or "package" in msg_lower:
            fallback = f"The package at {company_name} typically aligns with industry standards, but focus on the learning curve right now!"
            
        response_data = {"text": fallback, "isFallback": True}
        if not fut.done():
            fut.set_result(response_data)
        return response_data
        
    finally:
        _pending_company_queries.pop(cache_key, None)
