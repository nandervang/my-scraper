import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface DiscoveredProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  sources: ProductSource[];
  averagePrice?: number;
  lowestPrice?: number;
  highestPrice?: number;
  availability: 'in-stock' | 'out-of-stock' | 'limited' | 'unknown';
  discoveredAt: string;
}

export interface ProductSource {
  id: string;
  name: string;
  url: string;
  price: number;
  currency: string;
  availability: 'in-stock' | 'out-of-stock' | 'limited' | 'unknown';
  lastChecked: string;
  shipping?: string;
  rating?: number;
  reviewCount?: number;
}

export interface DiscoveryRequest {
  name: string;
  category: string;
  userId: string;
  preferences?: {
    maxPrice?: number;
    preferredBrands?: string[];
    excludeOutOfStock?: boolean;
  };
}

export interface ConfiguredSource {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  category: string;
  scraping_rules: Record<string, unknown>; // JSONB field for CSS selectors, etc.
  is_active: boolean;
  validation_status: string;
  robots_txt_compliant: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSourceRecord {
  id: string;
  product_id: string;
  name: string;
  url: string;
  price: number;
  currency: string;
  availability: string;
  last_checked: string;
  metadata?: {
    shipping?: string;
    rating?: number;
    reviewCount?: number;
  };
}

class ProductDiscoveryService {
  /**
   * Main discovery function that searches for products across web and configured sources
   */
  async discoverProduct(request: DiscoveryRequest): Promise<DiscoveredProduct> {
    try {
      // Generate unique product ID
      const productId = uuidv4();
      
      // Start discovery process
      console.log(`Starting discovery for: ${request.name} in category: ${request.category}`);
      
      // Parallel search across multiple strategies
      const [webSources, configuredSources] = await Promise.all([
        this.searchWebSources(request),
        this.searchConfiguredSources(request)
      ]);
      
      // Combine and deduplicate sources
      const allSources = this.deduplicateSources([...webSources, ...configuredSources]);
      
      // Calculate pricing analytics
      const analytics = this.calculatePriceAnalytics(allSources);
      
      // Determine overall availability
      const availability = this.determineAvailability(allSources);
      
      // Create discovered product
      const discoveredProduct: DiscoveredProduct = {
        id: productId,
        name: request.name,
        category: request.category,
        sources: allSources,
        averagePrice: analytics.average,
        lowestPrice: analytics.lowest,
        highestPrice: analytics.highest,
        availability,
        discoveredAt: new Date().toISOString()
      };
      
      // Save discovery to database
      await this.saveDiscovery(discoveredProduct, request.userId);
      
      return discoveredProduct;
      
    } catch (error) {
      console.error('Product discovery failed:', error);
      throw new Error(`Failed to discover product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Search across general web sources using AI-powered discovery
   */
  private async searchWebSources(request: DiscoveryRequest): Promise<ProductSource[]> {
    // This would integrate with web scraping APIs or AI services
    // For now, return mock data to establish the interface
    
    const mockSources: ProductSource[] = [
      {
        id: uuidv4(),
        name: 'Amazon',
        url: `https://amazon.com/search?k=${encodeURIComponent(request.name)}`,
        price: Math.random() * 500 + 50,
        currency: 'USD',
        availability: 'in-stock',
        lastChecked: new Date().toISOString(),
        shipping: 'Free shipping',
        rating: 4.2,
        reviewCount: 1247
      },
      {
        id: uuidv4(),
        name: 'eBay',
        url: `https://ebay.com/sch/i.html?_nkw=${encodeURIComponent(request.name)}`,
        price: Math.random() * 400 + 40,
        currency: 'USD',
        availability: 'in-stock',
        lastChecked: new Date().toISOString(),
        shipping: '$5.99 shipping',
        rating: 4.0,
        reviewCount: 856
      }
    ];
    
    return mockSources;
  }
  
  /**
   * Search across user-configured website sources
   */
  private async searchConfiguredSources(request: DiscoveryRequest): Promise<ProductSource[]> {
    try {
      // Get configured sources for this category
      const { data: sources, error } = await supabase
        .from('scraper_websites')
        .select('*')
        .eq('category', request.category)
        .eq('is_active', true);
      
      if (error) {
        console.error('Failed to fetch configured sources:', error);
        return [];
      }
      
      if (!sources || sources.length === 0) {
        console.log(`No configured sources found for category: ${request.category}`);
        return [];
      }
      
      // Search each configured source
      const sourceResults = await Promise.allSettled(
        sources.map(source => this.searchConfiguredSource(source, request))
      );
      
      // Extract successful results
      const validSources: ProductSource[] = [];
      sourceResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validSources.push(result.value);
        } else {
          console.warn(`Search failed for source ${sources[index].name}:`, 
            result.status === 'rejected' ? result.reason : 'No results');
        }
      });
      
