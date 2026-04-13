/**
 * AI Investor Engine — powered by claude-opus-4-6
 *
 * Simulates 8 investor personas making realistic investment decisions
 * across espacio-bosques projects. Claude Opus 4.6 evaluates each
 * persona's strategy vs current project state and decides whether to
 * invest, in which project, and how much.
 */
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { DEMO_PROJECTS, addSimInvestment } from '../data/simStore';
import { simulateBuy } from './bitso';
import { fundProject } from './wallet';
import { logger } from '../utils/logger';

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  return _anthropic;
}
const ETH_MXN = 65000;

// ── Investor Personas ─────────────────────────────────────────────────────────

export interface InvestorPersona {
  id: string;
  name: string;
  avatar: string;
  style: string;
  minAmount: number;
  maxAmount: number;
  preferredCategories: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  strategy: string;
  startingBalance: number;
}

export const PERSONAS: InvestorPersona[] = [
  {
    id: 'inv-maria',
    name: 'María Fernández',
    avatar: '👩',
    style: 'Conservative value',
    minAmount: 200,
    maxAmount: 800,
    preferredCategories: ['ENVIRONMENTAL', 'COMMUNITY'],
    riskTolerance: 'conservative',
    strategy: 'I invest small amounts in projects that already have momentum (20%+ funded). Environmental and community focus. I avoid anything that looks too speculative.',
    startingBalance: 150000,
  },
  {
    id: 'inv-carlos',
    name: 'Carlos Ortega',
    avatar: '💼',
    style: 'Aggressive growth',
    minAmount: 2000,
    maxAmount: 12000,
    preferredCategories: ['TECHNOLOGY', 'INFRASTRUCTURE'],
    riskTolerance: 'aggressive',
    strategy: 'I make large bets on early-stage projects, especially technology and infrastructure. I want to be a top investor and I am willing to take risks for higher returns.',
    startingBalance: 600000,
  },
  {
    id: 'inv-sofia',
    name: 'Sofía Reyes',
    avatar: '🔬',
    style: 'Tech specialist',
    minAmount: 500,
    maxAmount: 4000,
    preferredCategories: ['TECHNOLOGY'],
    riskTolerance: 'moderate',
    strategy: 'Technology only. I look for innovation and long-term scalability. I spread investments across multiple rounds rather than going all in at once.',
    startingBalance: 320000,
  },
  {
    id: 'inv-miguel',
    name: 'Miguel Ángel Torres',
    avatar: '🏘️',
    style: 'Community champion',
    minAmount: 300,
    maxAmount: 2000,
    preferredCategories: ['COMMUNITY', 'EDUCATION'],
    riskTolerance: 'conservative',
    strategy: 'Social impact over financial returns. Community spaces, education projects, and local initiatives are my priority. I invest consistently and patiently.',
    startingBalance: 200000,
  },
  {
    id: 'inv-ana',
    name: 'Ana Gutiérrez',
    avatar: '⚖️',
    style: 'Balanced portfolio',
    minAmount: 500,
    maxAmount: 3000,
    preferredCategories: ['INFRASTRUCTURE', 'TECHNOLOGY', 'ENVIRONMENTAL'],
    riskTolerance: 'moderate',
    strategy: 'Diversified across categories. I prefer projects at 30–70% funding where capital has maximum impact. I rebalance constantly to stay diversified.',
    startingBalance: 380000,
  },
  {
    id: 'inv-roberto',
    name: 'Roberto Mendoza',
    avatar: '🌱',
    style: 'Environmental impact',
    minAmount: 400,
    maxAmount: 3500,
    preferredCategories: ['ENVIRONMENTAL'],
    riskTolerance: 'moderate',
    strategy: 'All investments go to environmental projects. Climate action is non-negotiable. I look for measurable sustainability metrics and long-term impact.',
    startingBalance: 260000,
  },
  {
    id: 'inv-valentina',
    name: 'Valentina Cruz',
    avatar: '📚',
    style: 'Education & social',
    minAmount: 200,
    maxAmount: 1500,
    preferredCategories: ['EDUCATION', 'COMMUNITY'],
    riskTolerance: 'conservative',
    strategy: 'Education and social impact come first. I make frequent smaller investments to support many projects simultaneously. Consistency over size.',
    startingBalance: 180000,
  },
  {
    id: 'inv-diego',
    name: 'Diego Morales',
    avatar: '📈',
    style: 'Momentum trader',
    minAmount: 1500,
    maxAmount: 10000,
    preferredCategories: ['TECHNOLOGY', 'INFRASTRUCTURE', 'COMMUNITY', 'ENVIRONMENTAL', 'EDUCATION'],
    riskTolerance: 'aggressive',
    strategy: 'I follow momentum. I invest heavily in projects attracting lots of investment activity. I push projects over the finish line and back multiple categories.',
    startingBalance: 500000,
  },
];

