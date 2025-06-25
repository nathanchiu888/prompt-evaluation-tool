import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
    try {
        const { originalPrompt, llmOutput, systemPrompt: userSystemPrompt } =
            await request.json();

        const apiKey =
            request.headers.get("authorization")?.replace("Bearer ", "") ||
            request.headers.get("x-api-key");

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key is required" },
                { status: 401 }
            );
        }

        const openai = new OpenAI({
            apiKey: apiKey,
        });
        
        const evaluationSystemPrompt = `You are an expert prompt engineer and evaluator specializing in optimizing system prompts and user prompts for LLM applications. Your goal is to analyze how well the provided prompts work together and provide actionable feedback for improving them.

Your analysis should focus on:

1. **System Prompt Analysis**: How clear, specific, and effective is the system prompt?
2. **User Prompt Analysis**: How well does the user prompt communicate the desired outcome?
3. **Prompt Synergy**: How well do the two prompts work together?
4. **Output Quality Assessment**: What does the output reveal about prompt effectiveness?
5. **Actionable Improvements**: Specific suggestions for prompt optimization

EVALUATION CRITERIA:
- **Clarity**: Are the prompts clear and unambiguous?
- **Specificity**: Do they provide enough detail and context?
- **Alignment**: Do system and user prompts work together effectively?
- **Completeness**: Do they cover all necessary aspects of the task?
- **Effectiveness**: Do they produce the desired output quality?

You must respond ONLY as a valid JSON object with no additional text, markdown formatting, or code blocks. Use this exact format:

{
  "outputQuality": "detailed assessment of the LLM output quality and what it reveals about prompt effectiveness",
  "objectiveFulfillment": "assessment of how well the prompts achieved their intended objectives",
  "hallucinationCheck": "analysis of factual accuracy and what this indicates about prompt clarity",
  "reflection": "thoughtful analysis of prompt strengths, weaknesses, and optimization opportunities",
  "overallScore": 0,
  "recommendations": [
    "specific, actionable recommendation for improving the system prompt",
    "specific, actionable recommendation for improving the user prompt", 
    "specific, actionable recommendation for better prompt synergy",
    "specific, actionable recommendation for prompt optimization"
  ]
}

IMPORTANT REQUIREMENTS:
- Respond with ONLY the JSON object
- Do not use markdown code blocks or any other formatting
- Ensure the overallScore is an integer between 0-100
- Make all text fields detailed and specific to prompt optimization
- Include 3-5 actionable recommendations specifically for improving the prompts
- Focus on how to make the prompts more effective, not just on output quality
- Provide specific, actionable feedback that users can implement immediately`;

        const evaluationUserPrompt = `ORIGINAL SYSTEM PROMPT:
${userSystemPrompt}

ORIGINAL USER PROMPT:
${originalPrompt}

LLM OUTPUT GENERATED:
${llmOutput}

Please analyze the effectiveness of the system prompt and user prompt combination, and provide detailed feedback on how to optimize them.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: evaluationSystemPrompt,
                },
                {
                    role: "user",
                    content: evaluationUserPrompt,
                },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
        });
        const evaluationContent = completion.choices[0]?.message?.content || "";

        try {
            // First try to parse directly
            let evaluation;
            try {
                evaluation = JSON.parse(evaluationContent);
            } catch (directParseError) {
                // If direct parsing fails, try to extract JSON from markdown code blocks
                console.log(directParseError);
                const jsonMatch = evaluationContent.match(
                    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
                );
                if (jsonMatch && jsonMatch[1]) {
                    evaluation = JSON.parse(jsonMatch[1]);
                } else {
                    // Try to find JSON without code blocks
                    const jsonStart = evaluationContent.indexOf("{");
                    const jsonEnd = evaluationContent.lastIndexOf("}");
                    if (
                        jsonStart !== -1 &&
                        jsonEnd !== -1 &&
                        jsonEnd > jsonStart
                    ) {
                        const jsonStr = evaluationContent.substring(
                            jsonStart,
                            jsonEnd + 1
                        );
                        evaluation = JSON.parse(jsonStr);
                    } else {
                        throw new Error("No valid JSON found");
                    }
                }
            }

            return NextResponse.json(evaluation);
        } catch (parseError) {
            console.error("Parse error:", parseError);
            console.error("Content:", evaluationContent);

            // If JSON parsing fails, try to extract information manually
            return NextResponse.json({
                outputQuality: "Unable to parse evaluation response",
                objectiveFulfillment: "Unable to parse evaluation response",
                hallucinationCheck: "Unable to parse evaluation response",
                reflection: evaluationContent,
                overallScore: 5,
                recommendations: ["Please try again with a different prompt"],
            });
        }
    } catch (error) {
        console.error("Error getting qualitative evaluation:", error);
        return NextResponse.json(
            { error: "Failed to get qualitative evaluation" },
            { status: 500 }
        );
    }
}
