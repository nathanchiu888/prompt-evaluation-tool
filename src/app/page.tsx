import LLMJudgeTool from '@/components/LLMJudgeTool';
import { EvaluationProvider } from '@/lib/evaluationContext';
import { Metadata } from 'next';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">LLM as a Judge Testing Tool</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Evaluate your LLM outputs with qualitative and quantitative analysis
          </p>
        </div>
        <EvaluationProvider>
          <LLMJudgeTool />
        </EvaluationProvider>
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Prompt Evaluation Tool",
  description: "Evaluate your LLM outputs with qualitative and quantitative analysis",
};