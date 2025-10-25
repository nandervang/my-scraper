import { useState } from 'react';
import { db, supabase, type ScrapingJob } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { JobTemplateModal } from '@/components/JobTemplateModal';
import { createJobFromTemplate } from '@/lib/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Bot, Eye, Globe, FileText, Package } from 'lucide-react';

interface CreateJobModalProps {
  onJobCreated?: (job: ScrapingJob) => void;
}

export function CreateJobModal({ onJobCreated }: CreateJobModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'general' | 'product' | 'price' | 'content'>('general');
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    ai_prompt: '',
    use_vision: false,
    gemini_model: 'models/gemini-2.5-flash', // Best value model
  });
  const { toast } = useToast();

  const scrapingTypes = [
    {
      id: 'general' as const,
      name: 'General Scraping',
      description: 'Extract any data from websites using AI',
      icon: <Bot className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-800',
      example: 'Extract contact information, news articles, or any structured data'
    },
    {
      id: 'product' as const,
      name: 'Product Information',
      description: 'Extract product details, specs, and descriptions',
      icon: <Package className="h-5 w-5" />,
      color: 'bg-green-100 text-green-800',
      example: 'Get product title, description, features, specifications, and images'
    },
    {
      id: 'price' as const,
      name: 'Price Monitoring',
      description: 'Track product prices and availability',
      icon: <Globe className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-800',
      example: 'Monitor price changes, stock status, and price comparisons'
    },
    {
      id: 'content' as const,
      name: 'Content Extraction',
      description: 'Extract articles, reviews, and text content',
      icon: <FileText className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-800',
      example: 'Get blog posts, reviews, documentation, or other text content'
    }
  ];

  const geminiPrompts = {
    general: 'Extract all relevant information from this webpage. Focus on the main content and structured data.',
    product: 'Extract product information including: name, price, description, specifications, availability, images, and any key features or benefits.',
    price: 'Extract pricing information including: current price, original price, discount percentage, currency, availability status, and any price-related details.',
    content: 'Extract the main content from this webpage including: title, author, publication date, main text content, and any relevant metadata.'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.url.trim()) {
      return;
    }

    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      const jobData: Partial<ScrapingJob> = {
        user_id: user.id, // Add the user_id field
        name: formData.name.trim(),
        url: formData.url.trim(),
        scraping_type: selectedType,
        ai_prompt: formData.ai_prompt.trim() || geminiPrompts[selectedType],
        use_vision: formData.use_vision,
        gemini_model: formData.gemini_model,
        status: 'pending',
        config: { created_via: 'modal' },
        selectors: {},
        schedule_enabled: false,
      };

      const { data, error } = await db.jobs.create(jobData);
      
      if (error) throw error;
      
      if (data) {
        onJobCreated?.(data);
        toast({ title: 'Job created', description: `"${data.name}" has been created successfully` });
        setOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      toast({ 
        title: 'Failed to create job', 
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
      url: '',
      ai_prompt: '',
      use_vision: false,
      gemini_model: 'models/gemini-2.5-flash',
    });
    setSelectedType('general');
  };

  const handleTemplateSelected = (templateData: ReturnType<typeof createJobFromTemplate>) => {
    setFormData({
      name: templateData.name || '',
      url: templateData.url || '',
      ai_prompt: templateData.ai_prompt || '',
      use_vision: templateData.use_vision || false,
      gemini_model: templateData.gemini_model || 'models/gemini-2.5-flash',
    });
    setSelectedType(templateData.scraping_type || 'general');
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, url });
    
    // Auto-generate job name from URL if name is empty
    if (!formData.name && url) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        const suggestedName = `${selectedType} scraping - ${domain}`;
        setFormData(prev => ({ ...prev, name: suggestedName, url }));
      } catch {
        // Invalid URL, just update URL field
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-enhanced text-lg">
          <Plus className="h-5 w-5" />
          Create New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="modal-fullscreen dialog-content">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Create AI Scraping Job</DialogTitle>
          <DialogDescription className="flex items-center justify-between text-xl">
            <span>Set up an intelligent web scraping job powered by Google Gemini AI</span>
            <JobTemplateModal onTemplateSelected={handleTemplateSelected} />
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 overflow-y-auto flex-1 max-h-modal-form">
          {/* Scraping Type Selection */}
          <div className="space-y-4">
            <label className="text-xl font-semibold">Scraping Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scrapingTypes.map((type) => (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md card-enhanced text-lg ${
                    selectedType === type.id 
                      ? 'ring-2 ring-primary bg-primary/10' 
                      : 'hover:bg-card/80'
                  }`}
                  onClick={() => {
                    setSelectedType(type.id);
                    setFormData(prev => ({ ...prev, ai_prompt: '' })); // Reset custom prompt
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-3">
                      {type.icon}
                      {type.name}
                      {selectedType === type.id && (
                        <Badge variant="secondary" className="ml-auto text-sm">Selected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-base text-muted-foreground">{type.example}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label htmlFor="name" className="text-lg font-semibold">
                Job Name
              </label>
              <Input
                id="name"
                placeholder="e.g., Amazon product scraper"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-lg h-14"
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="url" className="text-lg font-semibold">
                Target URL
              </label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/page"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
                className="text-lg h-14"
              />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold">AI Configuration</h3>
            </div>
            
            <div className="space-y-3">
              <label htmlFor="prompt" className="text-lg font-semibold">
                Custom AI Prompt (Optional)
              </label>
              <Textarea
                id="prompt"
                placeholder={`Default: ${geminiPrompts[selectedType]}`}
                value={formData.ai_prompt}
                onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                rows={4}
                className="text-lg min-h-[120px]"
              />
              <p className="text-base text-muted-foreground">
                Leave empty to use the default prompt for {scrapingTypes.find(t => t.id === selectedType)?.name.toLowerCase()}
              </p>
            </div>

            <div className="flex items-center justify-between p-6 border rounded-lg card-enhanced">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="text-lg font-semibold">Vision AI (Screenshots)</p>
                  <p className="text-base text-muted-foreground">
                    Use Gemini Vision to analyze page screenshots for better accuracy
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={formData.use_vision ? "default" : "outline"}
                size="lg"
                className="btn-enhanced text-lg"
                onClick={() => setFormData({ ...formData, use_vision: !formData.use_vision })}
              >
                {formData.use_vision ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              size="lg"
              className="btn-enhanced text-lg"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="lg" className="btn-enhanced text-lg">
              {loading ? 'Creating...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}