import { useEffect, useState } from 'react';
import { db, supabase, type Product } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Bell, BellOff, Trash2, TrendingDown, TrendingUp, Search, Package } from 'lucide-react';
import { AddProductModal } from '@/components/AddProductModal';
import { ProductComparisonTable } from '@/components/ProductComparisonTable';
import { productDiscoveryService, type DiscoveredProduct } from '@/services/productDiscoveryService';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [discoveredProducts, setDiscoveredProducts] = useState<DiscoveredProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadDiscoveredProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.products.list();
      if (error) throw error;
      
      // Filter out discovery-based products (those with discovery:// URLs)
      const traditionalProducts = (data || []).filter(p => !p.url?.startsWith('discovery://'));
      setProducts(traditionalProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoveredProducts = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const discoveries = await productDiscoveryService.getDiscoveryHistory(user.id);
      setDiscoveredProducts(discoveries);
    } catch (err) {
      console.error('Failed to load discovered products:', err);
    }
  };  const formatPrice = (price: number | null | undefined, currency: string) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getStockStatus = (inStock: boolean | null | undefined) => {
    if (inStock === null || inStock === undefined) return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    return inStock 
      ? { text: 'In Stock', color: 'bg-green-100 text-green-800' }
      : { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
  };

  const getPriceIndicator = (current: number | null | undefined, target: number | null | undefined) => {
    if (!current || !target) return null;
    if (current <= target) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return <TrendingUp className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={loadProducts}>Try Again</Button>
      </div>
    );
  }

  const inStockCount = products.filter(p => p.in_stock === true).length;
  const outOfStockCount = products.filter(p => p.in_stock === false).length;
  const belowTargetCount = products.filter(p => p.current_price && p.target_price && p.current_price <= p.target_price).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Product Discovery & Monitoring
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover products by name and category, compare prices across multiple sources
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <AddProductModal onProductAdded={() => { loadProducts(); loadDiscoveredProducts(); }} />
          </div>
        </div>

        {/* Tabs for Discovery vs Traditional Monitoring */}
        <Tabs defaultValue="discovery" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discovery" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Product Discovery
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              URL Monitoring
            </TabsTrigger>
          </TabsList>

          {/* Product Discovery Tab */}
          <TabsContent value="discovery" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="card-enhanced border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Discovered Products</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-300">{discoveredProducts.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-enhanced border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Sources</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                        {discoveredProducts.reduce((sum, p) => sum + p.sources.length, 0)}
                      </p>
                    </div>
                    <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Avg Price Range</p>
                      <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                        {discoveredProducts.length > 0 ? 
                          `$${Math.round(discoveredProducts.reduce((sum, p) => sum + (p.averagePrice || 0), 0) / discoveredProducts.length)}` 
                          : '$0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Best Deals</p>
                      <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                        {discoveredProducts.filter(p => p.lowestPrice && p.averagePrice && p.lowestPrice < p.averagePrice * 0.9).length}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Discovery Results */}
            <div className="space-y-6">
              {discoveredProducts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Products Discovered Yet</h3>
                    <p className="text-gray-500 mb-6">
                      Use the "Discover Product" button to search for products by name and category
                    </p>
                    <AddProductModal onProductAdded={() => { loadProducts(); loadDiscoveredProducts(); }} />
                  </CardContent>
                </Card>
              ) : (
                discoveredProducts.map((product) => (
                  <ProductComparisonTable 
                    key={product.id} 
                    product={product}
                    onSourceClick={(source) => window.open(source.url, '_blank', 'noopener,noreferrer')}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Traditional Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="card-enhanced border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {products.length}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Products</div>
                    </div>
                    <div className="text-2xl">🛍️</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="card-enhanced border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {inStockCount}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300 font-medium">In Stock</div>
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced border-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {outOfStockCount}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300 font-medium">Out of Stock</div>
                    </div>
                    <div className="text-2xl">❌</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-enhanced border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {belowTargetCount}
                      </div>
                      <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Below Target</div>
                    </div>
                    <div className="text-2xl">🎯</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Traditional monitoring products grid */}
            {products.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Products Being Monitored</h3>
                  <p className="text-gray-500 mb-6">
                    Traditional URL-based monitoring for specific product pages
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.in_stock);
                  return (
                    <Card key={product.id} className="card-hover">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-xl line-clamp-2">{product.name}</CardTitle>
                          <Badge className={`status-indicator ${stockStatus.text === 'In Stock' ? 'status-success' : stockStatus.text === 'Out of Stock' ? 'status-error' : 'status-warning'}`}>
                            {stockStatus.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {product.image_url && (
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Current Price:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                {formatPrice(product.current_price, product.currency)}
                              </span>
                              {getPriceIndicator(product.current_price, product.target_price)}
                            </div>
                          </div>

                          {product.target_price && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Target Price:</span>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {formatPrice(product.target_price, product.currency)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Check Frequency:</span>
                            <span className="text-sm font-medium">Every {product.check_frequency_hours}h</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                          <div className="truncate">
                            <strong>URL:</strong> {product.url}
                          </div>
                          {product.last_checked_at && (
                            <div>
                              <strong>Last checked:</strong> {new Date(product.last_checked_at).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button size="lg" variant="outline" className="flex-1 apple-button">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button size="lg" variant="outline" className="apple-button">
                            {product.notifications_enabled ? (
                              <Bell className="h-4 w-4" />
                            ) : (
                              <BellOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="lg" variant="outline" className="text-destructive hover:text-destructive apple-button">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}