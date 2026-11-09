// Client-side "life oracle": used on GitHub Pages where there is no server
// for /api/story. Generates era-aware twists without repeating recent ones.
// When the app is self-hosted (npm run dev / start), the real LLM endpoint
// answers first and this module is only a fallback.
//
// v10.4: events are now categorised into four kinds. `askAI` randomly picks
// a kind weighted by life-stage context (rich players get more lifestage
// pivots, struggling players get more badluck/luck swings). The LLM prompt
// on /api/story also receives the chosen kind so the backend stays aligned.
import type { AIEvent, AIEventKind } from './engine';

interface Snap {
  name?: string; age?: number; year?: number; era?: string; nation?: string;
  money?: number; netWorth?: number; job?: string | null; businesses?: string[];
  space?: string[]; family?: string; fame?: number; level?: number; followers?: number;
  studying?: string[]; health?: number; spirit?: number;
}

type Tpl = {
  kind: AIEventKind;
  make: (c: Ctx) => Omit<AIEvent, 'source'>;
};
interface Ctx { y: number; era: string; rich: boolean; biz: string; snap: Snap }

// Weighting for kind selection. The caller can pass an explicit kind (e.g.
// when the LLM picks one) — otherwise we sample using these probabilities,
// modified slightly by the player's situation so the events feel relevant.
export function pickKind(snap: Snap): AIEventKind {
  const rich = (snap.netWorth || 0) > 1e6;
  const hasBiz = (snap.businesses?.length || 0) > 0;
  const isStudying = (snap.studying?.length || 0) > 0;
  // base weights
  const w: Record<AIEventKind, number> = { story: 30, luck: 25, badluck: 22, lifestage: 23 };
  if (rich) { w.lifestage += 8; w.story -= 4; }
  if (hasBiz) { w.lifestage += 6; w.badluck += 3; }
  if (isStudying) { w.lifestage += 6; }
  if ((snap.money || 0) < 0) { w.luck += 6; w.badluck += 4; w.story -= 4; }
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const k of Object.keys(w) as AIEventKind[]) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return 'story';
}

