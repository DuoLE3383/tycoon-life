// Client-side "life oracle": used on GitHub Pages where there is no server
// for /api/story. Generates era-aware twists without repeating recent ones.
// When the app is self-hosted (npm run dev / start), the real LLM endpoint
// answers first and this module is only a fallback.
import type { AIEvent } from './engine';

interface Snap {
  name?: string; age?: number; year?: number; era?: string; nation?: string;
  money?: number; netWorth?: number; job?: string | null; businesses?: string[];
  space?: string[]; family?: string; fame?: number; level?: number; followers?: number;
}

type Tpl = {
  dir: string;
  make: (c: Ctx) => Omit<AIEvent, 'source'>;
};
interface Ctx { y: number; era: string; rich: boolean; biz: string; snap: Snap }

const TEMPLATES: Tpl[] = [
  {
    dir: 'career',
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
    dir: 'era',
    make: ({ y, era }) => ({
      title: `The ${era} arrives early`,
      text: `Analysts on the radio in ${y} keep repeating one phrase: "adapt or disappear." Every tycoon in town is re-reading their ledgers tonight.`,
      choices: [
        { l: 'Reinvest everything', cost: 0, money: 0, out: 'You modernised just in time. The next decade belongs to you.' },
        { l: 'Hedge quietly', money: 20000, out: 'While others panic, you quietly profit.' },
        { l: 'Ignore the noise', out: 'The noise passes. Mostly.' }
      ]
    })
  },
  {
    dir: 'family',
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
    dir: 'fame',
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
    dir: 'windfall',
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
    dir: 'rival',
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
    dir: 'health',
    make: () => ({
      title: 'The doctor frowned',
      text: '"Your bloodwork looks like a man who never sleeps," the doctor says. "Fix it, or I will fix your calendar for you."',
      choices: [
        { l: 'Take a full month off', cost: 10000, out: 'You return tanned, rested and terrifyingly efficient.' },
        { l: 'Hire a personal chef & trainer', cost: 25000, out: 'Your energy is back. Your tailor is thrilled.' },
        { l: 'Ignore it', fame: 0, out: 'You power through. The yawning is heroic, barely.' }
      ]
    })
  },
  {
    dir: 'opportunity',
    make: ({ y, snap }) => ({
      title: 'A warehouse nobody wants',
      text: `In ${y}, a bankrupt wholesaler's warehouse goes to auction. ${snap.businesses?.length ? 'It would slot perfectly next to your operations.' : 'It is cheap, huge and full of potential.'}`,
      choices: [
        { l: 'Bid aggressively', cost: 40000, money: 110000, out: 'You win the auction. The inventory alone covers the bid.' },
        { l: 'Lowball and wait', money: 15000, out: 'The price drops twice. Your patience gets paid.' },
        { l: 'Pass', out: 'Another buyer overpays. You sleep beautifully.' }
      ]
    })
  },
  {
    dir: 'space',
    make: ({ y, snap }) => ({
      title: 'A rocket on the horizon',
      text: `Engineers keep emailing you about ${y}'s launch windows. ${snap.space?.length ? 'Your existing ventures could piggyback on one.' : 'They say the sky is a business address now.'}`,
      choices: [
        { l: 'Fund the feasibility study', cost: 15000, fame: 3, out: 'The report is thrilling. Your notebooks fill with orbits.' },
        { l: 'Book a seat instead', cost: 60000, fame: 4, out: 'You see the curvature of the Earth. Worth every dollar.' },
        { l: 'Keep your feet on the ground', out: 'Rockets are loud. Your ledger is quiet.' }
      ]
    })
  },
  {
    dir: 'romance',
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
    dir: 'charity',
    make: () => ({
      title: 'The flooded school',
      text: 'A storm flooded the local school. The radio reads a list of names who pledged money. Yours is not on it — yet.',
      choices: [
        { l: 'Rebuild it with your name on it', cost: 50000, fame: 6, out: 'The new wing opens in spring. Children spell your name.' },
        { l: 'Quietly cover the repairs', cost: 20000, fame: 2, out: 'No plaque, no photo. The town knows anyway.' },
        { l: 'Donate supplies', cost: 5000, out: 'Desks, books and chalk arrive by Friday.' }
      ]
    })
  },
  {
    dir: 'invest',
    make: ({ y }) => ({
      title: 'The taxi driver\'s tip',
      text: `Every passenger in ${y} has an opinion. Your driver tonight swears by a company "about to triple."`,
      choices: [
        { l: 'Bet big', cost: 30000, money: 80000, out: 'The tip was half genius, half luck. You take the win.' },
        { l: 'Bet small', cost: 5000, money: 9000, out: 'A tidy little gain and a good story.' },
        { l: 'Trust the index instead', money: 3000, out: 'Boring. Reliable. Yours.' }
      ]
    })
  },
  {
    dir: 'scandal',
    make: () => ({
      title: 'A photo you forgot',
      text: 'A tabloid dug up an old photo from a lavish party. The headline writes itself and it is not kind.',
      choices: [
        { l: 'Own it with humour', fame: 3, out: 'Your one-line reply becomes a meme. The crisis turns into a brand moment.' },
        { l: 'Buy the outlet\'s silence', cost: 40000, out: 'The story never runs. The cheque hurts anyway.' },
        { l: 'Say nothing', fame: -2, out: 'It blows over in two weeks. Two long weeks.' }
      ]
    })
  },
  {
    dir: 'legacy',
    make: ({ snap }) => ({
      title: 'What will they say?',
      text: `A young intern asks you the secret. ${snap.level && snap.level > 10 ? `You glance at your ${snap.level} levels of trophies.` : 'You glance at the empire around you.'}`,
      choices: [
        { l: 'Mentor them properly', fame: 3, out: 'Ten years later they run half your operations — gratefully.' },
        { l: 'Teach and test hard', out: 'You are demanding. They become excellent.' },
        { l: 'Just smile: "Solve real problems."', fame: 1, out: 'They write it on a sticky note. It stays there for years.' }
      ]
    })
  },
  {
    dir: 'relocate',
    make: ({ snap }) => ({
      title: 'A city with better numbers',
      text: `Your analysts found a ${snap.nation || 'nearby'} region where taxes, rents and hungry talent line up perfectly. The catch: starting over.`,
      choices: [
        { l: 'Open the new office', cost: 60000, money: 160000, out: 'Year one is chaos. Year two is a machine.' },
        { l: 'Send your best deputy', money: 30000, out: 'You clone yourself at 10% of the cost.' },
        { l: 'Stay put', out: 'Deep roots, steady fruit.' }
      ]
    })
  },
  {
    dir: 'mystery',
    make: () => ({
      title: 'The debtor in the lobby',
      text: 'An old man waits in your lobby with a 30-year-old IOU signed by your father. He asks for almost nothing.',
      choices: [
        { l: 'Pay tenfold', cost: 10000, fame: 4, out: 'The old man weeps. Your staff retell the story for a decade.' },
        { l: 'Pay exactly, with interest', cost: 3000, out: 'Clean and correct. He bows twice.' },
        { l: 'Hire him instead', money: 0, out: 'He ran warehouses for you for twenty years. Best hire ever.' }
      ]
    })
  }
];

export function localTwist(snap: Snap, used: string[]): AIEvent {
  const ctx: Ctx = {
    y: snap.year || 2020,
    era: snap.era || 'modern times',
    rich: (snap.netWorth || 0) > 1e6,
    biz: snap.businesses && snap.businesses.length ? snap.businesses[0] : '',
    snap
  };
  const freshPool = TEMPLATES.filter(t => !used.includes(t.make(ctx).title));
  const pool = freshPool.length ? freshPool : TEMPLATES;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const ev = pick.make(ctx);
  // keep numbers sane relative to wealth
  const cap = Math.max(5000, Math.round(Math.max(0, snap.netWorth || 0) * 0.4));
  ev.choices = ev.choices.map(c => ({
    ...c,
    cost: c.cost ? Math.min(c.cost, cap) : undefined,
    money: c.money ? Math.min(c.money, cap * 3) : undefined
  }));
  return { ...ev, source: 'local' };
}
