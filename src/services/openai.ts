import { AIAnalysisResult } from '@/types'

// Gemini call is done directly from the browser.
// NOTE: This exposes your API key to users. For production, route through a backend proxy.
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
const geminiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'

function extractTextFromGeminiResponse(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''

  return parts
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim()
}

function extractJsonFromText(maybeJsonText: string): string {
  let jsonStr = maybeJsonText.trim()

  // Extract JSON from markdown code blocks if present
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1]?.split('```')[0]?.trim() || jsonStr
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1]?.split('```')[0]?.trim() || jsonStr
  }

  return jsonStr
}

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
    if (!geminiApiKey) {
      console.warn('[Gemini] Missing VITE_GEMINI_API_KEY. Using fallback analysis.')
      return localFallbackAnalysis(description)
    }

    const systemPrompt = `You are an AI disaster response analyst.
Analyze the following disaster report and respond ONLY with a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "category": "fire" | "medical" | "accident" | "flood" | "other",
  "priority_score": 0-100,
  "reason": "short explanation"
}`

    const userPrompt = `Analyze this disaster report: ${description}`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      }),
    })

    const payload = await response.json().catch(() => null)
    const contentText = extractTextFromGeminiResponse(payload)

    if (!response.ok) {
      const msg = payload?.error?.message || `Gemini request failed with status ${response.status}`
      const isQuotaError =
        response.status === 429 ||
        String(msg).toLowerCase().includes('quota') ||
        String(msg).toLowerCase().includes('resource exhausted')

      if (isQuotaError) {
        console.warn('ℹ️ Gemini quota exceeded. Using keyword-based analysis fallback.')
        return localFallbackAnalysis(description)
      }

      console.error('Gemini request failed:', msg)
      return localFallbackAnalysis(description)
    }

    const jsonStr = extractJsonFromText(contentText)

    let result: AIAnalysisResult
    try {
      result = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', jsonStr, parseError)
      throw parseError
    }

    if (
      !['fire', 'medical', 'accident', 'flood', 'other'].includes(result.category) ||
      typeof result.priority_score !== 'number' ||
      result.priority_score < 0 ||
      result.priority_score > 100 ||
      !result.reason
    ) {
      throw new Error('Invalid AI response format')
    }

    return result
  } catch (error: any) {
    const msg = String(error?.message || error)
    const isQuotaError =
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('resource exhausted') ||
      error?.status === 429

    if (isQuotaError) {
      console.warn('ℹ️ Gemini quota exceeded. Using keyword-based analysis fallback.')
    } else {
      console.error('AI Analysis Error (Gemini):', error)
    }

    return localFallbackAnalysis(description)
  }
}
