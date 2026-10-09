/**
 * Avatar SVG sprite definitions – 8 animal/robot avatars
 * Rendered once at the top of the page, referenced via <use href="#av-{id}" />
 */
export default function AvatarSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {/* Cat */}
        <symbol id="av-cat" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#F6C9B4" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path d="M10 21 L12 7 L23 13 Z" fill="#E9A15F" />
            <path d="M38 21 L36 7 L25 13 Z" fill="#E9A15F" />
            <ellipse cx="24" cy="28" rx="14" ry="12" fill="#F2B56B" />
            <circle cx="18" cy="26" r="1.6" fill="#1B2A4A" />
            <circle cx="30" cy="26" r="1.6" fill="#1B2A4A" />
            <path d="M22 30 H26 L24 32.5 Z" fill="#B04A2F" />
            <path d="M24 32.5 V34 M20.5 35 Q24 37.5 27.5 35" fill="none" />
            <path d="M8 29 H14 M34 29 H40" fill="none" />
          </g>
        </symbol>
        {/* Fox */}
        <symbol id="av-fox" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#F7D9A8" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path d="M8 12 L19 19 H29 L40 12 L40 28 Q40 41 24 43 Q8 41 8 28 Z" fill="#E9803F" />
            <path d="M9 29 Q19 29 24 41 Q29 29 39 29 Q38 40 24 43 Q10 40 9 29 Z" fill="#FFF6E3" />
            <circle cx="17" cy="25" r="1.6" fill="#1B2A4A" />
            <circle cx="31" cy="25" r="1.6" fill="#1B2A4A" />
            <circle cx="24" cy="40" r="2" fill="#1B2A4A" />
          </g>
        </symbol>
        {/* Bear */}
        <symbol id="av-bear" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#CFE4DC" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <circle cx="12" cy="13" r="6" fill="#A9744B" />
            <circle cx="36" cy="13" r="6" fill="#A9744B" />
            <circle cx="24" cy="27" r="15" fill="#B98456" />
            <ellipse cx="24" cy="32" rx="6.5" ry="5" fill="#F3DDB8" />
            <ellipse cx="24" cy="30" rx="2.4" ry="1.7" fill="#1B2A4A" />
            <circle cx="17" cy="23" r="1.6" fill="#1B2A4A" />
            <circle cx="31" cy="23" r="1.6" fill="#1B2A4A" />
            <path d="M24 31.5 V34 M21.5 35 Q24 36.5 26.5 35" fill="none" />
          </g>
        </symbol>
        {/* Rabbit */}
        <symbol id="av-rabbit" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#F3D1D6" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <ellipse cx="17" cy="12" rx="4.5" ry="10" fill="#FFF6E3" />
            <ellipse cx="31" cy="12" rx="4.5" ry="10" fill="#FFF6E3" />
            <ellipse cx="17" cy="13" rx="1.8" ry="6" fill="#F0A9B6" stroke="none" />
            <ellipse cx="31" cy="13" rx="1.8" ry="6" fill="#F0A9B6" stroke="none" />
            <ellipse cx="24" cy="31" rx="13" ry="12" fill="#FFF6E3" />
            <circle cx="19" cy="29" r="1.6" fill="#1B2A4A" />
            <circle cx="29" cy="29" r="1.6" fill="#1B2A4A" />
            <path d="M22.5 33 H25.5 L24 34.8 Z" fill="#D9768A" />
            <path d="M24 34.8 V36.5 M21 37.5 Q24 39.5 27 37.5" fill="none" />
          </g>
        </symbol>
        {/* Frog */}
        <symbol id="av-frog" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#BFE0D9" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <ellipse cx="24" cy="30" rx="17" ry="12" fill="#7DBF6B" />
            <circle cx="15" cy="17" r="7" fill="#7DBF6B" />
            <circle cx="33" cy="17" r="7" fill="#7DBF6B" />
            <circle cx="15" cy="17" r="3.4" fill="#FFF6E3" />
            <circle cx="33" cy="17" r="3.4" fill="#FFF6E3" />
            <circle cx="15" cy="17" r="1.5" fill="#1B2A4A" stroke="none" />
            <circle cx="33" cy="17" r="1.5" fill="#1B2A4A" stroke="none" />
            <path d="M13 33 Q24 41 35 33" fill="none" />
          </g>
        </symbol>
        {/* Owl */}
        <symbol id="av-owl" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#D9D6EE" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path d="M11 15 L12 6 L20 12 Z" fill="#9A7B5B" />
            <path d="M37 15 L36 6 L28 12 Z" fill="#9A7B5B" />
            <ellipse cx="24" cy="27" rx="15" ry="16" fill="#9A7B5B" />
            <circle cx="17" cy="24" r="6.5" fill="#FFF6E3" />
            <circle cx="31" cy="24" r="6.5" fill="#FFF6E3" />
            <circle cx="17" cy="24" r="2.4" fill="#1B2A4A" />
            <circle cx="31" cy="24" r="2.4" fill="#1B2A4A" />
            <path d="M21.5 30 H26.5 L24 35.5 Z" fill="#D9A441" />
          </g>
        </symbol>
        {/* Duck */}
        <symbol id="av-duck" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#F8E3A0" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <circle cx="24" cy="24" r="14" fill="#F5CF4B" />
            <path d="M21 10.5 Q24 5 28 9.5" fill="none" />
            <ellipse cx="24" cy="31" rx="8.5" ry="4.5" fill="#E9803F" />
            <path d="M17 31 H31" fill="none" />
            <circle cx="18" cy="21" r="1.6" fill="#1B2A4A" />
            <circle cx="30" cy="21" r="1.6" fill="#1B2A4A" />
          </g>
        </symbol>
        {/* Robot */}
        <symbol id="av-robot" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="24" fill="#C9D5E8" />
          <g stroke="#1B2A4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path d="M24 8 V13" fill="none" />
            <circle cx="24" cy="6.5" r="2.5" fill="#B04A2F" />
            <rect x="5" y="22" width="4" height="10" rx="2" fill="#8B97AB" />
            <rect x="39" y="22" width="4" height="10" rx="2" fill="#8B97AB" />
            <rect x="9" y="13" width="30" height="27" rx="6" fill="#B9C4D6" />
            <rect x="14.5" y="21" width="8" height="7" rx="1.5" fill="#FFF6E3" />
            <rect x="25.5" y="21" width="8" height="7" rx="1.5" fill="#FFF6E3" />
            <circle cx="18.5" cy="24.5" r="1.5" fill="#1B2A4A" stroke="none" />
            <circle cx="29.5" cy="24.5" r="1.5" fill="#1B2A4A" stroke="none" />
            <path d="M16 34 L20 32 L24 34 L28 32 L32 34" fill="none" />
          </g>
        </symbol>
        {/* None / placeholder */}
        <symbol id="av-none" viewBox="0 0 48 48">
          <g fill="none" stroke="#1B2A4A" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="24" cy="17" r="8" />
            <path d="M8 43 Q8 30 24 30 Q40 30 40 43" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}
