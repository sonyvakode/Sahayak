import { ThinkingLevel, Type } from '@google/genai';
import { getGeminiClient } from '../services/geminiClient.ts';
import type { SupportedLanguage } from '../services/speechInterface.ts';

export interface ExtractedOrderDraft {
  productName: string;
  quantity: number | null;
  deadlineDays: number | null;
  buyerName: string;
  notes: string;
  englishSummary: string;
  confidence: number;
  extractionMode: 'gemini-4-hydrogen' | 'deterministic-parser-demo';
  missingFields: string[];
}

function deterministicFallbackParse(transcript: string): ExtractedOrderDraft {
  const clean = transcript.trim();
  const numbers = clean.match(/\d+/g)?.map((n) => parseInt(n, 10)) ?? [];

  let quantity: number | null = null;
  let deadlineDays: number | null = null;

  const qtyMatch = clean.match(/(\d+)\s*(?:cotton\s*bags?|bags?|pouches?|jars?|pieces?|pcs|units?|బ్యాగులు|సంచులు|పౌచ్|बैग|थैले|पाउच|ಬ್ಯಾಗ್|ಚೀಲ)/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  } else if (numbers.length > 0) {
    quantity = numbers[0];
  }

  const dayMatch = clean.match(/(\d+)\s*(?:days?|రోజుల్లో|రోజులు|दिन|दिनों|ದಿನ|ದಿನಗಳಲ್ಲಿ)/i);
  if (dayMatch) {
    deadlineDays = parseInt(dayMatch[1], 10);
  } else if (numbers.length > 1) {
    deadlineDays = numbers[1];
  }

  let productName = 'Custom Handcrafted Item';
  const lower = clean.toLowerCase();
  if (lower.includes('cotton') || lower.includes('కాటన్') || lower.includes('सूती') || lower.includes('ಹತ್ತಿ')) {
    productName = 'Cotton Bags';
  } else if (lower.includes('jute') || lower.includes('జ్యూట్') || lower.includes('जूट') || lower.includes('ಸೆಣಬು')) {
    productName = 'Handwoven Jute Pouches';
  } else if (lower.includes('bag') || lower.includes('బ్యాగ్') || lower.includes('बैग') || lower.includes('ಬ್ಯಾಗ್')) {
    productName = 'Cotton Bags';
  } else if (lower.includes('pouch') || lower.includes('పౌచ్')) {
    productName = 'Handwoven Jute Pouches';
  }

  const missingFields: string[] = [];
  if (!quantity) missingFields.push('quantity');
  if (!deadlineDays) missingFields.push('deadlineDays');

  return {
    productName,
    quantity,
    deadlineDays,
    buyerName: 'Walk-in / Voice Order Buyer',
    notes: clean,
    englishSummary: clean,
    confidence: missingFields.length === 0 ? 0.88 : 0.65,
    extractionMode: 'deterministic-parser-demo',
    missingFields,
  };
}

export async function runIntakeAgent(
  transcript: string,
  language: SupportedLanguage
): Promise<ExtractedOrderDraft> {
  const ai = getGeminiClient();
  if (!ai) {
    return deterministicFallbackParse(transcript);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Extract structured SHG customer order fields from this spoken order transcript (language code: ${language}).
Transcript: "${transcript}"

Rules:
- Do NOT invent missing numbers. If quantity or delivery days are not mentioned, return null for that field.
- Normalize product name cleanly in English title case (e.g. "Cotton Bags", "Handwoven Jute Pouches").
- Provide a concise English summary of the request.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Product name in English title case' },
            quantity: { type: Type.INTEGER, nullable: true, description: 'Requested quantity or null if missing' },
            deadlineDays: { type: Type.INTEGER, nullable: true, description: 'Requested delivery deadline in days or null if missing' },
            buyerName: { type: Type.STRING, description: 'Customer or organization name if stated, else "Customer Order"' },
            notes: { type: Type.STRING, description: 'Special quality or packaging notes' },
            englishSummary: { type: Type.STRING, description: 'Clear 1-sentence English summary of the transcript' },
            confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 1' },
          },
          required: ['productName', 'buyerName', 'notes', 'englishSummary', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<ExtractedOrderDraft>;
    const missingFields: string[] = [];
    if (!parsed.quantity) missingFields.push('quantity');
    if (!parsed.deadlineDays) missingFields.push('deadlineDays');

    return {
      productName: parsed.productName || 'Cotton Bags',
      quantity: typeof parsed.quantity === 'number' ? parsed.quantity : null,
      deadlineDays: typeof parsed.deadlineDays === 'number' ? parsed.deadlineDays : null,
      buyerName: parsed.buyerName || 'Customer Order',
      notes: parsed.notes || transcript,
      englishSummary: parsed.englishSummary || transcript,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
      extractionMode: 'gemini-4-hydrogen',
      missingFields,
    };
  } catch (err) {
    console.error('IntakeAgent Gemini error:', err);
    return deterministicFallbackParse(transcript);
  }
}
