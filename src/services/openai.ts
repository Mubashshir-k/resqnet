import { OpenAI } from 'openai'
import { AIAnalysisResult } from '@/types'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

export async function analyzeDisasterReport(description: string): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI disaster response analyst. Analyze the following disaster report and respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "category": "fire" | "medical" | "accident" | "flood" | "other",
  "priority_score": 0-100,
  "reason": "short explanation"
}`,
        },
        {
          role: 'user',
          content: `Analyze this disaster report: ${description}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content || ''
    let jsonStr = content.trim()

    // Extract JSON from markdown code blocks if present
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1]?.split('```')[0]?.trim() || jsonStr
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1]?.split('```')[0]?.trim() || jsonStr
    }

    // Parse the JSON response
    let result: AIAnalysisResult
    try {
      result = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonStr, parseError)
      throw parseError
    }

    // Validate the result
    if (
      !['fire', 'medical', 'accident', 'flood', 'other'].includes(result.category) ||
      result.priority_score < 0 ||
      result.priority_score > 100 ||
      !result.reason
    ) {
      throw new Error('Invalid AI response format')
    }

    return result
  } catch (error) {
    console.error('AI Analysis Error:', error)
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Return a default safe response
    return {
      category: 'other',
      priority_score: 50,
      reason: 'Unable to analyze - please provide more details',
    }
  }
}