      return validSources;
      
    } catch (error) {
      console.error('Error searching configured sources:', error);
      return [];
    }
  }
  
  /**
   * Search a specific configured source
   */
  private async searchConfiguredSource(source: ConfiguredSource, request: DiscoveryRequest): Promise<ProductSource | null> {
    try {
      // This would implement the actual scraping logic for each source
      // For now, return mock data based on the source configuration
      
      return {
        id: uuidv4(),
        name: source.name,
        url: `${source.base_url}/search?q=${encodeURIComponent(request.name)}`,
        price: Math.random() * 600 + 30,
        currency: 'USD',
        availability: Math.random() > 0.3 ? 'in-stock' : 'out-of-stock',
        lastChecked: new Date().toISOString(),
        shipping: Math.random() > 0.5 ? 'Free shipping' : '$3.99 shipping'
      };
      
    } catch (error) {
      console.error(`Failed to search source ${source.name}:`, error);
      return null;
    }
  }
  
  /**
   * Remove duplicate sources based on URL similarity
   */
  private deduplicateSources(sources: ProductSource[]): ProductSource[] {
    const seen = new Set<string>();
    const unique: ProductSource[] = [];
    
    for (const source of sources) {
      // Create a normalized key for deduplication
      const key = `${source.name.toLowerCase()}_${source.url.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(source);
      }
    }
    
    return unique;
  }
  
  /**
   * Calculate price analytics from sources
   */
  private calculatePriceAnalytics(sources: ProductSource[]) {
    if (sources.length === 0) {
      return { average: undefined, lowest: undefined, highest: undefined };
    }
    
    const prices = sources.map(s => s.price).filter(p => p > 0);
    
    if (prices.length === 0) {
      return { average: undefined, lowest: undefined, highest: undefined };
    }
    
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    return {
      lowest: Number(lowest.toFixed(2)),
      highest: Number(highest.toFixed(2)),
      average: Number(average.toFixed(2))
    };
  }
  
  /**
   * Determine overall product availability
   */
  private determineAvailability(sources: ProductSource[]): DiscoveredProduct['availability'] {
    if (sources.length === 0) return 'unknown';
    
    const availabilities = sources.map(s => s.availability);
    
    if (availabilities.includes('in-stock')) return 'in-stock';
    if (availabilities.includes('limited')) return 'limited';
    if (availabilities.includes('out-of-stock')) return 'out-of-stock';
    
    return 'unknown';
  }
  
  /**
   * Save discovery results to database
   */
  private async saveDiscovery(product: DiscoveredProduct, userId: string): Promise<void> {
    try {
      // Save main product discovery record with sources in discovered_sources field
      const { error: productError } = await supabase
        .from('scraper_products')
        .insert({
          id: product.id,
          user_id: userId,
          name: product.name,
          url: 'discovery://' + product.id, // Use discovery protocol
          category: product.category,
          target_price: product.lowestPrice,
          current_price: product.averagePrice,
          check_frequency_hours: 24,
          notifications_enabled: true,
          currency: 'USD',
          discovered_sources: {
            sources: product.sources,
            analytics: {
              averagePrice: product.averagePrice,
              lowestPrice: product.lowestPrice,
              highestPrice: product.highestPrice,
              totalSources: product.sources.length
            },
            discoveredAt: product.discoveredAt
          },
          created_at: product.discoveredAt
        });
      
      if (productError) {
        console.error('Failed to save product:', productError);
        throw productError;
      }
      
    } catch (error) {
      console.error('Failed to save discovery to database:', error);
      throw error;
    }
  }
  
  /**
   * Get discovery history for a user
   */
  async getDiscoveryHistory(userId: string, limit: number = 20): Promise<DiscoveredProduct[]> {
    try {
      const { data: products, error } = await supabase
        .from('scraper_products')
        .select('*')
        .eq('user_id', userId)
        .like('url', 'discovery://%')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to fetch discovery history:', error);
        return [];
      }
      
      return (products || []).map(product => {
        const discoveredSources = product.discovered_sources || { sources: [] };
        const sources = discoveredSources.sources || [];
        
        return {
          id: product.id,
          name: product.name,
          category: product.category || 'general',
          sources: sources,
          averagePrice: product.current_price,
          lowestPrice: product.target_price,
          highestPrice: discoveredSources.analytics?.highestPrice,
          availability: this.determineAvailability(sources),
          discoveredAt: product.created_at
        };
      });
      
    } catch (error) {
      console.error('Failed to get discovery history:', error);
      return [];
    }
  }
}

export const productDiscoveryService = new ProductDiscoveryService();