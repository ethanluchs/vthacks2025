import { NextRequest, NextResponse } from 'next/server';

// Read from environment variables (never commit your actual key in code)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const GEMINI_API_URL =
  process.env.GEMINI_API_URL ||
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

interface AIFixRequest {
  code: string;
  issueType: string;
  context?: string;
}

interface AIFixResponse {
  originalCode: string;
  improvedCode: string;
  explanation: string;
}

export async function POST(request: NextRequest) {
  console.log('🔥 AI Fix API called');
  try {
    const body: AIFixRequest = await request.json();
    console.log('📝 Request body:', body);
    
    const { code, issueType, context } = body;

    if (!code || !issueType) {
      console.log('Missing required fields:', { code: !!code, issueType: !!issueType });
      return NextResponse.json({ error: 'Code and issueType are required' }, { status: 400 });
    }

    // Create accessibility-focused prompt
    const prompt = createAccessibilityPrompt(code, issueType, context);

    // TEST MODE: Return a mock response for debugging
    const testMode = true; // Set to true to test without API call
    if (testMode) {
      console.log('🧪 TEST MODE: Returning mock response');
      const mockResponse = {
        originalCode: code,
        improvedCode: code.includes('img') 
          ? code.replace('<img', '<img alt="Accessible image description"')
          : code.replace('<button', '<button aria-label="Button description"'),
        explanation: 'Added proper accessibility attributes to improve WCAG compliance.'
      };
      return NextResponse.json(mockResponse);
    }

    // Call Gemini API
    console.log('🤖 Calling Gemini API with prompt:', prompt.substring(0, 200) + '...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1000,
        }
      }),
    });

    console.log('🌐 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API response:', data);
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('❌ No generated text from Gemini');
      throw new Error('No response from Gemini API');
    }

    console.log('📄 Generated text:', generatedText);

    // Parse the AI response
    const parsedResponse = parseAIResponse(generatedText, code);
    console.log('✨ Parsed response:', parsedResponse);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('❌ AI Fix API Error Details:', error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI fix',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'AI Fix API is working',
    timestamp: new Date().toISOString()
  });
}

function createAccessibilityPrompt(code: string, issueType: string, context?: string): string {
  const basePrompt = `You are an expert web accessibility consultant. Your task is to fix accessibility issues in HTML code to make it WCAG 2.1 AA compliant.

IMPORTANT: Respond in this exact format:
IMPROVED_CODE:
[Put the corrected HTML code here]

EXPLANATION:
[Brief explanation of what was fixed and why]

Original code with accessibility issues:
\`\`\`html
${code}
\`\`\`

Issue type: ${issueType}
${context ? `Additional context: ${context}` : ''}

Please provide:
1. The corrected HTML code that fixes the accessibility issue
2. A brief explanation of what was changed and why it improves accessibility

Focus on WCAG 2.1 AA compliance. Keep the visual appearance and functionality intact while adding proper accessibility attributes.`;

  return basePrompt;
}

function parseAIResponse(generatedText: string, originalCode: string): AIFixResponse {
  try {
    // Extract improved code
    const codeMatch = generatedText.match(/IMPROVED_CODE:\s*([\s\S]*?)(?=EXPLANATION:|$)/);
    const explanationMatch = generatedText.match(/EXPLANATION:\s*([\s\S]*?)$/);

    let improvedCode = originalCode;
    let explanation = 'AI suggested improvements for better accessibility.';

    if (codeMatch && codeMatch[1]) {
      improvedCode = codeMatch[1]
        .replace(/```html\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim();
    }

    return {
      originalCode,
      improvedCode,
      explanation
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      originalCode,
      improvedCode: originalCode,
      explanation: 'Unable to generate accessibility improvements at this time.'
    };
  }
}