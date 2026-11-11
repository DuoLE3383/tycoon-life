'use client';

import { Art, asset, type GameState, Ic, type Req, reqText, useEffect, useT } from '@/components/gameDeps';



// ================= shared bits =================
export type Act = (fn: (st: GameState) => string | null | void) => void;


export type TFn = ReturnType<typeof useT>['t'];



// v11.50 — Esc-to-close hook for dismissible modals. Pass onClose; while the
// calling component is mounted, pressing Esc calls onClose once. Skips when
// the active element is an input/textarea/select (don't steal form edits).
export function useEscapeKey(onClose: () => void, active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      // Don't hijack Esc while editing inputs (lets the user cancel field edits).
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        (el as HTMLElement | null)?.blur?.();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose, active]);
}



export function Row({ art, image, children, right }: { art: string; image?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="row">{image ? <img className="rowimg" src={asset(image)} alt="" loading="lazy" /> : (art && <Art id={art} />)}<div className="info">{children}</div>{right}</div>;
}


export function Btn({ ic, label, onClick, disabled, kind, dp }: { ic: string; label: string; onClick?: () => void; disabled?: boolean; kind?: string; dp?: Record<string, string> }) {
  return (
    <button className={'ibtn ' + (kind || '')} onClick={onClick} disabled={disabled} {...dp}>
      <Ic id={ic} className="bsi" /><span>{label}</span>
    </button>
  );
}


// reqText() is engine-side English; empty requirements get a translated label.
export function useReqLabel() {
  const { t } = useT();
  return (req?: Req) => (req && Object.keys(req).length ? reqText(req) : t('noReq'));
}
