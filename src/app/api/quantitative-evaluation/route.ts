import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt, iterations, batchSize = 5, model } = await request.json();

    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') || 
                   request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 401 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {        const results = [];
        const BATCH_SIZE = Math.min(Math.max(batchSize, 1), 10); // Clamp between 1-10
        const batches = Math.ceil(iterations / BATCH_SIZE);
        let completedIterations = 0;

        // Helper function to process a single iteration
        const processIteration = async (iterationIndex: number, retryCount = 0): Promise<any> => {
          const MAX_RETRIES = 3;
          
          try {
            const completion = await openai.chat.completions.create({
              model: model || 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: userPrompt,
                },
              ],
              temperature: 0.7,
            });

            const output = completion.choices[0]?.message?.content || '';

            // Try to parse the output as JSON
            let parsedOutput;
            try {
              // First try direct parsing
              try {
                parsedOutput = JSON.parse(output);
              } catch (directParseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = output.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                  parsedOutput = JSON.parse(jsonMatch[1]);
                } else {
                  // Try to find JSON without code blocks
                  const jsonStart = output.indexOf('{');
                  const jsonEnd = output.lastIndexOf('}');
                  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    const jsonStr = output.substring(jsonStart, jsonEnd + 1);
                    parsedOutput = JSON.parse(jsonStr);
                  } else {
                    throw new Error('No valid JSON found');
                  }
                }
              }

              if (parsedOutput.quantitative && parsedOutput.languageAnalysis) {
                return { success: true, data: parsedOutput, iteration: iterationIndex };
              } else {
                return { success: true, data: createMockResult(), iteration: iterationIndex };
              }
            } catch (parseError) {
              console.error(`Parse error in iteration ${iterationIndex + 1}:`, parseError);
              return { success: true, data: createMockResult(), iteration: iterationIndex };
            }
          } catch (error: any) {
            console.error(`Error in iteration ${iterationIndex + 1}, attempt ${retryCount + 1}:`, error);
            
            // Check if it's a rate limit error and we haven't exceeded max retries
            if (retryCount < MAX_RETRIES && (
              error.status === 429 || 
              error.message?.includes('rate limit') ||
              error.code === 'rate_limit_exceeded'
            )) {
              // Exponential backoff: wait longer for each retry
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              return processIteration(iterationIndex, retryCount + 1);
            }
            
            // If not a rate limit error or max retries exceeded, return mock result
            return { success: false, data: createMockResult(), iteration: iterationIndex, error: error.message };
          }
        };

        // Process iterations in batches
        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
          const startIdx = batchIndex * BATCH_SIZE;
          const endIdx = Math.min(startIdx + BATCH_SIZE, iterations);
          
          // Create promises for this batch
          const batchPromises = [];
          for (let i = startIdx; i < endIdx; i++) {
            batchPromises.push(processIteration(i));
          }

          try {
            // Wait for all requests in this batch to complete
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Process results and update progress
            for (const result of batchResults) {
              completedIterations++;
              
              if (result.status === 'fulfilled') {
                results.push(result.value.data);
              } else {
                console.error('Batch promise rejected:', result.reason);
                results.push(createMockResult());
              }

              // Send progress update for each completed iteration
              const progress = Math.round((completedIterations / iterations) * 100);
              const progressData = JSON.stringify({ 
                progress,
                completed: completedIterations,
                total: iterations,
                batchIndex: batchIndex + 1,
                totalBatches: batches
              });
              controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
            }

            // Add a small delay between batches to be respectful to API rate limits
            if (batchIndex < batches - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (batchError) {
            console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
            
            // If a batch fails, add mock results for the remaining iterations in this batch
            for (let i = startIdx; i < endIdx; i++) {
              results.push(createMockResult());
              completedIterations++;
              
              const progress = Math.round((completedIterations / iterations) * 100);
              const progressData = JSON.stringify({ 
                progress,
                completed: completedIterations,
                total: iterations,
                error: `Batch ${batchIndex + 1} failed`
              });
              controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
            }
          }
        }

        // Calculate statistics
        const statistics = calculateStatistics(results);

        const finalResults = {
          iterations,
          rawResults: results,
          statistics,
        };

        // Send final results
        const resultsData = JSON.stringify({ results: finalResults });
        controller.enqueue(encoder.encode(`data: ${resultsData}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in quantitative evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to perform quantitative evaluation' },
      { status: 500 }
    );
  }
}

function createMockResult() {
  return {
    quantitative: {
      communicationScore: 0,
      communicationJustification: "Sample communication assessment",
      persuasivenessScore: 0, // 6-8
      persuasivenessJustification: "Sample persuasiveness assessment",
      professionalismScore: 0, // 8-10
      professionalismJustification: "Sample professionalism assessment",
      callObjectiveScore: 0, // 7-9
      callObjectiveJustification: "Sample objective assessment",
      languageQualityScore: 0, // 7-9
      languageQualityJustification: "Sample language quality assessment",
      overallScore: 0,
    },
    languageAnalysis: {
      fillerWords: {
        count: 0,
        instances: [],
        percentage: 0,
        citation: [],
      },
      weakWords: {
        count: 0,
        instances: [],
        percentage: 0,
        citation: [],
      },
      sentenceStarters: {
        mostUsed: [],
        repetitionCount: 0,
        varietyScore: 0,
        citation: [],
      },
    },
  };
}

function calculateStatistics(results: any[]) {
  const metrics = [
    'communicationScore',
    'persuasivenessScore',
    'professionalismScore',
    'callObjectiveScore',
    'languageQualityScore',
    'overallScore',
  ];

  const languageMetrics = [
    'fillerWordsPercentage',
    'weakWordsPercentage',
    'varietyScore',
  ];

  const statistics: any = {};

  // Calculate statistics for quantitative metrics
  metrics.forEach(metric => {
    const values = results.map(r => r.quantitative[metric]);
    statistics[metric] = getStatistics(values);
  });

  // Calculate statistics for language analysis metrics
  statistics.fillerWordsPercentage = getStatistics(
    results.map(r => r.languageAnalysis.fillerWords.percentage)
  );
  statistics.weakWordsPercentage = getStatistics(
    results.map(r => r.languageAnalysis.weakWords.percentage)
  );
  statistics.varietyScore = getStatistics(
    results.map(r => r.languageAnalysis.sentenceStarters.varietyScore)
  );

  return statistics;
}

function getStatistics(values: number[]) {
  const sorted = values.sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const mode = getMode(values);
  
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
  };
}

function getMode(arr: number[]): number[] {
  const frequency: { [key: number]: number } = {};
  arr.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
  });

  const maxFrequency = Math.max(...Object.values(frequency));
  return Object.keys(frequency)
    .filter(key => frequency[Number(key)] === maxFrequency)
    .map(Number);
}
