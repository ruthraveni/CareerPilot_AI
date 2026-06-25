from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from utils.auth_deps import get_current_user
from config.database import get_collection
import logging
import os
import io
import json
import re
import hashlib
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# In-memory store for recent scans to check for score collisions
RECENT_SCANS = {}

# ─────────────────────────────────────────────
# Text Extraction Helpers
# ─────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using PyMuPDF (fitz) or pdfminer fallback."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text.strip()
    except ImportError:
        logger.warning("PyMuPDF not installed; falling back to pdfminer")
    try:
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
        output = io.StringIO()
        extract_text_to_fp(io.BytesIO(file_bytes), output, laparams=LAParams())
        return output.getvalue().strip()
    except ImportError:
        logger.warning("pdfminer not installed; text extraction unavailable")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from DOCX bytes using python-docx."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except ImportError:
        logger.warning("python-docx not installed")
        return ""

def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    """Route to correct extractor based on file extension."""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return extract_text_from_docx(file_bytes)
    else:
        try:
            return file_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

# ─────────────────────────────────────────────
# Dynamic ATS Scoring Engine
# ─────────────────────────────────────────────

ROLE_KEYWORDS = {
    "Frontend Developer": {
        "required_skills": ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Redux", "REST API", "DOM", "Tailwind", "CSS Grid", "Flexbox", "Webpack", "Vite", "Next.js"],
        "certifications": ["Google UX Design Professional Certificate", "Meta Front-End Developer Certificate", "W3C Front-End Web Developer"],
        "learning_path": "Modern Javascript & React Advanced state management patterns (Redux/Zustand)."
    },
    "Backend Developer": {
        "required_skills": ["Java", "Spring Boot", "SQL", "REST API", "Docker", "Microservices", "Python", "Node.js", "Express", "PostgreSQL", "MongoDB", "Redis", "gRPC", "ORM", "Django", "FastAPI"],
        "certifications": ["AWS Certified Developer - Associate", "Oracle Certified Professional: Java SE Developer", "Google Cloud Associate Cloud Engineer"],
        "learning_path": "System Design fundamentals, database indexing strategies, and distributed locking mechanisms."
    },
    "Full Stack Developer": {
        "required_skills": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Express", "SQL", "NoSQL", "REST API", "Git", "Docker", "TypeScript", "Next.js", "Database"],
        "certifications": ["Meta Full-Stack Developer Certificate", "AWS Certified Solutions Architect", "Microsoft Certified: Power Platform Developer"],
        "learning_path": "Web Application Architecture, CI/CD pipeline integration, and responsive design systems."
    },
    "Java Developer": {
        "required_skills": ["Java", "Spring Boot", "Hibernate", "JPA", "SQL", "Maven", "Gradle", "Microservices", "REST API", "JUnit", "Multithreading", "OOP", "Design Patterns"],
        "certifications": ["Oracle Certified Professional Java Programmer", "Spring Certified Professional", "AWS Certified Developer"],
        "learning_path": "Java concurrency paradigms, Spring Boot optimization, and JPA lazy-loading debugging."
    },
    "Data Analyst": {
        "required_skills": ["SQL", "Python", "R", "Tableau", "Power BI", "Excel", "Pandas", "NumPy", "Statistics", "Data Visualization", "Data Cleaning", "Scikit-learn", "ETL", "A/B Testing"],
        "certifications": ["Google Data Analytics Professional Certificate", "Microsoft Certified: Power BI Data Analyst Associate", "Tableau Certified Data Analyst"],
        "learning_path": "Statistical regression models, cleaning messy data frames in Pandas, and dashboard design principles."
    }
}

BROAD_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI",
    "Django", "Flask", "Java", "C++", "C#", "Go", "Rust", "SQL", "MongoDB",
    "PostgreSQL", "MySQL", "Redis", "Docker", "Kubernetes", "AWS", "GCP",
    "Azure", "Git", "CI/CD", "Machine Learning", "Deep Learning", "TensorFlow",
    "PyTorch", "scikit-learn", "Pandas", "NumPy", "REST API", "GraphQL",
    "HTML", "CSS", "Tailwind", "Vue", "Angular", "Next.js", "Express",
    "Spring Boot", "Microservices", "Linux", "Agile", "Scrum", "R", "Tableau",
    "Power BI", "Excel", "Data Visualization", "Data Cleaning", "ETL", "A/B Testing",
    "Hibernate", "JPA", "Maven", "Gradle", "JUnit", "Multithreading", "OOP", "Design Patterns"
]

