import { useState } from 'react';
import { type JobTemplate, JOB_TEMPLATES, TEMPLATE_CATEGORIES, createJobFromTemplate } from '@/lib/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookOpen, Plus, ArrowRight } from 'lucide-react';

interface JobTemplateModalProps {
  onTemplateSelected: (jobData: ReturnType<typeof createJobFromTemplate>) => void;
}

export function JobTemplateModal({ onTemplateSelected }: JobTemplateModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  const [customization, setCustomization] = useState({
    name: '',
    url: '',
    ai_prompt: ''
  });

  const handleTemplateSelect = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setCustomization({
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      url: template.example_url,
      ai_prompt: template.ai_prompt
    });
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;

    const jobData = createJobFromTemplate(selectedTemplate, customization);
    onTemplateSelected(jobData);
    setOpen(false);
    setSelectedTemplate(null);
    setCustomization({ name: '', url: '', ai_prompt: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="btn-enhanced text-lg">
          <BookOpen className="h-5 w-5" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="modal-fullscreen dialog-content">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Choose a Job Template</DialogTitle>
          <DialogDescription className="text-xl">
            Select from pre-configured templates for common scraping scenarios
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <Tabs defaultValue="all" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-16 text-lg">
              <TabsTrigger value="all" className="text-lg">All</TabsTrigger>
              {TEMPLATE_CATEGORIES.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="hidden sm:flex text-lg">
                  <span className="mr-2 text-xl">{category.icon}</span>
                  <span className="hidden lg:inline">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-6">
              <TabsContent value="all" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {JOB_TEMPLATES.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleTemplateSelect(template)}
                    />
                  ))}
                </div>
              </TabsContent>

              {TEMPLATE_CATEGORIES.map((category) => (
                <TabsContent key={category.id} value={category.id} className="space-y-6 mt-0">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold flex items-center justify-center gap-3">
                      <span className="text-3xl">{category.icon}</span>
                      {category.name}
                    </h3>
                    <p className="text-lg text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {JOB_TEMPLATES.filter(t => t.category === category.id).map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => handleTemplateSelect(template)}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        ) : (
          <div className="space-y-8 flex-1 overflow-y-auto">
            {/* Template Info */}
            <Card className="card-enhanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">{selectedTemplate.icon}</span>
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription className="text-lg">
                  {selectedTemplate.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-6">
                  <Badge variant="outline" className="text-base px-3 py-1">{selectedTemplate.category}</Badge>
                  <Badge variant="outline" className="text-base px-3 py-1">{selectedTemplate.scraping_type}</Badge>
                  {selectedTemplate.use_vision && (
                    <Badge variant="outline" className="bg-purple-100 text-base px-3 py-1">Vision AI</Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">
                  <strong>Example URL:</strong> {selectedTemplate.example_url}
                </p>
              </CardContent>
            </Card>

            {/* Customization Form */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">Customize Template</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-lg font-semibold">Job Name</label>
                  <Input
                    value={customization.name}
                    onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                    placeholder="Enter job name"
                    className="text-lg h-14"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-lg font-semibold">Target URL</label>
                  <Input
                    value={customization.url}
                    onChange={(e) => setCustomization({ ...customization, url: e.target.value })}
                    placeholder="Enter URL to scrape"
                    className="text-lg h-14"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-lg font-semibold">AI Prompt (Optional)</label>
                <Textarea
                  value={customization.ai_prompt}
                  onChange={(e) => setCustomization({ ...customization, ai_prompt: e.target.value })}
                  placeholder="Customize the AI prompt..."
                  rows={4}
                  className="text-lg min-h-[120px]"
                />
                <p className="text-base text-muted-foreground">
                  Leave empty to use the template's default prompt
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-4">
          {selectedTemplate ? (
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)} size="lg" className="btn-enhanced text-lg">
                Back to Templates
              </Button>
              <Button onClick={handleCreateFromTemplate} size="lg" className="btn-enhanced text-lg">
                Create Job
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)} size="lg" className="btn-enhanced text-lg">
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: JobTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow card-enhanced text-lg" onClick={onSelect}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-3">
          <span className="text-2xl">{template.icon}</span>
          {template.name}
        </CardTitle>
        <CardDescription className="text-base">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4">
          <Badge variant="outline" className="text-sm">{template.category}</Badge>
          <Badge variant="outline" className="text-sm">{template.scraping_type}</Badge>
        </div>
        <p className="text-base text-muted-foreground truncate mb-4">
          {template.example_url}
        </p>
        <Button variant="outline" size="lg" className="w-full btn-enhanced text-lg">
          <Plus className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </CardContent>
    </Card>
  );
}