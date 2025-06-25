# LLM as a Judge Testing Tool

A comprehensive testing tool for evaluating LLM outputs with both qualitative and quantitative analysis capabilities.

## Features

### Qualitative Summary Evaluation
- **Input**: System prompt and user prompt
- **Process**: 
  1. Generates LLM output using OpenAI GPT models
  2. Evaluates the output for quality, objective fulfillment, and hallucinations
  3. Provides detailed feedback and recommendations
- **Output**: Comprehensive qualitative analysis with scoring

### Quantitative Summary Analysis
- **Input**: System prompt, user prompt, and number of iterations
- **Process**:
  1. Runs multiple iterations of the same prompt
  2. Collects quantitative metrics from each run
  3. Performs statistical analysis across all iterations
- **Output**: 
  - Statistical summaries (mean, median, mode, standard deviation, variance)
  - Interactive charts and visualizations
  - Detailed performance metrics
  - Language analysis (filler words, weak words, sentence variety)

## Expected JSON Output Format

The tool is designed to work with LLM outputs that follow this JSON structure:

```json
{
  "qualitative": {
    "strengths": [],
    "areasForImprovement": [],
    "overallFeedback": ""
  },
  "quantitative": {
    "communicationScore": 0,
    "communicationJustification": "",
    "persuasivenessScore": 0,
    "persuasivenessJustification": "",
    "professionalismScore": 0,
    "professionalismJustification": "",
    "callObjectiveScore": 0,
    "callObjectiveJustification": "",
    "languageQualityScore": 0,
    "languageQualityJustification": "",
    "overallScore": 0
  },
  "languageAnalysis": {
    "fillerWords": {
      "count": 0,
      "instances": [],
      "percentage": 0.0,
      "citation": []
    },
    "weakWords": {
      "count": 0,
      "instances": [],
      "percentage": 0.0,
      "citation": []
    },
    "sentenceStarters": {
      "mostUsed": [],
      "repetitionCount": 0,
      "varietyScore": 0,
      "citation": []
    }
  },
  "recommendations": []
}
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Setup

1. **API Key Configuration**: On first launch, you'll be prompted to enter your OpenAI API key. This is stored locally in your browser.

2. **Choose Analysis Type**: 
   - Use the "Qualitative Evaluation" tab for single-run comprehensive analysis
   - Use the "Quantitative Analysis" tab for multi-iteration statistical analysis

### Usage

#### Qualitative Evaluation
1. Select your preferred OpenAI model
2. Enter your system prompt
3. Enter your user prompt
4. Click "Run Qualitative Evaluation"
5. Review the LLM output and evaluation results

#### Quantitative Analysis
1. Select your preferred OpenAI model
2. Set the number of iterations (1-50)
3. Enter your system prompt
4. Enter your user prompt
5. Click "Run Quantitative Analysis"
6. Monitor progress and review statistical results
7. Download results as JSON for further analysis


## API Endpoints

- `/api/llm-output`: Generates LLM responses
- `/api/qualitative-evaluation`: Provides qualitative analysis
- `/api/quantitative-evaluation`: Performs multi-iteration quantitative analysis with streaming
