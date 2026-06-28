import os
import time
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
import google.generativeai as genai
from fastapi import HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIClient")

# Configuration from environment variables
AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "3"))
AI_RETRY_DELAY = int(os.getenv("AI_RETRY_DELAY", "2"))
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "15"))

# Circuit Breaker Config
CB_FAILURE_THRESHOLD = int(os.getenv("CB_FAILURE_THRESHOLD", "5"))
CB_RECOVERY_TIMEOUT = int(os.getenv("CB_RECOVERY_TIMEOUT", "60"))

# Health Monitor State
class AIHealthState:
    total_requests = 0
    successful_requests = 0
    failed_requests = 0
    consecutive_failures = 0
    circuit_open = False
    circuit_opened_at = 0

health_state = AIHealthState()

class AIException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AIAuthenticationError(AIException):
    def __init__(self, message="Invalid API key or authentication failed."):
        super().__init__(message, 401)

class AIRateLimitError(AIException):
    def __init__(self, message="AI rate limit or quota exceeded. Please try again later."):
        super().__init__(message, 429)

class AITimeoutError(AIException):
    def __init__(self, message="The AI service timed out. Please try again."):
        super().__init__(message, 408)

class AIServiceUnavailableError(AIException):
    def __init__(self, message="The AI service is temporarily unavailable."):
        super().__init__(message, 503)

def check_circuit_breaker():
    if health_state.circuit_open:
        if time.time() - health_state.circuit_opened_at > CB_RECOVERY_TIMEOUT:
            logger.info("Circuit breaker half-open: attempting recovery.")
            health_state.circuit_open = False
            health_state.consecutive_failures = 0
        else:
            raise AIServiceUnavailableError("The AI service is currently unavailable due to continuous failures. Circuit is open.")

def record_success():
    health_state.successful_requests += 1
    health_state.consecutive_failures = 0
    health_state.circuit_open = False

def record_failure():
    health_state.failed_requests += 1
    health_state.consecutive_failures += 1
    if health_state.consecutive_failures >= CB_FAILURE_THRESHOLD and not health_state.circuit_open:
        health_state.circuit_open = True
        health_state.circuit_opened_at = time.time()
        logger.error(f"Circuit Breaker TRIPPED after {CB_FAILURE_THRESHOLD} consecutive failures.")

def log_structured(req_id, user_id, endpoint, model, start_time, error_type=None, error_msg=None):
    duration = round((time.time() - start_time) * 1000, 2)
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": req_id,
        "user_id": user_id,
        "endpoint": endpoint,
        "model": model,
        "duration_ms": duration,
        "status": "ERROR" if error_type else "SUCCESS"
    }
    if error_type:
        log_data["error_type"] = error_type
        log_data["error_message"] = str(error_msg)
        logger.error(f"AI_METRIC: {log_data}")
    else:
        logger.info(f"AI_METRIC: {log_data}")

class GeminiProvider:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            
    async def generate(self, prompt: str, model_name: str, config: dict) -> str:
        if not self.api_key:
            raise AIAuthenticationError("Missing GEMINI_API_KEY")
            
        model = genai.GenerativeModel(model_name)
        # Using asyncio.wait_for to enforce timeout on the async call
        try:
            response = await asyncio.wait_for(
                model.generate_content_async(prompt, generation_config=config),
                timeout=AI_TIMEOUT_SECONDS
            )
            if response and response.text:
                return response.text
            raise AIException("Model returned empty text.", 500)
        except asyncio.TimeoutError:
            raise AITimeoutError()
        except Exception as e:
            err_str = str(e).lower()
            if "401" in err_str or "api_key_invalid" in err_str:
                raise AIAuthenticationError()
            if "429" in err_str or "quota" in err_str:
                raise AIRateLimitError()
            raise AIException(f"Internal AI provider error: {str(e)}", 500)

class UnifiedAIClient:
    def __init__(self):
        self.primary_provider = GeminiProvider()
        
    async def generate_content(
        self, 
        prompt: str, 
        user_id: str = "anonymous", 
        endpoint: str = "unknown", 
        model_name: str = "gemini-2.5-flash",
        config: dict = None
    ) -> str:
        if config is None:
            config = {"temperature": 0.2}
            
        req_id = str(uuid.uuid4())
        start_time = time.time()
        health_state.total_requests += 1
        
        try:
            check_circuit_breaker()
        except AIException as e:
            log_structured(req_id, user_id, endpoint, model_name, start_time, error_type=e.__class__.__name__, error_msg=e.message)
            raise HTTPException(status_code=e.status_code, detail=e.message)
            
        for attempt in range(AI_MAX_RETRIES):
            try:
                result = await self.primary_provider.generate(prompt, model_name, config)
                record_success()
                log_structured(req_id, user_id, endpoint, model_name, start_time)
                return result
                
            except AIAuthenticationError as e:
                # Do not retry auth errors
                record_failure()
                log_structured(req_id, user_id, endpoint, model_name, start_time, error_type="AIAuthenticationError", error_msg=e.message)
                raise HTTPException(status_code=e.status_code, detail=e.message)
                
            except (AIRateLimitError, AITimeoutError, AIException) as e:
                if attempt < AI_MAX_RETRIES - 1:
                    delay = AI_RETRY_DELAY * (2 ** attempt)
                    logger.warning(f"Request {req_id} failed ({e.__class__.__name__}). Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    record_failure()
                    log_structured(req_id, user_id, endpoint, model_name, start_time, error_type=e.__class__.__name__, error_msg=e.message)
                    raise HTTPException(status_code=e.status_code, detail=e.message)
                    
        # Should not reach here
        raise HTTPException(status_code=503, detail="The AI service is temporarily unavailable.")

ai_client = UnifiedAIClient()
