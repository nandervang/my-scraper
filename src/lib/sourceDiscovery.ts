import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, type Website, type AISession } from '@/lib/supabase';

const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface SourceDiscoveryRequest {
  category: string;
  productType?: string;
  targetRegion?: string;
  includeNiche?: boolean;
}

export interface DiscoveredSource {
  name: string;
  url: string;
  confidence: number;
  reasoning: string;
  category: string;
  estimatedProductCount?: string | number;
  priceRange?: string;
  specialFeatures?: string[];
}

export class SourceDiscoveryService {
  
  static async discoverSources(request: SourceDiscoveryRequest): Promise<{
    success: boolean;
    sources: DiscoveredSource[];
    error?: string;
    sessionId?: string;
  }> {
    if (!genAI) {
      return {
        success: false,
        sources: [],
        error: 'Google AI API key not configured'
      };
    }

    try {
      // Get current user for AI session
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Create AI session
      const sessionData: Partial<AISession> = {
        user_id: user.id, // Add the user_id field
        session_type: 'source_discovery',
        status: 'running',
        gemini_model_used: 'models/gemini-2.5-flash', // Best value model
        search_query: `Discover sources for ${request.category} products`,
        target_category: request.category,
        started_at: new Date().toISOString()
      };

      const { data: session, error: sessionError } = await db.aiSessions.create(sessionData);
      if (sessionError || !session) {
        throw new Error('Failed to create AI session');
      }

      const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

      const prompt = `You are an expert e-commerce analyst. I need you to discover and recommend the best websites for tracking ${request.category} products.

Requirements:
- Category: ${request.category}
${request.productType ? `- Specific Product Type: ${request.productType}` : ''}
${request.targetRegion ? `- Target Region: ${request.targetRegion}` : '- Target Region: Global (prioritize US/EU)'}
- Include both major retailers and ${request.includeNiche ? 'niche specialist sites' : 'mainstream sites only'}

Please provide a comprehensive list of the TOP 15-20 websites where consumers commonly shop for ${request.category} products. For each website, include:

1. **Website Name**: Clear, recognizable name
2. **Base URL**: Full website URL (https://example.com)
3. **Confidence Score**: 0.0-1.0 based on how relevant this site is for ${request.category}
4. **Category Relevance**: How well this site serves the ${request.category} category
5. **Why It's Good**: Brief reasoning for why this site is valuable for price tracking
6. **Product Variety**: Estimated number of ${request.category} products (rough estimate)
7. **Price Range**: General price range (budget/mid-range/premium/all)
8. **Special Features**: Any unique features (price matching, exclusive brands, etc.)

Focus on:
- Major retailers (Amazon, eBay, etc.)
- Category specialists (Best Buy for electronics, etc.)
- Direct-to-consumer brands
- Popular regional retailers
- Discount/outlet stores
${request.includeNiche ? '- Niche hobbyist or specialty sites' : ''}

Format your response as a JSON array with this structure:
[
  {
    "name": "Website Name",
    "url": "https://example.com",
    "confidence": 0.95,
    "reasoning": "Why this site is great for ${request.category}",
    "category": "${request.category}",
    "estimatedProductCount": "10000+",
    "priceRange": "all ranges",
    "specialFeatures": ["feature1", "feature2"]
  }
]

Only include real, legitimate websites that actually exist and sell ${request.category} products. Do not include fictional or made-up websites.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let discoveredSources: DiscoveredSource[] = [];
      
      try {
        // Try to parse as JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          discoveredSources = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        
        // Fallback: extract websites from text manually
        const urlRegex = /https?:\/\/[^\s\],"]+/g;
        const urls = text.match(urlRegex) || [];
        
        // Create basic source objects from URLs
        discoveredSources = urls.slice(0, 15).map((url) => ({
          name: new URL(url).hostname.replace('www.', ''),
          url: url,
          confidence: 0.7,
          reasoning: `Discovered through AI analysis for ${request.category}`,
          category: request.category,
          estimatedProductCount: 'Unknown',
          priceRange: 'Unknown',
          specialFeatures: []
        }));
      }

      // Filter and validate sources
      discoveredSources = discoveredSources
        .filter(source => source.url && source.name)
        .filter(source => source.confidence > 0.5)
        .slice(0, 20); // Limit to top 20

      // Update AI session with results
      await db.aiSessions.complete(session.id, {
        products_found: 0,
        sources_discovered: discoveredSources.length,
        ai_insights: {
          category: request.category,
          totalSourcesFound: discoveredSources.length,
          averageConfidence: discoveredSources.reduce((sum, s) => sum + s.confidence, 0) / discoveredSources.length,
          topSources: discoveredSources.slice(0, 5).map(s => ({ name: s.name, url: s.url, confidence: s.confidence }))
        }
      });

      return {
        success: true,
        sources: discoveredSources,
        sessionId: session.id
      };

    } catch (error) {
      console.error('Source discovery failed:', error);
      
      return {
        success: false,
        sources: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async addDiscoveredSourcesToUser(sources: DiscoveredSource[], category: string): Promise<Website[]> {
    const addedWebsites: Website[] = [];

    // Get current user
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    for (const source of sources) {
      try {
        const websiteData: Partial<Website> = {
          user_id: user.id, // Add the user_id field
          name: source.name,
          base_url: source.url,
          category: category,
          discovered_by_ai: true,
          ai_confidence_score: source.confidence,
          is_active: true,
          validation_status: 'pending',
          robots_txt_compliant: true,
          scraping_rules: {
            discovered_reasoning: source.reasoning,
            estimated_products: source.estimatedProductCount,
            price_range: source.priceRange,
            special_features: source.specialFeatures
          },
          similar_websites: []
        };

        const { data: website, error } = await db.websites.create(websiteData);
        
        if (website && !error) {
          addedWebsites.push(website);
        }
      } catch (error) {
        console.error('Failed to add discovered website:', source.name, error);
      }
    }

    return addedWebsites;
  }

  // Get common product categories for source discovery
  static getProductCategories(): string[] {
    return [
      'Electronics',
      'Fashion & Clothing',
      'Home & Garden',
      'Sports & Outdoors',
      'Books & Media',
      'Health & Beauty',
      'Toys & Games',
      'Automotive',
      'Tools & Hardware',
      'Food & Beverages',
      'Jewelry & Watches',
      'Pet Supplies',
      'Office Supplies',
      'Musical Instruments',
      'Art & Crafts'
    ];
  }

  // Validate if a website is suitable for scraping
  static async validateWebsite(url: string): Promise<{
    valid: boolean;
    reason?: string;
    robotsCompliant?: boolean;
  }> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      
      // Check if it's a valid domain
      if (!urlObj.hostname.includes('.')) {
        return { valid: false, reason: 'Invalid domain format' };
      }

      // For now, assume all discovered websites are valid
      // In production, you'd want to check robots.txt, test accessibility, etc.
      return {
        valid: true,
        robotsCompliant: true
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'Invalid URL format'
      };
    }
  }
}

// Export singleton instance
export const sourceDiscoveryService = new SourceDiscoveryService();