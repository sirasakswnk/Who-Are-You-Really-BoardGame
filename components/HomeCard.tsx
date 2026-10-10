'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HomeCardView, { AVATARS, NAME_MAX, CODE_LEN, charLen } from './HomeCardView';
import { ensureAnonymousAuth } from '@/lib/firebase/client';
import { prepareRoomCreate, clearRoomCreate, type PendingRoomCreate } from '@/lib/client/pendingRoomCreate';

/* ─── constants ─── */
const CODE_BAD = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;
const STORE_KEY = 'wayr.profile';

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
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [avMsg, setAvMsg] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [activeAction, setActiveAction] = useState<'create' | 'join' | null>(null);
  const busy = activeAction !== null;
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const invited = inviteCode.length === CODE_LEN;

  const frameRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const eyeRefs = useRef<HTMLElement[]>([]);
  const pendingCreateRef = useRef<PendingRoomCreate | null>(null);
  const resetActionOnHideRef = useRef(false);

  const trimmedName = name.trim();
  const nameOk = charLen(trimmedName) >= 1 && charLen(trimmedName) <= NAME_MAX;

  /* Restore browser-only data after the server markup has hydrated. */
  useEffect(() => {
    // Discard the first mount's restore when Strict Mode runs its cleanup.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = loadSavedProfile();
      const invite = parseInviteCode();
      setName(saved.name);
      setAvatar(saved.avatar);
      setCode(invite);
      setInviteCode(invite);
      setProfileLoaded(true);
    });
    return () => { active = false; };
  }, []);

  /* Next.js Activity preserves this page; clear completed action UI when it hides. */
  useLayoutEffect(() => {
    return () => {
      if (!resetActionOnHideRef.current) return;
      resetActionOnHideRef.current = false;
      setActiveAction(null);
      setStatusMsg('');
    };
  }, []);

  /* ─── persist to localStorage on change ─── */
  useEffect(() => {
    if (!profileLoaded) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ name: trimmedName, avatar })); } catch { /* ignore */ }
  }, [profileLoaded, trimmedName, avatar]);

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
    setActiveAction('create');
    setStatusMsg('กำลังสร้างห้องและเตรียมแฟ้มสืบสวน...');

    try {
      const user = await ensureAnonymousAuth();
      const token = await user.getIdToken();

      let storage: Storage | null = null;
      try { storage = sessionStorage; } catch { /* Preserve retries in the ref. */ }
      const pending = prepareRoomCreate(storage, {
        uid: user.uid, displayName: trimmedName, avatarId: avatar || 'cat',
      }, pendingCreateRef.current);
      pendingCreateRef.current = pending;

      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: pending.requestId, displayName: pending.displayName, avatarId: pending.avatarId }),
      });

      const text = await res.text();
      let data: { code?: string; error?: string; retryable?: boolean } | null = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is not JSON
        }
      }

      if (!res.ok) {
        if (data?.retryable === false) {
          clearRoomCreate(storage);
          pendingCreateRef.current = null;
        }
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

      clearRoomCreate(storage);
      pendingCreateRef.current = null;

      resetActionOnHideRef.current = true;
      router.push(`/room/${data.code}`);
    } catch (err: unknown) {
      resetActionOnHideRef.current = false;
      setActiveAction(null);
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

    setActiveAction('join');
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

      resetActionOnHideRef.current = true;
      router.push(`/room/${code}`);
    } catch (err: unknown) {
      resetActionOnHideRef.current = false;
      setActiveAction(null);
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

  return <HomeCardView
    state={{ name, avatar, code, inviteCode, nameMsg, avMsg, codeMsg, statusMsg, nameInvalid, codeInvalid, activeAction, isOnline }}
    refs={{ frameRef, stampRef }}
    onEyeRef={(index, element) => { if (element) eyeRefs.current[index] = element; }}
    onNameInput={onNameInput} onCodeInput={onCodeInput} onAvatarChange={onAvatarChange}
    createRoom={createRoom} joinRoom={joinRoom} onSubmit={onSubmit}
  />;
}
