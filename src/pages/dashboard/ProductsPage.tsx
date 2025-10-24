import { useEffect, useState } from 'react';
import { db, type Product } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Bell, BellOff, Trash2, TrendingDown, TrendingUp } from 'lucide-react';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await db.products.list();
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null | undefined, currency: string) => {
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
              Product Monitoring
            </h1>
            <p className="text-lg text-muted-foreground">
              Track prices and availability across multiple sites
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="apple-button flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

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
                <div className="text-2xl">📈</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {outOfStockCount}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 font-medium">Out of Stock</div>
                </div>
                <div className="text-2xl">📉</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-enhanced border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {belowTargetCount}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">Below Target</div>
                </div>
                <div className="text-2xl">🎯</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="card-enhanced text-center py-16">
            <CardContent>
              <div className="space-y-6">
                <div className="text-8xl">🛍️</div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl">No products being monitored</CardTitle>
                  <CardDescription className="text-lg max-w-md mx-auto">
                    Add products to start tracking prices and availability
                  </CardDescription>
                </div>
                <Button className="apple-button flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Add Your First Product
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}