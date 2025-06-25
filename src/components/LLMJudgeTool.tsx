'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import QualitativeEvaluation from './QualitativeEvaluation';
import QuantitativeEvaluation from './QuantitativeEvaluation';
import { useEvaluation } from '@/lib/evaluationContext';

export default function LLMJudgeTool() {
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { activeTab, setActiveTab, isLoaded: isContextLoaded } = useEvaluation();

  // Check if API key is already stored (client-side only)
  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsApiKeySet(true);
    }
    setIsLoaded(true);
  }, []);

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setIsApiKeySet(true);
    }
  };

  // Show loading state until component is hydrated and context is loaded
  if (!isLoaded || !isContextLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isApiKeySet) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Please enter your OpenAI API key to use the LLM Judge testing tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button onClick={handleApiKeySubmit} className="w-full">
              Save API Key
            </Button>
            <p className="text-sm text-muted-foreground">
              Your API key is stored locally.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Badge variant="secondary" className="mb-2">
            API Key Configured
          </Badge>
        </div>        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem('openai_api_key');
            setIsApiKeySet(false);
            setApiKey('');
          }}
        >
          Change API Key
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quantitative">Quantitative Analysis</TabsTrigger>
          <TabsTrigger value="qualitative">Qualitative Evaluation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quantitative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quantitative Summary Analysis</CardTitle>
              <CardDescription>
                Run multiple iterations and get statistical analysis of your prompt performance with detailed metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuantitativeEvaluation />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualitative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Qualitative Prompt Optimization</CardTitle>
              <CardDescription>
                Test your prompts and get actionable feedback on how to optimize your system prompt and user prompt for better results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QualitativeEvaluation />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
