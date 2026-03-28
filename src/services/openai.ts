import { OpenAI } from 'openai'
import { AIAnalysisResult } from '@/types'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

function localFallbackAnalysis(description: string): AIAnalysisResult {
  const desc = description.toLowerCase()
  
  // Simple keyword-based categorization
  if (desc.includes('fire') || desc.includes('smoke') || desc.includes('burn') || desc.includes('explosion') || desc.includes('blaze')) {
    return {
      category: 'fire',
      priority_score: 85,
      reason: 'Detected fire-related keywords (Local Fallback)'
    }
  }
  
  if (desc.includes('injur') || desc.includes('blood') || desc.includes('bleed') || desc.includes('medical') || desc.includes('hospital') || desc.includes('ambulance') || desc.includes('hurt') || desc.includes('wound') || desc.includes('unconscious')) {
    return {
      category: 'medical',
      priority_score: 90,
      reason: 'Detected medical-related keywords (Local Fallback)'
    }
  }
  
  if (desc.includes('crash') || desc.includes('accident') || desc.includes('car') || desc.includes('collision') || desc.includes('truck') || desc.includes('traffic')) {
    return {
      category: 'accident',
      priority_score: 70,
      reason: 'Detected accident-related keywords (Local Fallback)'
    }
  }
  
  if (desc.includes('flood') || desc.includes('water') || desc.includes('river') || desc.includes('rain') || desc.includes('drown') || desc.includes('sink') || desc.includes('overflow')) {
    return {
      category: 'flood',
      priority_score: 75,
      reason: 'Detected flood-related keywords (Local Fallback)'
    }
  }
  
  return {
    category: 'other',
    priority_score: 50,
    reason: 'Generic categorization as no specific keywords matched (Local Fallback)'
  }
}

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
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || error?.message?.includes('quota') || error?.code === 'insufficient_quota'
    
    if (isQuotaError) {
      console.warn('⚠️ OpenAI Quota Exceeded (429). Switching to Local Fallback Analysis.')
    } else {
      console.error('AI Analysis Error:', error)
    }
    
    // Return the local keyword-based fallback instead of a hardcoded default
    return localFallbackAnalysis(description)
  }
}
