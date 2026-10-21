# AI Integration & Implementation

The AI capabilities within the SynergySpace are separated into a discrete Python microservice (`ai-service`). This architectural separation natively supports python's mature data-science ecosystems, making future expansion into custom NLP pipelines simpler.

## Service Technology
- **Language Framework:** Python / FastAPI
- **Model SDK:** Google Generative AI SDK (`google.generativeai`)
- **Primary Model:** `gemini-flash-latest` (Optimized for low-latency contextual generation).

## Prompt Flow and Assembly

When a user triggers an AI request from the Editor interface:
1. The frontend isolates the active block or selection the user is working on, as well as the immediate surrounding context.
2. An HTTP request is dispatched through the API Gateway, authenticated via JWT.
3. The Gateway routes the payload to `[ai-service]/ai/chat`.
4. The Python service encapsulates the raw user prompt with the structural context:
    ```python
    full_prompt = f"Here is the document context:\n{context}\n\nUser: {prompt}"
    ```
5. The `gemini-flash-latest` model processes the request asynchronously.

## Response Handling and Error Tactics

The AI Service employs defensive engineering against API limits and invalid logic:
- **Mock Fallbacks:** If the `GEMINI_API_KEY` is missing or intentionally disabled via the `MOCK_AI=true` environment variable, the service simulates an artificial delay and responds with a boilerplate mock string. This allows frontend developers to test UI states without spending API quotas.
- **Graceful Rate Limiting Check:** If Google's API returns a `429 Too Many Requests` or `ResourceExhausted` exception, the Python service catches the error strings and translates them into a user-friendly message (`"AI Service is currently busy (Rate Limit Exceeded). Please try again in a few moments."`), rather than throwing a raw 500 error.

## Extensibility 

Because the AI is isolated, the architecture inherently supports scaling to LangChain integrations, vector databases for full-workspace context windows, or swapping out Gemini for alternative LLMs with zero modifications required inside the Node.js backend cluster.
