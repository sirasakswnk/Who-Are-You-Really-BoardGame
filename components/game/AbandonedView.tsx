export default function AbandonedView({ displayName, busy, onLeave }: {
  displayName: string; busy: boolean; onLeave: () => void;
}) {
  return <section className="error-box" role="status" aria-live="polite">
    <h2 className="error-title">เกมยุติแล้ว</h2>
    <p className="error-message">{displayName} ออกจากห้อง เกมนี้จึงยุติและไม่มีผู้ชนะเต็มเกม</p>
    <p>หากต้องการเล่นต่อ ให้สร้างห้องใหม่</p>
    <button className="btn btn-primary" disabled={busy} onClick={onLeave}>ออกจากห้องและกลับหน้าหลัก</button>
  </section>;
}
