// seed.js - Chay: node seed.js
// Tu dong tao 50 users, 1000 chi so, 200 nhac lich, 200 chat

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));
const randItem = (arr) => arr[randInt(0, arr.length)];
const randDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysAgo));
  d.setHours(randInt(6, 22), randInt(0, 59));
  return d;
};

// ─── Dữ liệu mẫu ─────────────────────────────────────────────────
const firstNames = ['An', 'Binh', 'Chi', 'Dung', 'Em', 'Giang', 'Hoa', 'Hung',
  'Lan', 'Mai', 'Nam', 'Phuong', 'Quang', 'Son', 'Thu', 'Tuan', 'Van', 'Xuan',
  'Yen', 'Anh', 'Bao', 'Cuong', 'Dat', 'Hai', 'Khanh', 'Linh', 'Minh', 'Ngoc',
  'Phuc', 'Thanh', 'Thi', 'Thuy', 'Trang', 'Trung', 'Viet', 'Long', 'Hieu'];

const lastNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Dang',
  'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly'];

const metricTypes = [
  { type: 'heart_rate',   unit: 'bpm',   min: 60,  max: 100 },
  { type: 'blood_pressure_sys', unit: 'mmHg', min: 110, max: 140 },
  { type: 'blood_pressure_dia', unit: 'mmHg', min: 70,  max: 90  },
  { type: 'weight',       unit: 'kg',    min: 45,  max: 90  },
  { type: 'blood_sugar',  unit: 'mg/dL', min: 80,  max: 120 },
  { type: 'sleep_hours',  unit: 'gio',   min: 5,   max: 9   },
  { type: 'water_intake', unit: 'L',     min: 1.0, max: 2.5 },
  { type: 'steps',        unit: 'buoc',  min: 3000, max: 12000 },
  { type: 'temperature',  unit: 'C',     min: 36.0, max: 37.5 },
  { type: 'spo2',         unit: '%',     min: 95,  max: 100 },
];

const reminderTitles = [
  'Uong thuoc huyet ap', 'Uong vitamin D', 'Do huyet ap',
  'Tap the duc', 'Uong nuoc', 'An sang dung gio',
  'Kiem tra duong huyet', 'Uong vitamin C', 'Di bo buoi sang',
  'Thiet bi do nhip tim', 'Uong sua', 'An toi som',
  'Tap yoga', 'Chay bo', 'Uong thuoc tieu duong',
  'Kham dinh ky', 'Do can nang', 'Nghi ngoi mat',
  'Massage co', 'Uong tra xanh',
];

const repeatTypes = ['daily', 'weekly', 'none', 'daily', 'daily'];

