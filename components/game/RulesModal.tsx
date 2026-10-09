'use client';

import { ROLES, ROLE_IDS, SCORE_TABLE } from '@/lib/game/types';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="rules-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="กติกาและบทบาท">
      <div className="rules-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rules-modal-header">
          <div className="rules-modal-title">
            <svg width="20" height="20" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 8 }}>
              <use href="#ico-card" />
            </svg>
            คู่มือนักสืบ & กติกาการเล่น
          </div>
          <button className="rules-modal-close" onClick={onClose} aria-label="ปิดคู่มือ">
            ✕
          </button>
        </div>

        <div className="rules-modal-body">
          {/* Golden Rule */}
          <div className="rules-callout">
            <div className="rules-callout-icon">💡</div>
            <div className="rules-callout-text">
              <strong>กฎข้อสำคัญ:</strong> ตอบตามบทบาทที่ได้รับอย่างเป็นธรรมชาติ อย่าจงใจตอบตรงข้ามเพื่อกันเพื่อนทาย เพราะคะแนนมาจากการจับตัวตนของอีกฝ่ายให้ได้!
            </div>
          </div>

          {/* Scoring Table */}
          <div className="rules-section">
            <h3 className="rules-section-title">ตารางคะแนนการทาย</h3>
            <div className="rules-scoring-grid">
              {SCORE_TABLE.map((pts, idx) => (
                <div key={idx} className="rules-score-item">
                  <div className="rules-score-clue">ทายถูกหลังข้อ {idx + 1}</div>
                  <div className="rules-score-pts">+{pts} คะแนน</div>
                </div>
              ))}
              <div className="rules-score-item rules-score-wrong">
                <div className="rules-score-clue">ทายผิด / ไม่ทาย</div>
                <div className="rules-score-pts">0 คะแนน</div>
              </div>
            </div>
            <p className="rules-caption">
              * ทายได้เพียงคนละ 1 ครั้งต่อรอบ และจบรอบทันทีเมื่อทั้งสองคนส่งคำทายครบ หรือเมื่อจบข้อที่ 4
            </p>
          </div>

          {/* 6 Roles Catalog */}
          <div className="rules-section">
            <h3 className="rules-section-title">บทบาททั้ง 6 ในเกม</h3>
            <div className="rules-roles-list">
              {ROLE_IDS.map((roleId) => {
                const info = ROLES[roleId];
                return (
                  <div key={roleId} className="rules-role-card">
                    <div className="rules-role-header">
                      <span className={`rules-role-badge role-${roleId}`}>{info.name}</span>
                    </div>
                    <div className="rules-role-desc">{info.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rules-modal-footer">
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            รับทราบและกลับไปที่เกม
          </button>
        </div>
      </div>
    </div>
  );
}
