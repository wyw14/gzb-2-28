const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', `.env.${process.env.NODE_ENV || 'development'}`) });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { readJson, writeJson } = require('./utils/storage');
const { findMatchesForUser } = require('./utils/matching');

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT) || 3110;
const JWT_SECRET = process.env.JWT_SECRET || 'skill-swap-secret-key-2024';
const API_PREFIX = process.env.API_PREFIX || '/api';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: JWT_SECRET is not set in production environment!');
}

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未授权访问' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

app.post(`${API_PREFIX}/auth/register`, (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度需在2-20位之间' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6位' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: '请输入正确的邮箱格式' });
  }

  const users = readJson('users.json');

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: '邮箱已被注册' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    bio: '',
    rating: 5.0,
    reviewCount: 0,
    exchangeCount: 0,
    skillPoints: 0,
    preferences: {
      location: { city: '', province: '' },
      time: [],
      onlinePreference: 'both'
    },
    skillTree: [],
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson('users.json', users);

  const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ token, user: userWithoutPassword });
});

app.post(`${API_PREFIX}/auth/login`, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  const users = readJson('users.json');
  const user = users.find(u => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

app.get(`${API_PREFIX}/auth/me`, authMiddleware, (req, res) => {
  const users = readJson('users.json');
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put(`${API_PREFIX}/users/profile`, authMiddleware, (req, res) => {
  const users = readJson('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }

  users[userIndex] = { ...users[userIndex], ...req.body, id: req.user.id };
  writeJson('users.json', users);
  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

app.get(`${API_PREFIX}/skills`, authMiddleware, (req, res) => {
  const skills = readJson('skills.json');
  const { category, type, userId } = req.query;
  let filtered = skills;

  if (category) {
    filtered = filtered.filter(s => s.category === category);
  }
  if (type) {
    filtered = filtered.filter(s => s.type === type);
  }
  if (userId) {
    filtered = filtered.filter(s => s.userId === userId);
  }

  res.json(filtered);
});

app.post(`${API_PREFIX}/skills`, authMiddleware, (req, res) => {
  const { name, category, type } = req.body;

  if (!name || !category || !type) {
    return res.status(400).json({ error: '请填写技能名称、类别和类型' });
  }
  if (!['teach', 'learn'].includes(type)) {
    return res.status(400).json({ error: '技能类型无效，应为"可教"或"想学"' });
  }

  const skills = readJson('skills.json');
  const newSkill = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  skills.push(newSkill);
  writeJson('skills.json', skills);
  res.json(newSkill);
});

app.put('/api/skills/:id', authMiddleware, (req, res) => {
  const skills = readJson('skills.json');
  const skillIndex = skills.findIndex(s => s.id === req.params.id);
  if (skillIndex === -1) {
    return res.status(404).json({ error: '技能不存在' });
  }
  if (skills[skillIndex].userId !== req.user.id) {
    return res.status(403).json({ error: '无权限修改' });
  }

  skills[skillIndex] = { ...skills[skillIndex], ...req.body };
  writeJson('skills.json', skills);
  res.json(skills[skillIndex]);
});

app.delete(`${API_PREFIX}/skills/:id`, authMiddleware, (req, res) => {
  const skills = readJson('skills.json');
  const filtered = skills.filter(s => !(s.id === req.params.id && s.userId === req.user.id));
  writeJson('skills.json', filtered);
  res.json({ success: true });
});

app.get(`${API_PREFIX}/matches`, authMiddleware, (req, res) => {
  const users = readJson('users.json');
  const skills = readJson('skills.json');
  const { minScore, category } = req.query;

  let matches = findMatchesForUser(req.user.id, users, skills);

  if (minScore) {
    matches = matches.filter(m => m.score >= parseInt(minScore));
  }
  if (category) {
    matches = matches.filter(m =>
      m.matchedSkills.iCanTeach.some(s => s.includes(category)) ||
      m.matchedSkills.iCanLearn.some(s => s.includes(category))
    );
  }

  res.json(matches);
});

app.get(`${API_PREFIX}/messages/:userId`, authMiddleware, (req, res) => {
  const messages = readJson('messages.json');
  const { userId } = req.params;
  const myId = req.user.id;

  const conversation = messages.filter(m =>
    (m.senderId === myId && m.receiverId === userId) ||
    (m.senderId === userId && m.receiverId === myId)
  ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  conversation.forEach(m => {
    if (m.receiverId === myId && !m.read) {
      m.read = true;
    }
  });
  writeJson('messages.json', messages);

  res.json(conversation);
});

app.post(`${API_PREFIX}/messages`, authMiddleware, (req, res) => {
  const { receiverId, content } = req.body;

  if (!receiverId || !content) {
    return res.status(400).json({ error: '请指定接收者和消息内容' });
  }
  if (receiverId === req.user.id) {
    return res.status(400).json({ error: '不能给自己发送消息' });
  }

  const messages = readJson('messages.json');
  const newMessage = {
    id: uuidv4(),
    senderId: req.user.id,
    receiverId: req.body.receiverId,
    content: req.body.content,
    read: false,
    createdAt: new Date().toISOString()
  };
  messages.push(newMessage);
  writeJson('messages.json', messages);
  res.json(newMessage);
});

app.get(`${API_PREFIX}/conversations`, authMiddleware, (req, res) => {
  const messages = readJson('messages.json');
  const users = readJson('users.json');
  const myId = req.user.id;

  const userMessages = {};
  messages.forEach(m => {
    const otherId = m.senderId === myId ? m.receiverId : m.senderId;
    if (m.senderId === myId || m.receiverId === myId) {
      if (!userMessages[otherId]) {
        userMessages[otherId] = [];
      }
      userMessages[otherId].push(m);
    }
  });

  const conversations = Object.entries(userMessages).map(([userId, msgs]) => {
    const user = users.find(u => u.id === userId);
    const lastMsg = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(m => m.receiverId === myId && !m.read).length;
    return {
      userId,
      username: user?.username || '未知用户',
      avatar: user?.avatar,
      lastMessage: lastMsg.content,
      lastMessageTime: lastMsg.createdAt,
      unreadCount
    };
  }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

  res.json(conversations);
});

app.post(`${API_PREFIX}/exchanges`, authMiddleware, (req, res) => {
  const { partnerId, skills } = req.body;

  if (!partnerId || !skills) {
    return res.status(400).json({ error: '请指定交换对象和交换技能' });
  }
  if (partnerId === req.user.id) {
    return res.status(400).json({ error: '不能和自己发起交换' });
  }

  const exchanges = readJson('exchanges.json');
  const newExchange = {
    id: uuidv4(),
    initiatorId: req.user.id,
    partnerId: req.body.partnerId,
    skills: req.body.skills,
    status: 'pending',
    createdAt: new Date().toISOString(),
    confirmedBy: []
  };
  exchanges.push(newExchange);
  writeJson('exchanges.json', exchanges);
  res.json(newExchange);
});

app.put(`${API_PREFIX}/exchanges/:id/confirm`, authMiddleware, (req, res) => {
  const exchanges = readJson('exchanges.json');
  const index = exchanges.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '交换不存在' });
  }

  const exchange = exchanges[index];
  if (!exchange.confirmedBy.includes(req.user.id)) {
    exchange.confirmedBy.push(req.user.id);
  }

  if (exchange.confirmedBy.length >= 2) {
    exchange.status = 'completed';
    exchange.completedAt = new Date().toISOString();

    const users = readJson('users.json');
    [exchange.initiatorId, exchange.partnerId].forEach(userId => {
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users[userIndex].exchangeCount = (users[userIndex].exchangeCount || 0) + 1;
        users[userIndex].skillPoints = (users[userIndex].skillPoints || 0) + 50;
      }
    });
    writeJson('users.json', users);
  }

  exchanges[index] = exchange;
  writeJson('exchanges.json', exchanges);
  res.json(exchange);
});

app.get(`${API_PREFIX}/exchanges`, authMiddleware, (req, res) => {
  const exchanges = readJson('exchanges.json');
  const myExchanges = exchanges.filter(e =>
    e.initiatorId === req.user.id || e.partnerId === req.user.id
  );
  res.json(myExchanges);
});

app.post(`${API_PREFIX}/reviews`, authMiddleware, (req, res) => {
  const { exchangeId, targetUserId, rating, comment } = req.body;

  if (!exchangeId || !targetUserId || !rating) {
    return res.status(400).json({ error: '请填写交换ID、评价对象和评分' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分需在1-5分之间' });
  }
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: '不能评价自己' });
  }

  const reviews = readJson('reviews.json');
  const users = readJson('users.json');

  const existingReview = reviews.find(r =>
    r.exchangeId === req.body.exchangeId && r.reviewerId === req.user.id
  );
  if (existingReview) {
    return res.status(400).json({ error: '已评价过此交换' });
  }

  const newReview = {
    id: uuidv4(),
    exchangeId: req.body.exchangeId,
    reviewerId: req.user.id,
    targetUserId: req.body.targetUserId,
    rating: req.body.rating,
    comment: req.body.comment,
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  writeJson('reviews.json', reviews);

  const targetIndex = users.findIndex(u => u.id === req.body.targetUserId);
  if (targetIndex !== -1) {
    const targetUser = users[targetIndex];
    const userReviews = reviews.filter(r => r.targetUserId === req.body.targetUserId);
    const avgRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
    users[targetIndex].rating = Math.round(avgRating * 10) / 10;
    users[targetIndex].reviewCount = userReviews.length;
    writeJson('users.json', users);
  }

  res.json(newReview);
});

app.get('/api/reviews/:userId', (req, res) => {
  const reviews = readJson('reviews.json');
  const users = readJson('users.json');
  const userReviews = reviews.filter(r => r.targetUserId === req.params.userId);

  const reviewsWithUser = userReviews.map(r => {
    const reviewer = users.find(u => u.id === r.reviewerId);
    return {
      ...r,
      reviewerName: reviewer?.username || '匿名用户',
      reviewerAvatar: reviewer?.avatar
    };
  });

  res.json(reviewsWithUser);
});

app.get(`${API_PREFIX}/stats/popular-skills`, (req, res) => {
  const skills = readJson('skills.json');
  const skillCount = {};

  skills.forEach(s => {
    if (!skillCount[s.name]) {
      skillCount[s.name] = { teach: 0, learn: 0 };
    }
    skillCount[s.name][s.type]++;
  });

  const sorted = Object.entries(skillCount)
    .map(([name, counts]) => ({
      name,
      teachCount: counts.teach,
      learnCount: counts.learn,
      total: counts.teach + counts.learn,
      demand: counts.learn - counts.teach
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  res.json(sorted);
});

app.get(`${API_PREFIX}/stats/success-rate`, (req, res) => {
  const exchanges = readJson('exchanges.json');
  const total = exchanges.length;
  const completed = exchanges.filter(e => e.status === 'completed').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const skills = readJson('skills.json');
  const users = readJson('users.json');

  res.json({
    totalExchanges: total,
    completedExchanges: completed,
    successRate: rate,
    totalUsers: users.length,
    totalSkills: skills.length
  });
});

app.get(`${API_PREFIX}/skill-categories`, (req, res) => {
  const categories = readJson('skillCategories.json');
  res.json(categories);
});

app.get(`${API_PREFIX}/users/:userId`, (req, res) => {
  const users = readJson('users.json');
  const skills = readJson('skills.json');
  const user = users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const { password: _, ...userWithoutPassword } = user;
  const userSkills = skills.filter(s => s.userId === req.params.userId);
  res.json({
    ...userWithoutPassword,
    skills: userSkills
  });
});

app.put(`${API_PREFIX}/skill-tree`, authMiddleware, (req, res) => {
  const users = readJson('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }

  users[userIndex].skillTree = req.body.skillTree || [];
  writeJson('users.json', users);
  res.json({ skillTree: users[userIndex].skillTree });
});

app.get(`${API_PREFIX}/users`, authMiddleware, (req, res) => {
  const users = readJson('users.json');
  const { minRating, city, skill } = req.query;
  let filtered = users.map(u => {
    const { password: _, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });

  if (minRating) {
    filtered = filtered.filter(u => u.rating >= parseFloat(minRating));
  }
  if (city) {
    filtered = filtered.filter(u =>
      u.preferences?.location?.city?.includes(city)
    );
  }
  if (skill) {
    const skills = readJson('skills.json');
    const userIdsWithSkill = skills
      .filter(s => s.name.includes(skill))
      .map(s => s.userId);
    filtered = filtered.filter(u => userIdsWithSkill.includes(u.id));
  }

  res.json(filtered);
});

app.listen(PORT, () => {
  const protocol = process.env.BACKEND_PROTOCOL || 'http';
  const host = process.env.BACKEND_HOST || 'localhost';
  console.log(`\n========================================`);
  console.log(`  Skill Swap Server`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Address: ${protocol}://${host}:${PORT}`);
  console.log(`  API Prefix: ${API_PREFIX}`);
  console.log(`========================================\n`);
});
