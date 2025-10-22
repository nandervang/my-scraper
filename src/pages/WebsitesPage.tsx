import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ExternalLink, Bot, Trash2, Globe, Zap } from 'lucide-react';
import { db, supabase, type Website } from '@/lib/supabase';
import { SourceDiscoveryService } from '@/lib/sourceDiscovery';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_CATEGORIES = [
  'electronics', 'clothing', 'home-garden', 'books', 'toys', 'sports',
  'automotive', 'beauty', 'jewelry', 'food', 'health', 'tools',
  'baby', 'pet', 'music'
];

const WebsitesPage: React.FC = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDiscoveringAI, setIsDiscoveringAI] = useState(false);
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('');
  const { toast } = useToast();

  // New website form state
  const [newWebsite, setNewWebsite] = useState({
    name: '',
    url: '',
    category: '',
    description: ''
  });

  const loadWebsites = useCallback(async () => {
    try {
      const { data: userWebsites, error } = await db.websites.list();
      if (error) throw error;
      setWebsites(userWebsites || []);
    } catch (error) {
      console.error('Error loading websites:', error);
      toast({
        title: "Error",
        description: "Failed to load websites",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWebsite.name || !newWebsite.url || !newWebsite.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const websiteData = {
        user_id: user.id, // Add the user_id field
        name: newWebsite.name,
        base_url: newWebsite.url,
        category: newWebsite.category,
        scraping_rules: {},
        rate_limit_seconds: 1,
        requires_auth: false,
        auth_config: {},
        is_active: true,
        validation_status: 'pending' as const,
        robots_txt_compliant: true,
        discovered_by_ai: false,
        similar_websites: []
      };

      const { error } = await db.websites.create(websiteData);
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Website added successfully",
      });

      setNewWebsite({ name: '', url: '', category: '', description: '' });
      setIsAddDialogOpen(false);
      loadWebsites();
    } catch (error) {
      console.error('Error adding website:', error);
      toast({
        title: "Error",
        description: "Failed to add website",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    try {
      const { error } = await db.websites.delete(id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Website deleted successfully",
      });
      loadWebsites();
    } catch (error) {
      console.error('Error deleting website:', error);
      toast({
        title: "Error",
        description: "Failed to delete website",
        variant: "destructive"
      });
    }
  };

  const handleAIDiscovery = async () => {
    if (!discoveryCategory) {
      toast({
        title: "Error",
        description: "Please select a category for AI discovery",
        variant: "destructive"
      });
      return;
    }

    setIsDiscoveringAI(true);
    try {
      const discoveryResult = await SourceDiscoveryService.discoverSources({ 
        category: discoveryCategory 
      });
      
      if (discoveryResult.success && discoveryResult.sources.length > 0) {
        await SourceDiscoveryService.addDiscoveredSourcesToUser(discoveryResult.sources, discoveryCategory);
        toast({
          title: "Success",
          description: `Discovered ${discoveryResult.sources.length} new sources for ${discoveryCategory}`,
        });
        loadWebsites();
      } else {
        toast({
          title: "No Results",
          description: discoveryResult.error || "No new sources discovered for this category",
        });
      }
    } catch (error) {
      console.error('Error with AI discovery:', error);
      toast({
        title: "Error",
        description: "AI discovery failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDiscoveringAI(false);
      setDiscoveryCategory('');
    }
  };

  const filteredWebsites = selectedCategory === 'all' 
    ? websites 
    : websites.filter(website => website.category === selectedCategory);

  const websitesByCategory = PRODUCT_CATEGORIES.map(category => ({
    category,
    websites: websites.filter(website => website.category === category),
    count: websites.filter(website => website.category === category).length
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading websites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Website Management</h1>
          <p className="text-muted-foreground">
            Manage your primary sources and discover new ones with AI
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Website
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Website</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddWebsite} className="space-y-4">
                <div>
                  <Label htmlFor="name">Website Name *</Label>
                  <Input
                    id="name"
                    value={newWebsite.name}
                    onChange={(e) => setNewWebsite(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Amazon Electronics"
                  />
                </div>
                
                <div>
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={newWebsite.url}
                    onChange={(e) => setNewWebsite(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={newWebsite.category} onValueChange={(value) => setNewWebsite(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newWebsite.description}
                    onChange={(e) => setNewWebsite(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description..."
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Website</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Discovery Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>AI Source Discovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Discover sources for category</Label>
              <Select value={discoveryCategory} onValueChange={setDiscoveryCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category for AI discovery" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAIDiscovery} 
              disabled={isDiscoveringAI || !discoveryCategory}
            >
              {isDiscoveringAI ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Discover Sources
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({websites.length})
          </TabsTrigger>
          <TabsTrigger value="electronics">
            Electronics ({websites.filter(w => w.category === 'electronics').length})
          </TabsTrigger>
          <TabsTrigger value="clothing">
            Clothing ({websites.filter(w => w.category === 'clothing').length})
          </TabsTrigger>
          <TabsTrigger value="home-garden">
            Home & Garden ({websites.filter(w => w.category === 'home-garden').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {websitesByCategory.filter(cat => cat.count > 0).map(({ category, websites: categoryWebsites }) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize">
                {category.replace('-', ' ')} ({categoryWebsites.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryWebsites.map((website) => (
                  <WebsiteCard
                    key={website.id}
                    website={website}
                    onDelete={handleDeleteWebsite}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {websites.length === 0 && (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first website or use AI discovery to get started
              </p>
            </div>
          )}
        </TabsContent>

        {PRODUCT_CATEGORIES.slice(0, 3).map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWebsites.map((website) => (
                <WebsiteCard
                  key={website.id}
                  website={website}
                  onDelete={handleDeleteWebsite}
                />
              ))}
            </div>
            
            {filteredWebsites.length === 0 && (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No {category.replace('-', ' ')} websites yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add websites manually or use AI discovery
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface WebsiteCardProps {
  website: Website;
  onDelete: (id: string) => void;
}

const WebsiteCard: React.FC<WebsiteCardProps> = ({ website, onDelete }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {website.name}
              {website.validation_status === 'valid' && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
              {website.discovered_by_ai && (
                <Badge variant="outline" className="text-xs">
                  AI
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {website.base_url}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(website.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="capitalize">
            {website.category?.replace('-', ' ') || 'General'}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={website.base_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Visit
            </a>
          </Button>
        </div>
        
        {website.discovered_by_ai && website.ai_confidence_score && (
          <div className="text-sm text-muted-foreground mt-2">
            AI Confidence: {Math.round(website.ai_confidence_score * 100)}%
          </div>
        )}
        
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
          <span>Added {new Date(website.created_at).toLocaleDateString()}</span>
          <span className={`px-2 py-1 rounded ${
            website.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {website.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebsitesPage;