process.env.TZ = 'Asia/Kolkata';
console.log('Server time:', new Date().toString());

import dotenv from 'dotenv';
dotenv.config({ override: true });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import breakRoutes from './routes/break.routes';
import { initScheduler } from './utils/violationScheduler';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://workpulse.us", // Allow all for now, restrict in production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// Make io available in routes
app.set('io', io);

app.use(cors());
app.use(express.json());

app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/breaks', '/breaks'], breakRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('WorkPulse API is running');
});

// Socket.IO connection
io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);
  const userId = socket.handshake.query.userId;

  if (userId) {
    try {
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { isOnline: true }
      });
      io.emit('break_update'); // Notify others
    } catch (e) {
      console.error("Error updating user online status:", e);
    }
  }

  socket.on('join_manager', () => {
    socket.join('managers');
    console.log(`User ${socket.id} joined managers room`);
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: Number(userId) },
          data: { isOnline: false }
        });
        io.emit('break_update'); // Notify others
      } catch (e) {
        console.error("Error updating user offline status:", e);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize violation scheduler for ongoing sessions
  initScheduler().catch(e => console.error('Violation scheduler init failed:', e));
});
