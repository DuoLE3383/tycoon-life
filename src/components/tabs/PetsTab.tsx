'use client';

import { abandonPet, adoptPet, Art, careForPet, fmt, type GameState, MAX_PETS, PET_BY, petFameBonus, PETS, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= PETS / COMPANIONS (v10.5) =================
// Adopt up to MAX_PETS (3). Each pet type has upfront cost, monthly upkeep,
// and passive bonuses (spirit regen per day + fame per year) that ONLY apply
// when the pet is happy (≥30). Neglected exotic pets can drain player health.
export function PetsTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const totalBonus = petFameBonus(s);
  return (
    <>
      <h3>{t('tab.pets')}</h3>
      <p className="sub">{t('pets.sub')}</p>
      {totalBonus > 0 && <p className="mini" style={{ marginTop: 4 }}>{t('pets.fameBonus', '', { n: totalBonus })}</p>}
      {/* Owned pets */}
      {s.pets.length > 0 && (
        <>
          <h3>{t('pets.mine')}</h3>
          {s.pets.map((pet, idx) => {
            const def = PET_BY[pet.typeId]; if (!def) return null;
            const hColor = pet.happiness >= 60 ? 'var(--sage)' : pet.happiness >= 30 ? '#c9a070' : 'var(--brick)';
            const healthColor = pet.health >= 60 ? 'var(--sage)' : pet.health >= 30 ? '#c9a070' : 'var(--brick)';
            return <Row key={idx} art={def.art} right={<div className="trade" style={{ flexWrap: 'wrap' }}>
              <Btn ic="ic-bag" label={t('pets.feed') + ' ' + fmt(Math.round(def.upkeep * 0.5))} kind="ghost" disabled={s.money < Math.round(def.upkeep * 0.5)} onClick={() => act(st => careForPet(st, idx, 'feed'))} />
              <Btn ic="ic-heart" label={t('pets.play')} kind="ghost" onClick={() => act(st => careForPet(st, idx, 'play'))} />
              {(pet.typeId === 'dog' || pet.typeId === 'horse') && <Btn ic="ic-paw" label={t('pets.walk')} kind="ghost" onClick={() => act(st => careForPet(st, idx, 'walk'))} />}
              <Btn ic="ic-x" label={t('pets.rehome')} kind="danger" onClick={() => act(st => abandonPet(st, idx))} />
            </div>}>
              <b>{pet.name} <span className="tag">{def.name}</span></b>
              <div className="famewrap" style={{ marginTop: 6 }}>
                <span className="mini">{t('pets.happiness')}</span>
                <div className="famebar"><i style={{ width: pet.happiness + '%', background: hColor }} /></div>
                <b>{Math.round(pet.happiness)}</b>
              </div>
              <div className="famewrap" style={{ marginTop: 4 }}>
                <span className="mini">{t('pets.health')}</span>
                <div className="famebar"><i style={{ width: pet.health + '%', background: healthColor }} /></div>
                <b>{Math.round(pet.health)}</b>
              </div>
              <span className="sub" style={{ display: 'block', marginTop: 4 }}>{def.blurb}</span>
              <span className="mini" style={{ display: 'block' }}>+{def.spiritBonus.toFixed(2)} {t('pets.spiritPerDay')} · +{def.fameBonus} {t('pets.famePerYear')}{def.healthDrain > 0 ? ` · ${t('pets.exoticWarn')}` : ''}</span>
            </Row>;
          })}
        </>
      )}
      {/* Adoption grid */}
      {s.pets.length < MAX_PETS && (
        <>
          <h3>{t('pets.adopt')}</h3>
          <div className="grid">
            {PETS.map(p => {
              const owned = s.pets.some(pet => pet.typeId === p.id);
              return <button key={p.id} className="tile" disabled={owned || s.money < p.cost}
                onClick={() => { act(st => adoptPet(st, p.id, name)); setName(''); }}>
                <Art id={p.art} />
                <span>
                  <b>{p.name}</b>
                  <span className="sub" style={{ display: 'block' }}>{p.blurb}</span>
                  <span className="sub" style={{ display: 'block' }}>{t('pets.cost')} {fmt(p.cost)} · {t('pets.upkeep')} {fmt(p.upkeep)}/mo · +{p.spiritBonus.toFixed(2)} {t('pets.spiritPerDay')} · +{p.fameBonus} {t('pets.famePerYear')}</span>
                </span>
              </button>;
            })}
          </div>
          <input className="qty" style={{ width: '100%', marginTop: 8 }} maxLength={24} placeholder={t('pets.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
          <p className="sub">{t('pets.adoptNote', '', { n: MAX_PETS - s.pets.length })}</p>
        </>
      )}
      {s.pets.length >= MAX_PETS && <p className="sub">{t('pets.maxReached')}</p>}
    </>
  );
}