const TEMPLATES: Tpl[] = [
  // =================== story — open-ended life twists ===================
  {
    kind: 'story',
    make: ({ y, era, biz, rich }) => ({
      title: `A ${y} kind of offer`,
      text: `A headhunter slides you a contract across the table. "The ${era} won't wait," she says. ${biz ? `Your rivals at ${biz} would kill for this.` : 'Your rivals would kill for this.'}`,
      choices: [
        { l: 'Sign it', money: rich ? 120000 : 15000, fame: 2, out: 'You signed. The move pays off within months.' },
        { l: 'Counter hard', money: rich ? 40000 : 5000, out: 'They meet you halfway. Respect earned.' },
        { l: 'Stay loyal', fame: 1, out: 'You stay. Loyalty is its own quiet currency.' }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }) => ({
      title: 'A letter from home',
      text: `Your family writes: an old property needs repairs before the rainy season. ${snap.family ? 'They ask how you are doing, too.' : 'They miss you.'}`,
      choices: [
        { l: 'Send more than they asked', cost: 8000, fame: 2, out: 'The house is fixed. Your name is said with pride at dinner.' },
        { l: 'Send exactly what is needed', cost: 3000, out: 'Practical, thoughtful, done.' },
        { l: 'Promise to visit instead', out: 'You book the trip. Somehow that matters more.' }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }) => ({
      title: snap.followers && snap.followers > 50000 ? 'Trending, again' : 'A journalist calls',
      text: `A reporter is writing a profile: "The ${snap.nation || 'local'} tycoon nobody can figure out." The interview airs Sunday.`,
      choices: [
        { l: 'Open the books', fame: 4, out: 'Transparency wins the front page. The gossip dies.' },
        { l: 'Charm them, reveal nothing', fame: 1, out: 'The piece is flattering and completely uninformative.' },
        { l: 'Decline politely', fame: -1, out: 'The story runs without you. It stings a little.' }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ biz }) => ({
      title: 'Dinner with your rival',
      text: `${biz ? 'Your biggest competitor in ' + biz : 'Your biggest competitor'} invites you to dinner. The wine is expensive and the smiles are measured.`,
      choices: [
        { l: 'Propose a merger', cost: 25000, money: 90000, out: 'The handshake makes the papers. The empire grows.' },
        { l: 'Listen, agree to nothing', out: 'You leave with intel worth more than the meal.' },
        { l: 'Insult their pricing', fame: -2, money: 0, out: 'The tab is yours. The grudge is theirs.' }
      ]
    })
  },
  {
    kind: 'story',
    make: ({ snap }) => ({
      title: 'Two tickets, one weekend',
      text: `Someone from the ${snap.nation || 'city'} arts gala slips you two tickets with a handwritten note. ${snap.family && snap.family !== 'single' ? 'Your calendar, however, says board meeting.' : 'Your calendar says nothing at all.'}`,
      choices: [
        { l: 'Go. Work can wait.', out: 'You dance badly and laugh a lot. A good trade.' },
        { l: 'Send an assistant with flowers', fame: 1, out: 'Graceful, if a little safe.' },
        { l: 'Frame the note in your office', out: 'It becomes a small legend among your staff.' }
      ]
    })
  },
  {
    kind: 'story',
    make: () => ({
      title: 'The debtor in the lobby',
      text: 'An old man waits in your lobby with a 30-year-old IOU signed by your father. He asks for almost nothing.',
      choices: [
        { l: 'Pay tenfold', cost: 10000, fame: 4, out: 'The old man weeps. Your staff retell the story for a decade.' },
        { l: 'Pay exactly, with interest', cost: 3000, out: 'Clean and correct. He bows twice.' },
        { l: 'Hire him instead', money: 0, out: 'He ran warehouses for you for twenty years. Best hire ever.' }
      ]
    })
  },
  // =================== luck — windfall / good fortune ===================
  {
    kind: 'luck',
    make: ({ rich }) => ({
      title: 'An envelope with no sender',
      text: 'A thick envelope arrives at your office. No name, no note — except three words: "You deserve this."',
      choices: [
        { l: 'Keep it', money: rich ? 60000 : 9000, out: 'You keep it. Some mysteries are gifts.' },
        { l: 'Give it away', fame: 5, out: 'The shelter puts your name on the wall. You feel taller.' },
        { l: 'Try to find the sender', cost: 2000, money: 12000, out: 'You find them: a retired teacher you helped years ago. She insists you keep it — with interest.' }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }) => ({
      title: 'The lucky draw',
      text: 'A charity gala raffle ticket you forgot you bought wins the grand prize. The crowd claps; a banker hands you the envelope with a knowing smile.',
      choices: [
        { l: 'Take the cash', money: rich ? 90000 : 22000, fame: 1, out: 'You take the cheque. The banker introduces you to her boss.' },
        { l: 'Donate it back', cost: 0, fame: 6, out: 'The charity makes you a patron. Worth ten times the press.' },
        { l: 'Bet it on the index', cost: 0, money: rich ? 140000 : 33000, out: 'You buy an index fund on Monday. By Friday it ticks up.' }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ y }) => ({
      title: 'The inheritance',
      text: `A notary in ${y} informs you that a great-uncle you never met has passed and left you his estate. The lawyer is apologetic about the surprise.`,
      choices: [
        { l: 'Accept the estate', money: 130000, fame: 2, out: 'A vineyard, a townhouse, and a wine cellar with tasting notes in pencil.' },
        { l: 'Sell the estate, keep the cash', money: 200000, out: 'You sign the papers and walk away. Pragmatic and restful.' },
        { l: 'Donate most, keep a token', cost: 0, fame: 5, out: 'The town names a square after your uncle. You keep a single chair.' }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich, snap }) => ({
      title: 'A viral moment',
      text: `A clip of you helping someone in the rain goes viral. ${snap.followers && snap.followers > 100000 ? 'Even accounts that usually mock tycoons post it.' : 'Strangers start following your story.'}`,
      choices: [
        { l: 'Lean into it', fame: 7, money: rich ? 30000 : 6000, out: 'You launch a small line of merch. It sells out by Tuesday.' },
        { l: 'Stay quiet, let it pass', fame: 3, out: 'The clip fades. The goodwill lingers in your industry.' },
        { l: 'Direct the attention to a cause', fame: 4, cost: 5000, out: 'Donations to the cause triple overnight. You become the unofficial face.' }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }) => ({
      title: 'A forgotten stock certificate',
      text: 'While clearing out an old safe, you find a stock certificate your late aunt bought decades ago. The company is now a household name.',
      choices: [
        { l: 'Cash it in', money: rich ? 250000 : 75000, out: 'Your broker is speechless. The proceeds land in your account by Friday.' },
        { l: 'Hold for the dividend', money: rich ? 30000 : 8000, out: 'A small annual cheque arrives every quarter. A nice ritual.' },
        { l: 'Frame it in the office', fame: 1, money: 0, out: 'It becomes your favourite conversation piece.' }
      ]
    })
  },
  {
    kind: 'luck',
    make: ({ rich }) => ({
      title: 'The tax refund you forgot',
      text: 'Your accountant calls, sheepish. "I think we overpaid three years ago. The tax office agrees."',
      choices: [
        { l: 'Take the refund', money: rich ? 45000 : 9000, out: 'It lands in your account. You treat the team to dinner.' },
        { l: 'Reinvest it', cost: 0, money: rich ? 60000 : 13000, out: 'You buy more of your own stock. The compounding starts today.' },
        { l: 'Donate it', cost: 0, fame: 3, out: 'You send it to the local school. They name a scholarship.' }
      ]
    })
  },
  // =================== badluck — loss / damage / scandal ===================
  {
    kind: 'badluck',
    make: ({ rich }) => ({
      title: 'The warehouse fire',
      text: 'A small fire hits one of your storerooms. Nobody is hurt, but the smoke smell reaches the news.',
      choices: [
        { l: 'Rebuild fast', cost: rich ? 60000 : 20000, out: 'Insurance plus hustle: you reopen in weeks.' },
        { l: 'Claim and wait', money: 5000, out: 'The claim drags on, but the cheque clears. Reputation takes a nick.' },
        { l: 'Cut your losses', cost: 0, money: -rich ? -30000 : -8000, decline: 4, out: 'You sell the lot as-is to a salvage crew. The hit stings for months.' }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }) => ({
      title: 'A tabloid exposé',
      text: 'A tabloid runs a story about an old business deal. The headline is unkind and the facts are stretched.',
      choices: [
        { l: 'Sue them', cost: rich ? 80000 : 20000, fame: 2, out: 'After a year, they print a retraction in tiny font. You won, mostly.' },
        { l: 'Buy the silence', cost: 40000, out: 'The story never runs again. The cheque hurts.' },
        { l: 'Tell your side on the feed', fame: -3, money: 0, out: 'Your post gets more views than the tabloid. But the wound is open.' }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }) => ({
      title: 'The market crash',
      text: 'The market drops 18% in a week. Your portfolio is not spared. Your broker calls with the bad news in a calm voice.',
      choices: [
        { l: 'Hold the line', money: -rich ? -80000 : -15000, out: 'You hold. By the end of the quarter, half of it has come back.' },
        { l: 'Sell everything', money: -rich ? -120000 : -22000, out: 'You sell at the bottom. The cash sits there, mocking you.' },
        { l: 'Buy the dip', cost: rich ? 50000 : 10000, money: rich ? 90000 : 18000, out: 'You buy more. Two years later it is the best decision of the decade.' }
      ]
    })
  },
  {
    kind: 'badluck',
    make: () => ({
      title: 'The thief in the night',
      text: 'Someone broke into your garage. The watch you wore to your first big deal is gone. So is the cash box.',
      choices: [
        { l: 'File a police report', cost: 0, money: -8000, out: 'The police are sympathetic. The watch never resurfaces.' },
        { l: 'Quietly replace it', cost: 12000, out: 'You buy a similar one. Your friends do not notice. You do.' },
        { l: 'Post a reward', cost: 3000, fame: 1, out: 'A tip comes in. You get the watch back; the cash is gone.' }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }) => ({
      title: 'A lawsuit lands',
      text: 'A former partner serves you papers. The claim is thin but the legal fees will not be.',
      choices: [
        { l: 'Settle quietly', cost: rich ? 70000 : 18000, out: 'You settle. The partner signs an NDA and disappears.' },
        { l: 'Fight it in court', cost: rich ? 100000 : 25000, fame: 2, out: 'You win. Two years of your life are gone with the legal team.' },
        { l: 'Mediate', cost: 25000, fame: 1, out: 'A neutral third party helps. You pay a little, learn a lot.' }
      ]
    })
  },
  {
    kind: 'badluck',
    make: ({ rich }) => ({
      title: 'The bad hire',
      text: 'The bright young manager you hired six months ago has been cooking the books. The auditor\'s call wakes you at 6am.',
      choices: [
        { l: 'Fire and absorb', cost: rich ? 40000 : 12000, decline: 3, out: 'You patch the loss. Your trust in people takes a hit.' },
        { l: 'Press charges', cost: 15000, fame: 1, out: 'They are charged. The story leaks. Your industry shrugs.' },
        { l: 'Restructure the team', cost: 22000, decline: 2, out: 'You hire an outside CFO. The bill is steep; the lesson is steeper.' }
      ]
    })
  },
  // =================== lifestage — close shop / dropout / wrong turn ===================
  {
    kind: 'lifestage',
    make: ({ snap, biz }) => ({
      title: 'Close shop early?',
      text: `${biz ? `Your ${biz} line is bleeding cash and the trend is not reversing. ` : 'One of your lines is bleeding cash. '}Your CFO suggests shutting branches now, taking the loss, and redeploying the capital. The decision sits on your desk.`,
      choices: [
        { l: 'Liquidate two branches', cost: 0, money: snap.netWorth && snap.netWorth > 1e6 ? 14000 : 6000, liquidate: { biz: 'cafe', n: 2 }, out: 'You close two branches. The salvage cheque stings less than expected.' },
        { l: 'Liquidate hard — five branches', cost: 0, money: snap.netWorth && snap.netWorth > 1e6 ? 36000 : 14000, liquidate: { biz: 'cafe', n: 5 }, out: 'You cut deep. The team is in shock. The runway just doubled.' },
        { l: 'Refuse. Ride it out.', money: -8000, decline: 6, out: 'You stay the course. Three months later, you wish you had not.' }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ y, era }) => ({
      title: 'Drop out to chase the era?',
      text: `${era} is reshaping every industry. A friend who dropped out last year just raised a round at a valuation you can\'t stop thinking about. Your current course feels like it was designed for a decade that no longer exists.`,
      choices: [
        { l: 'Drop your main study, pivot', cost: 0, money: 0, dropout: { slot: 'study' }, out: 'You leave the program. Six months of chaos, then it clicks.' },
        { l: 'Drop your side study', cost: 0, money: 0, dropout: { slot: 'sideStudy' }, out: 'You let the parallel course go. The freed bandwidth pays off within weeks.' },
        { l: 'Stay the course', money: 0, decline: 4, out: 'You finish what you started. The era waits for nobody, but you have a credential.' }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ y, snap }) => ({
      title: 'The era no longer needs you',
      text: `In ${y}, your line of work is being automated faster than anyone predicted. ${snap.job ? `Your role as ${snap.job} is half as valuable as it was two years ago.` : 'Your industry is half as valuable as it was two years ago.'} The writing is on the wall; the question is whether you read it in time.`,
      choices: [
        { l: 'Re-skill hard', cost: 30000, money: 0, decline: 3, out: 'You enrol in an intensive re-skilling program. The future costs; it also pays.' },
        { l: 'Sell the line, retire early', cost: 0, money: 50000, decline: 5, out: 'You sell before the floor drops. The cash is comfort. The pride is gone.' },
        { l: 'Pivot the business to the new era', cost: 60000, money: 0, out: 'You retool. The first quarter is brutal. The third quarter is the best you have ever had.' }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap }) => ({
      title: 'A wrong turn',
      text: `You realise, late one night, that the last big decision was wrong. ${snap.businesses?.length ? 'The expansion should have been a stall.' : 'The hire should have been a no.'} The numbers do not lie; only your pride does.`,
      choices: [
        { l: 'Reverse course publicly', cost: 15000, fame: 3, out: 'You announce the reversal. The press calls it courage. Your team calls it a leader.' },
        { l: 'Quietly undo it', cost: 8000, decline: 3, out: 'You undo the move. Nobody notices except your accountant, and you.' },
        { l: 'Push through, deny it', money: -12000, decline: 9, out: 'You push through. The damage compounds for a year before you admit it.' }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap, biz }) => ({
      title: 'Sell the company?',
      text: `A buyer has offered to acquire your ${biz || 'main business'} line. The number is real. The签字笔 is on the table. ${snap.age && snap.age > 55 ? 'You are not getting younger.' : 'Your team is watching your face for an answer.'}`,
      choices: [
        { l: 'Sell — take the deal', cost: 0, money: 250000, fame: 4, out: 'You sell. The proceeds are life-changing. The company survives under new owners.' },
        { l: 'Sell a majority stake, stay on', cost: 0, money: 150000, fame: 2, out: 'You sell 60%. You keep the corner office and lose the final word.' },
        { l: 'Refuse. Build the empire.', money: 0, decline: 2, out: 'You refuse. The buyer walks. You either prove them wrong or yourself wrong.' }
      ]
    })
  },
  {
    kind: 'lifestage',
    make: ({ snap }) => ({
      title: 'Burnout at the door',
      text: `Your doctor is worried. Your partner is worried. ${snap.health && snap.health < 60 ? 'Your last blood panel was not great.' : 'You haven\'t slept a full eight hours in months.'} The question is whether you slow down now or pay for it later.`,
      choices: [
        { l: 'Take a sabbatical', cost: 20000, money: 0, out: 'You take three months off. You come back a different person.' },
        { l: 'Promote a deputy, step back to chair', cost: 10000, decline: 0, out: 'You promote someone hungry and capable. You move to the chair role.' },
        { l: 'Power through', cost: 0, decline: 10, out: 'You power through. The work is done. Your body keeps a ledger.' }
      ]
    })
  }
];

export function localTwist(snap: Snap, used: string[], kind?: AIEventKind): AIEvent {
  const ctx: Ctx = {
    y: snap.year || 2020,
    era: snap.era || 'modern times',
    rich: (snap.netWorth || 0) > 1e6,
    biz: snap.businesses && snap.businesses.length ? snap.businesses[0] : '',
    snap
  };
  const chosenKind = kind || pickKind(snap);
  const pool = TEMPLATES.filter(t => t.kind === chosenKind);
  const usable = pool.length ? pool : TEMPLATES;
  const freshPool = usable.filter(t => !used.includes(t.make(ctx).title));
  const finalPool = freshPool.length ? freshPool : usable;
  const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
  const ev = pick.make(ctx);
  // keep numbers sane relative to wealth
  const cap = Math.max(5000, Math.round(Math.max(0, snap.netWorth || 0) * 0.4));
  ev.choices = ev.choices.map(c => ({
    ...c,
    cost: c.cost ? Math.min(c.cost, cap) : undefined,
    money: c.money ? Math.max(-cap * 3, Math.min(c.money, cap * 3)) : undefined
  }));
  return { ...ev, source: 'local', kind: chosenKind };
}
