import { GoogleGenAI } from "@google/genai";

// Assume API_KEY is set in the environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI services will not work.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const translateText = async (text: string, targetLanguageName: string): Promise<string> => {
  if (!API_KEY) {
    return `(Translation disabled) ${text}`;
  }

  try {
    const prompt = `Translate the following text to ${targetLanguageName}. Only return the translated text, with no extra formatting or explanations: "${text}"`;
    
    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error('Error translating text:', error);
    return `(Translation failed) ${text}`;
  }
};

export const correctGrammar = async (text: string): Promise<string> => {
    if (!API_KEY) {
        return text;
    }

    try {
        const prompt = `Correct the spelling and grammar of the following text. Only return the corrected text, without any introductory phrases like "Here is the corrected text:":\n\n"${text}"`;
        
        const response = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim().replace(/^"|"$/g, ''); // Also remove quotes if Gemini adds them
    } catch (error) {
        console.error('Error correcting grammar:', error);
        return text; // Return original text on failure
    }
};

export const filterProfanity = async (text: string): Promise<string> => {
    if (!API_KEY) {
        return text;
    }

    try {
        const prompt = `Review the following text for any profane or inappropriate words. Replace every letter of each profane word with an asterisk (*). Return only the modified text. If no profane words are found, return the original text exactly as it is.\n\nOriginal text: "${text}"`;
        
        const response = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error('Error filtering profanity:', error);
        return text; // Return original text on failure
    }
};