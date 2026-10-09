'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAnonymousAuth } from '@/lib/firebase/client';

/* ─── constants ─── */
const AVATARS: [string, string][] = [
  ['cat', 'แมว'], ['fox', 'จิ้งจอก'], ['bear', 'หมี'], ['rabbit', 'กระต่าย'],
  ['frog', 'กบ'], ['owl', 'นกฮูก'], ['duck', 'เป็ด'], ['robot', 'หุ่นยนต์'],
];
const NAME_MAX = 20;
const CODE_LEN = 6;
const CODE_BAD = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;
const STORE_KEY = 'wayr.profile';

/** Count Unicode characters (not code-units) */
function charLen(s: string) { return Array.from(s).length; }

/** Read saved profile from localStorage (runs once) */
function loadSavedProfile(): { name: string; avatar: string | null } {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!d) return { name: '', avatar: null };
    const savedName = typeof d.name === 'string' ? Array.from(d.name).slice(0, NAME_MAX).join('') : '';
    const savedAvatar = AVATARS.some(([id]) => id === d.avatar) ? d.avatar : null;
    return { name: savedName, avatar: savedAvatar };
  } catch {
    return { name: '', avatar: null };
  }
}

/** Parse invite code from URL search params */
function parseInviteCode(): string {
  if (typeof window === 'undefined') return '';
  const raw = new URLSearchParams(window.location.search).get('room') || '';
  const c = raw.toUpperCase().replace(CODE_BAD, '');
  return c.length === CODE_LEN ? c : '';
}

