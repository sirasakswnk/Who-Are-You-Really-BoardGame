import { getRoleInfo, type ActiveRoleId, type RoleId } from '@/lib/game/types';

// UI summaries only. The complete catalog descriptions and game rules stay intact.
const SHORT_DESCRIPTIONS: Partial<Record<RoleId, string>> = {
  alien: 'เรียนรู้ธรรมเนียมมนุษย์โดยไม่เผยตัว',
  spy: 'เก็บข้อมูลโดยไม่เป็นจุดสนใจ',
  vampire: 'ใช้ชีวิตกับมนุษย์ แต่หลบแสงแดดโดยตรง',
  time_traveler: 'มาจากอดีต ไม่คุ้นเทคโนโลยีปัจจุบัน',
  thief: 'หาโอกาสเข้าใกล้ของมีค่าอย่างแนบเนียน',
  ghost: 'ปะปนกับคน แต่หลีกเลี่ยงการสัมผัสตัว',
} satisfies Record<ActiveRoleId, string>;

export function getRolePresentation(role: RoleId) {
  const info = getRoleInfo(role);
  return { ...info, shortDescription: SHORT_DESCRIPTIONS[role] ?? info.description };
}
