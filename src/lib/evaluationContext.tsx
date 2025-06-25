'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types for evaluation data
interface QualitativeEvaluationData {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  result: any;
  llmOutput: string;
  timestamp: string;
}

interface QuantitativeEvaluationData {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  iterations: number;
  batchSize: number;
  results: any;
  timestamp: string;
}

interface EvaluationContextType {
  // Qualitative evaluation state
  qualitativeData: QualitativeEvaluationData | null;
  saveQualitativeEvaluation: (data: Omit<QualitativeEvaluationData, 'timestamp'>) => void;
  clearQualitativeEvaluation: () => void;
  
  // Quantitative evaluation state
  quantitativeData: QuantitativeEvaluationData | null;
  saveQuantitativeEvaluation: (data: Omit<QuantitativeEvaluationData, 'timestamp'>) => void;
  clearQuantitativeEvaluation: () => void;
  
  // Active tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Loading state
  isLoaded: boolean;
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [qualitativeData, setQualitativeData] = useState<QualitativeEvaluationData | null>(null);
  const [quantitativeData, setQuantitativeData] = useState<QuantitativeEvaluationData | null>(null);
  const [activeTab, setActiveTab] = useState('qualitative');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      // Load qualitative evaluation data
      const storedQualitative = localStorage.getItem('last_qualitative_evaluation');
      if (storedQualitative) {
        setQualitativeData(JSON.parse(storedQualitative));
      }

      // Load quantitative evaluation data
      const storedQuantitative = localStorage.getItem('last_quantitative_evaluation');
      if (storedQuantitative) {
        setQuantitativeData(JSON.parse(storedQuantitative));
      }

      // Load active tab
      const storedActiveTab = localStorage.getItem('active_tab');
      if (storedActiveTab) {
        setActiveTab(storedActiveTab);
      }
    } catch (error) {
      console.error('Error loading evaluation data from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save qualitative evaluation data
  const saveQualitativeEvaluation = (data: Omit<QualitativeEvaluationData, 'timestamp'>) => {
    const evaluationData: QualitativeEvaluationData = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    
    setQualitativeData(evaluationData);
    localStorage.setItem('last_qualitative_evaluation', JSON.stringify(evaluationData));
  };

  // Clear qualitative evaluation data
  const clearQualitativeEvaluation = () => {
    setQualitativeData(null);
    localStorage.removeItem('last_qualitative_evaluation');
  };

  // Save quantitative evaluation data
  const saveQuantitativeEvaluation = (data: Omit<QuantitativeEvaluationData, 'timestamp'>) => {
    const evaluationData: QuantitativeEvaluationData = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    
    setQuantitativeData(evaluationData);
    localStorage.setItem('last_quantitative_evaluation', JSON.stringify(evaluationData));
  };

  // Clear quantitative evaluation data
  const clearQuantitativeEvaluation = () => {
    setQuantitativeData(null);
    localStorage.removeItem('last_quantitative_evaluation');
  };

  // Update active tab and save to localStorage
  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('active_tab', tab);
  };

  const value: EvaluationContextType = {
    qualitativeData,
    saveQualitativeEvaluation,
    clearQualitativeEvaluation,
    quantitativeData,
    saveQuantitativeEvaluation,
    clearQuantitativeEvaluation,
    activeTab,
    setActiveTab: handleSetActiveTab,
    isLoaded,
  };

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluation() {
  const context = useContext(EvaluationContext);
  if (context === undefined) {
    throw new Error('useEvaluation must be used within an EvaluationProvider');
  }
  return context;
} 