const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const prisma = new PrismaClient();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('/{*path}', cors());
app.use(express.json());

// Test
app.get('/', (req, res) => {
  res.json({ message: '✅ HealthSync AI Backend is running!' });
});

// ====================== REGISTER ======================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Thiếu thông tin" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hashedPassword,
      }
    });

    res.status(201).json({
      message: "Đăng ký thành công",
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ====================== LOGIN ======================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    res.json({
      message: "Đăng nhập thành công",
      user: { id: user.id, fullName: user.fullName, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});
// Xem tất cả user đã đăng ký
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi" });
  }
});
// Test Database
app.get('/api/test-db', async (req, res) => {
  try {
    const count = await prisma.user.count();
    res.json({ 
      message: "Kết nối Database OK", 
      total_users: count 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi kết nối Database", 
      error: error.message 
    });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server HealthSync AI đang chạy tại http://localhost:${PORT}`);
});