/* ─── component ─── */
export default function HomeCard() {
  const [name, setName] = useState(() => loadSavedProfile().name);
  const [avatar, setAvatar] = useState<string | null>(() => loadSavedProfile().avatar);
  const [code, setCode] = useState(() => parseInviteCode());
  const [nameMsg, setNameMsg] = useState('');
  const [avMsg, setAvMsg] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const inviteCode = useMemo(() => parseInviteCode(), []);
  const invited = inviteCode.length === CODE_LEN;

  const frameRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const eyeRefs = useRef<HTMLElement[]>([]);

  const trimmedName = name.trim();
  const nameOk = charLen(trimmedName) >= 1 && charLen(trimmedName) <= NAME_MAX;
  const stampReady = nameOk && !!avatar;
  const stampState = stampReady ? 'ready' : 'idle';

  /* ─── persist to localStorage on change ─── */
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ name: trimmedName, avatar })); } catch { /* ignore */ }
  }, [trimmedName, avatar]);

  /* ─── online / offline ─── */
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const set = () => setIsOnline(navigator.onLine);
    set();
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    return () => { window.removeEventListener('online', set); window.removeEventListener('offline', set); };
  }, []);

  /* ─── peeking eyes follow pointer ─── */
  useEffect(() => {
    let raf = 0;
    function look(x: number, y: number) {
      eyeRefs.current.forEach((eye) => {
        if (!eye) return;
        const r = eye.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 40) * 2.6;
        eye.style.setProperty('--px', (dx / d * k).toFixed(2) + 'px');
        eye.style.setProperty('--py', (dy / d * k).toFixed(2) + 'px');
      });
    }
    function onPoint(e: PointerEvent) {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; look(e.clientX, e.clientY); });
    }
    document.addEventListener('pointermove', onPoint, { passive: true });
    document.addEventListener('pointerdown', onPoint, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onPoint);
      document.removeEventListener('pointerdown', onPoint);
    };
  }, []);

  /* ─── helpers ─── */
  const boing = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.classList.remove('boing');
    void el.offsetWidth;
    el.classList.add('boing');
  }, []);

  const popStamp = useCallback(() => {
    const el = stampRef.current;
    if (!el) return;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }, []);

  /* ─── handlers ─── */
  function onNameInput(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value;
    if (charLen(v) > NAME_MAX) v = Array.from(v).slice(0, NAME_MAX).join('');
    setName(v);
    setNameMsg('');
    setNameInvalid(false);
    setStatusMsg('');
  }

  function onAvatarChange(id: string) {
    setAvatar(id);
    setAvMsg('');
    boing(frameRef.current);
    setTimeout(popStamp, 50);
  }

  function onCodeInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase().replace(CODE_BAD, '').slice(0, CODE_LEN);
    setCode(v);
    setCodeMsg('');
    setCodeInvalid(false);
    setStatusMsg('');
  }

  /* ─── validate ─── */
  function validateProfile(): string | null {
    let first: string | null = null;
    if (!nameOk) {
      setNameMsg(`ใส่ชื่อ 1–${NAME_MAX} ตัวอักษร`);
      setNameInvalid(true);
      first = 'name';
    }
    if (!avatar) {
      setAvMsg('เลือกอวาตาร์ 1 แบบ');
      if (!first) first = 'av-grid';
    }
    return first;
  }

  function guardOffline() {
    if (!isOnline) { setStatusMsg('ออฟไลน์อยู่ ต่ออินเทอร์เน็ตแล้วลองใหม่'); return true; }
    return false;
  }

  /* ─── actions ─── */
  async function createRoom() {
    if (busy || guardOffline()) return;
    if (validateProfile()) return;
    setBusy(true);
    setStatusMsg('กำลังสร้างห้องและเตรียมแฟ้มสืบสวน...');

    try {
      const user = await ensureAnonymousAuth();
      const token = await user.getIdToken();

      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: trimmedName, avatarId: avatar || 'cat' }),
      });

      const text = await res.text();
      let data: { code?: string; error?: string } | null = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is not JSON
        }
      }

      if (!res.ok) {
        console.error('[CreateRoom] Server responded with error:', res.status, text);
        const errorMsg =
          data?.error ||
          (text && text.length < 150 && !text.includes('<!DOCTYPE')
            ? text
            : `สร้างห้องไม่สำเร็จ (HTTP ${res.status}) - โปรดตรวจสอบ /api/diagnostics`);
        throw new Error(errorMsg);
      }

      if (!data?.code) {
        throw new Error('ไม่พบรหัสห้องที่สร้าง');
      }

      router.push(`/room/${data.code}`);
    } catch (err: unknown) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างห้อง';
      setStatusMsg(msg);
    }
  }

  async function joinRoom() {
    if (busy || guardOffline()) return;
    const bad = validateProfile();
    if (code.length !== CODE_LEN) {
      setCodeMsg(`รหัสห้องมี ${CODE_LEN} ตัว`);
      setCodeInvalid(true);
    }
    if (bad || code.length !== CODE_LEN) return;

    setBusy(true);
    setStatusMsg('กำลังตรวจสอบรหัสห้อง...');

    try {
      const user = await ensureAnonymousAuth();
      const token = await user.getIdToken();

      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, displayName: trimmedName, avatarId: avatar || 'fox' }),
      });

      const text = await res.text();
      let data: { code?: string; error?: string } | null = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is not JSON
        }
      }

      if (!res.ok) {
        console.error('[JoinRoom] Server responded with error:', res.status, text);
        const errorMsg =
          data?.error ||
          (text && text.length < 150 && !text.includes('<!DOCTYPE')
            ? text
            : `ไม่สามารถเข้าร่วมห้องได้ (HTTP ${res.status}) - โปรดตรวจสอบ /api/diagnostics`);
        throw new Error(errorMsg);
      }

      router.push(`/room/${code}`);
    } catch (err: unknown) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าห้อง';
      setCodeMsg(msg);
      setCodeInvalid(true);
      setStatusMsg(msg);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invited) {
      joinRoom();
    } else {
      createRoom();
    }
  }

  /* ─── render ─── */
  return (
    <>
      {/* Offline banner */}
      <div className="offline" id="offline" role="status" hidden={isOnline}>
        ออฟไลน์อยู่ ต่ออินเทอร์เน็ตก่อนสร้างหรือเข้าห้อง
      </div>

      <main className="wrap">
        <div className="folder">
          <span className="stitch" aria-hidden="true" />
          <i className="st st1" aria-hidden="true" />
          <i className="st st2" aria-hidden="true" />
          <i className="st st3" aria-hidden="true" />
          <svg className="edge-clip" viewBox="0 0 22 60" aria-hidden="true" focusable="false"><use href="#d-clip" /></svg>
          <span className="edge-sticker" aria-hidden="true">?</span>
          <span className="tape ct ct-tr" aria-hidden="true" />
          <span className="tape ct ct-bl" aria-hidden="true" />
          <div className="tab">
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="5.5" fill="#DCEBE7" stroke="#1B2A4A" strokeWidth="2" />
              <path d="M12.4 12.4 18 18" stroke="#1B2A4A" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            แฟ้มสืบตัวตน
          </div>

          <div className="folder-inner">
            {/* ─── Title ─── */}
            <header className="head">
              <svg className="doodle doodle-star" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
                <path d="M22 3 L27.5 15.5 L41 17 L31 26.5 L33.8 40 L22 33 L10.2 40 L13 26.5 L3 17 L16.5 15.5 Z" fill="#F7E08F" stroke="#1B2A4A" strokeWidth="2.4" strokeLinejoin="round" />
              </svg>
              <svg className="doodle doodle-spark" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M10 1 V19 M1 10 H19" stroke="#B04A2F" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <h1>
                <span className="l1">Who Are You</span>
                <span className="l2">Really<b className="q">?</b></span>
              </h1>
              <p className="tagline"><span>ตอบตามบท จับตัวตนเพื่อนให้ได้</span></p>
              <p className="sub">เล่น 2 คน ใช้มือถือคนละเครื่อง ไม่ต้องสมัครสมาชิก</p>
            </header>

            {/* ─── Detective ID Card ─── */}
            <div className="card-area">
              <form
                className={`card${invited ? ' invited' : ''}`}
                id="card"
                noValidate
                autoComplete="off"
                aria-labelledby="card-title"
                onSubmit={onSubmit}
              >
                <span className="tape" aria-hidden="true" />
                <div className="card-head">
                  <h2 id="card-title">บัตรสายสืบ</h2>
                </div>
                <div
                  className={`stamp${stampReady ? ' pop' : ''}`}
                  ref={stampRef}
                  data-state={stampState}
                  aria-live="polite"
                >
                  {stampReady ? 'พร้อมสืบ' : 'ยังไม่ครบ'}
                </div>

                <div className="id-row">
                  <div className="photo" ref={frameRef} id="photo-frame" aria-hidden="true">
                    <span className="tape" />
                    <div className={`photo-in${!avatar ? ' empty' : ''}`} id="photo">
                      <svg viewBox="0 0 48 48">
                        <use href={`#av-${avatar || 'none'}`} />
                      </svg>
                    </div>
                  </div>
                  <div className="fields">
                    <label className="lbl" htmlFor="name">ชื่อผู้เล่น</label>
                    <input
                      className="name-input"
                      id="name"
                      name="name"
                      type="text"
                      maxLength={20}
                      placeholder="พิมพ์ชื่อเล่น"
                      autoComplete="nickname"
                      enterKeyHint="done"
                      aria-describedby="name-msg name-count"
                      aria-invalid={nameInvalid || undefined}
                      value={name}
                      onChange={onNameInput}
                    />
                    <div className="meta">
                      <span className="msg" id="name-msg" role="alert">{nameMsg}</span>
                      <span className="count" id="name-count">{charLen(name)}/{NAME_MAX}</span>
                    </div>
                    <div className="secret">
                      <span>บทลับ</span>
                      <span className="bar-wrap" aria-hidden="true">
                        <span className="eyes">
                          <span className="eye" ref={(el) => { if (el) eyeRefs.current[0] = el; }}><i /></span>
                          <span className="eye" ref={(el) => { if (el) eyeRefs.current[1] = el; }}><i /></span>
                        </span>
                        <span className="redact" />
                      </span>
                      <span className="sr-only">ยังไม่ได้รับบท</span>
                    </div>
                    <p className="secret-hint">แอบดูอยู่ รู้ตอนเริ่มเกม</p>
                  </div>
                </div>

                {/* ─── Avatar picker ─── */}
                <fieldset className="avatars" aria-describedby="av-msg">
                  <legend>เลือกหน้าตาของคุณ</legend>
                  <div className="av-grid" id="av-grid">
                    {AVATARS.map(([id, label]) => (
                      <label key={id} className="av" title={label}>
                        <input
                          type="radio"
                          name="avatar"
                          value={id}
                          aria-label={label}
                          checked={avatar === id}
                          onChange={() => onAvatarChange(id)}
                        />
                        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                          <use href={`#av-${id}`} />
                        </svg>
                        <span className="tick" aria-hidden="true">
                          <svg viewBox="0 0 12 12">
                            <path d="M2.5 6.5 5 9l4.5-5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="av-msg" id="av-msg" role="alert">{avMsg}</p>
                </fieldset>

                {/* ─── Create / Join actions ─── */}
                <div className="stub">
                  <svg className="scissors" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
                    <g fill="none" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round">
                      <circle cx="6" cy="6" r="3.2" /><circle cx="6" cy="20" r="3.2" />
                      <path d="M8.6 8 L23 18 M8.6 18 L23 8" />
                    </g>
                  </svg>

                  {invited && (
                    <div className="invite" id="invite" style={{ display: 'block' }}>
                      เพื่อนชวนคุณเข้าห้อง <b id="invite-code">{inviteCode}</b>
                    </div>
                  )}

                  <div className="block-create">
                    <button
                      type="button"
                      className={`btn ${invited ? 'btn-alt' : 'btn-main'} btn-wide`}
                      id="btn-create"
                      disabled={busy}
                      onClick={createRoom}
                    >
                      <svg viewBox="0 0 22 22" aria-hidden="true" focusable="false">
                        <circle cx="11" cy="11" r="9.5" fill="#FFFCF2" />
                        <path d="M11 6.5 V15.5 M6.5 11 H15.5" stroke="#B04A2F" strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                      <span className="t">{busy && !invited ? 'กำลังสร้างห้อง…' : 'สร้างห้องใหม่'}</span>
                    </button>
                  </div>

                  <div className="or" aria-hidden="true">หรือ</div>

                  <div className="block-join">
                    <label className="join-label" htmlFor="code">เข้าห้องของเพื่อน</label>
                    <div className="join-row" style={invited ? { gridTemplateColumns: 'minmax(0,1fr)' } : undefined}>
                      {!invited && (
                        <input
                          className="code-input"
                          id="code"
                          name="code"
                          type="text"
                          inputMode="text"
                          maxLength={6}
                          placeholder="K7M2QP"
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-describedby="code-msg"
                          aria-invalid={codeInvalid || undefined}
                          value={code}
                          onChange={onCodeInput}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); joinRoom(); } }}
                        />
                      )}
                      <button
                        type="button"
                        className={`btn ${invited ? 'btn-main btn-wide' : 'btn-alt'}`}
                        id="btn-join"
                        disabled={busy}
                        onClick={joinRoom}
                      >
                        <span className="t">{busy && invited ? 'กำลังเข้าห้อง…' : 'เข้าห้อง'}</span>
                      </button>
                    </div>
                    <p className="code-msg" id="code-msg" role="alert">{codeMsg}</p>
                  </div>

                  <p className="status" id="status" role="status" aria-live="polite">{statusMsg}</p>
                </div>
              </form>
            </div>

            {/* ─── How to Play ─── */}
            <section className="how" aria-labelledby="how-title">
              <h2 id="how-title">วิธีเล่น</h2>
              <ol className="steps">
                <li><strong>รับบทลับ</strong><span>ทั้งสองคนได้บทคนละบท และไม่ซ้ำกัน</span></li>
                <li><strong>ตอบตามบท</strong><span>เห็นสถานการณ์เดียวกัน แล้วเลือกคำตอบที่บทของคุณจะเลือก</span></li>
                <li><strong>ทายบทของเพื่อน</strong><span>ดูคำตอบของเพื่อน แล้วล็อกคำทายได้รอบละ 1 ครั้ง</span></li>
                <li><strong>สะสมคะแนน</strong><span>เล่น 4 รอบ ใครรวมคะแนนมากกว่าชนะ</span></li>
              </ol>
              <p className="points-title">ทายถูกหลังสถานการณ์ข้อไหน ได้คะแนนตามนี้</p>
              <ul className="points">
                <li><small>ข้อ 1</small><b>5</b></li>
                <li><small>ข้อ 2</small><b>4</b></li>
                <li><small>ข้อ 3</small><b>3</b></li>
                <li><small>ข้อ 4</small><b>2</b></li>
              </ul>
              <p className="points-note">ทายผิดได้ 0 คะแนน</p>
              <p className="fair">ตอบตามบทบาทที่ได้รับ อย่าจงใจตอบตรงข้ามเพื่อกันเพื่อนทาย</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
