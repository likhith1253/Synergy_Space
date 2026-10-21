import { getAuthToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatResponse {
    aiResponse: string
}

export const aiService = {
    async chat(userPrompt: string, documentContent: string): Promise<string> {
        try {
            const token = getAuthToken()
            const response = await fetch(`${API_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // The AI endpoint requires a valid access token (it spends paid model quota)
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    userPrompt,
                    documentContent,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('AI Service Response Error:', response.status, errorData);
                throw new Error(errorData.detail || errorData.message || 'Failed to get AI response');
            }

            const data: ChatResponse = await response.json().catch(() => {
                throw new Error(`Invalid JSON response from AI service: ${response.status}`)
            })
            return data.aiResponse
        } catch (error) {
            console.error('AI Service Exception:', error)
            throw error
        }
    },
}