// ── Event types ───────────────────────────────────────────────────────────────

export interface InvestmentEvent {
  type: 'investment' | 'pass' | 'status' | 'thinking' | 'complete' | 'error';
  investor?: Omit<InvestorPersona, 'strategy' | 'startingBalance'>;
  projectId?: string;
  projectTitle?: string;
  amount?: number;
  txHash?: string;
  reasoning?: string;
  stats?: AgentStats;
  timestamp: string;
}

export interface AgentStats {
  running: boolean;
  totalInvested: number;
  txCount: number;
  passCount: number;
  activeInvestors: number;
  round: number;
  startedAt?: string;
}

// ── Emitter & state ───────────────────────────────────────────────────────────

export const investorEmitter = new EventEmitter();
investorEmitter.setMaxListeners(100);

let agentRunning = false;
let agentTimer: NodeJS.Timeout | null = null;
const personaBalances = new Map<string, number>();

let stats: AgentStats = {
  running: false,
  totalInvested: 0,
  txCount: 0,
  passCount: 0,
  activeInvestors: 0,
  round: 0,
};

function emit(event: InvestmentEvent) {
  investorEmitter.emit('event', event);
}

function resetState() {
  for (const p of PERSONAS) personaBalances.set(p.id, p.startingBalance);
  stats = {
    running: true,
    totalInvested: 0,
    txCount: 0,
    passCount: 0,
    activeInvestors: PERSONAS.length,
    round: 0,
    startedAt: new Date().toISOString(),
  };
}

// ── Claude decision engine ────────────────────────────────────────────────────

interface Decision {
  invest: boolean;
  projectId?: string;
  amount?: number;
  reasoning: string;
}

function buildProjectSummary(): string {
  const investable = DEMO_PROJECTS.filter(p => p.status === 'ACTIVE' || p.status === 'PENDING');
  if (investable.length === 0) return 'No active projects.';
  return investable.map(p => {
    const goalEth = Number(BigInt(p.fundingGoal)) / 1e18;
    const raisedEth = Number(BigInt(p.fundingRaised)) / 1e18;
    const pct = goalEth > 0 ? Math.round((raisedEth / goalEth) * 100) : 0;
    const goalMxn = Math.round(goalEth * ETH_MXN).toLocaleString();
    const raisedMxn = Math.round(raisedEth * ETH_MXN).toLocaleString();
    return `• id="${p.id}" title="${p.title}" category=${p.category} funded=${pct}% raised=$${raisedMxn}MXN goal=$${goalMxn}MXN investors=${p._count.investments}`;
  }).join('\n');
}

async function askClaude(persona: InvestorPersona, balance: number): Promise<Decision> {
  const maxAllowed = Math.min(persona.maxAmount, balance);
  if (maxAllowed < persona.minAmount) {
    return { invest: false, reasoning: 'Insufficient balance.' };
  }

  const projectSummary = buildProjectSummary();
  if (projectSummary === 'No active projects.') {
    return { invest: false, reasoning: 'No active projects to invest in.' };
  }

  const systemPrompt = `You are a realistic investor simulation engine. You will play the role of a specific investor and make investment decisions based on their strategy.
Respond ONLY with valid JSON — no markdown, no explanation outside the JSON object.`;

  const userPrompt = `You are ${persona.name}. Strategy: "${persona.strategy}"

Your balance: $${balance.toLocaleString()} MXN
Your investment range per transaction: $${persona.minAmount.toLocaleString()} – $${maxAllowed.toLocaleString()} MXN
Preferred categories: ${persona.preferredCategories.join(', ')}
Risk tolerance: ${persona.riskTolerance}

Current projects available:
${projectSummary}

Decide now whether to invest. Round amounts to nearest 100.

Respond with this JSON (no other text):
If investing: {"invest":true,"projectId":"<id>","amount":<number>,"reasoning":"<one sentence max 80 chars>"}
If passing: {"invest":false,"reasoning":"<one sentence max 80 chars>"}`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const decision = JSON.parse(cleaned) as Decision;

    // Validate amount is in range
    if (decision.invest && decision.amount) {
      decision.amount = Math.round(decision.amount / 100) * 100;
      if (decision.amount < persona.minAmount || decision.amount > maxAllowed) {
        decision.amount = Math.round((persona.minAmount + (maxAllowed - persona.minAmount) * 0.4) / 100) * 100;
      }
    }

    return decision;
  } catch (err: any) {
    logger.warn(`[ai-investor] Claude unavailable, using rule-based decision for ${persona.name}`);
    return ruleBasedDecide(persona, balance, maxAllowed);
  }
}

