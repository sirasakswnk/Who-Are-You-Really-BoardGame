'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ROLES, type RoleId } from '@/lib/game/types';
import styles from './RoleReminder.module.css';

export default function RoleReminder({ role, placement = 'header' }: {
  role: RoleId;
  placement?: 'header' | 'folder-tab';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const documentId = useId();
  const roleInfo = ROLES[role];

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog?.open) dialog.close();
    };
  }, [isOpen]);

  const openFile = () => {
    dialogRef.current?.showModal();
    setIsOpen(true);
  };
  const closeFile = () => dialogRef.current?.close();

  return (
    <div className={`role-reminder-row ${styles.row}`}>
      <button type="button" className={`${styles.trigger} ${placement === 'folder-tab' ? styles.folderTabTrigger : ''}`} onClick={openFile}
        aria-haspopup="dialog" aria-controls={`${documentId}-dialog`} aria-expanded={isOpen}>
        บทบาทของฉัน
      </button>
      <dialog ref={dialogRef} className={styles.dialog} id={`${documentId}-dialog`}
        aria-label="บทบาทของฉัน" aria-describedby={`${documentId}-description`}
        onClose={() => setIsOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) closeFile(); }}
        onKeyDown={event => {
          if (event.key === 'Escape') closeFile();
          if (event.key === 'Tab') {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }}>
        <div className={styles.folder}>
          <span className={styles.tab} aria-hidden="true">บทบาทลับ</span>
          <div className={styles.header}>
            <span className={styles.privateStamp}>เฉพาะคุณ</span>
            <button ref={closeButtonRef} type="button" className={styles.close} onClick={closeFile}>ปิดแฟ้ม</button>
          </div>
          <div className={styles.paper}>
            <p className={styles.kicker}>บทบาทของคุณในรอบนี้</p>
            <h2 className={styles.roleName}>{roleInfo.name}</h2>
            <p className={styles.description} id={`${documentId}-description`}>{roleInfo.description}</p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
