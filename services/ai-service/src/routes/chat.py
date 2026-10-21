import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from src.auth import enforce_rate_limit
from src.logger import logger
from src.config import settings
from src.services.ai import ai_service

# Log startup configurations safely
if not settings.gemini_api_key:
    logger.warning("GEMINI_API_KEY not found in configuration - live fallback mode active")
else:
    logger.info(f"GEMINI_API_KEY registered successfully ({len(settings.gemini_api_key)} characters)")
    
logger.info(f"AI Model target: {settings.ai_model}")
logger.info(f"AI Singleton state initialized: {ai_service.model is not None}")

router = APIRouter()

class ChatRequest(BaseModel):
    userPrompt: str = Field(..., min_length=1, max_length=settings.max_prompt_chars)
    documentContent: str = Field("", max_length=settings.max_context_chars)

class ChatResponse(BaseModel):
    aiResponse: str

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, user_id: str = Depends(enforce_rate_limit)):
    logger.info(f"Incoming AI processing request. Model: {ai_service.model_name} | Context present: {bool(request.documentContent)}")
    
    try:
        # Delegate prompt resolution and mock fallbacks directly to our safe service wrapper
        reply_text = await ai_service.chat(
            prompt=request.userPrompt, 
            context=request.documentContent
        )
        
        if not reply_text:
            logger.error("Empty string response parsed from target provider execution handler")
            raise HTTPException(status_code=500, detail="Empty AI response parsed")
            
        logger.info(f"AI response successfully generated ({len(reply_text)} chars)")
        return ChatResponse(aiResponse=reply_text)
        
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        logger.error(f"Critical exception intercepted during execution pipeline: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="AI provider error processing request")