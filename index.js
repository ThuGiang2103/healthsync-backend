const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_secret_2024';

const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('/{*path}', cors());
app.use(express.json());

// ─── Middleware xác thực JWT ───────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Chua dang nhap' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token khong hop le' });
  }
};

// ─── Middleware kiểm tra Admin ─────────────────────────────────────
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Khong co quyen truy cap' });
  }
  next();
};

// ─── TEST ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'HealthSync AI Backend is running!' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ message: 'Ket noi Database OK', total_users: count });
  } catch (error) {
    res.status(500).json({ message: 'Loi ket noi Database', error: error.message });
  }
});

// ─── REGISTER ─────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Thieu thong tin' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mat khau phai co it nhat 6 ky tu' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email da ton tai' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash: hashedPassword, role: 'user' }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Dang ky thanh cong',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Thieu thong tin' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Email hoac mat khau khong dung' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      message: 'Dang nhap thanh cong',
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── USER: xem profile ────────────────────────────────────────────
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, email: true, role: true,
                height: true, weight: true, gender: true, dateOfBirth: true,
                bloodType: true, medicalHistory: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── USER: cập nhật profile ───────────────────────────────────────
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, height, weight, gender, dateOfBirth, bloodType, medicalHistory } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, height, weight, gender, bloodType, medicalHistory,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined },
      select: { id: true, fullName: true, email: true, role: true }
    });
    res.json({ message: 'Cap nhat thanh cong', user });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── HEALTH METRICS ───────────────────────────────────────────────
app.post('/api/metrics', authMiddleware, async (req, res) => {
  try {
    const { metricType, value, unit, recordedAt, note } = req.body;
    if (!metricType || !value || !unit) {
      return res.status(400).json({ message: 'Thieu thong tin chi so' });
    }
    const metric = await prisma.healthMetric.create({
      data: {
        userId: req.user.id, metricType, value: parseFloat(value),
        unit, note, recordedAt: recordedAt ? new Date(recordedAt) : new Date()
      }
    });
    res.status(201).json({ message: 'Them chi so thanh cong', metric });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

app.get('/api/metrics', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const metrics = await prisma.healthMetric.findMany({
      where: { userId: req.user.id, ...(type && { metricType: type }) },
      orderBy: { recordedAt: 'desc' },
      take: 30
    });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── REMINDERS ────────────────────────────────────────────────────
app.post('/api/reminders', authMiddleware, async (req, res) => {
  try {
    const { title, description, reminderTime, repeatType } = req.body;
    if (!title || !reminderTime) {
      return res.status(400).json({ message: 'Thieu thong tin nhac lich' });
    }
    const reminder = await prisma.reminder.create({
      data: {
        userId: req.user.id, title, description,
        reminderTime: new Date(reminderTime),
        repeatType: repeatType || 'none'
      }
    });
    res.status(201).json({ message: 'Tao nhac lich thanh cong', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

app.get('/api/reminders', authMiddleware, async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { reminderTime: 'asc' }
    });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// ─── CHAT ─────────────────────────────────────────────────────────
app.post('/api/chat/session', authMiddleware, async (req, res) => {
  try {
    const session = await prisma.chatSession.create({
      data: { userId: req.user.id }
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

app.post('/api/chat/message', authMiddleware, async (req, res) => {
  try {
    const { sessionId, content, sender } = req.body;
    const message = await prisma.chatMessage.create({
      data: { sessionId, content, sender: sender || 'user' }
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ─── ADMIN APIs ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// Tạo tài khoản admin (chỉ dùng 1 lần để setup)
app.post('/api/admin/setup', async (req, res) => {
  try {
    const { secretKey, email, password, fullName } = req.body;
    if (secretKey !== (process.env.ADMIN_SECRET || 'healthsync_admin_2024')) {
      return res.status(403).json({ message: 'Secret key khong dung' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const updated = await prisma.user.update({
        where: { email }, data: { role: 'admin' }
      });
      return res.json({ message: 'Da cap nhat role admin', user: updated });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: { fullName: fullName || 'Admin', email, passwordHash: hashedPassword, role: 'admin' }
    });
    res.status(201).json({
      message: 'Tao admin thanh cong',
      user: { id: admin.id, email: admin.email, role: admin.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// Xem tất cả users
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: parseInt(limit),
        select: { id: true, fullName: true, email: true, role: true,
                  isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// Khóa / mở khóa user
app.put('/api/admin/users/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Khong tim thay user' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Khong the khoa admin' });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive }
    });
    res.json({ message: updated.isActive ? 'Da mo khoa user' : 'Da khoa user', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// Xóa user
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'Khong tim thay user' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Khong the xoa admin' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Da xoa user thanh cong' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});

// Thống kê tổng quan
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalMetrics, totalReminders, totalChats, newUsersToday] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.healthMetric.count(),
        prisma.reminder.count(),
        prisma.chatSession.count(),
        prisma.user.count({
          where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
        })
      ]);
    res.json({ totalUsers, activeUsers, totalMetrics, totalReminders, totalChats, newUsersToday });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});
// Xóa dữ liệu hệ thống (Admin only)
app.delete('/api/admin/data/:type', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Chua dang nhap' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Khong co quyen' });
    const { type } = req.params;
    let count = 0;
    if (type === 'metrics') {
      const r = await prisma.healthMetric.deleteMany();
      count = r.count;
    } else if (type === 'reminders') {
      const r = await prisma.reminder.deleteMany();
      count = r.count;
    } else if (type === 'chats') {
      const r = await prisma.chatSession.deleteMany();
      count = r.count;
    } else {
      return res.status(400).json({ message: 'Loai du lieu khong hop le' });
    }
    res.json({ message: `Da xoa ${count} ban ghi`, count });
  } catch (error) {
    res.status(500).json({ message: 'Loi server' });
  }
});
// ─── START ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server HealthSync AI dang chay tai http://localhost:${PORT}`);
});