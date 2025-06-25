import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userPrompt, model } = await request.json();

    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') || 
                   request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 401 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

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

    return NextResponse.json({ output });
  } catch (error) {
    console.error('Error getting LLM output:', error);
    return NextResponse.json(
      { error: 'Failed to get LLM output' },
      { status: 500 }
    );
  }
}
