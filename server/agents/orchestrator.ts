// Modular Agent Orchestrator designed for seamless future integration with Lyzr Agent Studio.
import { isGeminiConfigured } from '../services/geminiClient.ts';
import { getSpeechProviderStatus } from '../services/speechInterface.ts';

export interface AgentDescriptor {
  id: 'intake' | 'pricing' | 'allocation' | 'tracking_quality' | 'payout';
  name: string;
  responsibility: string;
  humanAuthorityBoundary: string;
  deterministicComponent: string;
  aiComponent: string;
}

export const SAHAYAK_AGENTS: AgentDescriptor[] = [
  {
    id: 'intake',
    name: 'Intake Agent',
    responsibility: 'Converts regional-language voice transcripts into structured order fields.',
    humanAuthorityBoundary: 'SHG Leader reviews, edits, and confirms before creating the order.',
    deterministicComponent: 'Input validation, unique order ID generation, date math.',
    aiComponent: 'Gemini 3.5 Transcribe + Gemini 4 Hydrogen structured JSON extraction.',
  },
  {
    id: 'pricing',
    name: 'Pricing Agent',
    responsibility: 'Computes transparent production cost, unit price, and worker piece rate.',
    humanAuthorityBoundary: 'SHG Leader inputs/verifies costs and approves the selling price.',
    deterministicComponent: 'All cost summation, margin calculation, unit price, and piece rate math.',
    aiComponent: 'Gemini 4 Hydrogen plain-language cost fairness explanation.',
  },
  {
    id: 'allocation',
    name: 'Allocation Agent',
    responsibility: 'Recommends fair task distribution across SHG members.',
    humanAuthorityBoundary: 'SHG Leader can edit quantities, redistribute work, and must approve.',
    deterministicComponent: 'Capacity, skill-match, past workload, and availability scoring.',
    aiComponent: 'Gemini 4 Hydrogen transparent per-member assignment explanation.',
  },
  {
    id: 'tracking_quality',
    name: 'Tracking & Quality Agent',
    responsibility: 'Monitors production pace, delivery deadlines, and quality inspection flags.',
    humanAuthorityBoundary: 'Leader holds final authority on accepted/rework pieces and redistribution.',
    deterministicComponent: 'Completion %, pending totals, pace risk threshold, redistribution math.',
    aiComponent: 'Gemini 4 Hydrogen supportive risk advisory and localized work instructions.',
  },
  {
    id: 'payout',
    name: 'Payout Agent',
    responsibility: 'Calculates member earnings and prepares personal audio payout summaries.',
    humanAuthorityBoundary: 'Group approves every payout; transfer status awaits real payment rail.',
    deterministicComponent: 'Accepted pieces × approved rate per piece; total group payout.',
    aiComponent: 'Gemini 3.8 Flash Lite TTS regional audio earnings summary (with demo fallback).',
  },
];

export function getOrchestratorStatus() {
  return {
    orchestrationMode: process.env.LYZR_API_KEY ? 'lyzr-connected' : 'modular-local-orchestrator',
    lyzrReady: Boolean(process.env.LYZR_API_KEY),
    geminiConfigured: isGeminiConfigured(),
    speech: getSpeechProviderStatus(),
    agents: SAHAYAK_AGENTS,
  };
}