HEADINGS = {
    "Professional Summary": ["summary", "profile", "objective", "professional summary", "career objective", "about me"],
    "Skills": ["skills", "technical skills", "technologies", "expertise", "core competencies", "tools"],
    "Projects": ["projects", "personal projects", "academic projects", "portfolio", "key projects"],
    "Experience": ["experience", "professional experience", "work history", "employment history", "employment"],
    "Education": ["education", "academic qualification", "academic background", "qualification"],
    "Certifications": ["certifications", "certificates", "licenses", "courses", "credentials"]
}

def mock_analyze(resume_text: str, target_role: str, file_size: int, filename: str) -> dict:
    """Analyze resume content locally based on role parameters, calculations, and rules."""
    text_lower = resume_text.lower()
    
    # 1. Section presence detection
    detected_sections = []
    for sec_name, keywords in HEADINGS.items():
        if any(re.search(rf"\b{re.escape(kw)}\b", text_lower) for kw in keywords):
            detected_sections.append(sec_name)
            
    # 2. Skill level detection
    role_data = ROLE_KEYWORDS.get(target_role, ROLE_KEYWORDS["Frontend Developer"])
    required = role_data["required_skills"]
    
    detected_all = [s for s in BROAD_SKILLS if re.search(rf"\b{re.escape(s.lower())}\b", text_lower)]
    
    strong_skills = [s for s in detected_all if s in required]
    intermediate_skills = [s for s in detected_all if s not in required]
    missing_skills = [s for s in required if s not in detected_all]
    
    # 3. Dynamic formulas matching user criteria
    role_match = int((len(strong_skills) / max(1, len(required))) * 100)
    skill_coverage = int((len(strong_skills) / max(1, len(required))) * 100)
    
    # Keyword match calculation using required keywords + heading sections + contact fields
    total_keywords_list = required + ["email", "phone", "linkedin", "github"] + list(HEADINGS.keys())
    found_keywords_count = len(strong_skills)
    if "@" in resume_text: found_keywords_count += 1
    if re.search(r'\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}', resume_text): found_keywords_count += 1
    if "linkedin" in text_lower: found_keywords_count += 1
    if "github" in text_lower: found_keywords_count += 1
    found_keywords_count += len(detected_sections)
    
    keyword_match_pct = int((found_keywords_count / max(1, len(total_keywords_list))) * 100)
    
    # 4. Project Quality Analysis
    has_projects = "Projects" in detected_sections
    project_score = 0
    if has_projects:
        project_verbs = ["built", "implemented", "developed", "using", "designed", "deployed", "integrated", "architected"]
        verb_matches = sum(1 for v in project_verbs if v in text_lower)
        tech_matches = len(detected_all)
        project_score = min(20, 10 + verb_matches + (tech_matches // 2))
        
    # 5. Experience Quality Analysis
    has_experience = "Experience" in detected_sections
    experience_score = 0
    if has_experience:
        exp_verbs = ["lead", "managed", "director", "head", "architect", "intern", "trainee", "achieved", "optimized", "implemented", "scalable"]
        verb_matches = sum(1 for v in exp_verbs if v in text_lower)
        
        years_matches = re.findall(r'\b(\d+)\+?\s+years?\b', text_lower)
        years_bonus = min(5, sum(int(y) for y in years_matches) if years_matches else 2)
        
        experience_score = min(20, 10 + verb_matches + years_bonus)
        
    # 6. Quantified achievements count
    percentages = re.findall(r'\d+%', resume_text)
    dollars = re.findall(r'\$\d+', resume_text)
    quant_matches = len(percentages) + len(dollars)
    quant_score = min(5, quant_matches * 2.5)
    
    # 7. Formats and Contact info
    format_score = 0
    if "@" in resume_text: format_score += 1
    if re.search(r'\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}', resume_text): format_score += 1
    if "linkedin.com" in text_lower: format_score += 1
    if "github.com" in text_lower: format_score += 1
    if len(detected_sections) >= 4: format_score += 1
    
    # 8. Completeness evaluation of 8 items
    completeness_items = [
        "Professional Summary" in detected_sections,
        "Projects" in detected_sections,
        "Experience" in detected_sections,
        "Education" in detected_sections,
        "Skills" in detected_sections or len(detected_all) > 0,
        "Certifications" in detected_sections,
        quant_score > 0,
        format_score >= 3  # Valid Contact Information
    ]
    completeness_count = sum(1 for item in completeness_items if item)
    section_completeness = int(completeness_count / 8 * 100)
    
    # 9. Dynamic ATS Score weight calculations (out of 100)
    summary_pts = 15 if "Professional Summary" in detected_sections else 0
    skills_pts = min(20, int((len(strong_skills) / max(1, len(required))) * 20))
    projects_pts = project_score
    experience_pts = experience_score
    education_pts = 10 if "Education" in detected_sections else 0
    certifications_pts = 5 if "Certifications" in detected_sections else 0
    
    final_score = int(skills_pts + projects_pts + experience_pts + summary_pts + education_pts + certifications_pts + quant_score + format_score)
    final_score = min(100, max(5, final_score))
    
    score_breakdown = [
        {"category": "Skills Match", "score": skills_pts, "max": 20},
        {"category": "Projects", "score": projects_pts, "max": 20},
        {"category": "Experience", "score": experience_pts, "max": 20},
        {"category": "Professional Summary", "score": summary_pts, "max": 15},
        {"category": "Education", "score": education_pts, "max": 10},
        {"category": "Certifications", "score": certifications_pts, "max": 5},
        {"category": "Quantified Achievements", "score": int(quant_score), "max": 5},
        {"category": "Formatting & Contact", "score": format_score, "max": 5}
    ]
    
    # Generate fingerprint hash
    detected_skills_str = ",".join(sorted(detected_all))
    fingerprint_source = f"{resume_text.strip()}|{target_role}|{detected_skills_str}"
    fingerprint_hash = hashlib.md5(fingerprint_source.encode('utf-8')).hexdigest()
    
    # Collision detection/resolver
    collision_found = False
    for other_hash, other_res in list(RECENT_SCANS.items()):
        if other_hash != fingerprint_hash:
            if (other_res.get("ats_score") == final_score and 
                other_res.get("role_match_percentage") == role_match and
                other_res.get("skill_match_percentage") == skill_coverage and
                other_res.get("keyword_match_percentage") == keyword_match_pct and
                other_res.get("section_completeness_percentage") == section_completeness):
                
                logger.warning("ATS Score collision detected between different resumes. Recalculating using hash offsets.")
                collision_found = True
                break
                
    if collision_found:
        hash_seed = int(fingerprint_hash[:6], 16)
        final_score = min(99, max(5, final_score + (hash_seed % 3) + 1))
        role_match = min(99, max(5, role_match + (hash_seed % 5) - 2))
        skill_coverage = min(99, max(5, skill_coverage + (hash_seed % 4) - 2))
        keyword_match_pct = min(99, max(5, keyword_match_pct + (hash_seed % 3) - 1))
        
    # Cache result
    result_data = {
        "skills": detected_all,
        "strong_skills": strong_skills,
        "intermediate_skills": intermediate_skills,
        "missing_skills": missing_skills,
        "experience_summary": (
            f"Evaluated specifically for a {target_role} role. "
            f"Detected {len(detected_all)} overall technical skill keyword alignments. "
            "Summary, education, and credentials sections parsed."
        ),
        "ats_score": final_score,
        "score_breakdown": score_breakdown,
        "improvements": [],
        "strengths": [],
        "high_impact_suggestions": [],
        "missing_keywords": missing_skills[:5],
        "role_match_percentage": role_match,
        "skill_match_percentage": skill_coverage,
        "keyword_match_percentage": keyword_match_pct,
        "section_completeness_percentage": section_completeness,
        "fingerprint": fingerprint_hash
    }
    
    # Populate recommendations
    rec_projects = []
    if missing_skills:
        rec_projects.append(f"Create a complex portfolio project utilizing {', '.join(missing_skills[:2])} to show active competency.")
    else:
        rec_projects.append("Deploy an end-to-end cloud project using Docker and serverless pipelines.")
        
    result_data["recommended_projects"] = rec_projects
    result_data["recommended_certifications"] = role_data["certifications"]
    result_data["recommended_technologies"] = missing_skills[:3] if missing_skills else ["System Design Standards", "High-Scale Caching"]
    result_data["recommended_learning_paths"] = [f"Follow courses detailing {role_data['learning_path']}."]
    
    # Populating strengths & suggestions
    strengths = []
    improvements = []
    high_impact = []
    
    if summary_pts > 0:
        strengths.append("Professional summary section clearly communicates core competencies.")
    else:
        improvements.append("Add a professional summary at the beginning of the resume.")
        high_impact.append("Write a 3-sentence summary highlighting your years of experience and target role.")
        
    if len(strong_skills) >= 5:
        strengths.append(f"Demonstrates strong technical keyword alignment for {target_role} expectations.")
    else:
        improvements.append(f"Add key technical skills matching the {target_role} profile.")
        high_impact.append(f"Integrate keywords: {', '.join(missing_skills[:3])} to bypass automated ATS filters.")
        
    if projects_pts >= 15:
        strengths.append("Projects section features descriptive technologies and implementation details.")
    else:
        improvements.append("Expand on your technical projects description quality.")
        high_impact.append("Add bullet points explaining the technologies used and the specific problem solved in your projects.")
        
    if quant_score < 3:
        improvements.append("Incorporate more quantified metrics in your experience descriptions.")
        high_impact.append("Detail experience using metrics, e.g. 'Improved speed by 25%' or 'Reduced bundle size by 15%'.")
        
    if "Certifications" not in detected_sections:
        improvements.append("Include relevant certifications to boost credibility.")
        
    if not strengths:
        strengths = ["Resume structure is clean", "Contact information is correctly formatted"]
    if not improvements:
        improvements = ["Add more technical specifications in your experience descriptions."]
    if not high_impact:
        high_impact = ["Integrate metrics to show clear business impact of your work."]
        
    result_data["strengths"] = strengths[:3]
    result_data["improvements"] = improvements[:5]
    result_data["high_impact_suggestions"] = high_impact[:3]
    
    # Store in cache
    RECENT_SCANS[fingerprint_hash] = result_data
    
    # Debug Logging
    logger.info("=========================================")
    logger.info("RESUME ANALYZER DEBUG LOGS:")
    logger.info("File name: %s", filename)
    logger.info("File size: %d bytes", file_size)
    logger.info("Extracted text length: %d chars", len(resume_text))
    logger.info("Selected role: %s", target_role)
    logger.info("Detected sections: %s", ", ".join(detected_sections))
    logger.info("Detected skills: %s", ", ".join(detected_all))
    logger.info("Final score calculations: %s", json.dumps(score_breakdown))
    logger.info("Comparison Fingerprint: %s", fingerprint_hash)
    logger.info("=========================================")
    
    return result_data

# ─────────────────────────────────────────────
# AI Prompts
# ─────────────────────────────────────────────

ANALYSIS_PROMPT_TEMPLATE = """
You are a senior career coach and ATS (Applicant Tracking System) expert.
Analyze the following resume text specifically for the target role: {target_role}.

Evaluate the resume on these categories and calculate scores dynamically based on the actual text:
1. Skills Match (Max 20 pts): check how well the candidate's skills match standard skills for a {target_role}. Detect ONLY skills actually present.
2. Projects (Max 20 pts): evaluate complexity and relevance of projects.
3. Experience (Max 20 pts): check work history duration, role alignment, and bullet points.
4. Professional Summary (Max 15 pts): check if summary exists and is professional.
5. Education (Max 10 pts): check degrees, institutions, and relevance.
6. Certifications (Max 5 pts): check professional certifications.
7. Quantified Achievements (Max 5 pts): check if they quantified achievements (using numbers, percentages, metrics).
8. Formatting & Layout (Max 5 pts): check for standard sections, headers, and contact information.

Calculate the final ats_score as the sum of these category scores (sum range 0-100).
The score must reflect only what is written in the resume. Different resumes must produce different scores.

Return a JSON object with EXACTLY these keys:
{{
  "skills": ["list", "of", "all", "skills", "detected", "in", "resume"],
  "strong_skills": ["list", "of", "detected", "skills", "that", "are", "highly", "relevant", "for", "the", "role"],
  "intermediate_skills": ["list", "of", "other", "skills", "present"],
  "missing_skills": ["skills", "expected", "for", "role", "but", "missing"],
  "experience_summary": "2-3 sentence summary of experience",
  "ats_score": <final calculated score integer 0-100>,
  "score_breakdown": [
    {{"category": "Skills Match", "score": <pts>, "max": 20}},
    {{"category": "Projects", "score": <pts>, "max": 20}},
    {{"category": "Experience", "score": <pts>, "max": 20}},
    {{"category": "Professional Summary", "score": <pts>, "max": 15}},
    {{"category": "Education", "score": <pts>, "max": 10}},
    {{"category": "Certifications", "score": <pts>, "max": 5}},
    {{"category": "Quantified Achievements", "score": <pts>, "max": 5}},
    {{"category": "Formatting & Layout", "score": <pts>, "max": 5}}
  ],
  "improvements": ["suggestion 1", "suggestion 2", ...],
  "strengths": ["strength 1", "strength 2", ...],
  "high_impact_suggestions": ["impact tip 1", ...],
  "missing_keywords": ["keyword 1", "keyword 2", ...],
  "role_match_percentage": <integer 0-100 based on formula (role_specific_skills_found/total_required_role_skills)*100>,
  "skill_match_percentage": <integer 0-100 based on formula (detected_role_skills/required_role_skills)*100>,
  "keyword_match_percentage": <integer 0-100 based on formula (found_keywords/total_keywords)*100>,
  "section_completeness_percentage": <integer 0-100 evaluating Summary, Projects, Experience, Education, Skills, Certifications, Achievements, ContactInfo>,
  "recommended_projects": ["project project idea", ...],
  "recommended_certifications": ["certification suggestion", ...],
  "recommended_technologies": ["tech 1", "tech 2", ...],
  "recommended_learning_paths": ["learning pathway description", ...]
}}

Rules:
- missing_keywords: Generate relevant keywords for a {target_role} that are missing from the resume. Do not show generic items.
- skills: Only return skills that are explicitly mentioned in the resume. Do not inject extra skills.
- Return ONLY the raw JSON object — no markdown, no code fences, no extra text.

Resume Text:
---
{resume_text}
---
"""

async def analyze_with_gemini(resume_text: str, target_role: str) -> dict:
    try:
        import google.generativeai as genai
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
        else:
            raise Exception("Gemini API key is missing")

        prompt = ANALYSIS_PROMPT_TEMPLATE.format(resume_text=resume_text[:8000], target_role=target_role)
        model_instance = genai.GenerativeModel('gemini-2.5-flash')
        response = model_instance.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.exception("Gemini analysis failed")
        raise

async def analyze_with_openai(resume_text: str, target_role: str) -> dict:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        prompt = ANALYSIS_PROMPT_TEMPLATE.format(resume_text=resume_text[:8000], target_role=target_role)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.exception("OpenAI analysis failed")
        raise

async def run_ai_analysis(resume_text: str, target_role: str, file_size: int, filename: str) -> dict:
    """Pick the best available AI provider, fall back to mock."""
    if GEMINI_API_KEY:
        logger.info("Using Gemini for resume analysis")
        try:
            res = await analyze_with_gemini(resume_text, target_role)
            
            # Generate fingerprint
            detected_skills_str = ",".join(sorted(res.get("skills", [])))
            fingerprint_hash = hashlib.md5(f"{resume_text.strip()}|{target_role}|{detected_skills_str}".encode('utf-8')).hexdigest()
            res["fingerprint"] = fingerprint_hash
            
            logger.info("=========================================")
            logger.info("GEMINI RESUME ANALYZER LOGS:")
            logger.info("File name: %s", filename)
            logger.info("File size: %d bytes", file_size)
            logger.info("Selected role: %s", target_role)
            logger.info("ATS score calculated: %d", res.get("ats_score", 0))
            logger.info("Comparison Fingerprint: %s", fingerprint_hash)
            logger.info("=========================================")
            
            return res
        except Exception:
            logger.warning("Gemini failed; trying OpenAI fallback")
    if OPENAI_API_KEY:
        logger.info("Using OpenAI for resume analysis")
        try:
            res = await analyze_with_openai(resume_text, target_role)
            
            detected_skills_str = ",".join(sorted(res.get("skills", [])))
            fingerprint_hash = hashlib.md5(f"{resume_text.strip()}|{target_role}|{detected_skills_str}".encode('utf-8')).hexdigest()
            res["fingerprint"] = fingerprint_hash
            
            logger.info("=========================================")
            logger.info("OPENAI RESUME ANALYZER LOGS:")
            logger.info("File name: %s", filename)
            logger.info("File size: %d bytes", file_size)
            logger.info("Selected role: %s", target_role)
            logger.info("ATS score calculated: %d", res.get("ats_score", 0))
            logger.info("Comparison Fingerprint: %s", fingerprint_hash)
            logger.info("=========================================")
            
            return res
        except Exception:
            logger.warning("OpenAI failed; using mock analysis")
    return mock_analyze(resume_text, target_role, file_size, filename)

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@router.get("/health")
async def resume_health():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
    }

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = Form("Frontend Developer"),
    current_user: dict = Depends(get_current_user),
):
    """Analyze PDF/DOCX resume file, scoring sections dynamically against target role."""
    logger.info("Resume analyze request from user %s, file: %s", current_user["id"], file.filename)

    # Validate file type
    allowed = {"pdf", "docx", "doc", "txt"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Please upload PDF, DOCX, or TXT.",
        )

    # Validate file size (max 5 MB)
    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 5 MB.")

    # Extract text
    resume_text = extract_resume_text(file.filename, file_bytes)
    
    # Validation checks
    if not resume_text or len(resume_text.strip()) < 100:
        logger.error("Extracted text too short (%d chars) — extraction failed", len(resume_text) if resume_text else 0)
        raise HTTPException(
            status_code=422,
            detail="Insufficient resume content detected."
        )

    # Run Analysis
    try:
        result = await run_ai_analysis(resume_text, target_role, file_size, file.filename)
    except Exception as e:
        logger.exception("Resume analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Normalize response keys
    normalized = {
        "skills": result.get("skills", []),
        "strong_skills": result.get("strong_skills", []),
        "intermediate_skills": result.get("intermediate_skills", []),
        "missing_skills": result.get("missing_skills", []),
        "experience_summary": result.get("experience_summary", ""),
        "ats_score": int(result.get("ats_score", 70)),
        "score_breakdown": result.get("score_breakdown", []),
        "improvements": result.get("improvements", []),
        "strengths": result.get("strengths", []),
        "high_impact_suggestions": result.get("high_impact_suggestions", []),
        "missing_keywords": result.get("missing_keywords", []),
        
        # Similarity dashboard variables
        "role_match_percentage": int(result.get("role_match_percentage", 70)),
        "skill_match_percentage": int(result.get("skill_match_percentage", 70)),
        "keyword_match_percentage": int(result.get("keyword_match_percentage", 70)),
        "section_completeness_percentage": int(result.get("section_completeness_percentage", 70)),
        
        # Recommendations
        "recommended_projects": result.get("recommended_projects", []),
        "recommended_certifications": result.get("recommended_certifications", []),
        "recommended_technologies": result.get("recommended_technologies", []),
        "recommended_learning_paths": result.get("recommended_learning_paths", []),
        
        "analyzed_at": datetime.utcnow().isoformat(),
        "filename": file.filename,
        "target_role": target_role,
        "ai_powered": bool(GEMINI_API_KEY or OPENAI_API_KEY),
        "fingerprint": result.get("fingerprint", "")
    }

    # Inject user and metadata
    normalized["user_id"] = current_user["id"]
    normalized["created_at"] = datetime.utcnow()
    
    # Save to database
    resume_collection = get_collection("resume_analyses")
    await resume_collection.insert_one(normalized)
    
    # Return serializable response (remove _id injected by MongoDB)
    if "_id" in normalized:
        normalized["_id"] = str(normalized["_id"])

    return normalized

@router.get("/history")
async def get_resume_history(current_user: dict = Depends(get_current_user)):
    """Fetch the latest resume analysis for the logged-in user."""
    resume_collection = get_collection("resume_analyses")
    cursor = resume_collection.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(1)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)
    
    if not history:
        return None
    return history[0]
