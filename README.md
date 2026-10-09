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
| **Testing** | Vitest 3.2.7 + Playwright 1.64 | Unit/isolated integration, opt-in emulator และ Multi-Browser E2E; ผลแต่ละขั้นอยู่ใน `docs/F0*.md` |
| **CI / CD** | GitHub Actions | Automated Lint, Typecheck, Content Validation, Emulators & Build |
| **Hosting** | Vercel (Singapore `sin1`) | Serverless Functions รันใกล้เคียงกับฐานข้อมูล Firebase RTDB (`asia-southeast1`) |

---

## 🚀 เริ่มต้นใช้งานและพัฒนา (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- Node.js version 24.x (ตรงกับ CI และเครื่องมือ cleanup ที่รัน TypeScript โดยตรง)
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

# 4. รันชุดทดสอบ Unit/Concurrency/Integration (Vitest)
# SDK/Rules emulator tests จะ skip ถ้าไม่ได้เปิดโหมดทดสอบ local ชัดเจน
npm test

# 5. รัน Auth/RTDB emulator, build และ E2E บน Pixel 7 + Desktop Chrome (เหมือน CI)
# ต้องมี Firebase CLI, Java และ Playwright Chromium; ใช้ demo project ใหม่แยกจากข้อมูลจริง
npm run verify:acceptance

# 6. ทดสอบ Build โปรดักชัน (Next.js Production Build)
npm run build
```

ผลตรวจ checkout ปัจจุบัน: regression แบบจำลองผ่าน 332 ข้อ แต่ real emulator 10 ข้อยังไม่ได้รัน, E2E 14 กรณียังไม่ execute และ production build บนเครื่องนี้ติด Windows SWC Access denied จึงยังไม่ถือว่าตรวจรับครบหรือพร้อม release ดู [F08_ACCEPTANCE.md](docs/F08_ACCEPTANCE.md) และ [DELIVERY_CHECKLIST.md](docs/DELIVERY_CHECKLIST.md) คำสั่ง `verify:acceptance -- --list` ตรวจรายการ E2E โดยไม่เปิด browser และ `verify:acceptance -- --unit` รันเฉพาะ regression กับ emulator; ไม่ใช้ `test:e2e` ตรง ๆ กับ Vercel URL

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
   NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=http://127.0.0.1:9099
   NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1
   NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_PORT=9000
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
   ```

---

## 🚢 คู่มือการขึ้นระบบ (Deployment Guide)

### ทำไมต้อง Deploy กฎ Firebase Security Rules แยกจาก Frontend?
> **ความปลอดภัยสูงสุด**: กฎความปลอดภัยของ Firebase Realtime Database (`database.rules.json`) เป็นปราการด่านแรกที่ควบคุมสิทธิ์การอ่าน/เขียนข้อมูลจากระดับฐานข้อมูล การ Deploy กฎความปลอดภัยแยกด้วย Firebase CLI ช่วยรับประกันว่าฐานข้อมูลปิดกั้นคนนอก (Deny-by-default) และปกป้องข้อมูลความลับของผู้เล่นเรียบร้อยแล้ว ก่อนที่ Frontend เวอร์ชันใหม่บน Vercel จะเริ่มรับทราฟฟิกจริง

### ขั้นตอนที่ 1: Deploy กฎ Firebase Security Rules
```bash
npx firebase-tools deploy --only database --project who-are-you-really-e6584
```
รันจากโฟลเดอร์ `who-are-you-really` ที่มี `firebase.json` และ `package.json` ตรวจ project/instance ก่อนรัน คำสั่งนี้เปลี่ยน Rules ของฐานข้อมูลจริง ส่วนการ deploy Vercel ไม่ได้อัปโหลด Rules ให้ ขั้น F07 แก้เฉพาะไฟล์ใน checkout ยังไม่ได้ deploy กฎหรือโค้ด

