// POST /api/story — LLM "life director": invents a brand-new life event for the
// player's exact situation (era, wealth, career, family...) while avoiding every
// premise the player has already seen. Falls back to a local generator so the
// endpoint ALWAYS returns a valid event.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const DIRECTIONS = [
  'a career crossroads: a risky promotion, a rival offering a job, or a bold pivot',
  'family drama: an unexpected reunion, a relative needing money, or a celebration',
  'a business opportunity tied to the current era technology or culture',
  'a windfall or a loss that arrives in an unusual way',
  'a brush with fame or scandal that changes how people see the player',
  'health or lifestyle: a wake-up call, a new obsession, or a doctor visit',
  'a rivalry with another tycoon that escalates in a surprising way',
  'an investment tip with hidden risks and a tempting upside',
  'a romance twist that collides with business ambitions',
  'a civic or charity moment that could boost the player\u2019s reputation',
  'a travel or relocation idea that could reshape the player\u2019s fortune',
  'a mysterious encounter: an old letter, a stranger, a forgotten debt'
];

interface Choice { l: string; cost?: number; money?: number; fame?: number; out?: string }
interface StoryEv { title: string; text: string; choices: Choice[] }

function clampEv(ev: StoryEv, netWorth: number): StoryEv {
  const cap = Math.max(5000, Math.round(Math.max(0, netWorth) * .4));
  const choices = (Array.isArray(ev.choices) ? ev.choices : []).slice(0, 3).map(c => ({
    l: String(c.l || 'Continue').slice(0, 48),
    cost: c.cost ? Math.min(Math.round(Math.abs(+c.cost)), cap) : undefined,
    money: c.money ? Math.max(-cap * 3, Math.min(Math.round(+c.money), cap * 3)) : undefined,
    fame: c.fame ? Math.max(-10, Math.min(10, Math.round(+c.fame))) : undefined,
    out: c.out ? String(c.out).slice(0, 140) : undefined
  }));
  return {
    title: String(ev.title || 'A twist of fate').slice(0, 64),
    text: String(ev.text || 'Something unexpected happens.').slice(0, 300),
    choices: choices.length ? choices : [{ l: 'Face it', out: 'You deal with it in your own way.' }]
  };
}

function localTwist(state: { era?: string; netWorth?: number; businesses?: string[] }): StoryEv {
  const era = state.era || 'modern times';
  const rich = (state.netWorth || 0) > 1e6;
  const pool: StoryEv[] = [
    { title: `A ${era} investor knocks`, text: 'Someone from the old money circle wants to co-invest in one of your ventures.', choices: [{ l: 'Accept the deal', cost: rich ? 50000 : 5000, money: rich ? 150000 : 12000, out: 'The partnership pays off beyond expectations.' }, { l: 'Stay independent', out: 'You keep full control and sleep well.' }] },
    { title: 'Whispers at the club', text: 'Rivals gossip that your empire is a house of cards. A journalist wants a comment.', choices: [{ l: 'Invite them in, books open', fame: 5, out: 'The profile is glowing. The gossip dies.' }, { l: 'No comment', fame: -2, out: 'The story runs anyway. It stings.' }] },
    { title: 'An anonymous envelope', text: 'A thick envelope with no sender arrives at your office.', choices: [{ l: 'Open it', money: 8000, out: 'Inside: cash and a note: "For the girl on the pier. Pay it forward."' }, { l: 'Hand it to the police', fame: 3, out: 'The local papers call you the honest tycoon.' }] },
    { title: 'The warehouse fire', text: 'A small fire hits one of your storerooms. Nobody is hurt.', choices: [{ l: 'Rebuild fast', cost: 20000, out: 'Insurance plus hustle: you reopen in weeks.' }, { l: 'Claim and wait', money: 5000, out: 'The claim drags on, but the cheque clears.' }] },
    { title: 'A worker\u2019s petition', text: 'Employees ask for better conditions. Word could reach the press either way.', choices: [{ l: 'Grant it', cost: 15000, fame: 4, out: 'Productivity soars. Your name trends for the right reason.' }, { l: 'Hold the line', out: 'Quiet grumbling. Business as usual.' }] },
    { title: 'Old friend, new scheme', text: 'A childhood friend pitches a venture that fits this era perfectly.', choices: [{ l: 'Back them', cost: 30000, money: 90000, out: 'The scheme works. Your friend cries at dinner.' }, { l: 'Lend a little', cost: 5000, out: 'They make it on their own, and thank you anyway.' }] }
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(req: NextRequest) {
  let body: { state?: Record<string, unknown>; used?: string[] } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const state = body.state || {};
  const used = Array.isArray(body.used) ? body.used.slice(-24) : [];
  const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

  const sys = [
    'You are the Story Engine of "Tycoon Life", a life-simulation game.',
    'Invent ONE brand-new life event that fits the player\u2019s exact situation: their era, country, age, wealth, career, businesses and family.',
    'The event must feel grounded in the player\u2019s historical era and their current assets (mention one concrete detail from their snapshot).',
    'It must NOT repeat any of the premises listed in "avoidThesePremises" and must not be generic.',
    'Respond with ONLY a JSON object, no markdown, in this exact shape:',
    '{"title": string (max 60 chars), "text": string (2-3 sentences, second person), "choices": [{"l": string (max 40 chars), "cost": number (optional money the player pays), "money": number (optional money gained), "fame": number (optional -10..10), "out": string (result sentence)}]}',
    'Give exactly 2 or 3 meaningful choices with different trade-offs.'
  ].join(' ');
  const user = JSON.stringify({ player: state, avoidThesePremises: used, direction });

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: sys },
        { role: 'user', content: user }
      ],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as StoryEv;
      if (parsed && parsed.title && Array.isArray(parsed.choices) && parsed.choices.length) {
        return NextResponse.json(clampEv(parsed, Number(state.netWorth) || 0));
      }
    }
  } catch (e) {
    console.error('story: LLM failed, using local fallback:', e);
  }
  return NextResponse.json(clampEv(localTwist(state as { netWorth?: number; era?: string }), Number(state.netWorth) || 0));
}