/**
 * Rule-based investor decision engine — mirrors each persona's actual strategy
 * without requiring a Claude API call. Used as primary or fallback.
 */
function ruleBasedDecide(persona: InvestorPersona, _balance: number, maxAllowed: number): Decision {
  const investable = DEMO_PROJECTS.filter(p => p.status === 'ACTIVE' || p.status === 'PENDING');
  if (investable.length === 0) return { invest: false, reasoning: 'No active projects available.' };

  // Score each project for this persona
  const scored = investable.map(p => {
    const goalEth = Number(BigInt(p.fundingGoal)) / 1e18;
    const raisedEth = Number(BigInt(p.fundingRaised)) / 1e18;
    const pct = goalEth > 0 ? (raisedEth / goalEth) * 100 : 0;
    const catMatch = persona.preferredCategories.some(
      cat => p.category === cat || p.category.toLowerCase() === cat.toLowerCase()
    );
    const investorCount = p._count.investments;

    let score = 0;

    // Category match is primary signal
    if (catMatch) score += 50;

    // Risk-tolerance-based funding % preference
    if (persona.riskTolerance === 'conservative') {
      // Prefer already-funded projects (20-80%), penalize empty or nearly full
      if (pct >= 20 && pct <= 80) score += 30;
      if (pct < 10) score -= 20;
    } else if (persona.riskTolerance === 'aggressive') {
      // Prefer early-stage (0-40%) for max upside
      if (pct < 40) score += 30;
      if (pct > 70) score -= 10;
    } else {
      // Balanced: sweet spot 30-70%
      if (pct >= 30 && pct <= 70) score += 25;
    }

    // Diego (momentum) — loves projects with many investors
    if (persona.id === 'inv-diego') score += Math.min(investorCount * 3, 30);

    // Small random noise for natural variation
    score += Math.random() * 10;

    return { project: p, score, pct };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Occasionally pass (realistic behavior — not every investor acts every round)
  const passChance = persona.riskTolerance === 'conservative' ? 0.30 : 0.15;
  if (Math.random() < passChance) {
    const reasons = [
      'Waiting for a better entry point.',
      'Market conditions not ideal right now.',
      'Monitoring for stronger momentum first.',
      'Holding capital for next round.',
      'Evaluating risk exposure before committing.',
    ];
    return { invest: false, reasoning: reasons[Math.floor(Math.random() * reasons.length)] };
  }

  if (best.score < 10) return { invest: false, reasoning: 'No projects match my current criteria.' };

  // Amount: weighted toward lower end for conservative, higher for aggressive
  const range = maxAllowed - persona.minAmount;
  const weightedRandom = persona.riskTolerance === 'conservative'
    ? Math.random() * 0.4  // conservative: use 0-40% of range
    : persona.riskTolerance === 'aggressive'
    ? 0.5 + Math.random() * 0.5  // aggressive: use 50-100% of range
    : 0.2 + Math.random() * 0.6; // balanced: 20-80%
  const amount = Math.round((persona.minAmount + range * weightedRandom) / 100) * 100;

  const catLabel = best.project.category.toLowerCase();
  const fundedPct = Math.round(best.pct);
  const reasons = best.score >= 50 ? [
    `Strong ${catLabel} project at ${fundedPct}% — fits my strategy perfectly.`,
    `This ${catLabel} project has solid momentum, investing now.`,
    `${fundedPct}% funded with good traction — timing is right.`,
  ] : [
    `Best available option given current portfolio state.`,
    `Diversifying into this project at ${fundedPct}% funded.`,
    `Low competition, good risk/reward at current funding level.`,
  ];

  return {
    invest: true,
    projectId: best.project.id,
    amount,
    reasoning: reasons[Math.floor(Math.random() * reasons.length)],
  };
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function runRound() {
  if (!agentRunning) return;
  stats.round++;

  const solvent = PERSONAS.filter(p => (personaBalances.get(p.id) ?? 0) >= p.minAmount);
  stats.activeInvestors = solvent.length;

  if (solvent.length === 0) {
    emit({ type: 'complete', stats: { ...stats }, timestamp: new Date().toISOString() });
    stopAgent();
    return;
  }

  const investable = DEMO_PROJECTS.filter(p => p.status === 'ACTIVE' || p.status === 'PENDING');
  if (investable.length === 0) {
    emit({ type: 'complete', stats: { ...stats }, timestamp: new Date().toISOString() });
    stopAgent();
    return;
  }

  // 2–4 investors act per round — realistic market activity
  const actorsCount = 2 + Math.floor(Math.random() * 3);
  const actors = solvent.sort(() => Math.random() - 0.5).slice(0, actorsCount);

  for (const persona of actors) {
    if (!agentRunning) break;

    const balance = personaBalances.get(persona.id) ?? 0;

    // Emit thinking — lets UI show "thinking" state per investor
    emit({
      type: 'thinking',
      investor: persona,
      timestamp: new Date().toISOString(),
    });

    try {
      const decision = await askClaude(persona, balance);

      if (!decision.invest || !decision.projectId || !decision.amount) {
        stats.passCount++;
        emit({
          type: 'pass',
          investor: persona,
          reasoning: decision.reasoning,
          timestamp: new Date().toISOString(),
        });
        await pause(200, 500);
        continue;
      }

      const project = DEMO_PROJECTS.find(p => p.id === decision.projectId);
      if (!project) {
        await pause(200, 500);
        continue;
      }

      // Execute via existing invest pipeline
      const order = await simulateBuy(decision.amount);
      const { txHash } = await fundProject(project.id, order.eth);
      addSimInvestment(project.id, order.eth, decision.amount, persona.id);
      personaBalances.set(persona.id, balance - decision.amount);

      stats.totalInvested += decision.amount;
      stats.txCount++;

      emit({
        type: 'investment',
        investor: persona,
        projectId: project.id,
        projectTitle: project.title,
        amount: decision.amount,
        txHash,
        reasoning: decision.reasoning,
        stats: { ...stats },
        timestamp: new Date().toISOString(),
      });

      logger.info(`[ai-investor] ${persona.name} → "${project.title}" $${decision.amount.toLocaleString()} MXN (tx ${stats.txCount})`);

      // Natural pause between investors within a round
      await pause(400, 1200);
    } catch (err: any) {
      logger.warn(`[ai-investor] Error for ${persona.name}: ${err.message}`);
      emit({ type: 'error', investor: persona, reasoning: err.message, timestamp: new Date().toISOString() });
    }
  }

  emit({ type: 'status', stats: { ...stats }, timestamp: new Date().toISOString() });

  // Schedule next round — 4–9 seconds feels like a live market
  if (agentRunning) {
    const delay = 4000 + Math.random() * 5000;
    agentTimer = setTimeout(runRound, delay);
  }
}

function pause(minMs: number, maxMs: number): Promise<void> {
  return new Promise(r => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startAgent(): AgentStats {
  if (agentRunning) return { ...stats };
  agentRunning = true;
  resetState();
  logger.info('[ai-investor] Started — 8 personas, claude-opus-4-6 decisions');
  runRound(); // fire immediately
  return { ...stats };
}

export function stopAgent(): AgentStats {
  agentRunning = false;
  if (agentTimer) { clearTimeout(agentTimer); agentTimer = null; }
  stats.running = false;
  logger.info(`[ai-investor] Stopped — $${stats.totalInvested.toLocaleString()} MXN in ${stats.txCount} transactions`);
  return { ...stats };
}

export function getAgentStatus(): AgentStats & { personas: { id: string; name: string; balance: number }[] } {
  return {
    ...stats,
    personas: PERSONAS.map(p => ({
      id: p.id,
      name: p.name,
      balance: personaBalances.get(p.id) ?? p.startingBalance,
    })),
  };
}
