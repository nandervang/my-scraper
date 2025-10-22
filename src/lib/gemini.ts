import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.warn('Google AI API key not found. Gemini features will be disabled.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ScrapingRequest {
  url: string;
  prompt: string;
  useVision?: boolean;
  model?: string;
}

export interface GeminiScrapingResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  tokensUsed?: number;
  executionTime?: number;
}

export class GeminiService {
  static async scrapeWithAI(request: ScrapingRequest): Promise<GeminiScrapingResult> {
    if (!genAI) {
      return {
        success: false,
        error: 'Google AI API key not configured'
      };
    }

    const startTime = Date.now();

    try {
      // For now, we'll use a text-only approach
      // In a real implementation, you'd want to:
      // 1. Fetch the webpage content
      // 2. Take a screenshot if useVision is true
      // 3. Send to Gemini for processing

      const model = genAI.getGenerativeModel({ 
        model: request.model || 'models/gemini-2.5-flash' // Best value: 1M input tokens, 65K output, fast & stable
      });

      // Construct the prompt with context
      const fullPrompt = `
You are a web scraping AI assistant. Your task is to extract structured data from web content.

URL to scrape: ${request.url}
Task: ${request.prompt}

Please provide the extracted data in a clean JSON format. If you cannot access the actual webpage content, provide a structured template of what data would be extracted based on the scraping task.

Response format should be valid JSON with relevant fields based on the scraping type.
`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse as JSON, fallback to structured text
      let extractedData;
      try {
        extractedData = JSON.parse(text);
      } catch {
        // If not valid JSON, create a structured response
        extractedData = {
          extracted_content: text,
          url: request.url,
          extraction_type: 'text_content',
          timestamp: new Date().toISOString()
        };
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: extractedData,
        tokensUsed: 0, // Token counting will be added later
        executionTime
      };

    } catch (error) {
      console.error('Gemini scraping error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: Date.now() - startTime
      };
    }
  }

  static async testConnection(): Promise<boolean> {
    if (!genAI) return false;

    try {
      const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
      const result = await model.generateContent('Hello, can you respond with just "OK"?');
      const response = await result.response;
      return response.text().trim().toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }

  // Predefined prompts for different scraping types
  static getPromptTemplate(type: string): string {
    const templates = {
      general: `Extract all relevant information from this webpage. Focus on:
- Main content or data
- Important details and specifications  
- Contact information if available
- Any structured data or lists
Return the data in a clean JSON format.`,

      product: `Extract comprehensive product information including:
- Product name/title
- Price (current, original, currency)
- Description and key features
- Specifications and technical details
- Availability/stock status
- Images (URLs if available)
- Brand and category information
- Customer ratings or reviews summary
Return as structured JSON.`,

      price: `Extract pricing and availability information:
- Current price and currency
- Original/list price if different
- Discount amount or percentage
- Stock/availability status
- Price comparison data if available
- Shipping costs or delivery info
- Any price alerts or special offers
Return as JSON with clear price fields.`,

      content: `Extract the main content from this webpage:
- Article/page title
- Author and publication date
- Main text content (clean, formatted)
- Key headings and sections
- Meta information (tags, categories)
- Related links or references
- Summary or excerpt if available
Return as structured JSON with content fields.`
    };

    return templates[type as keyof typeof templates] || templates.general;
  }
}

// Helper function to validate API key format
export function isValidGeminiApiKey(key: string): boolean {
  return key.startsWith('AIza') && key.length >= 35;
}

// Check if Gemini is available
export function isGeminiAvailable(): boolean {
  return !!apiKey && isValidGeminiApiKey(apiKey);
}