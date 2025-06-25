'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileText, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import QuantitativeVisualization from './QuantitativeVisualization';
import { samplePrompts, type SamplePromptKey } from '@/lib/samplePrompts';
import { useEvaluation } from '@/lib/evaluationContext';

interface QuantitativeMetrics {
  communicationScore: number;
  persuasivenessScore: number;
  professionalismScore: number;
  callObjectiveScore: number;
  languageQualityScore: number;
  overallScore: number;
}

interface LanguageAnalysis {
  fillerWords: {
    count: number;
    percentage: number;
  };
  weakWords: {
    count: number;
    percentage: number;
  };
  sentenceStarters: {
    varietyScore: number;
    repetitionCount: number;
  };
}

interface StatisticalResults {
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  range: number;
}

interface QuantitativeResults {
  iterations: number;
  rawResults: Array<{
    quantitative: QuantitativeMetrics;
    languageAnalysis: LanguageAnalysis;
  }>;
  statistics: {
    communicationScore: StatisticalResults;
    persuasivenessScore: StatisticalResults;
    professionalismScore: StatisticalResults;
    callObjectiveScore: StatisticalResults;
    languageQualityScore: StatisticalResults;
    overallScore: StatisticalResults;
    fillerWordsPercentage: StatisticalResults;
    weakWordsPercentage: StatisticalResults;
    varietyScore: StatisticalResults;
  };
}

