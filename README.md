# Who Are You Really? (คุณคือใครกันแน่?)

[![CI](https://github.com/sirasakswnk/Who-Are-You-Really-BoardGame/actions/workflows/ci.yml/badge.svg)](https://github.com/sirasakswnk/Who-Are-You-Really-BoardGame/actions/workflows/ci.yml)

เว็บเกมกระดานจิตวิทยาและการสืบสวนตัวตนสำหรับผู้เล่น 2 คน (2-Player Thai Mobile Web Board Game) ออกแบบในธีม **"แฟ้มคดีนักสืบวินเทจ" (Detective Folder Theme)** — กระดาษการ์ดสีครีม, หมึกน้ำเงินเข้ม, ตราประทับสีส้มอิฐ และแท็บแฟ้มคดี

---

## 🔍 สรุปแนวคิดเกมและกติกา (Game Concept & Rules)

ผู้เล่น 2 คนได้รับรหัสคดีและเข้าสู่ห้องเดียวกัน แต่ละคนจะได้รับ **"บทบาทลับ" (Secret Role)** ประจำรอบโดยที่อีกฝ่ายไม่ทราบ ทั้งสองฝ่ายจะต้องตอบคำถามสถานการณ์จำลองในชีวิตประจำวัน 4 ข้อ (Clues 1–4) โดยเลือกคำตอบที่สอดคล้องกับบทบาทของตนเองมากที่สุด จากนั้นนำคำตอบที่เฉลยมาวิเคราะห์และอนุมานว่า **"เพื่อนของคุณน่าจะเป็นใคร?"**

### 6 บทบาทลับ (The 6 Roles)

| บทบาท (Role) | สัญลักษณ์ | คำอธิบายบุคลิก |
|---|:---:|---|
| **สายประหยัด** (*Thrifty*) | 💰 | เน้นความคุ้มค่า มองหาความประหยัด โปรโมชัน และของฟรีเสมอ |
| **สายเปย์** (*Splurger*) | 💳 | ซื้อความสะดวกสบาย ยอมจ่ายเพื่อประสบการณ์พรีเมียมและคนที่รัก |
| **สายชิล** (*Chill*) | 🌴 | สบายๆ อะไรก็ได้ ไม่ชอบการวางแผนล่วงหน้า ยืดหยุ่นตามสถานการณ์ |
| **สายเนี๊ยบ** (*Perfectionist*) | 📋 | มีแบบแผน มีระเบียบ ตรวจสอบรายละเอียดและกำหนดเวลาอย่างเคร่งครัด |
| **สายผจญภัย** (*Adventurous*) | 🧗 | ชอบความท้าทาย สิ่งใหม่ ไม่กลัวความเสี่ยง พร้อมลุยทุกสถานการณ์ |
| **สายสังคม** (*Socializer*) | ☕ | ชอบอยู่ท่ามกลางผู้คน แคร์ความรู้สึกเพื่อน ให้ความสำคัญกับมิตรภาพ |

### กฎทองคำ (The Golden Rule)
> **"เลือกตอบตามบทบาทลับของคุณให้สมจริงที่สุด เพื่อท้าทายการอนุมานของเพื่อน และจับตาดูคำตอบของเพื่อนเพื่อเปิดโปงตัวตนที่แท้จริง!"**

### ตารางคะแนน (Scoring Table)

ผู้เล่นมีสิทธิ์ล็อกคำทายได้ **เพียงครั้งเดียวต่อรอบ** โดยคะแนนที่ได้รับจะลดหลั่นตามจำนวนเบเบาะแสที่ใช้:

| ข้อที่ตัดสินใจทาย (Clue Index) | คะแนนเมื่อทายถูก | หมายเหตุ |
|:---:|:---:|---|
| **ข้อที่ 1 (Clue 1)** | **+5 แต้ม** | ทายเร็วที่สุด คะแนนสูงสุด ความเสี่ยงสูง |
| **ข้อที่ 2 (Clue 2)** | **+4 แต้ม** | มีเบาะแสเปรียบเทียบ 2 ข้อ |
| **ข้อที่ 3 (Clue 3)** | **+3 แต้ม** | มีเบาะแสเปรียบเทียบ 3 ข้อ |
| **ข้อที่ 4 (Clue 4 - ข้อสุดท้าย)** | **+2 แต้ม** | *บังคับทาย (Forced Guess)* |
| **ทายผิด (Wrong Guess)** | **0 แต้ม** | ไม่ได้รับคะแนนในรอบนั้น |

- **Score-Once Semantics**: คะแนนให้เพียงครั้งเดียวเมื่อทายถูกในรอบนั้น ผู้เล่นที่ล็อกคำทายแล้วจะอยู่ในสถานะรอดูเฉลย
- **การแข่งขัน (Match)**: เล่นทั้งหมด 4 รอบ (16 คำถามจากคลัง 24 สถานการณ์) รวมคะแนนเพื่อหาผู้ชนะ

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี | รายละเอียด |
|---|---|---|
| **Framework** | Next.js 16.4.0 (App Router) | รองรับ Partial Prerendering (PPR), Server Components & Route Handlers |
| **UI Library** | React 19.3.0 | Modern Hooks, Transitions, Responsive Detective Design System |
| **Language** | TypeScript (Strict Mode) | Zero implicit any, Type-safe Game Engine & Contracts |
| **Styling** | Vanilla CSS (`globals.css`) | CSS Variables, Micro-animations, Mobile-first (max 520px container) |
| **Realtime DB** | Firebase Realtime Database | Live synchronization ระหว่าง 2 ผู้เล่น พร้อม Polling fallback |
| **Authentication** | Firebase Anonymous Auth | ล็อกอินไม่ระบุตัวตนอัตโนมัติ รักษาสิทธิ์แยกผู้เล่น 2 ฝั่ง |
| **Testing** | Vitest 3.2.7 + Playwright 1.64 | 70 Unit/Concurrency tests + 8 Multi-Browser E2E tests |
| **CI / CD** | GitHub Actions | Automated Lint, Typecheck, Content Validation, Emulators & Build |
| **Hosting** | Vercel (Singapore `sin1`) | Serverless Functions รันใกล้เคียงกับฐานข้อมูล Firebase RTDB (`asia-southeast1`) |

---

## 🚀 เริ่มต้นใช้งานและพัฒนา (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- Node.js version 20.x หรือใหม่กว่า
- npm version 9.x หรือใหม่กว่า

### 1. ติดตั้ง Dependencies
```bash
npm ci
```

### 2. รันเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

### 3. วิธีจำลองการเล่น 2 คนบนเครื่องคอมพิวเตอร์ (Local 2-Player Testing)
เนื่องจากระบบใช้ Firebase Anonymous Auth แยกตัวตนตาม Browser Storage ในการทดสอบ 2 คน ให้เปิดดังนี้:
1. **ผู้เล่นคนที่ 1 (หัวหน้าห้อง 👑)**: เปิดเบราว์เซอร์ปกติ ไปที่ [http://localhost:3000](http://localhost:3000) กรอกชื่อ เลือกอวาตาร์ แล้วกด **"สร้างห้องใหม่"**
2. **ผู้เล่นคนที่ 2 (เพื่อน 🔍)**: เปิดหน้าต่าง **Incognito / InPrivate** (`Ctrl + Shift + N`) ไปที่ [http://localhost:3000](http://localhost:3000) กรอกรหัสห้อง 6 ตัว (หรือเปิดผ่านลิงก์ชวนเพื่อน) กรอกชื่อ เลือกอวาตาร์ แล้วกด **"เข้าร่วมห้อง"**
3. ทั้ง 2 คนกด **"ฉันพร้อมแล้ว! ✓"** จากนั้นหัวหน้าห้องกด **"เริ่มการสืบสวน! 🔍"**

### 4. วิธีเล่นผ่านโทรศัพท์มือถือจริงในวง Wi-Fi เดียวกัน (Local LAN Mobile Play)
1. ตรวจสอบ IP เครื่องคอมพิวเตอร์ของคุณ (เช่น `192.168.1.50`)
2. เปิดมือถือที่เชื่อมต่อ Wi-Fi วงเดียวกัน แล้วเปิดเบราว์เซอร์ไปที่ `http://192.168.1.50:3000`
3. มือถือเครื่องที่ 1 กดสร้างห้อง แล้วแชร์รหัสให้มือถือเครื่องที่ 2 เข้ามาร่วมเล่นได้ทันที

---

## 🧪 การทดสอบและการตรวจสอบคุณภาพ (Testing & QA)

ระบบมีชุดทดสอบครอบคลุมทุกระดับชั้น สามารถรันได้ด้วยคำสั่งต่อไปนี้:

```bash
# 1. ตรวจสอบ Code Quality & สไตล์การเขียนโค้ด (ESLint 9)
npm run lint

# 2. ตรวจสอบ Type Safety แบบเคร่งครัด (TypeScript Strict Mode)
npm run typecheck

# 3. ตรวจสอบความถูกต้องของเนื้อหาสถานการณ์และการแยกแยะบทบาท 15 คู่
npm run validate:content

# 4. รันชุดทดสอบ Unit Tests และ Concurrency/Resilience ทั้งหมด 70 ข้อ (Vitest)
npm test

# 5. รันชุดทดสอบเสมือนจริงแบบ Multi-Browser E2E บน Mobile Pixel 7 และ Desktop Chrome (Playwright)
npm run test:e2e

# 6. ทดสอบ Build โปรดักชัน (Next.js Production Build)
npm run build
```

---

## 💻 การใช้งาน Firebase Local Emulator Suite

สำหรับการรันหรือทดสอบโดยไม่เชื่อมต่อกับฐานข้อมูลจริง สามารถใช้ Firebase Emulator ได้ดังนี้:

1. ติดตั้ง Firebase CLI (หากยังไม่มี):
   ```bash
   npm install -g firebase-tools
   ```
2. เริ่มต้นจำลอง Emulator (Auth พอร์ต 9099, RTDB พอร์ต 9000, Emulator UI พอร์ต 4000):
   ```bash
   firebase emulators:start
   ```
3. กำหนดค่าใน `.env.local`:
   ```env
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
   ```

---

## 🚢 คู่มือการขึ้นระบบ (Deployment Guide)

### ทำไมต้อง Deploy กฎ Firebase Security Rules แยกจาก Frontend?
> **ความปลอดภัยสูงสุด**: กฎความปลอดภัยของ Firebase Realtime Database (`database.rules.json`) เป็นปราการด่านแรกที่ควบคุมสิทธิ์การอ่าน/เขียนข้อมูลจากระดับฐานข้อมูล การ Deploy กฎความปลอดภัยแยกด้วย Firebase CLI ช่วยรับประกันว่าฐานข้อมูลปิดกั้นคนนอก (Deny-by-default) และปกป้องข้อมูลความลับของผู้เล่นเรียบร้อยแล้ว ก่อนที่ Frontend เวอร์ชันใหม่บน Vercel จะเริ่มรับทราฟฟิกจริง

### ขั้นตอนที่ 1: Deploy กฎ Firebase Security Rules
```bash
npx firebase-tools deploy --only database
```
คำสั่งนี้จะอ่านค่าจาก `.firebaserc` และอัปโหลด `database.rules.json` ไปยัง Firebase RTDB Instance จริงโดยอัตโนมัติ

### ขั้นตอนที่ 2: ตั้งค่า Vercel Git Integration
1. ไปที่ [vercel.com/new](https://vercel.com/new)
2. นำเข้า Repository: `Who-Are-You-Really-BoardGame`
3. Framework Preset: **Next.js**
4. Root Directory: `./`
5. กรอกค่า Environment Variables (ครอบคลุมทั้ง Production และ Preview):

| ชื่อตัวแปร (Variable) | สิทธิ์เข้าถึง | แหล่งข้อมูล |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser | จาก Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser | `who-are-you-really-e6584.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser | `who-are-you-really-e6584` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Browser | `https://who-are-you-really-e6584-default-rtdb.asia-southeast1.firebasedatabase.app/` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser | App ID ใน Firebase Console |
| `FIREBASE_PROJECT_ID` | Server Only | `who-are-you-really-e6584` |
| `FIREBASE_DATABASE_URL` | Server Only | URL ของ RTDB |
| `FIREBASE_CLIENT_EMAIL` | Server Only | Service Account Email จาก Google Cloud |
| `FIREBASE_PRIVATE_KEY` | Server Only | Service Account Private Key (`-----BEGIN PRIVATE KEY-----\n...`) |

> ⚠️ **คำเตือนความปลอดภัย**: ตัวแปร `FIREBASE_CLIENT_EMAIL` และ `FIREBASE_PRIVATE_KEY` ต้อง **ไม่มี** คำนำหน้า `NEXT_PUBLIC_` โดยเด็ดขาด เพื่อป้องกันไม่ให้กุญแจลับหลุดเข้าไปในโค้ดฝั่งเบราว์เซอร์

### ขั้นตอนที่ 3: เพิ่ม Authorized Domains ใน Firebase
เมื่อ Vercel สร้างโดเมนให้เรียบร้อย (เช่น `who-are-you-really.vercel.app`):
1. ไปที่ [Firebase Console -> Authentication -> Settings -> Authorized domains](https://console.firebase.google.com/project/who-are-you-really-e6584/authentication/settings)
2. กด **Add domain** แล้วใส่โดเมนของ Vercel ลงไป เพื่อให้ระบบ Anonymous Sign-In ทำงานได้สมบูรณ์

---

## 📝 คู่มือการเพิ่มเนื้อหาและสถานการณ์ใหม่ (Content Authoring Guide)

### การเพิ่มสถานการณ์ใหม่ใน `content/scenarios.ts`
โครงสร้างข้อมูลสถานการณ์ 1 ข้อประกอบด้วยข้อมูลที่ผู้เล่นเห็น และข้อมูลเบื้องหลังสำหรับการวิเคราะห์:

```typescript
{
  id: 'category-slug',          // รหัสคำถามไม่ซ้ำกัน เช่น 'travel-flight-delay'
  category: 'travel',           // หมวดหมู่: travel | food | shopping | leisure | friends | daily
  title: 'เที่ยวบินดีเลย์ 6 ชั่วโมง',
  prompt: 'คุณกำลังจะเดินทางไปเที่ยวต่างประเทศ แต่เที่ยวบินดีเลย์ 6 ชั่วโมง คุณจะทำอย่างไร?',
  options: [
    { id: 'opt-1', label: 'หาเลานจ์สนามบินจ่ายเงินเข้าไปนั่งพักผ่อนสบายๆ' },
    { id: 'opt-2', label: 'เดินสำรวจร้านค้าปลอดภาษีและซื้อของฆ่าเวลา' },
    { id: 'opt-3', label: 'นั่งรอที่เกต หาจุดชาร์จแบตฟรีแล้วเปิดซีรีส์ดู' },
    { id: 'opt-4', label: 'ชวนเพื่อนร่วมทางหรือคนข้างๆ คุยแลกเปลี่ยนประสบการณ์' },
  ],
  // ข้อมูล Editorial เบื้องหลัง (เซิร์ฟเวอร์จะตัดทิ้งก่อนส่งให้ไคลเอนต์ด้วย stripEditorial)
  plausibleOptionsByRole: {
    splurger: ['opt-1'],
    thrifty: ['opt-3'],
    socializer: ['opt-4'],
    chill: ['opt-3'],
    perfectionist: ['opt-1', 'opt-3'],
    adventurous: ['opt-2'],
  },
  rationaleByRole: {
    splurger: 'ยอมจ่ายค่าเลานจ์เพื่อความสะดวกสบายและพักผ่อน',
    thrifty: 'เลือกนั่งรอจุดฟรี ไม่ยอมเสียเงินเพิ่มโดยไม่จำเป็น',
    // ...
  },
  difficulty: 'medium',
  tags: ['airport', 'delay', 'travel'],
}
```

### การตรวจสอบความถูกต้องของเนื้อหา (Content Validation)
หลังเพิ่มสถานการณ์ใหม่ ให้รันคำสั่ง:
```bash
npm run validate:content
```
Validator จะตรวจสอบ:
1. จำนวนตัวเลือกมี 3–4 ข้อต่อสถานการณ์ และข้อความไม่ว่างเปล่า
2. การกระจายตัวของหมวดหมู่อย่างสมดุล
3. **15-Pair Distinguishability Coverage**: ตรวจสอบว่าทุกคู่บทบาทที่เป็นไปได้ (เช่น สายเปย์ vs สายประหยัด, สายชิล vs สายเนี๊ยบ) มีสถานการณ์ที่ให้คำตอบต่างกันอย่างน้อย $\ge 11$ ข้อขึ้นไป เพื่อรับประกันว่าผู้เล่นสามารถอนุมานตัวตนได้จริง

---

## ⚠️ ข้อจำกัดและข้อควรทราบ (Known Limitations & Disclaimers)

1. **ระบบ Honor-System**: เกมนี้ออกแบบตามหลักความซื่อสัตย์ของผู้เล่น การเลือกคำตอบที่ไม่ตรงกับบทบาทลับไม่มีระบบลงโทษอัตโนมัติ ผู้เล่นจะได้รับความสนุกสูงสุดเมื่อตั้งใจสวมบทบาทตามการ์ดที่ได้รับ
2. **ความสมดุลของบทบาท (Balance Tuning)**: ความยากง่ายและการกระจายตัวของตัวเลือกควรได้รับการปรับปรุงอย่างต่อเนื่องผ่านการ Playtest จริงกับกลุ่มผู้เล่น
3. **การจำกัด Session ตามอุปกรณ์ (Device-Bound Sessions)**: การกู้คืนการเล่นในกรณีโหลดหน้าจอใหม่ (Reload/Refresh) อ้างอิงจาก Anonymous Auth Token ที่เก็บไว้ในเบราว์เซอร์ของเครื่องนั้น ๆ การย้ายไปเล่นต่อบนเครื่องอื่นไม่อยู่ในขอบเขต MVP
4. **การล้างข้อมูลห้องเก่า (Room Cleanup)**: ห้องที่ไม่มีการใช้งานเกิน 2 ชั่วโมงจะหมดอายุอัตโนมัติผ่านการตรวจสอบ TTL ฝั่งเซิร์ฟเวอร์ การลบข้อมูลถาวรในฐานข้อมูลต้องอาศัย Scheduled Function / Cron Job ภายนอก

---

## 📄 ใบอนุญาต (License)

พัฒนาขึ้นเพื่อการเรียนรู้และสร้างสรรค์เกมกระดานดิจิทัล ลิขสิทธิ์โค้ดต้นฉบับเป็นของผู้พัฒนา (`Who-Are-You-Really-BoardGame`).
