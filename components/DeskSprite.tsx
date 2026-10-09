/**
 * Desk decoration SVG sprites – magnifying glass, pencil, tag, cup, stars, etc.
 * Rendered once in the body, referenced by the DeskScene component.
 */
export default function DeskSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="d-star" viewBox="0 0 44 44">
          <path d="M22 3 L27.5 15.5 L41 17 L31 26.5 L33.8 40 L22 33 L10.2 40 L13 26.5 L3 17 L16.5 15.5 Z" fill="#F7E08F" stroke="#1B2A4A" strokeWidth="2.4" strokeLinejoin="round" />
        </symbol>
        <symbol id="d-q" viewBox="0 0 40 60">
          <text x="20" y="50" textAnchor="middle" fontFamily="Rockwell, Georgia, serif" fontWeight="800" fontSize="56" fill="none" stroke="#1B2A4A" strokeWidth="2.5" strokeLinejoin="round">?</text>
        </symbol>
        <symbol id="d-print" viewBox="0 0 60 80">
          <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M5 74 V32 a25 25 0 0 1 50 0 V60" strokeDasharray="22 6 10 6" />
            <path d="M12 70 V32 a18 18 0 0 1 36 0 V68" strokeDasharray="16 5 24 5" />
            <path d="M19 66 V32 a11 11 0 0 1 22 0 V62" strokeDasharray="10 5 18 5" />
            <path d="M26 58 V33 a4 4 0 0 1 8 0 V56" />
          </g>
        </symbol>
        <symbol id="d-feet" viewBox="0 0 90 250">
          <g fill="currentColor">
            <g transform="translate(26 22) rotate(-8)"><ellipse rx="10" ry="16" /><ellipse cy="26" rx="7" ry="8" /></g>
            <g transform="translate(62 68) rotate(6)"><ellipse rx="10" ry="16" /><ellipse cy="26" rx="7" ry="8" /></g>
            <g transform="translate(26 114) rotate(-6)"><ellipse rx="10" ry="16" /><ellipse cy="26" rx="7" ry="8" /></g>
            <g transform="translate(62 160) rotate(8)"><ellipse rx="10" ry="16" /><ellipse cy="26" rx="7" ry="8" /></g>
            <g transform="translate(26 206) rotate(-8)"><ellipse rx="10" ry="16" /><ellipse cy="26" rx="7" ry="8" /></g>
          </g>
        </symbol>
        <symbol id="d-mag" viewBox="0 0 120 170">
          <g stroke="#1B2A4A" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
            <rect x="52" y="94" width="16" height="66" rx="8" fill="#B04A2F" />
            <circle cx="60" cy="56" r="42" fill="#DCEBE7" fillOpacity=".8" />
          </g>
          <path d="M33 48 A28 28 0 0 1 52 29" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        </symbol>
        <symbol id="d-tag" viewBox="0 0 70 118">
          <g stroke="#1B2A4A" strokeLinejoin="round" strokeLinecap="round">
            <path d="M35 40 C35 24 22 16 12 4 M35 40 C35 24 48 16 58 4" fill="none" strokeWidth="2.5" />
            <path d="M22 32 H48 L62 48 V112 H8 V48 Z" fill="#F2E3B3" strokeWidth="3" />
            <circle cx="35" cy="44" r="4.5" fill="#DCCFA8" strokeWidth="2.5" />
          </g>
          <text x="35" y="78" textAnchor="middle" fontFamily="Noto Sans Thai, Tahoma, sans-serif" fontWeight="800" fontSize="12" fill="#1B2A4A">หลักฐาน</text>
          <path d="M16 90 H54 M16 99 H44" stroke="#1B2A4A" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="d-pencil" viewBox="0 0 150 28">
          <g stroke="#1B2A4A" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M26 2 H124 V26 H26 Z" fill="#F7E08F" />
            <path d="M2 14 L26 2 V26 Z" fill="#EBCBA0" />
            <path d="M2 14 L9 10.4 V17.6 Z" fill="#1B2A4A" />
            <rect x="124" y="2" width="9" height="24" fill="#B8C0CC" />
            <rect x="133" y="2" width="14" height="24" rx="4" fill="#F5CDBF" />
            <path d="M40 9 H114 M40 19 H114" fill="none" strokeOpacity=".3" />
          </g>
        </symbol>
        <symbol id="d-stamp" viewBox="0 0 100 100">
          <g fill="none" stroke="#B04A2F"><circle cx="50" cy="50" r="46" strokeWidth="4" /><circle cx="50" cy="50" r="38" strokeWidth="2" /></g>
          <text x="50" y="59" textAnchor="middle" fontFamily="Noto Sans Thai, Tahoma, sans-serif" fontWeight="800" fontSize="24" fill="#B04A2F" transform="rotate(-10 50 50)">ปิดคดี</text>
        </symbol>
        <symbol id="d-cup" viewBox="0 0 120 120">
          <g fill="none" stroke="#8B5E3C" strokeLinecap="round">
            <circle cx="60" cy="60" r="46" strokeWidth="7" strokeDasharray="240 50" />
            <circle cx="60" cy="60" r="39" strokeWidth="2" strokeOpacity=".6" strokeDasharray="150 40" />
          </g>
          <circle cx="108" cy="20" r="3.5" fill="#8B5E3C" /><circle cx="14" cy="102" r="2.5" fill="#8B5E3C" /><circle cx="100" cy="30" r="2" fill="#8B5E3C" />
        </symbol>
        <symbol id="d-note" viewBox="0 0 90 90">
          <g stroke="#1B2A4A" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M6 8 H84 V68 L66 86 H6 Z" fill="#F7E08F" />
            <path d="M66 86 V68 H84" fill="#E8C95F" />
          </g>
          <text x="42" y="62" textAnchor="middle" fontFamily="Rockwell, Georgia, serif" fontWeight="800" fontSize="52" fill="#B04A2F">?</text>
        </symbol>
        <symbol id="d-clip" viewBox="0 0 22 60">
          <path d="M9 44 V12 a6 6 0 0 1 12 0 V46 a10 10 0 0 1 -20 0 V20" fill="none" stroke="#1B2A4A" strokeWidth="2.6" strokeLinecap="round" />
        </symbol>
      </defs>
    </svg>
  );
}