export default function QuantitativeEvaluation() {
  const { quantitativeData, saveQuantitativeEvaluation, clearQuantitativeEvaluation } = useEvaluation();
  
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [iterations, setIterations] = useState(5);
  const [batchSize, setBatchSize] = useState(5);
  const [model, setModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState<{
    completed: number;
    total: number;
    batchIndex?: number;
    totalBatches?: number;
    error?: string;
  }>({ completed: 0, total: 0 });
  const [results, setResults] = useState<QuantitativeResults | null>(null);
  const [dataValidationError, setDataValidationError] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    if (quantitativeData) {
      setSystemPrompt(quantitativeData.systemPrompt);
      setUserPrompt(quantitativeData.userPrompt);
      setIterations(quantitativeData.iterations);
      setBatchSize(quantitativeData.batchSize);
      setModel(quantitativeData.model);
      setResults(quantitativeData.results);
    }
  }, [quantitativeData]);

  const loadSamplePrompt = (key: SamplePromptKey) => {
    const sample = samplePrompts[key];
    setSystemPrompt(sample.systemPrompt);
    setUserPrompt(sample.userPrompt);
  };

  const validateResults = (results: QuantitativeResults): boolean => {
    try {
      // Check if all required statistics exist and are valid numbers
      const requiredStats = [
        'communicationScore', 'persuasivenessScore', 'professionalismScore',
        'callObjectiveScore', 'languageQualityScore', 'overallScore',
        'fillerWordsPercentage', 'weakWordsPercentage', 'varietyScore'
      ];

      for (const statKey of requiredStats) {
        const stats = results.statistics[statKey as keyof typeof results.statistics];
        if (!stats) return false;

        const numericFields = ['mean', 'median', 'standardDeviation', 'variance', 'min', 'max', 'range'];
        for (const field of numericFields) {
          const value = stats[field as keyof typeof stats];
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            return false;
          }
        }
      }

      // Check raw results
      if (!Array.isArray(results.rawResults) || results.rawResults.length === 0) {
        return false;
      }

      for (const result of results.rawResults) {
        if (!result.quantitative || !result.languageAnalysis) {
          return false;
        }

        // Check quantitative scores
        const scores = ['communicationScore', 'persuasivenessScore', 'professionalismScore', 
                       'callObjectiveScore', 'languageQualityScore', 'overallScore'];
        for (const score of scores) {
          const value = result.quantitative[score as keyof typeof result.quantitative];
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            return false;
          }
        }

        // Check language analysis
        const langFields = ['fillerWords', 'weakWords', 'sentenceStarters'];
        for (const field of langFields) {
          const langData = result.languageAnalysis[field as keyof typeof result.languageAnalysis];
          if (!langData) return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Data validation error:', error);
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!systemPrompt.trim() || !userPrompt.trim()) {
      alert('Please provide both system and user prompts');
      return;
    }

    if (iterations < 1 || iterations > 50) {
      alert('Please enter a valid number of iterations (1-50)');
      return;
    }
    setProgressInfo({ completed: 0, total: iterations, batchIndex: 0, totalBatches: Math.ceil(iterations / batchSize) });
    setLoading(true);
    setProgress(0);
    setResults(null);
    setDataValidationError(false);
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key found');
      }

      const response = await fetch('/api/quantitative-evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          iterations,
          batchSize,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get quantitative analysis');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setLoading(false);
                return;
              }              try {
                const parsed = JSON.parse(data);
                if (parsed.progress !== undefined) {
                  setProgress(parsed.progress);
                  setProgressInfo({
                    completed: parsed.completed || 0,
                    total: parsed.total || iterations,
                    batchIndex: parsed.batchIndex,
                    totalBatches: parsed.totalBatches,
                    error: parsed.error
                  });
                } else if (parsed.results) {
                  // Validate the results before setting them
                  if (validateResults(parsed.results)) {
                    setResults(parsed.results);
                    setDataValidationError(false);
                    
                    // Save the evaluation data to localStorage
                    saveQuantitativeEvaluation({
                      systemPrompt,
                      userPrompt,
                      model,
                      iterations,
                      batchSize,
                      results: parsed.results,
                    });
                  } else {
                    setDataValidationError(true);
                    console.error('Invalid data received from API');
                  }
                  setLoading(false);
                }
              } catch (e) {
                // Ignore parsing errors for partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error occurred during analysis. Please check your API key and try again.');
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `quantitative-analysis-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatNumber = (num: number) => {
    // Enhanced safety checking for toFixed errors
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
      return 0;
    }
    
    try {
      return Number(num.toFixed(2));
    } catch (error) {
      console.error('toFixed error:', error, 'for value:', num);
      return 0;
    }
  };

  const getScoreColor = (score: number) => {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
      return 'text-gray-400';
    }
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
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
      {quantitativeData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
              <Clock className="h-4 w-4" />
              Last Evaluation
            </CardTitle>
            <CardDescription className="text-blue-700">
              {formatTimestamp(quantitativeData.timestamp)} • {quantitativeData.iterations} iterations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearQuantitativeEvaluation}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                Clear Saved Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Validation Error Card */}
      {dataValidationError && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Data Validation Error
            </CardTitle>
            <CardDescription className="text-red-700">
              The analysis completed but received invalid data from the LLM. This may be due to a failed or corrupted response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-red-700">
                Some iterations may have failed or returned unexpected data formats. This can happen when:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>The LLM response was incomplete or malformed</li>
                <li>Rate limits were hit during processing</li>
                <li>The model returned non-numeric values where numbers were expected</li>
              </ul>
              <Button 
                onClick={handleAnalyze} 
                variant="outline" 
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rerun Quantitative Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4">
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
            <p className="text-xs text-muted-foreground">GPT-4o working, placeholder for other models (gemini?)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iterations">Number of Iterations</Label>
            <Input
              id="iterations"
              type="number"
              min="1"
              max="50"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size (Concurrent)</Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="10"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              Higher values = faster but may hit rate limits
            </p>
          </div>
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

        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Analysis...
            </>
          ) : (
            'Run Quantitative Analysis'
          )}
        </Button>        {loading && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Completed: {progressInfo.completed} / {progressInfo.total} iterations
              </span>
              {progressInfo.batchIndex && progressInfo.totalBatches && (
                <span>
                  Batch: {progressInfo.batchIndex} / {progressInfo.totalBatches}
                </span>
              )}
            </div>
            {progressInfo.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                Warning: {progressInfo.error}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              💡 Processing {batchSize} requests concurrently per batch for faster results
            </div>
          </div>
        )}
      </div>

      {results && !dataValidationError && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            <Button onClick={downloadResults} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Results (JSON)
            </Button>
          </div>

          {/* Overall Score Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Score Statistics</CardTitle>
              <CardDescription>Statistical analysis of overall performance across {results.iterations} iterations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(results.statistics.overallScore.mean)}`}>
                    {formatNumber(results.statistics.overallScore.mean)}
                  </div>
                  <div className="text-sm text-muted-foreground">Mean</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(results.statistics.overallScore.median)}</div>
                  <div className="text-sm text-muted-foreground">Median</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(results.statistics.overallScore.standardDeviation)}</div>
                  <div className="text-sm text-muted-foreground">Std Dev</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(results.statistics.overallScore.variance)}</div>
                  <div className="text-sm text-muted-foreground">Variance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {/* Visualization Charts */}
            <QuantitativeVisualization 
              statistics={results.statistics}
              rawResults={results.rawResults}
            />

            

            {/* Detailed Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(results.statistics).map(([key, stats]) => {
                    if (key.includes('Score')) {
                      const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="grid grid-cols-6 gap-2 text-sm">
                          <div className="font-medium">{displayName}</div>
                          <div>Mean: {formatNumber(stats.mean)}</div>
                          <div>Median: {formatNumber(stats.median)}</div>
                          <div>Min: {formatNumber(stats.min)}</div>
                          <div>Max: {formatNumber(stats.max)}</div>
                          <div>Std Dev: {formatNumber(stats.standardDeviation)}</div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Language Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Language Analysis Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Filler Words</h4>
                      <div className="text-sm space-y-1">
                        <div>Average: {formatNumber(results.statistics.fillerWordsPercentage.mean)}%</div>
                        <div>Range: {formatNumber(results.statistics.fillerWordsPercentage.min)}% - {formatNumber(results.statistics.fillerWordsPercentage.max)}%</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Weak Words</h4>
                      <div className="text-sm space-y-1">
                        <div>Average: {formatNumber(results.statistics.weakWordsPercentage.mean)}%</div>
                        <div>Range: {formatNumber(results.statistics.weakWordsPercentage.min)}% - {formatNumber(results.statistics.weakWordsPercentage.max)}%</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Sentence Variety</h4>
                    <div className="text-sm space-y-1">
                      <div>Average Variety Score: {formatNumber(results.statistics.varietyScore.mean)}</div>
                      <div>Range: {formatNumber(results.statistics.varietyScore.min)} - {formatNumber(results.statistics.varietyScore.max)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Raw Data Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Results Summary</CardTitle>
                <CardDescription>Results from each iteration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.rawResults.map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-medium">Iteration {index + 1}</span>
                      <Badge variant="outline" className={getScoreColor(result.quantitative.overallScore)}>
                        {result.quantitative.overallScore}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
