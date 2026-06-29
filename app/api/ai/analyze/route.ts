import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // 1. Fetch available categories from database to give Gemini context
    const supabase = createServerClient();
    const { data: categories, error } = await supabase.from('categories').select('id, name, description');
    
    if (error || !categories) {
      return NextResponse.json({ error: 'Failed to fetch categories context' }, { status: 500 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback Mock if no API key is provided yet
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback mock data.');
      // Simple keyword matching mock
      const isWater = description.toLowerCase().includes('water') || description.toLowerCase().includes('flood');
      const plumbingCat = categories.find(c => c.name === 'Plumber') || categories[0];
      
      return NextResponse.json({
        success: true,
        analysis: {
          categoryId: plumbingCat.id,
          severity: isWater ? 'HIGH' : 'MEDIUM',
          suggestedPrice: isWater ? 250 : 150,
          reasoning: "MOCK AI: Based on the keywords, this seems like a plumbing issue. Please add GEMINI_API_KEY to your .env to enable real AI analysis.",
        }
      });
    }

    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // 3. Define the expected JSON schema output
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        categoryId: {
          type: Type.STRING,
          description: "The exact UUID of the best matching category from the provided list.",
        },
        severity: {
          type: Type.STRING,
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description: "The severity of the emergency.",
        },
        suggestedPrice: {
          type: Type.INTEGER,
          description: "Suggested starting price in Euros. Min 50, Max 900. Higher for high severity or complex tasks.",
        },
        reasoning: {
          type: Type.STRING,
          description: "A short 1-2 sentence explanation of why this category, severity, and price were chosen.",
        },
      },
      required: ["categoryId", "severity", "suggestedPrice", "reasoning"],
    };

    // 4. Construct prompt
    const prompt = `
      You are an expert German 'Handwerker-Notdienst' (Emergency Craftsman) dispatcher AI.
      Analyze the following customer emergency description:
      "${description}"

      Available Categories:
      ${JSON.stringify(categories, null, 2)}

      Task:
      1. Pick the best matching category ID.
      2. Determine the severity.
      3. Suggest a fair starting price (in EUR) based on realistic German market rates for emergency services. 
         - Include an estimated 'Anfahrtspauschale' (travel fee, typically €40-€80).
         - Include an estimated hourly rate for emergency work (e.g. €80-€150/hr).
         - Apply the standard German VAT (MwSt.) of 19% to the final total.
         - Make sure the final suggestedPrice is the GROSS amount (Brutto) including the 19% tax.
      4. Provide a brief reasoning, mentioning that the price includes German market rates, travel fees, and 19% VAT.
    `;

    // 5. Call Gemini with automatic retries for 503 High Demand errors
    let response;
    let retries = 3;
    let delay = 1000; // start with 1 second delay
    
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.1,
          }
        });
        break; // If successful, break out of the retry loop
      } catch (e: any) {
        const is503 = e?.status === 503 || (e?.message && e.message.includes('503'));
        const is429 = e?.status === 429 || (e?.message && e.message.includes('429')) || (e?.message && e.message.includes('quota'));
        
        if (is503 && retries > 1) {
          retries--;
          console.warn(`Gemini API 503 Error. Retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff: 1s -> 2s -> 4s
        } else if (is429) {
          return NextResponse.json({ 
            success: false,
            error: 'AI Quota Exceeded. The AI feature is temporarily unavailable due to limits on the free Google API key. Please manually select a category and enter a price below to continue.' 
          }, { status: 429 });
        } else {
          throw e; // Throw if it's not a 503 or we ran out of retries
        }
      }
    }

    if (!response || !response.text) {
      throw new Error('No response from AI');
    }

    const analysis = JSON.parse(response.text);

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze emergency' }, { status: 500 });
  }
}
