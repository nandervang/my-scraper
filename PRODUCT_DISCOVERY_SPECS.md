# Product Discovery & Price Comparison - Updated Specifications

## Core Philosophy Change

**OLD APPROACH:** URL-based product monitoring
**NEW APPROACH:** Product discovery and price comparison engine

## Product Addition Workflow

### 1. Product Input
- **Product Name**: User enters product name (e.g., "iPhone 15 Pro Max 256GB")
- **Category**: User selects category segment (Electronics, Fashion, Books, Home & Garden, Outdoor Gear, etc.)
- **Optional Filters**: Brand, price range, specific features

### 2. AI Discovery Process
- **Dual Search Strategy**:
  - Free web search across major e-commerce sites
  - Targeted search within configured website sources
- **Product Matching**: AI identifies the same product across multiple sources
- **Data Extraction**: Price, availability, shipping, ratings, specifications

### 3. Results Display
- **Table Format** with columns:
  - Product Image
  - Source/Store
  - Current Price
  - Availability Status
  - Shipping Options
  - Rating/Reviews
  - Last Updated
  - Action (View/Buy)

## Website Source Categories

### Updated Category List:
- Electronics
- Fashion & Apparel
- Books & Media
- Home & Garden
- **Outdoor Gear** (NEW)
- Sports & Fitness
- Automotive
- Health & Beauty
- Toys & Games
- Office Supplies

### Outdoor Gear Sources:
- REI
- Patagonia
- The North Face
- Backcountry
- Moosejaw
- Eastern Mountain Sports
- Campmor
- Outdoor Research

## AI Search Strategy

### 1. Website Source Search
- Search configured website sources first
- Use website-specific scraping rules
- Extract structured product data

### 2. Free Web Search
- Google Shopping search
- Amazon search
- General e-commerce site discovery
- Price comparison engines

### 3. Product Matching Algorithm
- Match products by name similarity
- Compare specifications and features
- Identify duplicate listings
- Rank by price and availability

## Table Display Specifications

### Column Structure:
1. **Product Image** (thumbnail)
2. **Store/Source** (logo + name)
3. **Price** (sortable, highlight lowest)
4. **Availability** (In Stock, Out of Stock, Limited)
5. **Shipping** (Free, Cost, Speed)
6. **Rating** (stars + review count)
7. **Last Check** (timestamp)
8. **Actions** (View Product, Add to Watchlist)

### Table Features:
- **Sortable columns** (price, rating, availability)
- **Filter options** (in stock only, free shipping, price range)
- **Best deal highlighting** (green background for lowest price)
- **Comparison view** (side-by-side product details)

## Database Schema Updates

### Products Table Changes:
```sql
-- Remove URL-centric fields, add discovery fields
ALTER TABLE scraper_products 
DROP COLUMN url,
ADD COLUMN product_name VARCHAR(255) NOT NULL,
ADD COLUMN category VARCHAR(100) NOT NULL,
ADD COLUMN search_keywords TEXT[],
ADD COLUMN discovered_sources JSONB DEFAULT '{}';
```

### New Product Sources Table:
```sql
CREATE TABLE scraper_product_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES scraper_products(id) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    source_url TEXT NOT NULL,
    current_price DECIMAL(10,2),
    availability_status VARCHAR(50),
    shipping_info JSONB,
    rating DECIMAL(3,2),
    review_count INTEGER,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## User Experience Flow

### 1. Add Product
1. Click "Discover Product"
2. Enter product name
3. Select category
4. Optional: Add filters
5. AI searches and discovers sources
6. Results displayed in comparison table

### 2. View Results
1. Table shows all found sources
2. Sort by price, rating, availability
3. Filter results as needed
4. Click to view product details or buy

### 3. Track Products
1. Add interesting products to watchlist
2. Get notifications on price changes
3. Weekly summary of best deals
4. Availability alerts

## Implementation Priority

1. **Phase 1**: Update AddProductModal for name/category input
2. **Phase 2**: Create product discovery AI service
3. **Phase 3**: Build comparison table component
4. **Phase 4**: Add Outdoor Gear category and sources
5. **Phase 5**: Implement price tracking and notifications

This approach transforms the app from a simple price monitor to a comprehensive product discovery and comparison platform.