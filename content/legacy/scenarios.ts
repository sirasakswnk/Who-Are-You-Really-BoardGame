/**
 * 24 Authoritative Game Scenarios with Server-Only Editorial Metadata
 * Complies with Who Are You Really? product contract and role psychological profiles
 */

import { Scenario, LegacyScenarioWithEditorial } from '../../lib/game/types';

/**
 * Strips editorial metadata from a scenario before sending to the client/browser.
 */
export function stripEditorial(scenario: LegacyScenarioWithEditorial): Scenario {
  return {
    id: scenario.id,
    version: scenario.version,
    category: scenario.category,
    prompt: scenario.prompt,
    options: scenario.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
    })),
  };
}

/**
 * The 24 official game scenarios across 6 categories (4 each).
 */
export const LEGACY_SCENARIOS: LegacyScenarioWithEditorial[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. หมวด TRAVEL (การเดินทางและท่องเที่ยว)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'travel-rain',
    version: 1,
    category: 'travel',
    prompt: 'ฝนตกหนักกระทันหันตอนกำลังจะเดินทางกลับบ้าน การจราจรติดขัด รถโดยสารแน่นมาก',
    options: [
      { id: 'opt-rain-taxi', label: 'เรียกรถแท็กซี่หรือแอปมารับทันที ยอมจ่ายค่าเรียกรถช่วงฝนตก' },
      { id: 'opt-rain-wait', label: 'หาร้านกาแฟหรือร้านสะดวกซื้อนั่งพัก รอจนกว่าฝนจะซาและคนเริ่มน้อยลง' },
      { id: 'opt-rain-walk', label: 'กางร่มเดินลุยไปสถานีรถไฟฟ้าที่ใกล้ที่สุดเพื่อกลับให้ถึงไวขึ้น' },
      { id: 'opt-rain-bus', label: 'วิ่งขึ้นรถเมล์คันแรกที่ผ่านมา ยอมเบียดเสียดยืนเปียกเพื่อกลับบ้าน' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['travel', 'weather', 'commute'],
      plausibleOptionsByRole: {
        saver: ['opt-rain-bus', 'opt-rain-wait'],
        comfort: ['opt-rain-taxi', 'opt-rain-wait'],
        explorer: ['opt-rain-walk'],
        companion: ['opt-rain-wait', 'opt-rain-taxi'],
        impatient: ['opt-rain-walk', 'opt-rain-taxi', 'opt-rain-bus'],
        cautious: ['opt-rain-wait', 'opt-rain-taxi'],
      },
      rationaleByRole: {
        saver: 'ไม่ยอมจ่ายค่าแท็กซี่แพงช่วงฝนตก เลือกรถเมล์ราคาประหยัดหรือรอฝนหยุดเพื่อไม่เสียเงินเพิ่ม',
        comfort: 'ไม่ยอมเปียกฝนหรือเบียดคน เรียกรถติดแอร์หรือนั่งรอสบายๆ ในร้านกาแฟ',
        explorer: 'ชอบลุยฝนเดินสำรวจเส้นทางใหม่ ไม่กังวลเรื่องเปียกหรือความลำบาก',
        companion: 'มองหาเพื่อนร่วมทางกลับด้วยกัน หรือนั่งรอกับคนอื่นในร้าน',
        impatient: 'ไม่อยากยืนรอเฉยๆ เลือกรถที่มาเร็วที่สุดหรือเดินก้าวเท้าไปสถานีทันที',
        cautious: 'หลีกเลี่ยงการเดินลุยน้ำฝนที่อาจลื่นหรือมีเชื้อโรค รอในที่ปลอดภัยหรือขึ้นรถปิดมิดชิด',
      },
    },
  },
  {
    id: 'travel-hotel-full',
    version: 1,
    category: 'travel',
    prompt: 'เดินทางถึงเมืองท่องเที่ยวตอนเย็น แต่โรงแรมที่เล็งไว้ห้องพักเต็มหมดกะทันหัน',
    options: [
      { id: 'opt-hotel-upgrade', label: 'ยอมจ่ายเพิ่มเพื่อเปิดห้องระดับพรีเมียมของโรงแรมใหญ่ที่มีห้องว่างแน่นอน' },
      { id: 'opt-hotel-hostel', label: 'จองโฮสเทลห้องรวมราคาถูกที่อยู่ใกล้ที่สุดทันที' },
      { id: 'opt-hotel-unique', label: 'ลองเปิดหาที่พักสไตล์แปลกใหม่ เช่น เต็นท์โดม หรือโฮมสเตย์ชุมชน' },
      { id: 'opt-hotel-search', label: 'ยืนเช็กแอปเปรียบเทียบราคาและอ่านรีวิวจนกว่าจะได้ที่ที่คุ้มค่าที่สุด' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['travel', 'lodging', 'crisis'],
      plausibleOptionsByRole: {
        saver: ['opt-hotel-hostel', 'opt-hotel-search'],
        comfort: ['opt-hotel-upgrade'],
        explorer: ['opt-hotel-unique'],
        companion: ['opt-hotel-hostel', 'opt-hotel-unique'],
        impatient: ['opt-hotel-upgrade', 'opt-hotel-hostel'],
        cautious: ['opt-hotel-upgrade', 'opt-hotel-search'],
      },
      rationaleByRole: {
        saver: 'เลือกโฮสเทลหรือเปรียบเทียบหาราคาถูกที่สุดเพื่อไม่ให้งบทริปบานปลาย',
        comfort: 'ยอมจ่ายแพงเพื่อได้เตียงสบายและบริการดี ไม่เสียเวลาทนลำบาก',
        explorer: 'มองเป็นโอกาสดีที่จะได้ลองนอนเต็นท์โดมหรือโฮมสเตย์ท้องถิ่นที่ไม่เคยพัก',
        companion: 'ชอบบรรยากาศโฮสเทลที่มีผู้คนให้พูดคุย หรือชวนกันไปพักที่แปลกๆ',
        impatient: 'ขอแค่ได้ห้องเช็กอินทันที จะอัปเกรดหรือโฮสเทลก็ได้แต่ต้องเสร็จเร็วที่สุด',
        cautious: 'เลือกโรงแรมใหญ่ที่มีมาตรฐานความปลอดภัยชัดเจน หรือตรวจรีวิวอย่างถี่ถ้วน',
      },
    },
  },
  {
    id: 'travel-transport',
    version: 1,
    category: 'travel',
    prompt: 'วางแผนทริปท่องเที่ยว 3 วัน 2 คืน ไปจังหวัดใกล้เคียง ต้องเลือกวิธีการเดินทางหลัก',
    options: [
      { id: 'opt-trans-train', label: 'นั่งรถไฟท้องถิ่น ชมนกชมไม้สองข้างทาง ได้บรรยากาศคลาสสิก' },
      { id: 'opt-trans-flight', label: 'นั่งเครื่องบินเที่ยวบินด่วน ใช้เวลาเพียง 45 นาทีถึงจุดหมาย' },
      { id: 'opt-trans-van', label: 'เหมารถตู้ร่วมกับกลุ่มเพื่อน ผลัดกันคุยและแวะจุดพักตามใจชอบ' },
      { id: 'opt-trans-bus', label: 'นั่งรถทัวร์รอบเช้าตรู่ ค่าโดยสารประหยัดและกำหนดเวลาแน่นอน' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['travel', 'transport', 'planning'],
      plausibleOptionsByRole: {
        saver: ['opt-trans-train', 'opt-trans-bus'],
        comfort: ['opt-trans-flight', 'opt-trans-van'],
        explorer: ['opt-trans-train'],
        companion: ['opt-trans-van'],
        impatient: ['opt-trans-flight'],
        cautious: ['opt-trans-bus', 'opt-trans-flight'],
      },
      rationaleByRole: {
        saver: 'เน้นตั๋วรถไฟหรือรถทัวร์ที่ค่าเดินทางถูกที่สุด ช่วยคุมงบรวม',
        comfort: 'ชอบบินเร็วถึงไว ไม่เมื่อยตัว หรือนั่งรถตู้สบายๆ มีคนขับให้',
        explorer: 'ชอบความรู้สึกนั่งรถไฟเปิดหน้าต่างสัมผัสเส้นทางจริง',
        companion: 'อยากเดินทางไปพร้อมกลุ่มเพื่อนในรถตู้คันเดียวกันเพื่อความสนุก',
        impatient: 'ต้องการไปถึงเร็วที่สุด เลือกรอบบินตรงไม่ลังเล',
        cautious: 'เลือกระบบที่มีเวลาแน่นอนและอัตราความปลอดภัยสูง',
      },
    },
  },
  {
    id: 'travel-plan-change',
    version: 1,
    category: 'travel',
    prompt: 'วันที่สองของทริปมีประกาศพายุเข้า ทำให้สถานที่ไฮไลต์กลางแจ้งต้องปิดให้บริการ',
    options: [
      { id: 'opt-change-museum', label: 'เปลี่ยนไปเข้าพิพิธภัณฑ์ท้องถิ่นหรือตลาดโบราณที่อยู่นอกแผนเดิม' },
      { id: 'opt-change-resort', label: 'พักผ่อนในรีสอร์ต ว่ายน้ำสระในร่ม สปา และสั่งอาหารมาทาน' },
      { id: 'opt-change-cafe', label: 'นัดรวมตัวกลุ่มในร้านกาแฟใกล้ๆ เล่นบอร์ดเกมและคุยกันยาวๆ' },
      { id: 'opt-change-wait', label: 'รอติดตามประกาศจากอุทยานเป็นระยะ เผื่อพายุผ่านพ้นแล้วเปิดให้เข้าช่วงบ่าย' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['travel', 'emergency', 'activities'],
      plausibleOptionsByRole: {
        saver: ['opt-change-cafe', 'opt-change-wait'],
        comfort: ['opt-change-resort'],
        explorer: ['opt-change-museum'],
        companion: ['opt-change-cafe'],
        impatient: ['opt-change-museum', 'opt-change-resort'],
        cautious: ['opt-change-resort', 'opt-change-wait'],
      },
      rationaleByRole: {
        saver: 'ไม่ยอมเสียเงินกับค่าสปาแพงๆ ในโรงแรม เลือกร้านกาแฟหรือรอให้เปิดฟรี',
        comfort: 'เปลี่ยนมาพักผ่อนนอนเล่นสปาในรีสอร์ตได้อย่างสบายใจ',
        explorer: 'ตื่นเต้นที่จะได้สำรวจตลาดหรือพิพิธภัณฑ์ที่ไม่ได้ตั้งใจมา',
        companion: 'มองว่าอยู่คุยเล่นกับเพื่อนๆ ในร้านกาแฟก็สนุกไม่แพ้กัน',
        impatient: 'ไม่อยากรอเฉยๆ ปรับเปลี่ยนไปทำสิ่งที่เริ่มได้ทันที',
        cautious: 'อยู่แต่ในที่พักปลอดภัย ไม่เสี่ยงออกไปข้างนอกช่วงพายุ',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 2. หมวด FOOD (การกินและเลือกร้านอาหาร)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'food-queue',
    version: 1,
    category: 'food',
    prompt: 'ตั้งใจมากินร้านสตรีทฟู้ดชื่อดังในคืนวันศุกร์ แต่หน้าร้านมีคิวรอกว่า 40 คิว',
    options: [
      { id: 'opt-fq-wait', label: 'กดรับบัตรคิวแล้วยืนรอหน้าร้านอย่างอดทน เพราะตั้งใจมากินแล้ว' },
      { id: 'opt-fq-nextdoor', label: 'เปลี่ยนไปกินร้านข้างๆ ที่ไม่มีคนเลยทันที หิวแล้วไม่อยากรอ' },
      { id: 'opt-fq-takeaway', label: 'สั่งแบบใส่กล่องกลับบ้าน แล้วเดินหาที่นั่งกินแถวนั้นแทน' },
      { id: 'opt-fq-check', label: 'เดินดูร้านแถวนั้นว่ามีร้านไหนที่คนกินเยอะพอควรแต่คิวสั้นกว่า' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['food', 'queue', 'dining'],
      plausibleOptionsByRole: {
        saver: ['opt-fq-wait', 'opt-fq-check'],
        comfort: ['opt-fq-takeaway', 'opt-fq-check'],
        explorer: ['opt-fq-nextdoor'],
        companion: ['opt-fq-wait'],
        impatient: ['opt-fq-nextdoor', 'opt-fq-takeaway'],
        cautious: ['opt-fq-wait', 'opt-fq-check'],
      },
      rationaleByRole: {
        saver: 'ยอมรอเพื่อร้านคุ้มค่าเดิม หรือเลือกร้านข้างเคียงที่ราคามาตรฐาน',
        comfort: 'ไม่อยากยืนรอเมื่อยขา สั่งใส่กล่องหรือเลือกร้านมีที่นั่งแอร์',
        explorer: 'ถือโอกาสลองร้านข้างๆ ที่ไม่เคยมีใครรีวิวดูว่าจะรสชาติเป็นอย่างไร',
        companion: 'ถ้าเพื่อนอยากกินก็ยืนรอเป็นเพื่อน คุยเล่นฆ่าเวลากันได้',
        impatient: 'ทนหิวไม่ไหว เข้าร้านข้างๆ หรือสั่งหิ้วกลับทันที',
        cautious: 'ไม่อยากสุ่มเสี่ยงกับร้านข้างๆ ที่ไม่มีคน เลือกร้านที่มีคิวการันตีหรือหาร้านที่ดูสะอาด',
      },
    },
  },
  {
    id: 'food-group-pick',
    version: 1,
    category: 'food',
    prompt: 'นัดทานมื้อค่ำกับกลุ่มเพื่อน 5 คน ทุกคนมีความชอบไม่เหมือนกันและยังตกลงร้านไม่ได้',
    options: [
      { id: 'opt-fgp-buffet', label: 'เลือกร้านบุฟเฟต์นานาชาติ ทุกคนตักของที่ตัวเองชอบได้เต็มที่' },
      { id: 'opt-fgp-mall', label: 'ไปฟู้ดคอร์ตในห้างใหญ่ สะดวก แยกสั่งแล้วมานั่งโต๊ะเดียวกัน' },
      { id: 'opt-fgp-follow', label: 'ให้เพื่อนที่เสียงดังที่สุดตัดสินใจ แล้วเราตามไปกินได้หมดทุกอย่าง' },
      { id: 'opt-fgp-popular', label: 'เปิดโหวตเลือกร้านที่คะแนนรีวิวสูงสุด 4.8 ดาวขึ้นไปในระยะใกล้' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['food', 'social', 'decision'],
      plausibleOptionsByRole: {
        saver: ['opt-fgp-mall'],
        comfort: ['opt-fgp-buffet', 'opt-fgp-follow'],
        explorer: ['opt-fgp-popular'],
        companion: ['opt-fgp-follow', 'opt-fgp-buffet'],
        impatient: ['opt-fgp-follow', 'opt-fgp-mall'],
        cautious: ['opt-fgp-popular', 'opt-fgp-mall'],
      },
      rationaleByRole: {
        saver: 'ฟู้ดคอร์ตราคาประหยัด คุมค่าใช้จ่ายของตัวเองได้ชัดเจน',
        comfort: 'ชอบบุฟเฟต์นั่งสบายยาวๆ หรือตามใจเพื่อนจะได้ไม่ต้องคิดเอง',
        explorer: 'อยากลองร้านที่ได้คะแนนรีวิวสูงๆ ที่อาจมีเมนูใหม่ๆ',
        companion: 'ยินดีตามใจเพื่อน ขอแค่ทุกคนได้นั่งกินและเฮฮาด้วยกัน',
        impatient: 'ให้ใครสักคนเคาะเลย หรือไปห้างทันที จะได้ไม่ต้องเถียงกันนาน',
        cautious: 'ตรวจรีวิว 4.8 ดาวเพื่อให้มั่นใจว่าไม่มีใครท้องเสียหรือผิดหวัง',
      },
    },
  },
  {
    id: 'food-new-menu',
    version: 1,
    category: 'food',
    prompt: 'ร้านอาหารเจ้าประจำเปิดตัว "เมนูฟิวชันทดลอง" รสชาติแปลกใหม่ที่ไม่เคยมีที่ไหนมาก่อน',
    options: [
      { id: 'opt-fnm-try', label: 'สั่งเมนูทดลองทันที อยากรู้รสชาติแปลกใหม่ว่าเป็นอย่างไร' },
      { id: 'opt-fnm-classic', label: 'สั่งเมนูซิกเนเจอร์เดิมที่สั่งประจำ เพราะมั่นใจในความอร่อยแน่นอน' },
      { id: 'opt-fnm-share', label: 'ชวนเพื่อนสั่งมาแชร์ตรงกลาง 1 จาน จะได้ลองชิมคำเล็กๆ ร่วมกัน' },
      { id: 'opt-fnm-ask', label: 'ถามพนักงานอย่างละเอียดเรื่องวัตถุดิบและรสชาติก่อนตัดสินใจ' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['food', 'novelty', 'risk'],
      plausibleOptionsByRole: {
        saver: ['opt-fnm-classic', 'opt-fnm-share'],
        comfort: ['opt-fnm-classic'],
        explorer: ['opt-fnm-try'],
        companion: ['opt-fnm-share'],
        impatient: ['opt-fnm-classic', 'opt-fnm-try'],
        cautious: ['opt-fnm-classic', 'opt-fnm-ask'],
      },
      rationaleByRole: {
        saver: 'กลัวสั่งมาแล้วกินไม่หมดจนเสียเงินฟรี สั่งเมนูเดิมหรือขอแชร์กับเพื่อน',
        comfort: 'กินของเดิมที่คุ้นลิ้น ไม่ต้องลุ้นว่าจะถูกปากไหม',
        explorer: 'กระตือรือร้นที่จะลองของใหม่ทันทีโดยไม่ต้องคิดเยอะ',
        companion: 'ชอบสั่งมาแบ่งกันชิมกับเพื่อนๆ เพื่อให้ทุกคนมีส่วนร่วม',
        impatient: 'สั่งสิ่งที่ตัดสินใจได้เร็ว เมนูเดิมหรือสั่งตามป้ายโปรโมตทันที',
        cautious: 'ซักถามวัตถุดิบและส่วนผสมอย่างรอบคอบ หรือเลือกเมนูเดิมที่ปลอดภัย',
      },
    },
  },
  {
    id: 'food-rush',
    version: 1,
    category: 'food',
    prompt: 'มีเวลาพักเที่ยงเพียง 25 นาทีก่อนต้องเข้าประชุมด่วนช่วงบ่าย',
    options: [
      { id: 'opt-fr-convenience', label: 'เข้ามินิมาร์ทซื้อแซนด์วิชและนมกล่องมานั่งทานหน้าคอมพิวเตอร์' },
      { id: 'opt-fr-fastfood', label: 'เดินไปร้านฟาสต์ฟู้ดสั่งชุดเบอร์เกอร์กลับมาทาน' },
      { id: 'opt-fr-canteen', label: 'ลงไปโรงอาหารสั่งข้าวราดแกงที่ตักใส่จานเสร็จทันที' },
      { id: 'opt-fr-skip', label: 'ดื่มแค่กาแฟแล้วทำงานต่อ รอไปกินมื้อใหญ่ตอนเลิกงานทีเดียว' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['food', 'time-pressure', 'lunch'],
      plausibleOptionsByRole: {
        saver: ['opt-fr-convenience', 'opt-fr-canteen'],
        comfort: ['opt-fr-convenience', 'opt-fr-skip'],
        explorer: ['opt-fr-fastfood'],
        companion: ['opt-fr-canteen'],
        impatient: ['opt-fr-canteen', 'opt-fr-convenience'],
        cautious: ['opt-fr-canteen', 'opt-fr-convenience'],
      },
      rationaleByRole: {
        saver: 'ข้าวราดแกงหรือแซนด์วิชมินิมาร์ทคุ้มค่าราคาประหยัดที่สุด',
        comfort: 'ไม่อยากเดินร้อนออกไปไหน ซื้อจากมินิมาร์ทใกล้ๆ หรือรอกินทีเดียว',
        explorer: 'อาจแวะดูเมนูใหม่ของร้านฟาสต์ฟู้ดแก้เบื่อ',
        companion: 'ลงไปโรงอาหารกับเพื่อนร่วมงาน สั่งข้าวราดแกงกินด้วยกัน',
        impatient: 'ข้าวราดแกงตักปุ๊บได้ปั๊บ หรือหยิบของในมินิมาร์ทคิดเงินเร็วที่สุด',
        cautious: 'เลือกอาหารที่ปรุงสุกใหม่สะอาด ไม่เสี่ยงปวดท้องก่อนประชุม',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 3. หมวด SHOPPING (การซื้อของและจัดการงบประมาณ)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'shopping-delivery',
    version: 1,
    category: 'shopping',
    prompt: 'สั่งซื้อของใช้จำเป็นออนไลน์ กำลังเลือกรูปแบบการจัดส่งที่หน้าชำระเงิน',
    options: [
      { id: 'opt-sd-express', label: 'จ่ายค่าส่งด่วนพิเศษเพื่อให้ของมาส่งภายในวันพรุ่งนี้' },
      { id: 'opt-sd-standard', label: 'เลือกส่งธรรมดาฟรี รอ 3-5 วันตามปกติ' },
      { id: 'opt-sd-pickup', label: 'เลือกไปรับสินค้าเองที่จุดรับใกล้บ้าน สะดวกแวะรับตอนไหนก็ได้' },
      { id: 'opt-sd-cod', label: 'เลือกเก็บเงินปลายทาง ตรวจของก่อนค่อยจ่ายเงินให้พนักงาน' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['shopping', 'delivery', 'online'],
      plausibleOptionsByRole: {
        saver: ['opt-sd-standard', 'opt-sd-pickup'],
        comfort: ['opt-sd-express', 'opt-sd-standard'],
        explorer: ['opt-sd-pickup'],
        companion: ['opt-sd-standard'],
        impatient: ['opt-sd-express'],
        cautious: ['opt-sd-cod', 'opt-sd-pickup'],
      },
      rationaleByRole: {
        saver: 'เลือกส่งฟรีเพื่อประหยัดเงิน ไม่ยอมเสียค่าส่งด่วน',
        comfort: 'ให้มาส่งถึงหน้าประตูบ้าน ยอมจ่ายค่าส่งด่วนเพื่อความสบาย',
        explorer: 'ลองเลือกจุดรับสินค้าอัตโนมัติแบบใหม่',
        companion: 'สั่งรวมกับคนอื่นเพื่อส่งรอบเดียวกัน',
        impatient: 'ยอมจ่ายค่าส่งด่วนเพื่อให้ของถึงมือเร็วที่สุด',
        cautious: 'เลือกเก็บเงินปลายทางหรือไปรับเองเพื่อตรวจเช็กสภาพสินค้าก่อนจ่าย',
      },
    },
  },
  {
    id: 'shopping-repair',
    version: 1,
    category: 'shopping',
    prompt: 'หูฟังคู่โปรดที่ใช้มา 2 ปีเพิ่งหมดประกันเริ่มมีเสียงขาดๆ หายๆ',
    options: [
      { id: 'opt-sr-buy-new', label: 'กดสั่งรุ่นใหม่ล่าสุดตัวท็อปทันที ได้ฟังก์ชันและเสียงที่ดีกว่าเดิม' },
      { id: 'opt-sr-repair-shop', label: 'ส่งร้านซ่อมแถวบ้าน ประเมินค่าซ่อมก่อน ถ้าไม่เกินหลักร้อยก็ซ่อม' },
      { id: 'opt-sr-diy', label: 'เปิดคลิปยูทูปหาวิธีแกะซ่อมสายและทำความสะอาดด้วยตัวเอง' },
      { id: 'opt-sr-cheap', label: 'ซื้อรุ่นประหยัดราคาไม่กี่ร้อยมาใช้แก้ขัดไปก่อน' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['shopping', 'repair', 'gadgets'],
      plausibleOptionsByRole: {
        saver: ['opt-sr-repair-shop', 'opt-sr-diy', 'opt-sr-cheap'],
        comfort: ['opt-sr-buy-new'],
        explorer: ['opt-sr-diy', 'opt-sr-buy-new'],
        companion: ['opt-sr-repair-shop'],
        impatient: ['opt-sr-buy-new', 'opt-sr-cheap'],
        cautious: ['opt-sr-repair-shop', 'opt-sr-buy-new'],
      },
      rationaleByRole: {
        saver: 'พยายามซ่อมเองหรือส่งซ่อมราคาถูกที่สุดก่อน ไม่ยอมซื้อใหม่ทันที',
        comfort: 'กดสั่งรุ่นใหม่เลย ไม่ต้องเสียเวลาแกะซ่อมให้ปวดหัว',
        explorer: 'ชอบความท้าทายในการแกะซ่อมอุปกรณ์อิเล็กทรอนิกส์ด้วยตัวเอง',
        companion: 'ถามเพื่อนว่ามีร้านซ่อมแนะนำไหม หรือใครใช้อะไรดี',
        impatient: 'กดสั่งตัวใหม่หรือซื้อตัวแก้ขัดทันทีเพื่อจะได้มีใช้โดยไม่ขาดตอน',
        cautious: 'ส่งร้านทางการหรือซื้อรุ่นใหม่ที่มีประกันศูนย์เต็มปี',
      },
    },
  },
  {
    id: 'shopping-unfamiliar',
    version: 1,
    category: 'shopping',
    prompt: 'เดินเข้าไปในร้านขายของฝากหรือร้านเฉพาะทางที่ไม่มีป้ายราคาติดไว้บนสินค้า',
    options: [
      { id: 'opt-su-ask-all', label: 'ถามราคาพนักงานทีละชิ้นก่อนหยิบเพื่อความชัวร์และไม่เกินงบ' },
      { id: 'opt-su-walk-out', label: 'เดินออกจากร้านทันที ไม่ชอบความไม่ชัดเจนและกลัวโดนคิดแพง' },
      { id: 'opt-su-pick-few', label: 'หยิบเฉพาะชิ้นที่ชอบจริงๆ ไปเช็กราคาตอนสแกนบาร์โค้ดที่เคาน์เตอร์' },
      { id: 'opt-su-search-web', label: 'ใช้มือถือถ่ายรูปค้นหาราคาตลาดออนไลน์เปรียบเทียบก่อน' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['shopping', 'transparency', 'money'],
      plausibleOptionsByRole: {
        saver: ['opt-su-ask-all', 'opt-su-search-web', 'opt-su-walk-out'],
        comfort: ['opt-su-pick-few'],
        explorer: ['opt-su-pick-few'],
        companion: ['opt-su-ask-all'],
        impatient: ['opt-su-pick-few', 'opt-su-walk-out'],
        cautious: ['opt-su-walk-out', 'opt-su-search-web', 'opt-su-ask-all'],
      },
      rationaleByRole: {
        saver: 'กลัวโดนคิดราคาเกินจริง ต้องถามทุกชิ้นหรือเช็กราคาออนไลน์ก่อน',
        comfort: 'ชอบอันไหนก็หยิบไปจ่ายที่เคาน์เตอร์ ไม่อยากถามเยอะ',
        explorer: 'เพลิดเพลินกับการดูสินค้าแปลกๆ ในร้าน ไม่กังวลเรื่องราคามากนัก',
        companion: 'ชวนเพื่อนช่วยกันดูและถามพนักงานด้วยกัน',
        impatient: 'ถ้าไม่ติดราคาก็เดินออก หรือหยิบไปคิดเงินเลย ไม่ชอบยืนค้นหา',
        cautious: 'ระมัดระวังเป็นพิเศษ อาจเลือกร้านอื่นที่โปร่งใสหรือค้นข้อมูลละเอียด',
      },
    },
  },
  {
    id: 'shopping-trip-gear',
    version: 1,
    category: 'shopping',
    prompt: 'เพื่อนชวนไปเดินป่าขึ้นดอยสัปดาห์หน้า คุณยังไม่มีกระเป๋าเป้และรองเท้าเดินป่าเฉพาะทาง',
    options: [
      { id: 'opt-stg-borrow', label: 'ขอยืมเป้และรองเท้าจากเพื่อนที่เคยไปเดินป่ามาก่อน' },
      { id: 'opt-stg-rent', label: 'เช่าอุปกรณ์จากร้านบริการเช่าอุปกรณ์แคมป์ปิ้ง' },
      { id: 'opt-stg-buy-brand', label: 'ไปห้างซื้อแบรนด์เดินป่าชั้นนำรุ่นมาตรฐานที่มีระบบเซฟข้อเท้าอย่างดี' },
      { id: 'opt-stg-use-existing', label: 'ใช้รองเท้าผ้าใบและเป้ใบเดิมที่มีอยู่แล้วไปลุยเลย' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['shopping', 'gear', 'outdoor'],
      plausibleOptionsByRole: {
        saver: ['opt-stg-borrow', 'opt-stg-use-existing'],
        comfort: ['opt-stg-rent', 'opt-stg-buy-brand'],
        explorer: ['opt-stg-buy-brand', 'opt-stg-use-existing'],
        companion: ['opt-stg-borrow', 'opt-stg-rent'],
        impatient: ['opt-stg-use-existing', 'opt-stg-buy-brand'],
        cautious: ['opt-stg-buy-brand', 'opt-stg-rent'],
      },
      rationaleByRole: {
        saver: 'ขอยืมเพื่อนหรือใช้ของเดิม ไม่ยอมเสียเงินซื้ออุปกรณ์ที่ใช้นานๆ ครั้ง',
        comfort: 'เช่าชุดที่พร้อมใช้หรือซื้อแบรนด์ดีๆ เพื่อให้เดินสบายไม่ปวดเท้า',
        explorer: 'ตื่นเต้นที่จะได้ใช้อุปกรณ์เดินป่าของตัวเองในทริปต่อๆ ไป',
        companion: 'ขอยืมเพื่อนเพื่อจะได้คุยแลกเปลี่ยนคำแนะนำเรื่องทริป',
        impatient: 'คว้าของเดิมในบ้านหรือแวะซื้อร้านแรกให้จบเร็วที่สุด',
        cautious: 'ต้องใช้รองเท้าเฉพาะทางที่มีระบบเซฟตี้ ป้องกันการลื่นตกเขา',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 4. หมวด LEISURE (การพักผ่อนและงานอดิเรก)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'leisure-day-off',
    version: 1,
    category: 'leisure',
    prompt: 'วันอาทิตย์นี้ว่างตลอดทั้งวัน ไม่มีงานค้างและไม่มีนัดหมายใดๆ',
    options: [
      { id: 'opt-ldo-home', label: 'นอนตื่นสาย ดูซีรีส์ สั่งเดลิเวอรี และพักผ่อนอยู่บ้านทั้งวัน' },
      { id: 'opt-ldo-explore', label: 'ออกไปเดินย่านที่ไม่เคยไป ถ่ายรูปและแวะคาเฟ่ใหม่ๆ' },
      { id: 'opt-ldo-friends', label: 'ทักชวนเพื่อนกลุ่มสนิทไปกินข้าวหรือร้องเกะด้วยกัน' },
      { id: 'opt-ldo-plan', label: 'จัดการเคลียร์ตู้เสื้อผ้า วางแผนการเงิน และจัดระเบียบตารางชีวิต' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['leisure', 'weekend', 'lifestyle'],
      plausibleOptionsByRole: {
        saver: ['opt-ldo-home', 'opt-ldo-plan'],
        comfort: ['opt-ldo-home'],
        explorer: ['opt-ldo-explore'],
        companion: ['opt-ldo-friends'],
        impatient: ['opt-ldo-explore', 'opt-ldo-friends'],
        cautious: ['opt-ldo-home', 'opt-ldo-plan'],
      },
      rationaleByRole: {
        saver: 'พักผ่อนอยู่บ้านหรือวางแผนการเงิน ไม่เสียค่าใช้จ่ายนอกบ้าน',
        comfort: 'นอนเล่นบนเตียงสบายๆ ตลอดทั้งวัน ไม่ต้องแต่งตัวออกไปไหน',
        explorer: 'ชอบออกไปตะลุยสถานที่ใหม่ๆ ในเมืองที่ยังไม่เคยสัมผัส',
        companion: 'วันหยุดต้องอยู่กับเพื่อน ชวนรวมตัวกันทำกิจกรรม',
        impatient: 'อยู่เฉยๆ แล้วเบื่อ ต้องออกไปหาอะไรทำทันที',
        cautious: 'อยู่บ้านเคลียร์ชีวิตและเตรียมพร้อมสำหรับสัปดาห์หน้า',
      },
    },
  },
  {
    id: 'leisure-new-activity',
    version: 1,
    category: 'leisure',
    prompt: 'มีเพื่อนแชร์คอร์สเวิร์กช็อปปีนหน้าผาจำลองเปิดใหม่พร้อมส่วนลดพิเศษ',
    options: [
      { id: 'opt-lna-join-solo', label: 'กดสมัครและจ่ายเงินทันที อยากลองความท้าทายใหม่ๆ อยู่พอดี' },
      { id: 'opt-lna-join-group', label: 'ชวนเพื่อนในกลุ่มไปด้วยกัน ถ้ามีเพื่อนไปอย่างน้อย 2 คนถึงจะลงชื่อ' },
      { id: 'opt-lna-check-safety', label: 'อ่านข้อมูลอุปกรณ์ มาตรฐานความปลอดภัย และรีวิวครูฝึกก่อน' },
      { id: 'opt-lna-pass', label: 'ปฏิเสธไป มองว่าเปลืองเงินและเหนื่อยเกินไปสำหรับวันหยุด' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['leisure', 'workshop', 'sports'],
      plausibleOptionsByRole: {
        saver: ['opt-lna-pass'],
        comfort: ['opt-lna-pass'],
        explorer: ['opt-lna-join-solo', 'opt-lna-join-group'],
        companion: ['opt-lna-join-group'],
        impatient: ['opt-lna-join-solo'],
        cautious: ['opt-lna-check-safety', 'opt-lna-pass'],
      },
      rationaleByRole: {
        saver: 'ไม่อยากเสียเงินกับกิจกรรมที่ไม่ได้จำเป็นในชีวิตประจำวัน',
        comfort: 'เหนื่อยและเมื่อยตัว สู้พักผ่อนชิลๆ ดีกว่า',
        explorer: 'ตื่นเต้นกับกีฬาปีนหน้าผา อยากลองทดสอบขีดจำกัดตนเอง',
        companion: 'ไปได้ถ้าเพื่อนๆ ไปด้วยกัน เน้นความสนุกของกลุ่ม',
        impatient: 'ถ้าสนใจก็กดสมัครเลย ไม่ต้องคิดวิเคราะห์เยอะ',
        cautious: 'ตรวจสอบใบรับรองความปลอดภัยและสถิติอุบัติเหตุก่อนตัดสินใจ',
      },
    },
  },
  {
    id: 'leisure-crowded-event',
    version: 1,
    category: 'leisure',
    prompt: 'ตั้งใจมาเดินงานเทศกาลดนตรีและศิลปะ แต่คนแน่นขนัดจนเบียดเสียดยัดเยียด',
    options: [
      { id: 'opt-lce-front', label: 'แทรกตัวเบียดเข้าไปโซนหน้าเวทีเพื่อสัมผัสพลังงานของงานแบบเต็มที่' },
      { id: 'opt-lce-back', label: 'ถอยออกมายืนดูตรงโซนสนามหญ้าด้านหลัง ลมโกรกโปร่งสบาย ไม่อึดอัด' },
      { id: 'opt-lce-booths', label: 'เลี่ยงไปเดินดูซุ้มนิทรรศการและร้านค้าอินดี้รอบนอกที่คนบางตากว่า' },
      { id: 'opt-lce-leave', label: 'กลับบ้านทันที ไม่ชอบที่คนเยอะและรู้สึกไม่ปลอดภัย' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['leisure', 'crowd', 'festival'],
      plausibleOptionsByRole: {
        saver: ['opt-lce-back', 'opt-lce-booths'],
        comfort: ['opt-lce-back'],
        explorer: ['opt-lce-booths', 'opt-lce-front'],
        companion: ['opt-lce-front', 'opt-lce-back'],
        impatient: ['opt-lce-leave', 'opt-lce-front'],
        cautious: ['opt-lce-back', 'opt-lce-leave'],
      },
      rationaleByRole: {
        saver: 'ปักหลักดูด้านหลังให้คุ้มค่าตั๋วโดยไม่ต้องไปเสียเงินซื้อของกินโซนหน้า',
        comfort: 'ยืนโซนด้านหลังที่มีที่นั่งและอากาศถ่ายเทสะดวก',
        explorer: 'ไปเดินดูซุ้มศิลปะอินดี้ที่คนไม่ค่อยสนใจเพื่อหาผลงานเจ๋งๆ',
        companion: 'เกาะกลุ่มกับเพื่อนๆ ไปเต้นหน้าเวทีหรือนั่งปิกนิกด้วยกัน',
        impatient: 'ถ้าเบียดจนทำอะไรไม่ได้ก็กลับ หรือพุ่งไปข้างหน้าทันที',
        cautious: 'ระวังเรื่องการเหยียบกันหรือกระเป๋าหาย ถอยออกมาริมนอกหรือกลับ',
      },
    },
  },
  {
    id: 'leisure-one-hour',
    version: 1,
    category: 'leisure',
    prompt: 'มีเวลาว่างกะทันหัน 1 ชั่วโมงในใจกลางเมืองระหว่างรอคนรู้จักทำธุระ',
    options: [
      { id: 'opt-loh-bookstore', label: 'เดินเข้าไปเปิดอ่านหนังสือใหม่ๆ ในร้านหนังสือขนาดใหญ่' },
      { id: 'opt-loh-cafe', label: 'นั่งดื่มเครื่องดื่มเย็นๆ ในร้านกาแฟติดแอร์ พร้อมชาร์จแบตมือถือ' },
      { id: 'opt-loh-walk', label: 'เดินสำรวจซอยข้างเคียง ดูร้านรวงและวิถีชีวิตผู้คนแถวนั้น' },
      { id: 'opt-loh-convenient', label: 'ยืนรอที่จุดนัดหมาย เล่นมือถือรอไปเรื่อยๆ เพื่อไม่ให้คลาดกัน' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['leisure', 'time', 'city'],
      plausibleOptionsByRole: {
        saver: ['opt-loh-bookstore', 'opt-loh-convenient'],
        comfort: ['opt-loh-cafe'],
        explorer: ['opt-loh-walk', 'opt-loh-bookstore'],
        companion: ['opt-loh-cafe'],
        impatient: ['opt-loh-walk'],
        cautious: ['opt-loh-convenient', 'opt-loh-cafe'],
      },
      rationaleByRole: {
        saver: 'เข้าร้านหนังสืออ่านฟรีหรือยืนรอที่จุดนัด ไม่ต้องเสียเงินซื้อกาแฟ',
        comfort: 'นั่งแอร์เย็นๆ จิบเครื่องดื่มสบายๆ',
        explorer: 'ออกเดินสำรวจซอยที่ไม่เคยเดินเพื่อค้นหาสิ่งใหม่ๆ',
        companion: 'นั่งร้านกาแฟโทรคุยกับเพื่อนหรือส่งข้อความหาคนอื่น',
        impatient: 'อยู่นิ่งไม่ได้ ขอเดินไปเรื่อยๆ ให้เวลาผ่านไปเร็ว',
        cautious: 'รออยู่ใกล้จุดนัดหมาย ไม่ไปไหนไกลเพื่อความแน่นอน',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 5. หมวด FRIENDS (ความสัมพันธ์และการเข้าสังคม)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'friends-late',
    version: 1,
    category: 'friends',
    prompt: 'นัดเพื่อนทานข้าวไว้เวลาเที่ยงตรง แต่เพื่อนโทรมาบอกว่าจะมาสายประมาณ 45 นาที',
    options: [
      { id: 'opt-fl-order-first', label: 'สั่งอาหารของตัวเองมานั่งทานก่อนทันที ไม่ยอมทนหิวรอ' },
      { id: 'opt-fl-browse', label: 'ไปเดินเล่นดูของในห้างรอ พอเพื่อนใกล้ถึงค่อยเดินกลับมา' },
      { id: 'opt-fl-wait-table', label: 'นั่งจิบน้ำรอที่โต๊ะ บอกเพื่อนว่าไม่ต้องรีบขับรถระวังๆ' },
      { id: 'opt-fl-call-talk', label: 'โทรคุยกับเพื่อนระหว่างที่เพื่อนกำลังเดินทาง จะได้ไม่เหงา' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['friends', 'punctuality', 'patience'],
      plausibleOptionsByRole: {
        saver: ['opt-fl-wait-table'],
        comfort: ['opt-fl-wait-table', 'opt-fl-order-first'],
        explorer: ['opt-fl-browse'],
        companion: ['opt-fl-call-talk', 'opt-fl-wait-table'],
        impatient: ['opt-fl-order-first', 'opt-fl-browse'],
        cautious: ['opt-fl-wait-table'],
      },
      rationaleByRole: {
        saver: 'นั่งรอที่โต๊ะเฉยๆ ไม่เดินดูของให้เกิดกิเลสเสียเงินเพิ่ม',
        comfort: 'นั่งเล่นมือถือสบายๆ ที่โต๊ะ หรือสั่งของกินรองท้อง',
        explorer: 'เดินสำรวจร้านใหม่ๆ ฆ่าเวลาอย่างเพลิดเพลิน',
        companion: 'เข้าใจเพื่อน โทรคุยกันและบอกว่าไม่ต้องรีบ',
        impatient: 'ไม่ชอบการรอคอย สั่งอาหารกินเลยหรือเดินไม่อยู่กับที่',
        cautious: 'เตือนเพื่อนให้ขับขี่ปลอดภัย และนั่งรอที่ร้านเพื่อรักษาโต๊ะไว้',
      },
    },
  },
  {
    id: 'friends-disagree',
    version: 1,
    category: 'friends',
    prompt: 'กลุ่มเพื่อนกำลังวางแผนงานเลี้ยงรุ่น แต่เสียงแตกครึ่งต่อครึ่งระหว่างร้านหรูกับร้านชิลริมน้ำ',
    options: [
      { id: 'opt-fd-chill', label: 'เชียร์ร้านริมน้ำ เพราะราคาเป็นมิตรกับทุกคนและคุยกันได้สบายใจกว่า' },
      { id: 'opt-fd-fancy', label: 'เชียร์ร้านหรู ถือเป็นโอกาสพิเศษที่จะได้ถ่ายรูปสวยและกินของพรีเมียม' },
      { id: 'opt-fd-compromise', label: 'เสนอให้จับฉลากหรือหาร้านที่อยู่กึ่งกลาง เพื่อความรวดเร็วและยุติธรรม' },
      { id: 'opt-fd-follow', label: 'เงียบไว้ก่อน รอดูว่าเสียงข้างมากจะไปทางไหนแล้วพร้อมไปตามนั้น' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['friends', 'conflict', 'compromise'],
      plausibleOptionsByRole: {
        saver: ['opt-fd-chill'],
        comfort: ['opt-fd-follow', 'opt-fd-compromise'],
        explorer: ['opt-fd-fancy'],
        companion: ['opt-fd-follow', 'opt-fd-chill'],
        impatient: ['opt-fd-compromise'],
        cautious: ['opt-fd-compromise', 'opt-fd-follow'],
      },
      rationaleByRole: {
        saver: 'เชียร์ร้านริมน้ำเพราะค่าอาหารไม่แพงเกินไปสำหรับทุกคน',
        comfort: 'ไม่อยากร่วมวงเถียง ตามเสียงส่วนใหญ่ได้เสมอ',
        explorer: 'เลือกร้านหรูเพราะอยากลองบรรยากาศและเมนูพิเศษ',
        companion: 'อยากให้ทุกคนแฮปปี้ เลือกร้านที่คุยกันสนิทใจหรือตามใจเพื่อน',
        impatient: 'เสนอให้จับฉลากตัดสินทันที เลิกเถียงกันให้เสียเวลา',
        cautious: 'มองหาทางออกประนีประนอมเพื่อไม่ให้เพื่อนแตกคอกัน',
      },
    },
  },
  {
    id: 'friends-budget',
    version: 1,
    category: 'friends',
    prompt: 'เพื่อนสนิทคนหนึ่งในกลุ่มบอกว่าช่วงนี้มีปัญหาการเงิน อาจจะไม่สามารถไปทริปเที่ยวที่ทุกคนวางแผนไว้ได้',
    options: [
      { id: 'opt-fb-adjust-plan', label: 'เสนอให้ปรับแผนทริป ลดค่าที่พักและกิจกรรมลง เพื่อให้เพื่อนไปด้วยได้' },
      { id: 'opt-fb-help-pool', label: 'เสนอให้เพื่อนที่เหลือช่วยกันแชร์ออกค่าใช้จ่ายบางส่วนให้เพื่อน' },
      { id: 'opt-fb-postpone', label: 'เสนอเลื่อนทริปออกไปก่อน รอเพื่อนพร้อมค่อยไปพร้อมกันครบทุกคน' },
      { id: 'opt-fb-go-anyway', label: 'เข้าใจเพื่อนแต่เดินหน้าทริปเดิมต่อไป และนัดกินข้าวปลอบใจแยกต่างหาก' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['friends', 'empathy', 'money'],
      plausibleOptionsByRole: {
        saver: ['opt-fb-adjust-plan'],
        comfort: ['opt-fb-go-anyway', 'opt-fb-postpone'],
        explorer: ['opt-fb-adjust-plan', 'opt-fb-go-anyway'],
        companion: ['opt-fb-help-pool', 'opt-fb-adjust-plan', 'opt-fb-postpone'],
        impatient: ['opt-fb-go-anyway'],
        cautious: ['opt-fb-adjust-plan', 'opt-fb-postpone'],
      },
      rationaleByRole: {
        saver: 'เห็นด้วยกับการลดค่าใช้จ่ายทริป เพราะตัวเองก็ได้ประหยัดด้วย',
        comfort: 'ไม่อยากให้ทริปวุ่นวาย ไปตามแผนเดิมหรือเลื่อนไปแบบสบายใจ',
        explorer: 'ปรับแผนเป็นทริปแคมปิ้งลุยๆ ราคาเบาๆ ก็สนุกไปอีกแบบ',
        companion: 'เพื่อนสำคัญที่สุด ต้องช่วยกันซัพพอร์ตให้ได้ไปด้วยกัน',
        impatient: 'ถ้าจองทุกอย่างแล้วก็ไปต่อตามกำหนดเดิม ไม่อยากยกเลิก',
        cautious: 'ประเมินแผนการเงินของกลุ่มใหม่เพื่อความสบายใจของทุกฝ่าย',
      },
    },
  },
  {
    id: 'friends-spontaneous',
    version: 1,
    category: 'friends',
    prompt: 'คืนวันธรรมดาตอนสี่ทุ่ม เพื่อนสนิทโทรมาชวนไปนั่งกินนมสดและคุยเล่นที่ร้านแถวบ้าน',
    options: [
      { id: 'opt-fs-go', label: 'เปลี่ยนเสื้อผ้าออกไปทันที เพื่อนชวนทั้งทีต้องไปเจอกันหน่อย' },
      { id: 'opt-fs-decline-sleep', label: 'ปฏิเสธอย่างสุภาพ เพราะตั้งใจจะนอนพักผ่อนเตรียมทำงานพรุ่งนี้' },
      { id: 'opt-fs-call-instead', label: 'ชวนเพื่อนคุยทางโทรศัพท์แทน ไม่ต้องออกไปให้เหนื่อยเดินทาง' },
      { id: 'opt-fs-ask-who', label: 'ถามก่อนว่ามีใครไปบ้าง ถ้ารวมตัวกันหลายคนถึงจะยอมออกไป' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['friends', 'spontaneous', 'rest'],
      plausibleOptionsByRole: {
        saver: ['opt-fs-decline-sleep', 'opt-fs-call-instead'],
        comfort: ['opt-fs-decline-sleep', 'opt-fs-call-instead'],
        explorer: ['opt-fs-go'],
        companion: ['opt-fs-go', 'opt-fs-ask-who'],
        impatient: ['opt-fs-go'],
        cautious: ['opt-fs-decline-sleep'],
      },
      rationaleByRole: {
        saver: 'ไม่อยากเสียเงินค่าน้ำมันและของกินตอนดึก เลี่ยงได้ก็ไม่ไป',
        comfort: 'นอนสบายบนเตียงแล้ว ไม่อยากลุกขึ้นมาแต่งตัวออกไปข้างนอก',
        explorer: 'ชอบความสนุกแบบกะทันหัน ออกไปหาอะไรทำยามดึก',
        companion: 'เพื่อนต้องการคนคุย ยินดีออกไปอยู่เป็นเพื่อนเสมอ',
        impatient: 'ใจพร้อมลุย ตัดสินใจออกไปทันที',
        cautious: 'คำนึงถึงสุขภาพและการนอนหลับพักผ่อนเพื่อวันพรุ่งนี้',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 6. หมวด DAILY (ชีวิตประจำวันและการแก้ปัญหาเฉพาะหน้า)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'daily-queue',
    version: 1,
    category: 'daily',
    prompt: 'ไปต่อคิวทำบัตรหรือธุรกรรมที่สำนักงาน มีคิวข้างหน้าประมาณ 30 คน',
    options: [
      { id: 'opt-dq-online', label: 'เช็กในแอปว่ามีสาขาอื่นที่คิวน้อยกว่าไหม หรือจองออนไลน์รอบอื่นได้หรือไม่' },
      { id: 'opt-dq-wait-work', label: 'นั่งรอที่เดิม เสียบหูฟังนั่งทำงานหรือดูหนังผ่านมือถือไปเรื่อยๆ' },
      { id: 'opt-dq-ask-staff', label: 'เดินไปสอบถามเจ้าหน้าที่ว่ามีช่องบริการด่วนสำหรับเคสของเราไหม' },
      { id: 'opt-dq-postpone', label: 'ทิ้งคิวแล้วกลับบ้าน ค่อยตื่นมาใหม่แต่เช้าวันหลัง' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['daily', 'queue', 'bureaucracy'],
      plausibleOptionsByRole: {
        saver: ['opt-dq-wait-work'],
        comfort: ['opt-dq-wait-work', 'opt-dq-online'],
        explorer: ['opt-dq-online'],
        companion: ['opt-dq-wait-work'],
        impatient: ['opt-dq-ask-staff', 'opt-dq-postpone', 'opt-dq-online'],
        cautious: ['opt-dq-wait-work', 'opt-dq-online'],
      },
      rationaleByRole: {
        saver: 'ยอมนั่งรอให้เสร็จวันนี้เพื่อจะได้ไม่ต้องเสียค่าเดินทางมาใหม่อีกรอบ',
        comfort: 'นั่งห้องแอร์ดูหนังไปเรื่อยๆ ชิลๆ',
        explorer: 'ลองเปิดแอปดูระบบบริการใหม่ๆ ที่อาจไม่เคยใช้',
        companion: 'นั่งรอได้เรื่อยๆ ชวนคนข้างๆ คุยหรือแชตกับเพื่อน',
        impatient: 'ทนรอ 30 คิวไม่ไหว ต้องถามหาช่องทางลัดหรือกลับเลย',
        cautious: 'รอตามคิวอย่างเป็นระเบียบ หรือเช็กระบบออนไลน์เพื่อความถูกต้อง',
      },
    },
  },
  {
    id: 'daily-route-detour',
    version: 1,
    category: 'daily',
    prompt: 'เส้นทางหลักที่ใช้เดินทางไปทำงานเป็นประจำมีการปิดซ่อมถนนกะทันหัน',
    options: [
      { id: 'opt-drd-gps', label: 'เปิดแอปนำทางแล้วเลือกเส้นทางลัดใหม่ที่แนะนำ แม้ไม่เคยไปมาก่อน' },
      { id: 'opt-drd-main-wait', label: 'ขับไปตามทางหลักเดิม ยอมติดช้าลงแต่คุ้นเคยและปลอดภัยแน่นอน' },
      { id: 'opt-drd-public', label: 'จอดรถทิ้งไว้แล้วเปลี่ยนไปขึ้นรถไฟฟ้าหรือมอเตอร์ไซค์รับจ้าง' },
      { id: 'opt-drd-wfh', label: 'โทรแจ้งที่ทำงานขออนุญาตเข้าสายหรือทำงานจากบ้านแทน' },
    ],
    editorial: {
      difficulty: 'broad',
      tags: ['daily', 'traffic', 'navigation'],
      plausibleOptionsByRole: {
        saver: ['opt-drd-main-wait', 'opt-drd-wfh'],
        comfort: ['opt-drd-main-wait', 'opt-drd-wfh'],
        explorer: ['opt-drd-gps'],
        companion: ['opt-drd-main-wait'],
        impatient: ['opt-drd-public', 'opt-drd-gps'],
        cautious: ['opt-drd-main-wait', 'opt-drd-wfh'],
      },
      rationaleByRole: {
        saver: 'วิ่งทางเดิมไม่เสียค่าทางด่วนหรือค่าวินมอเตอร์ไซค์เพิ่ม',
        comfort: 'นั่งแอร์ในรถไปเรื่อยๆ หรือขอ WFH ไม่ต้องดิ้นรน',
        explorer: 'ตื่นเต้นที่จะได้ลองวิ่งเส้นทางลัดใหม่ๆ ในชุมชน',
        companion: 'ถามเพื่อนร่วมงานว่าใช้เส้นไหนแล้วตามกันไป',
        impatient: 'ต่อมอเตอร์ไซค์หรือทางลัดทันที ไม่ยอมติดแหง็กบนถนน',
        cautious: 'วิ่งทางหลักที่คุ้นเคย ไม่เสี่ยงหลงทางในซอยแคบ',
      },
    },
  },
  {
    id: 'daily-chores',
    version: 1,
    category: 'daily',
    prompt: 'ช่วงสุดสัปดาห์ เสื้อผ้ากองโต จานยังไม่ได้ล้าง และห้องเริ่มรกมาก',
    options: [
      { id: 'opt-dc-hire', label: 'จ้างแม่บ้านรายชั่วโมงจากแอปมาทำความสะอาดทั้งหมด ยอมจ่ายเพื่อแลกเวลา' },
      { id: 'opt-dc-blitz', label: 'เปิดเพลงจังหวะเร็วๆ แล้วลงมือทำแบบรวดเดียวให้เสร็จภายใน 1 ชั่วโมง' },
      { id: 'opt-dc-gradual', label: 'ค่อยๆ ทำทีละอย่างระหว่างวัน เหนื่อยก็พัก ไม่เร่งรีบ' },
      { id: 'opt-dc-gadget', label: 'ใช้หุ่นยนต์ดูดฝุ่นและเครื่องล้างจานช่วยผ่อนแรงให้ได้มากที่สุด' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['daily', 'cleaning', 'productivity'],
      plausibleOptionsByRole: {
        saver: ['opt-dc-blitz', 'opt-dc-gradual'],
        comfort: ['opt-dc-hire', 'opt-dc-gadget'],
        explorer: ['opt-dc-gadget'],
        companion: ['opt-dc-gradual'],
        impatient: ['opt-dc-blitz', 'opt-dc-hire'],
        cautious: ['opt-dc-gradual'],
      },
      rationaleByRole: {
        saver: 'ลงมือทำเองทั้งหมด ไม่ยอมเสียเงินจ้างแม่บ้านเด็ดขาด',
        comfort: 'จ้างแม่บ้านหรือใช้เครื่องทุ่นแรง ไม่ต้องออกแรงเอง',
        explorer: 'ชอบทดลองอุปกรณ์ทำความสะอาดหรือแกดเจ็ตใหม่ๆ',
        companion: 'ชวนคนที่บ้านช่วยกันทำพร้อมพูดคุยกัน',
        impatient: 'จัดการแบบสายฟ้าแลบให้เสร็จเร็วที่สุดเพื่อจะได้ไปทำอย่างอื่น',
        cautious: 'ค่อยๆ ทำอย่างละเอียดและจัดเก็บของให้เข้าที่อย่างเป็นระเบียบ',
      },
    },
  },
  {
    id: 'daily-problem-service',
    version: 1,
    category: 'daily',
    prompt: 'แอร์ที่ห้องเริ่มไม่เย็น มีเสียงดังผิดปกติและมีน้ำหยด ต้องเลือกช่างมาซ่อม',
    options: [
      { id: 'opt-dps-official', label: 'เรียกช่างจากศูนย์บริการทางการของแบรนด์แอร์ มีประกันและมาตรฐานชัดเจน' },
      { id: 'opt-dps-local', label: 'เรียกช่างร้านทั่วไปแถวบ้านที่ราคาถูกกว่าครึ่งหนึ่ง' },
      { id: 'opt-dps-fast-app', label: 'จองช่างผ่านแอปบริการด่วนที่การันตีเข้ามาซ่อมได้ภายใน 2 ชั่วโมง' },
      { id: 'opt-dps-check-first', label: 'ถอดแผ่นกรองมาล้างและเปิดดูเบื้องต้นก่อน เผื่อแก้เองได้ไม่ต้องจ้างช่าง' },
    ],
    editorial: {
      difficulty: 'distinguishing',
      tags: ['daily', 'home-repair', 'service'],
      plausibleOptionsByRole: {
        saver: ['opt-dps-check-first', 'opt-dps-local'],
        comfort: ['opt-dps-fast-app', 'opt-dps-official'],
        explorer: ['opt-dps-check-first'],
        companion: ['opt-dps-local'],
        impatient: ['opt-dps-fast-app'],
        cautious: ['opt-dps-official'],
      },
      rationaleByRole: {
        saver: 'ลองล้างฟิลเตอร์เองก่อน หรือเลือกช่างแถวบ้านราคาประหยัด',
        comfort: 'กดเรียกช่างด่วนผ่านแอป สะดวกสบาย จ่ายเงินจบ',
        explorer: 'ชอบลองแกะตรวจเช็กระบบแอร์ด้วยตนเอง',
        companion: 'อุดหนุนช่างคนรู้จักแถวบ้านที่คุ้นเคยกัน',
        impatient: 'ทนร้อนไม่ได้ เรียกช่างแอปด่วนที่มาถึงภายใน 2 ชั่วโมง',
        cautious: 'ต้องช่างจากศูนย์ทางการเท่านั้น มั่นใจว่าอะไหล่แท้และมีประกันงานซ่อม',
      },
    },
  },
];

/** Index by ID for quick lookup */
export const SCENARIO_MAP: ReadonlyMap<string, LegacyScenarioWithEditorial> = new Map(
  LEGACY_SCENARIOS.map((s) => [s.id, s])
);

/** Helper to get scenario by ID */
export function getScenarioById(id: string): LegacyScenarioWithEditorial | undefined {
  return SCENARIO_MAP.get(id);
}
