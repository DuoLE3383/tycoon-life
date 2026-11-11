'use client';

import { Art, Ic } from '@/lib/art';
import { reqText, type GameState } from '@/lib/engine';
import type { Req } from '@/lib/gameData';
import { useT } from '@/lib/i18n';

export type Act = (fn: (state: GameState) => string | null | void) => void;
export type TFn = ReturnType<typeof useT>['t'];

export function Row({ art, children, right }: { art: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="row">{art && <Art id={art} />}<div className="info">{children}</div>{right}</div>;
}

export function Btn({ ic, label, onClick, disabled, kind, dp }: {
  ic: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  kind?: string;
  dp?: Record<string, string>;
}) {
  return (
    <button className={'ibtn ' + (kind || '')} onClick={onClick} disabled={disabled} {...dp}>
      <Ic id={ic} className="bsi" /><span>{label}</span>
    </button>
  );
}

export function useReqLabel() {
  const { t } = useT();
  return (req?: Req) => (req && Object.keys(req).length ? reqText(req) : t('noReq'));
}