const chatContents = [
  ['Huyet ap cua toi la 130/85 co binh thuong khong?', 'Muc 130/85 mmHg hoi cao hon binh thuong (120/80). Ban nen theo doi them va giam muoi trong khau phan an.'],
  ['Toi bi mat ngu phai lam gi?', 'Ban nen di ngu dung gio, tranh dung dien thoai truoc khi ngu 30 phut va tap ho tho sau de thu gian.'],
  ['Nhip tim 90 bpm co sao khong?', 'Nhip tim 90 bpm van trong nguong binh thuong (60-100). Neu ban cam thay kho tho hay dau nguc thi nen gap bac si.'],
  ['Lam sao giam can hieu qua?', 'Ket hop an uong lanh manh va tap the duc. Nen giam 0.5-1kg moi tuan, tranh che do an qua khac nghiet.'],
  ['Uong bao nhieu nuoc moi ngay?', 'Nguoi truong thanh can uong 2-2.5L nuoc moi ngay. Tang len khi tap the duc hoac troi nong.'],
  ['Duong huyet 95 mg/dL tot khong?', 'Rat tot! Duong huyet khi doi tu 70-100 mg/dL la binh thuong. Ban dang quan ly suc khoe tot.'],
  ['Giac ngu bao nhieu tieng la du?', 'Nguoi truong thanh can 7-9 tieng ngu moi dem. Ngu du giup phuc hoi co the va tang suc de khang.'],
  ['Co nen tap the duc khi bi cam khong?', 'Neu chi cam nhe, di bo nhe 20-30 phut la duoc. Nhung neu sot cao hay met moi nhieu thi nen nghi ngoi.'],
  ['Vitamin D co tac dung gi?', 'Vitamin D giup hap thu canxi, tang cuong xuong khop va he mien dich. Nen phoi nang buoi sang 15-20 phut.'],
  ['Bmi 23 co phu hop khong?', 'BMI 23 nam trong khoang binh thuong (18.5-24.9). Ban dang co can nang hop ly, hay duy tri loi song lanh manh!'],
];

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Bat dau tao du lieu mau...\n');

  console.log('Tao 50 nguoi dung...');
  const hashedPwd = await bcrypt.hash('password123', 10);
  const users = [];

  for (let i = 0; i < 50; i++) {
    const firstName = randItem(firstNames);
    const lastName  = randItem(lastNames);
    const fullName  = `${lastName} ${firstName}`;
    const email     = `user${i + 1}@healthsync.com`;

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) { users.push(existing); continue; }

      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash: hashedPwd,
          role: 'user',
          gender: randItem(['Nam', 'Nu']),
          height: parseFloat(rand(155, 185).toFixed(1)),
          weight: parseFloat(rand(45, 90).toFixed(1)),
          isActive: Math.random() > 0.1,
          createdAt: randDate(90),
        }
      });
      users.push(user);
    } catch (e) {
      console.log(`  Skip user ${email}: ${e.message}`);
    }
  }
  console.log(`  Da tao ${users.length} nguoi dung\n`);

  console.log('Tao 1000 chi so suc khoe...');
  let metricCount = 0;
  const metricsPerUser = Math.ceil(1000 / users.length);

  for (const user of users) {
    for (let i = 0; i < metricsPerUser; i++) {
      const mt = randItem(metricTypes);
      try {
        await prisma.healthMetric.create({
          data: {
            userId:     user.id,
            metricType: mt.type,
            value:      parseFloat(rand(mt.min, mt.max).toFixed(1)),
            unit:       mt.unit,
            recordedAt: randDate(30),
            note:       Math.random() > 0.7 ? 'Ghi chu tu dong' : null,
          }
        });
        metricCount++;
      } catch (e) { /* skip */ }
    }
  }
  console.log(`  Da tao ${metricCount} ban ghi chi so\n`);

  console.log('Tao 200 nhac lich...');
  let reminderCount = 0;
  const remindersPerUser = Math.ceil(200 / users.length);

  for (const user of users) {
    for (let i = 0; i < remindersPerUser; i++) {
      const future = new Date();
      future.setDate(future.getDate() + randInt(0, 30));
      future.setHours(randInt(6, 22), randInt(0, 59), 0, 0);
      try {
        await prisma.reminder.create({
          data: {
            userId:       user.id,
            title:        randItem(reminderTitles),
            description:  Math.random() > 0.5 ? 'Nhac nho tu dong' : null,
            reminderTime: future,
            repeatType:   randItem(repeatTypes),
            isActive:     Math.random() > 0.2,
          }
        });
        reminderCount++;
      } catch (e) { /* skip */ }
    }
  }
  console.log(`  Da tao ${reminderCount} nhac lich\n`);

  console.log('Tao 200 cuoc tro chuyen AI...');
  let chatCount = 0;
  const chatsPerUser = Math.ceil(200 / users.length);

  for (const user of users) {
    for (let i = 0; i < chatsPerUser; i++) {
      try {
        const session = await prisma.chatSession.create({
          data: {
            userId:    user.id,
            startedAt: randDate(30),
          }
        });

        const qa = randItem(chatContents);
        await prisma.chatMessage.createMany({
          data: [
            { sessionId: session.id, sender: 'user',      content: qa[0], createdAt: session.startedAt },
            { sessionId: session.id, sender: 'assistant', content: qa[1],
              createdAt: new Date(session.startedAt.getTime() + 3000) },
          ]
        });
        chatCount++;
      } catch (e) { /* skip */ }
    }
  }
  console.log(`  Da tao ${chatCount} cuoc tro chuyen\n`);

  // ── Tổng kết ──────────────────────────────────────────────────
  const [u, m, r, c] = await Promise.all([
    prisma.user.count(),
    prisma.healthMetric.count(),
    prisma.reminder.count(),
    prisma.chatSession.count(),
  ]);

  console.log('════════════════════════════════');
  console.log('HOAN THANH! Ket qua:');
  console.log(`  Nguoi dung:   ${u}`);
  console.log(`  Chi so SK:    ${m}`);
  console.log(`  Nhac lich:    ${r}`);
  console.log(`  Tro chuyen:   ${c}`);
  console.log('════════════════════════════════');
  console.log('\nYeu cau do an:');
  console.log(`  >= 50 users:       ${u >= 50 ? 'DAT' : 'CHUA DAT'} (${u})`);
  console.log(`  >= 1000 chi so:    ${m >= 1000 ? 'DAT' : 'CHUA DAT'} (${m})`);
  console.log(`  >= 200 nhac lich:  ${r >= 200 ? 'DAT' : 'CHUA DAT'} (${r})`);
  console.log(`  >= 200 tro chuyen: ${c >= 200 ? 'DAT' : 'CHUA DAT'} (${c})`);
}

main()
  .catch(e => { console.error('Loi:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());