### ขั้นตอนที่ 2: ตั้งค่า Vercel Git Integration
1. ไปที่ [vercel.com/new](https://vercel.com/new)
2. นำเข้า Repository: `Who-Are-You-Really-BoardGame`
3. Framework Preset: **Next.js**
4. Root Directory: โฟลเดอร์ที่มี `package.json` และ `next.config.ts` (Git root ของ checkout นี้คือ `who-are-you-really` ไม่ใช่โฟลเดอร์ `gemini` ชั้นนอก)
5. กรอกค่า Environment Variables ของแต่ละ environment ให้ client/server ชี้ Firebase project และ RTDB instance เดียวกัน ใช้ project/DB ทดสอบแยกสำหรับ Preview เพื่อไม่เขียนเกมทดสอบลง Production:

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

เปิด Anonymous provider ใน Firebase Authentication และใช้ Admin service account ของ project ที่กำหนด Server ใช้ REST ETag/conditional PUT ไป RTDB ด้วย access token ของ Admin; ไม่มี production memory fallback หรืองานที่ใช้ offline queue ตรวจ `/api/diagnostics` หลังตั้งค่า และสร้าง deployment ใหม่หลังเปลี่ยน environment variables ปิด `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` และอย่าตั้ง `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_DATABASE_EMULATOR_HOST` บน Vercel

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
4. **อายุห้อง (Room TTL)**: เริ่มที่ 24 ชั่วโมงจากคำขอสร้างห้อง และต่ออายุเป็น 24 ชั่วโมงหลังการเข้าร่วมใหม่หรือคำสั่งที่ผ่านการตรวจสิทธิ์/context และเปลี่ยน game state (ready/start/ack/answer/decision/next round/rematch/leave) ใช้ expiry เดิมเป็นค่าต่ำสุด การอ่าน, polling, presence, join ซ้ำ/reconnect, create/action replay, คำสั่งผิด และคำสั่งที่ไม่เปลี่ยนสถานะไม่ต่ออายุ Expiry เก็บเฉพาะ server เพื่อไม่เผยกิจกรรมลับผ่าน public revision API คืน 410 เมื่อห้องหมดอายุ และ Rules ปิด reads/publication; own presence deletion ยังทำได้หลัง expiry/leave

## 🧹 ดูแลข้อมูลห้อง (Manual Maintenance)

`npm run cleanup:rooms` เป็นเครื่องมือ manual สำหรับฐานข้อมูลขนาดเล็ก ค่าเริ่มต้นเป็น **dry-run**: อ่านและแสดงเฉพาะ path ที่เข้าเกณฑ์ ไม่มีการเขียนหรือลบ ใช้ Node.js 24 และ Application Default Credentials ผ่าน service account file ใน `GOOGLE_APPLICATION_CREDENTIALS`; ไม่โหลด `.env.local` หรือใช้ private key ของเว็บโดยอัตโนมัติ

```powershell
# แสดงวิธีใช้ โดยไม่เชื่อมต่อฐานข้อมูล
npm.cmd run cleanup:rooms -- --help

# ตรวจฐานข้อมูลจริงแบบอ่านอย่างเดียว ต้องตั้ง ADC และระบุ project/URL ให้ถูกต้อง
npm.cmd run cleanup:rooms -- --project who-are-you-really-e6584 --database-url https://who-are-you-really-e6584-default-rtdb.asia-southeast1.firebasedatabase.app/ --dry-run

# ตรวจไฟล์ JSON จำลองโดยไม่ใช้ credentials (รองรับเฉพาะ dry-run)
npm.cmd run cleanup:rooms -- --fixture path/to/fixture.json
```

การลบจริงต้องเพิ่ม `--apply --confirm-project PROJECT` ให้ตรงกับ `--project` หลังตรวจ dry-run และเป้าหมายฐานข้อมูลแล้ว เครื่องมือใช้ root ETag CAS ตรวจ expiry/generation ซ้ำ ลบห้องที่หมดอายุพร้อม presence ใน commit เดียว ข้ามห้องที่ต่ออายุหรือสร้างใหม่ระหว่าง scan และลบ orphan presence ที่ยังไม่มีห้อง ณ transaction เดียวกัน ลบ rate-limit records ที่เก่ากว่า 24 ชั่วโมง และ creation reservations ที่เก่ากว่า 24 ชั่วโมงซึ่งไม่เกี่ยวกับห้อง active; records ที่อ่าน metadata ไม่ได้จะถูกเก็บไว้

ค่าเริ่มต้น 100 candidates ต่อ pass (สูงสุด 500; presence ที่ติดกับห้องลบพร้อมกัน) การอ่าน root จำกัด 5 MiB, จำกัด retry/timeout และต้อง dry-run ใหม่หลังแต่ละ pass ฐานข้อมูลใหญ่หรือมี contention มากอาจปฏิเสธงานนี้โดยไม่คืนผลลบที่ยืนยัน หาก PUT response หายอาจ commit แล้ว ให้ตรวจ dry-run ใหม่และอย่าสรุปว่าการลบล้มเหลวแน่นอน ไม่ติดตั้ง scheduler และยังไม่มีการลบข้อมูลจริงใน F07 รายละเอียดอยู่ใน [F07_EXPIRY_MAINTENANCE.md](docs/F07_EXPIRY_MAINTENANCE.md)

---

## 📄 ใบอนุญาต (License)

พัฒนาขึ้นเพื่อการเรียนรู้และสร้างสรรค์เกมกระดานดิจิทัล ลิขสิทธิ์โค้ดต้นฉบับเป็นของผู้พัฒนา (`Who-Are-You-Really-BoardGame`).
