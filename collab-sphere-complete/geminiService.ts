// Get API key from Vite environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not found. Translation and grammar features will be disabled.');
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

async function callGeminiAPI(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not configured');
    return prompt; // Return original text if API key is missing
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return prompt; // Return original text on error
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text.trim()) return text;
  
  const prompt = `Translate the following text to ${targetLanguage}. Only provide the translation, no explanations:\n\n${text}`;
  return await callGeminiAPI(prompt);
}

export async function correctGrammar(text: string): Promise<string> {
  if (!text.trim()) return text;
  
  const prompt = `Correct any grammar and spelling mistakes in the following text. Only provide the corrected text, no explanations:\n\n${text}`;
  return await callGeminiAPI(prompt);
}

export async function filterProfanity(text: string): Promise<string> {
  if (!text.trim()) return text;
  
  const prompt = `Replace any profanity or inappropriate words in the following text with asterisks (***). Keep all other words unchanged. Only provide the filtered text:\n\n${text}`;
  return await callGeminiAPI(prompt);
}