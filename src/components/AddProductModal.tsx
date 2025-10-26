import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, DollarSign, Bell, Search } from 'lucide-react';
import { productDiscoveryService } from '../services/productDiscoveryService';

interface AddProductModalProps {
  onProductAdded?: () => void;
  trigger?: React.ReactNode;
}

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'books', label: 'Books & Media' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'outdoor-gear', label: 'Outdoor Gear' },
  { value: 'sports-fitness', label: 'Sports & Fitness' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'health-beauty', label: 'Health & Beauty' },
  { value: 'toys-games', label: 'Toys & Games' },
  { value: 'office-supplies', label: 'Office Supplies' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'CHF', label: 'CHF (Fr)' },
  { value: 'CNY', label: 'CNY (¥)' },
];

const CHECK_FREQUENCIES = [
  { value: 1, label: 'Every hour' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Once daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
];

export function AddProductModal({ onProductAdded, trigger }: AddProductModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    target_price: '',
    currency: 'USD',
    check_frequency_hours: 24,
    notifications_enabled: true,
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.category.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in product name and category',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to discover products',
          variant: 'destructive'
        });
        return;
      }

      // Start product discovery
      toast({
        title: 'Starting product discovery',
        description: `Searching for "${formData.name}" across multiple sources...`
      });

      const discoveredProduct = await productDiscoveryService.discoverProduct({
        name: formData.name.trim(),
        category: formData.category,
        userId: user.id,
        preferences: {
          maxPrice: formData.target_price ? parseFloat(formData.target_price) : undefined,
          excludeOutOfStock: true
        }
      });

      toast({ 
        title: 'Product discovered!', 
        description: `Found "${discoveredProduct.name}" at ${discoveredProduct.sources.length} sources. Lowest price: $${discoveredProduct.lowestPrice}` 
      });
      
      setOpen(false);
      resetForm();
      onProductAdded?.();
      
    } catch (error) {
      console.error('Failed to discover product:', error);
      toast({ 
        title: 'Discovery failed', 
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      target_price: '',
      currency: 'USD',
      check_frequency_hours: 24,
      notifications_enabled: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="apple-button flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Discover Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="apple-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl apple-text flex items-center gap-2">
            <Search className="h-6 w-6 text-purple-600" />
            Discover Product Across Sources
          </DialogTitle>
          <DialogDescription className="text-lg">
            Find and compare prices for products across multiple retailers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-lg font-semibold">
                Product Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., iPhone 15 Pro Max 256GB, Nike Air Max 90"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-lg h-14"
              />
              <p className="text-sm text-muted-foreground">
                Enter the specific product name you want to find and compare prices for
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="category" className="text-lg font-semibold">
                Product Category *
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="text-lg h-14">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the category that best matches your product for better search results
              </p>
            </div>
          </div>

          {/* Pricing Configuration */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Price Monitoring
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="target_price" className="text-lg font-semibold">
                  Target Price (Optional)
                </Label>
                <Input
                  id="target_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.target_price}
                  onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
                  className="text-lg h-14"
                />
                <p className="text-sm text-muted-foreground">
                  Get notified when the price drops to or below this amount
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="currency" className="text-lg font-semibold">
                  Currency
                </Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="text-lg h-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Monitoring Configuration */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Discovery Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="frequency" className="text-lg font-semibold">
                  Search Frequency
                </Label>
                <Select 
                  value={formData.check_frequency_hours.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, check_frequency_hours: parseInt(value) })}
                >
                  <SelectTrigger className="text-lg h-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECK_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value.toString()}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often to search for price changes across sources
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">Notifications</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get alerted about price changes and new deals found
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifications_enabled: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-lg h-14 px-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.category.trim()}
              className="apple-button text-lg h-14 px-8"
            >
              {loading ? 'Starting Discovery...' : 'Discover Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}