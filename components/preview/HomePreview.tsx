'use client';

import { useEffect, useRef, useState } from 'react';
import HomeCardView, { CODE_LEN, NAME_MAX, charLen } from '@/components/HomeCardView';
import type { HomeCardDisplayState } from '@/components/HomeCardView';
import type { PreviewState } from './fixtures';

/** Local display state only: no profile storage, authentication, or room requests. */
export default function HomePreview({ state }: { state: PreviewState }) {
  const [form, setForm] = useState<HomeCardDisplayState>(() => ({
    name: state === 'waiting' ? 'มะลิ' : '',
    avatar: state === 'waiting' ? 'cat' : null,
    code: '',
    inviteCode: '',
    nameMsg: '', avMsg: '', codeMsg: '',
    statusMsg: state === 'waiting' ? 'กำลังสร้างห้องและเตรียมแฟ้มสืบสวน...' : '',
    nameInvalid: false, codeInvalid: false,
    activeAction: state === 'waiting' ? 'create' : null,
    isOnline: state !== 'blocked',
  }));
  const frameRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const eyeRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    let frame = 0;
    function onPoint(event: PointerEvent) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        for (const eye of eyeRefs.current) {
          const bounds = eye.getBoundingClientRect();
          const dx = event.clientX - (bounds.left + bounds.width / 2);
          const dy = event.clientY - (bounds.top + bounds.height / 2);
          const distance = Math.hypot(dx, dy) || 1;
          const scale = Math.min(1, distance / 40) * 2.6;
          eye.style.setProperty('--px', `${(dx / distance * scale).toFixed(2)}px`);
          eye.style.setProperty('--py', `${(dy / distance * scale).toFixed(2)}px`);
        }
      });
    }
    document.addEventListener('pointermove', onPoint, { passive: true });
    document.addEventListener('pointerdown', onPoint, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onPoint);
      document.removeEventListener('pointerdown', onPoint);
    };
  }, []);

  function pulse(element: HTMLElement | null, className: string) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function showAction(action: 'create' | 'join') {
    if (form.activeAction) return;
    if (!form.isOnline) {
      setForm(previous => ({ ...previous, statusMsg: 'ออฟไลน์อยู่ ต่ออินเทอร์เน็ตแล้วลองใหม่' }));
      return;
    }
    const nameInvalid = charLen(form.name.trim()) < 1 || charLen(form.name.trim()) > NAME_MAX;
    const codeInvalid = action === 'join' && form.code.length !== CODE_LEN;
    setForm(previous => ({
      ...previous,
      nameInvalid,
      codeInvalid,
      nameMsg: nameInvalid ? `ใส่ชื่อ 1–${NAME_MAX} ตัวอักษร` : '',
      avMsg: !form.avatar ? 'เลือกอวาตาร์ 1 แบบ' : '',
      codeMsg: codeInvalid ? `รหัสห้องมี ${CODE_LEN} ตัว` : '',
      ...(!nameInvalid && form.avatar && !codeInvalid ? {
        activeAction: action,
        statusMsg: action === 'create' ? 'กำลังสร้างห้องและเตรียมแฟ้มสืบสวน...' : 'กำลังตรวจสอบรหัสห้อง...',
      } : {}),
    }));
  }

  return <HomeCardView state={form} refs={{ frameRef, stampRef }}
    onEyeRef={(index, element) => { if (element) eyeRefs.current[index] = element; }}
    onNameInput={event => {
      const name = Array.from(event.target.value).slice(0, NAME_MAX).join('');
      setForm(previous => ({ ...previous, name, nameMsg: '', nameInvalid: false, statusMsg: '' }));
    }}
    onCodeInput={event => {
      const code = event.target.value.toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, '').slice(0, CODE_LEN);
      setForm(previous => ({ ...previous, code, codeMsg: '', codeInvalid: false, statusMsg: '' }));
    }}
    onAvatarChange={avatar => {
      setForm(previous => ({ ...previous, avatar, avMsg: '' }));
      pulse(frameRef.current, 'boing');
      setTimeout(() => pulse(stampRef.current, 'pop'), 50);
    }}
    createRoom={() => showAction('create')} joinRoom={() => showAction('join')}
    onSubmit={event => { event.preventDefault(); showAction('create'); }}
  />;
}
