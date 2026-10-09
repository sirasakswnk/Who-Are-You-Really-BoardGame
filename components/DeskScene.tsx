/**
 * DeskScene – purely decorative background elements behind the folder
 * Uses sprite definitions from DeskSprite.tsx
 */
export default function DeskScene() {
  return (
    <div className="scene" aria-hidden="true">
      <svg className="d d-pencil" viewBox="0 0 150 28" focusable="false"><use href="#d-pencil" /></svg>
      <svg className="d d-tag" viewBox="0 0 70 118" focusable="false"><use href="#d-tag" /></svg>
      <svg className="d d-mag" viewBox="0 0 120 170" focusable="false"><use href="#d-mag" /></svg>
      <svg className="d d-cup" viewBox="0 0 120 120" focusable="false"><use href="#d-cup" /></svg>
      <svg className="d d-star-a" viewBox="0 0 44 44" focusable="false"><use href="#d-star" /></svg>
      {/* Desktop-only decorations */}
      <svg className="d dk d-feet" viewBox="0 0 90 250" focusable="false"><use href="#d-feet" /></svg>
      <svg className="d dk d-note" viewBox="0 0 90 90" focusable="false"><use href="#d-note" /></svg>
      <svg className="d dk d-print d-print-a" viewBox="0 0 60 80" focusable="false"><use href="#d-print" /></svg>
      <svg className="d dk d-print d-print-b" viewBox="0 0 60 80" focusable="false"><use href="#d-print" /></svg>
      <svg className="d dk d-stamp" viewBox="0 0 100 100" focusable="false"><use href="#d-stamp" /></svg>
      <svg className="d dk d-q d-q-a" viewBox="0 0 40 60" focusable="false"><use href="#d-q" /></svg>
      <svg className="d dk d-q d-q-b" viewBox="0 0 40 60" focusable="false"><use href="#d-q" /></svg>
      <svg className="d dk d-star-b" viewBox="0 0 44 44" focusable="false"><use href="#d-star" /></svg>
    </div>
  );
}
