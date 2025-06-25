'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

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

interface ChartData {
  name: string;
  value: number;
}

interface QuantitativeVisualizationProps {
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
  rawResults: Array<{
    quantitative: {
      communicationScore: number;
      persuasivenessScore: number;
      professionalismScore: number;
      callObjectiveScore: number;
      languageQualityScore: number;
      overallScore: number;
    };
  }>;
}

export default function QuantitativeVisualization({ statistics, rawResults }: QuantitativeVisualizationProps) {
  // Prepare data for score comparison chart
  const scoreComparisonData: ChartData[] = [
    { name: 'Communication', value: Number(statistics.communicationScore.mean.toFixed(2)) },
    { name: 'Persuasiveness', value: Number(statistics.persuasivenessScore.mean.toFixed(2)) },
    { name: 'Professionalism', value: Number(statistics.professionalismScore.mean.toFixed(2)) },
    { name: 'Call Objective', value: Number(statistics.callObjectiveScore.mean.toFixed(2)) },
    { name: 'Language Quality', value: Number(statistics.languageQualityScore.mean.toFixed(2)) },
    { name: 'Overall', value: Number(statistics.overallScore.mean.toFixed(2)) },
  ];

  // Prepare data for iteration trend chart
  const iterationTrendData = rawResults.map((result, index) => ({
    iteration: index + 1,
    overallScore: result.quantitative.overallScore,
    communicationScore: result.quantitative.communicationScore,
    persuasivenessScore: result.quantitative.persuasivenessScore,
    professionalismScore: result.quantitative.professionalismScore,
    callObjectiveScore: result.quantitative.callObjectiveScore,
    languageQualityScore: result.quantitative.languageQualityScore,
  }));

  // Prepare language analysis data
  const languageAnalysisData: ChartData[] = [
    { name: 'Filler Words %', value: Number(statistics.fillerWordsPercentage.mean.toFixed(2)) },
    { name: 'Weak Words %', value: Number(statistics.weakWordsPercentage.mean.toFixed(2)) },
    { name: 'Variety Score', value: Number(statistics.varietyScore.mean.toFixed(2)) },
  ];

  function calculateq1(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const lowerHalf = sorted.slice(0, mid);
    if (lowerHalf.length === 0) return 0;
    const q1Index = Math.floor(lowerHalf.length / 2);
    return lowerHalf.length % 2 === 0
      ? (lowerHalf[q1Index - 1] + lowerHalf[q1Index]) / 2
      : lowerHalf[q1Index];
  }

  function calculateq3(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const upperHalf = sorted.slice(mid + (sorted.length % 2 === 0 ?
      0 : 1));
    if (upperHalf.length === 0) return 0;
    const q3Index = Math.floor(upperHalf.length / 2);
    return upperHalf.length % 2 === 0
      ? (upperHalf[q3Index - 1] + upperHalf[q3Index]) / 2
      : upperHalf[q3Index];
  }
  function getOutliers(data: number[]): number[] {
    const q1 = calculateq1(data);
    const q3 = calculateq3(data);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return data.filter(value => value < lowerBound || value > upperBound);
  }

  // Prepare data for ApexCharts box plot
  function prepareBoxPlotData() {
    const metrics = [
      { key: 'communicationScore', name: 'Communication' },
      { key: 'persuasivenessScore', name: 'Persuasiveness' },
      { key: 'professionalismScore', name: 'Professionalism' },
      { key: 'callObjectiveScore', name: 'Call Objective' },
      { key: 'languageQualityScore', name: 'Language Quality' },
      { key: 'overallScore', name: 'Overall Score' },
    ];

    return metrics.map(metric => {
      const metricKey = metric.key as keyof typeof statistics;
      const values = rawResults.map(r => r.quantitative[metric.key as keyof typeof r.quantitative]);
      
      // Filter out any null/undefined values for safety
      const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (validValues.length === 0) {
        return {
          x: metric.name,
          y: [0, 0, 0, 0, 0] // [min, q1, median, q3, max]
        };
      }

      const min = Math.min(...validValues);
      const q1 = calculateq1(validValues);
      const median = statistics[metricKey]?.median || 0;
      const q3 = calculateq3(validValues);
      const max = Math.max(...validValues);
      
      // Get outliers for goals (optional visualization)
      const outliers = getOutliers(validValues);
      
      return {
        x: metric.name,
        y: [min, q1, median, q3, max],
        goals: outliers.map(outlier => ({
          value: outlier,
          strokeWidth: 8,
          strokeHeight: 0,
          strokeLineCap: 'round',
          strokeColor: '#f59e0b', // Orange color for outliers
        }))
      };
    });
  }
  const boxPlotData = prepareBoxPlotData();
  
  // Debug logging
  console.log('Box Plot Data for ApexCharts:', boxPlotData);

  // ApexCharts configuration
  const boxPlotSeries: any = [{
    data: boxPlotData
  }];
  
  console.log('Box Plot Series:', boxPlotSeries);

  const boxPlotOptions: any = {
    chart: {
      type: 'boxPlot' as const,
      height: 400
    },
    title: {
      text: '',
      align: 'left' as const
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '50%'
      },
      boxPlot: {
        colors: {
          upper: '#3b82f6',
          lower: '#93c5fd'
        }
      }
    },
    stroke: {
      colors: ['#1f2937']
    },
    xaxis: {
      type: 'category' as const,
      title: {
        text: 'Scores'
      }
    },
    yaxis: {
      title: {
        text: 'Evaluation Metrics'
      },
      min: 0,
      max: 100
    },
    tooltip: {
      shared: false,
      intersect: true
    }
  };
  return (
    <div className="space-y-6">
      {/* ApexCharts Box Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution Analysis</CardTitle>
          <CardDescription>Box and whisker plot showing data distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%' }}>
            <ReactApexChart 
              options={boxPlotOptions} 
              series={boxPlotSeries} 
              type="boxPlot" 
              height={400} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Score Comparison Chart */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Average Score Comparison</CardTitle>
          <CardDescription>Mean scores across all evaluation metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card> */}

      {/* Iteration Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Trends Across Iterations</CardTitle>
          <CardDescription>How scores varied across different test runs</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={iterationTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="iteration" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="overallScore" stroke="#3b82f6" strokeWidth={3} name="Overall" />
              <Line type="monotone" dataKey="communicationScore" stroke="#ef4444" strokeWidth={2} name="Communication" />
              <Line type="monotone" dataKey="persuasivenessScore" stroke="#10b981" strokeWidth={2} name="Persuasiveness" />
              <Line type="monotone" dataKey="professionalismScore" stroke="#f59e0b" strokeWidth={2} name="Professionalism" />
              <Line type="monotone" dataKey="callObjectiveScore" stroke="#8b5cf6" strokeWidth={2} name="Call Objective" />
              <Line type="monotone" dataKey="languageQualityScore" stroke="#06b6d4" strokeWidth={2} name="Language Quality" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Language Analysis Chart */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Language Analysis Metrics</CardTitle>
          <CardDescription>Average language quality indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={languageAnalysisData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card> */}

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consistency Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Standard Deviation:</span>
                <span className="font-medium">{statistics.overallScore.standardDeviation.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Variance:</span>
                <span className="font-medium">{statistics.overallScore.variance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Range:</span>
                <span className="font-medium">{statistics.overallScore.range.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Best Score:</span>
                <span className="font-medium text-green-600">{statistics.overallScore.max.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Worst Score:</span>
                <span className="font-medium text-red-600">{statistics.overallScore.min.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Median:</span>
                <span className="font-medium">{statistics.overallScore.median.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Language Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Filler Words:</span>
                <span className="font-medium">{statistics.fillerWordsPercentage.mean.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Weak Words:</span>
                <span className="font-medium">{statistics.weakWordsPercentage.mean.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Variety Score:</span>
                <span className="font-medium">{statistics.varietyScore.mean.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
