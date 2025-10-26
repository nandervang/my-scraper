import { type DiscoveredProduct, type ProductSource } from '../services/productDiscoveryService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Package, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

interface ProductComparisonTableProps {
  product: DiscoveredProduct;
  onSourceClick?: (source: ProductSource) => void;
}

export function ProductComparisonTable({ product, onSourceClick }: ProductComparisonTableProps) {
  const getAvailabilityBadge = (availability: string) => {
    switch (availability) {
      case 'in-stock':
        return <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>;
      case 'limited':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Limited</Badge>;
      case 'out-of-stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriceIndicator = (price: number) => {
    if (!product.lowestPrice || !product.highestPrice) return null;
    
    const isLowest = price === product.lowestPrice;
    const isHighest = price === product.highestPrice;
    
    if (isLowest) {
      return <TrendingDown className="h-4 w-4 text-green-600 ml-1" />;
    }
    if (isHighest) {
      return <TrendingUp className="h-4 w-4 text-red-600 ml-1" />;
    }
    return null;
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {product.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Category: {product.category} • Discovered: {formatDate(product.discoveredAt)}
            </p>
          </div>
          <div className="text-right">
            {getAvailabilityBadge(product.availability)}
          </div>
        </div>
        
        {/* Price Analytics */}
        <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Lowest Price</p>
            <p className="text-lg font-semibold text-green-600">
              {product.lowestPrice ? formatPrice(product.lowestPrice) : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Average Price</p>
            <p className="text-lg font-semibold">
              {product.averagePrice ? formatPrice(product.averagePrice) : 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Highest Price</p>
            <p className="text-lg font-semibold text-red-600">
              {product.highestPrice ? formatPrice(product.highestPrice) : 'N/A'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-600">No sources found for this product</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                product.sources.map((source) => (
                  <TableRow key={source.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{source.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-semibold">
                          {formatPrice(source.price, source.currency)}
                        </span>
                        {getPriceIndicator(source.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getAvailabilityBadge(source.availability)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {source.shipping || 'Not specified'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {source.rating ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{source.rating}</span>
                          <span className="text-sm text-gray-500">
                            ({source.reviewCount?.toLocaleString() || 0})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">No rating</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatDate(source.lastChecked)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onSourceClick) {
                            onSourceClick(source);
                          } else {
                            window.open(source.url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {product.sources.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Prices and availability are checked periodically. Click "View" to see current information on the source website.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductComparisonTable;