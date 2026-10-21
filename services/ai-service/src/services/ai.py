import google.generativeai as genai
from src.config import settings
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        # Self-healing fallback chain: checks config model, then next-gen defaults
        self.model_name = settings.ai_model or "gemini-2.5-flash"
        self.model = None
        
        if not self.api_key:
            print("[AIService] WARNING: GEMINI_API_KEY missing. Local mock execution state active.")
        else:
            print(f"[AIService] INFO: GEMINI_API_KEY verified successfully (Length: {len(self.api_key)} chars)")
            try:
                genai.configure(api_key=self.api_key)
                
                # Dynamic Discovery Loop: Fetch all active models supported on your API key
                print("[AIService] INFO: Querying ModelService.ListModels for available engines...")
                available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_methods]
                print(f"[AIService] INFO: Discovered supported models on key: {available_models}")
                
                # Check if our target model is actually available
                target_full_name = f"models/{self.model_name}" if not self.model_name.startswith("models/") else self.model_name
                short_target_name = self.model_name.replace("models/", "")
                
                if target_full_name in available_models or f"models/{short_target_name}" in available_models:
                    print(f"[AIService] INFO: Target model {short_target_name} verified. Initializing...")
                    self.model = genai.GenerativeModel(short_target_name)
                else:
                    # Self-healing fallback to whatever model is live on your key
                    fallback_candidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"]
                    chosen_fallback = None
                    
                    for candidate in fallback_candidates:
                        if f"models/{candidate}" in available_models:
                            chosen_fallback = candidate
                            break
                    
                    if not chosen_fallback and available_models:
                        # Grab the first available model if none of our preferred candidates match
                        chosen_fallback = available_models[0].replace("models/", "")
                        
                    if chosen_fallback:
                        print(f"[AIService] ⚠️ WARNING: Chosen model '{short_target_name}' unavailable. Auto-healing to active fallback: '{chosen_fallback}'")
                        self.model_name = chosen_fallback
                        self.model = genai.GenerativeModel(chosen_fallback)
                    else:
                        print("[AIService] ERROR: No valid generateContent models discovered on this account profile.")
                        self.model = None
                        
                if self.model:
                    print(f"[AIService] OK: Google generative model instantiated successfully with engine: {self.model_name}")
            except Exception as e:
                print(f"[AIService] ERROR: Exception raised during provider configuration hook: {e}")
                # Fallback to standard initialization if list_models fails due to networking restrictions
                try:
                    fallback_model = "gemini-2.5-flash"
                    print(f"[AIService] Attempting direct binding fallback to static default: {fallback_model}")
                    self.model_name = fallback_model
                    self.model = genai.GenerativeModel(fallback_model)
                except Exception:
                    self.model = None

    async def chat(self, prompt: str, context: str = "") -> str:
        """
        Sends an operational chat summary block down to Google Gemini with integrated mock fallbacks.
        """
        try:
            # 1. Enforce explicit local mock testing toggle check
            if os.getenv("MOCK_AI", "false").lower() == "true":
                await asyncio.sleep(0.8)
                return f"Greetings! I am your portfolio AI Assistant running in sandbox simulation mode. Your prompt was received successfully:\n\n\"{prompt}\""
            
            # 2. Handle key absence gracefully without throwing unmanaged 500 errors
            if not self.model:
                if os.getenv("MOCK_AI_ON_ERROR", "true").lower() == "true":
                    await asyncio.sleep(0.5)
                    return f"**[Sandbox Environment Notification]** No structural `GEMINI_API_KEY` was found in your local environment configurations or the active models are missing. To provide an uninterrupted assessment experience for recruiters, the platform falls back to this message.\n\n**Processed Prompt:** \"{prompt}\"\n\n**Document Context Size:** {len(context) if context else 0} characters."
                raise Exception("The core underlying Gemini engine failed to initialize due to missing authorization parameters.")

            # 3. Construct clean runtime text input block
            full_prompt = ""
            if context:
                full_prompt += f"System Context (Reference Document Content):\n{context}\n\n"
            
            full_prompt += f"User Query: {prompt}"

            # 4. Generate asynchronous execution call using safe built-in definitions
            response = await self.model.generate_content_async(
                contents=full_prompt
            )
            
            return response.text

        except Exception as e:
            error_str = str(e)
            print(f"[AIService] ERROR: Underlying client crash encountered: {error_str}")
            
            if "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str:
                return "The system AI engine is currently dealing with high concurrent traffic limits. Please resend your request in a brief moment."

            if os.getenv("MOCK_AI_ON_ERROR", "true").lower() == "true":
                return "The AI provider returned an error. Please try again later."
            
            raise e

# Instantiate singleton tracking instance
ai_service = AIService()