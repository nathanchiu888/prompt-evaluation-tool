'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Clock } from 'lucide-react';
import { samplePrompts, type SamplePromptKey } from '@/lib/samplePrompts';
import { useEvaluation } from '@/lib/evaluationContext';

interface EvaluationResult {
  outputQuality: string;
  objectiveFulfillment: string;
  hallucinationCheck: string;
  reflection: string;
  overallScore: number;
  recommendations: string[];
}

export default function QualitativeEvaluation() {
  const { qualitativeData, saveQualitativeEvaluation, clearQualitativeEvaluation } = useEvaluation();
  
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [llmOutput, setLlmOutput] = useState('');

  // Load saved data on mount
  useEffect(() => {
    if (qualitativeData) {
      setSystemPrompt(qualitativeData.systemPrompt);
      setUserPrompt(qualitativeData.userPrompt);
      setModel(qualitativeData.model);
      setResult(qualitativeData.result);
      setLlmOutput(qualitativeData.llmOutput);
    }
  }, [qualitativeData]);

  const loadSamplePrompt = (key: SamplePromptKey) => {
    const sample = samplePrompts[key];
    setSystemPrompt(sample.systemPrompt);
    setUserPrompt(sample.userPrompt);
  };

  const handleEvaluate = async () => {
    if (!systemPrompt.trim() || !userPrompt.trim()) {
      alert('Please provide both system and user prompts');
      return;
    }

    setLoading(true);
    setResult(null);
    setLlmOutput('');    try {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key found');
      }

      // First, get the LLM output
      const outputResponse = await fetch('/api/llm-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          model,
        }),
      });

      if (!outputResponse.ok) {
        throw new Error('Failed to get LLM output');
      }

      const outputData = await outputResponse.json();
      setLlmOutput(outputData.output);

      // Then, evaluate the output
      const evaluationResponse = await fetch('/api/qualitative-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          originalPrompt: userPrompt,
          llmOutput: outputData.output,
          systemPrompt,
        }),
      });

      if (!evaluationResponse.ok) {
        throw new Error('Failed to get evaluation');
      }      const evaluationData = await evaluationResponse.json();
      
      // Check if we got a proper evaluation or a parsing error
      if (evaluationData.outputQuality === "Unable to parse evaluation response") {
        alert('There was an issue parsing the evaluation response. The model may have returned an unexpected format. Please try again.');
        console.log('Raw evaluation response:', evaluationData.reflection);
      }
      
      setResult(evaluationData);

      // Save the evaluation data to localStorage
      saveQualitativeEvaluation({
        systemPrompt,
        userPrompt,
        model,
        result: evaluationData,
        llmOutput: outputData.output,
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error occurred during evaluation. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (    <div className="space-y-6">
      {/* Sample Prompts Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Load sample prompts to get started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSamplePrompt('callAnalysis')}
            >
              Sales Call Analysis - Good
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSamplePrompt('contentReview')}
            >
              Sales Call Analysis - Poor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Evaluation Info */}
      {qualitativeData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
              <Clock className="h-4 w-4" />
              Last Evaluation
            </CardTitle>
            <CardDescription className="text-blue-700">
              {formatTimestamp(qualitativeData.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearQualitativeEvaluation}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                Clear Saved Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            placeholder="Enter your system prompt here..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userPrompt">User Prompt</Label>
          <Textarea
            id="userPrompt"
            placeholder="Enter your user prompt here..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleEvaluate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Prompts...
            </>
          ) : (
            'Analyze Prompt Effectiveness'
          )}
        </Button>
      </div>

      {llmOutput && (
        <Card>
          <CardHeader>
            <CardTitle>LLM Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{llmOutput}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Optimization Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Prompt Effectiveness Score:</span>
                  <Badge className={`${getScoreColor(result.overallScore)} text-white`}>
                    {result.overallScore}/100
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Output Quality & Prompt Effectiveness</h4>
                  <p className="text-sm text-muted-foreground">{result.outputQuality}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Objective Achievement & Prompt Alignment</h4>
                  <p className="text-sm text-muted-foreground">{result.objectiveFulfillment}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Factual Accuracy & Prompt Clarity</h4>
                  <p className="text-sm text-muted-foreground">{result.hallucinationCheck}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Prompt Analysis & Optimization Insights</h4>
                  <p className="text-sm text-muted-foreground">{result.reflection}</p>
                </div>

                {result.recommendations && result.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Prompt Optimization Recommendations</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
