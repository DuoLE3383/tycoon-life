'use client';

import { ART_DEFS, begin, BoardView, bump, ChatView, entityTierOf, FriendsView, getState, GROUPS, healthState, Ic, persist, processDay, reincarnateState, spaceIncome, tick, yearEnd } from '@/components/gameDeps';

import { Header } from '@/components/layout/Header';
import { PinZone } from '@/components/layout/PinZone';
import { HomeTab } from '@/components/tabs/HomeTab';
import { CareerTab } from '@/components/tabs/CareerTab';
import { EduTab } from '@/components/tabs/EduTab';
import { BizTab } from '@/components/tabs/BizTab';
import { SpaceTab } from '@/components/tabs/SpaceTab';
import { HealthTab } from '@/components/tabs/HealthTab';
import { SpiritTab } from '@/components/tabs/SpiritTab';
import { PetsTab } from '@/components/tabs/PetsTab';
import { AssetsTab } from '@/components/tabs/AssetsTab';
import { StockTab } from '@/components/tabs/StockTab';
import { SocialTab } from '@/components/tabs/SocialTab';
import { RelationsTab } from '@/components/tabs/RelationsTab';
import { ClubTab } from '@/components/tabs/ClubTab';
import { BankTab } from '@/components/tabs/BankTab';
import { PortfolioTab } from '@/components/tabs/PortfolioTab';
import { FinanceOverviewTab } from '@/components/tabs/FinanceOverviewTab';
import { RankTab } from '@/components/tabs/RankTab';
import { PowerTab } from '@/components/tabs/PowerTab';
import { EntityTab } from '@/components/tabs/EntityTab';
import { FameTab } from '@/components/tabs/FameTab';
import { LinksTab } from '@/components/tabs/LinksTab';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { Intro } from '@/components/modals/IntroModal';
import { EventModal, GameOver } from '@/components/modals/EventModal';
import { WhatsNewModal } from '@/components/modals/WhatsNewModal';
import { NavBar } from '@/components/layout/NavBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useGameController } from '@/components/useGameController';



// Test/debug hook: lets automation (and power users) drive the engine from the console.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__tycoon = {
    getState, persist, bump, processDay, yearEnd, spaceIncome, tick,
  };
}

