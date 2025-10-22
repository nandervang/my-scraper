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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Track prices and availability across multiple sites
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{products.length}</div>
            <div className="text-sm text-gray-600">Total Products</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">In Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm text-gray-600">Out of Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-orange-600">{belowTargetCount}</div>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-sm text-gray-600">Below Target</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🛍️</div>
            <CardTitle className="mb-2">No products being monitored</CardTitle>
            <CardDescription className="mb-4">
              Add products to start tracking prices and availability
            </CardDescription>
            <Button className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const stockStatus = getStockStatus(product.in_stock);
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                    <Badge className={stockStatus.color}>
                      {stockStatus.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.image_url && (
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Price:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">
                          {formatPrice(product.current_price, product.currency)}
                        </span>
                        {getPriceIndicator(product.current_price, product.target_price)}
                      </div>
                    </div>

                    {product.target_price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Target Price:</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatPrice(product.target_price, product.currency)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Check Frequency:</span>
                      <span className="text-sm">Every {product.check_frequency_hours}h</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="truncate">
                      <strong>URL:</strong> {product.url}
                    </div>
                    {product.last_checked_at && (
                      <div>
                        <strong>Last checked:</strong> {new Date(product.last_checked_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      {product.notifications_enabled ? (
                        <Bell className="h-3 w-3" />
                      ) : (
                        <BellOff className="h-3 w-3" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}