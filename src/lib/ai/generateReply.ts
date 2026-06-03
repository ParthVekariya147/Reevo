/**
 * AI reply generator for owner-facing "Draft Mode".
 * Same multi-provider + key-rotation pattern as generate.ts.
 * Provider order: Anthropic → OpenAI → Gemini, with fallback text.
 */

import Anthropic             from '@anthropic-ai/sdk';
import OpenAI                from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type ReplyLength = 'short' | 'medium' | 'long';

export interface ReplyRequest {
  reviewText:  string;
  rating:      number;      // 1–5
  tone:        string;      // 'friendly' | 'professional' | 'casual' | etc.
  signature:   string | null;
  language:    string;      // BCP-47 e.g. 'en', 'es', 'hi'
  replyLength: ReplyLength;
}

// ── Key helpers (identical to generate.ts) ────────────────────

function loadKeys(prefix: string): string[] {
  const keys: string[] = [];
  const base = process.env[prefix];
  if (base?.trim()) keys.push(base.trim());
  for (let i = 1; i <= 9; i++) {
    const k = process.env[`${prefix}_${i}`]?.trim();
    if (k) keys.push(k);
  }
  return keys;
}

function nextKey(keys: string[]): string {
  return keys[Math.floor(Math.random() * keys.length)];
}

// ── Prompt ───────────────────────────────────────────────────

function buildPrompt(req: ReplyRequest): string {
  const lengthGuide =
    req.replyLength === 'short'  ? '1 sentence (about 15–20 words)' :
    req.replyLength === 'medium' ? '2–3 sentences (about 30–60 words)' :
                                   '4–5 sentences (about 70–120 words)';

  const ratingGuidance =
    req.rating >= 4
      ? 'The customer left a positive review. Thank them warmly and specifically; keep enthusiasm genuine but not over-the-top.'
      : req.rating === 3
      ? 'The customer left a mixed review. Thank them for the feedback and lightly acknowledge there is room to improve — no defensiveness.'
      : 'The customer left a negative review. Be empathetic, apologise sincerely, and invite them to contact you directly to resolve the issue. Never be defensive, never make excuses, never argue.';

  const langNote = req.language !== 'en'
    ? `Write entirely in the language with BCP-47 code "${req.language}".`
    : 'Write in English.';

  const sigLine = req.signature?.trim()
    ? `\nEnd the reply with this signature on its own line: "${req.signature.trim()}"`
    : '';

  return `You are a business owner responding to a customer review on Google Maps.

Customer review (rating: ${req.rating}/5):
"""
${req.reviewText}
"""

Instructions:
- Write the reply AS the business owner, directly TO the customer.
- Tone: ${req.tone}.
- Length: ${lengthGuide}.
- ${ratingGuidance}
- Sound human and genuine — never robotic or templated.
- No fake promises ("we will do better next time" is fine; "we guarantee 100% perfection" is not).
- No emojis unless the customer used them in their review.
- ${langNote}${sigLine}

Output ONLY the reply text. No preamble, no quotes, no labels.`;
}

// ── Providers ────────────────────────────────────────────────

async function withAnthropic(req: ReplyRequest): Promise<string> {
  const keys = loadKeys('ANTHROPIC_API_KEY');
  if (!keys.length) throw new Error('No Anthropic keys configured');
  const client = new Anthropic({ apiKey: nextKey(keys) });
  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages:   [{ role: 'user', content: buildPrompt(req) }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Anthropic response type');
  return block.text.trim();
}

async function withOpenAI(req: ReplyRequest): Promise<string> {
  const keys = loadKeys('OPENAI_API_KEY');
  if (!keys.length) throw new Error('No OpenAI keys configured');
  const client = new OpenAI({ apiKey: nextKey(keys) });
  const res = await client.chat.completions.create({
    model:      'gpt-4o-mini',
    max_tokens: 256,
    messages:   [{ role: 'user', content: buildPrompt(req) }],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI response');
  return text.trim();
}

async function withGemini(req: ReplyRequest): Promise<string> {
  const keys = loadKeys('GEMINI_API_KEY');
  if (!keys.length) throw new Error('No Gemini keys configured');
  const client = new GoogleGenerativeAI(nextKey(keys));
  const model  = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const res    = await model.generateContent(buildPrompt(req));
  const text   = res.response.text();
  if (!text) throw new Error('Empty Gemini response');
  return text.trim();
}

function hasAnyKey(): boolean {
  return (
    loadKeys('ANTHROPIC_API_KEY').length > 0 ||
    loadKeys('OPENAI_API_KEY').length    > 0 ||
    loadKeys('GEMINI_API_KEY').length    > 0
  );
}

const FALLBACK_REPLIES = [
  'Thank you so much for taking the time to share your experience with us — we truly appreciate it and look forward to welcoming you back soon.',
  'We really appreciate you leaving us a review! Your feedback means a lot to our team and we hope to see you again.',
  'Thank you for the kind words! It was a pleasure serving you and we look forward to your next visit.',
];

function fallbackReply(): string {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

// ── Public entry point ────────────────────────────────────────

const PROVIDERS = [withAnthropic, withOpenAI, withGemini];

export async function generateReply(req: ReplyRequest): Promise<string> {
  if (!hasAnyKey()) return fallbackReply();

  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      return await provider(req);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  console.warn('[ai/generateReply] All providers failed, using fallback:', errors.join(' | '));
  return fallbackReply();
}