export default function Page() {
  const { act, activeGroup, aiBusy, aiNoteKey, askAI, comm, curCat, curSubs, dismissWhatsNew, editingProfile, eraName, lastTab, pzExpanded, qtyMap, rankBoard, reloadPrompt, s, setCurCat, setEditingProfile, setLastTab, setPzExpanded, setQtyMap, setRankBoard, setReloadPrompt, setSpeed, setTab, showToast, speed, t, tab, toast, whatsNew, whatsNewContent } = useGameController();

  // v13.12 — NAVIGATION BUG FIX.
  // The previous onNav handlers captured `activeGroup` from the closure and
  // stored lastTab under that key: `setLastTab(lt => ({ ...lt, [activeGroup]: k }))`.
  // This was correct ONLY when navigating within the current group. When a
  // quick link crossed group boundaries (e.g. user is on 'biz' in the empire
  // group, clicks the PinZone "low cash" warning → onNav('bank')), the entry
  // was stored as `lastTab['empire'] = 'bank'`. The next time the user tapped
  // the empire group button, NavBar did `setTab(lastTab['empire'] || 'biz')` =
  // `setTab('bank')` — sending them BACK to the bank tab (in the finance
  // group) instead of the expected 'biz'. The navigation felt "locked" — every
  // group button kept sending them to wherever they'd last cross-linked from.
  //
  // FIX: navTo() computes the TARGET group from the destination tab key, so
  // lastTab is always stored under the correct group. Cross-group quick links
  // no longer pollute the source group's lastTab entry. NavBar / MobileNav
  // now reliably restore the right tab per group on subsequent clicks.
  const navTo = (k: string) => {
    setTab(k);
    const targetGroup = GROUPS.find(g => g[3].some(([key]) => key === k))?.[0] || activeGroup;
    setLastTab(lt => ({ ...lt, [targetGroup]: k }));
  };

  return (
    <div className={'tgame life-' + healthState(s.health)}>
      <div dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
      <div className="wrap">
        <Header s={s} eraName={eraName} speed={speed} setSpeed={setSpeed} act={act} />
        {/* v11.48 — reverted to simple inline nav bars (popups were buggy/confusing).
            PinZone dashboard stays; nav is back to horizontal scroll pills. */}
        <div className="sticky-header">
        <PinZone s={s} t={t} onEdit={() => setEditingProfile(true)} act={act}
          onNav={navTo}
          expanded={pzExpanded} onToggleExpand={() => setPzExpanded(v => !v)} />
        <NavBar s={s} t={t} tab={tab} activeGroup={activeGroup} curSubs={curSubs}
          friendActivity={comm.ready && (comm.incoming.length > 0 || comm.unclaimedGifts.length > 0)}
          onSelectGroup={(gid: string, first: string) => setTab(lastTab[gid] || first)}
          onSelectTab={(key: string) => navTo(key)} />
      </div>
        <main id="tview" key={tab} className="enter">
          {tab === 'home' && <HomeTab s={s} act={act} askAI={askAI} aiBusy={aiBusy} aiNote={t(aiNoteKey)} eraName={eraName} onNav={navTo} />}
          {tab === 'career' && <CareerTab s={s} act={act} />}
          {tab === 'edu' && <EduTab s={s} act={act} />}
          {tab === 'biz' && <BizTab s={s} act={act} />}
          {tab === 'space' && <SpaceTab s={s} act={act} />}
          {tab === 'health' && <HealthTab s={s} act={act} />}
          {tab === 'spirit' && <SpiritTab s={s} act={act} />}
          {tab === 'pets' && <PetsTab s={s} act={act} />}
          {tab === 'assets' && <AssetsTab s={s} act={act} curCat={curCat} setCurCat={setCurCat} />}
          {tab === 'markets' && <StockTab s={s} act={act} qtyMap={qtyMap} setQtyMap={setQtyMap} />}
          {tab === 'social' && <SocialTab s={s} act={act} />}
          {tab === 'relations' && <RelationsTab s={s} act={act} />}
          {tab === 'club' && <ClubTab s={s} act={act} />}
          {tab === 'friends' && <FriendsView s={s} act={act} comm={comm} toast={showToast} />}
          {tab === 'chat' && <ChatView comm={comm} />}
          {tab === 'lboard' && <BoardView comm={comm} />}
          {tab === 'bank' && <BankTab s={s} act={act} />}
          {tab === 'portfolio' && <PortfolioTab s={s} act={act} />}
          {tab === 'finance-overview' && <FinanceOverviewTab s={s} act={act} onNav={navTo} />}
          {tab === 'rank' && <RankTab s={s} board={rankBoard} setBoard={setRankBoard} />}
          {tab === 'power' && <PowerTab s={s} act={act} />}
          {tab === 'entity' && <EntityTab s={s} act={act} />}
          {tab === 'fame' && <FameTab s={s} />}
          {tab === 'links' && <LinksTab s={s} onNav={navTo} />}
        </main>
        <footer className="mini tfoot">
          {/* v11.10 — persistent legal disclaimer, visible on every tab */}
          <span style={{ opacity: .65, maxWidth: 560 }}>{t('disc.short')}</span>
          <span>{t('footer')}</span>
          <button className="newlife-btn" type="button"
            onClick={() => { if (typeof window !== 'undefined' && window.confirm(t('reincarnate.confirm'))) { reincarnateState(); showToast(t('reincarnate.toast')); } }}>
            {t('newLife')}
          </button>
        </footer>
      </div>

      {/* v12.13 — MOBILE-FIRST BOTTOM NAV.
          Replaces the top sticky gnav + subnav on viewports ≤ 700px (those
          are hidden via CSS in @media max-width:700px). The shell is a
          position:fixed container at the viewport bottom that stacks:
            1) .mobile-subnav  — horizontal scroll strip of sub-tab icons for
               the currently active group (only rendered when the group has
               >1 sub-tab; otherwise the strip is omitted and only the icon
               bar shows). Tapping a sub-tab calls the same setTab + lastTab
               flow as the desktop subnav.
            2) .mobile-bottom-nav — evenly-spaced row of GROUP icon buttons.
               Active group highlighted with accent color. Tapping a group
               icon switches to that group's last-visited (or first) sub-tab.
          The shell is display:none on desktop (root rule in globals.css),
          so this JSX is a no-op above 700px — desktop keeps the top nav.
          padding-bottom on .wrap (in @media) reserves space so the fixed
          bar doesn't cover main content. env(safe-area-inset-bottom) handles
          notched phones. */}
      <MobileNav s={s} t={t} tab={tab} activeGroup={activeGroup} curSubs={curSubs}
        onSelectGroup={(gid: string, first: string) => setTab(lastTab[gid] || first)}
        onSelectTab={(key: string) => navTo(key)} />
      {editingProfile && <EditProfileModal s={s} act={act} onClose={() => setEditingProfile(false)} />}

      {toast && <div id="ttoast" key={toast.id} className="on">{toast.msg}</div>}

      {!s.started && <Intro onBegin={opts => act(st => { begin(st, opts); showToast(`${t('begin')}: ${opts.name} 🎉`); })} />}
      {(s.pending || s.aiEv) && <EventModal s={s} act={act} />}
      {s.over && <GameOver s={s} onAgain={() => { reincarnateState(); showToast(t('reincarnate.toast')); }} />}

      {/* v11 — reload-to-update banner (no F5 needed; polled every 5 min) */}
      {reloadPrompt && (
        <div className="reload-banner" role="alert">
          <span><b>{reloadPrompt.headline}</b> — {t('v11.reloadPrompt', '', { v: reloadPrompt.version })}</span>
          <button className="ibtn" onClick={() => { window.location.reload(); }}>{t('v11.reload')}</button>
          <button className="ibtn ghost" onClick={() => setReloadPrompt(null)}>{t('v11.later')}</button>
        </div>
      )}

      {/* v11.44 — what's-new modal, shown once per player per PATCH.
          Content driven from version.json (headline + features). */}
      {whatsNew && <WhatsNewModal onDismiss={dismissWhatsNew} content={whatsNewContent} />}
    </div>
  );
}
