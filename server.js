// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3334', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Socket.io setup
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Make io accessible to API routes
  global.io = io;

  // Initialize shared Prisma client for socket handlers
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join live-updates room for real-time updates
    socket.on('join-live-updates', () => {
      socket.join('live-updates');
      console.log('Client joined live-updates room:', socket.id);
    });

    // Join user-specific room for notifications
    socket.on('join-notifications', (userId) => {
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`Client joined notifications room: user-${userId}`);
      }
    });

    // Handle get-rooms request
    socket.on('get-rooms', async () => {
      try {

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Get all rooms
        const rooms = await prisma.room.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        });

        // Get today's lessons
        const lessons = await prisma.lesson.findMany({
          where: {
            date: today,
            status: { in: ['scheduled', 'in_progress', 'completed'] }
          },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            room: true
          }
        });

        // Map rooms with current lessons
        const roomsWithLessons = rooms.map(room => {
          // Find current or upcoming lesson for this room
          const currentLesson = lessons.find(lesson => {
            if (lesson.roomId !== room.id) return false;

            const [startHour, startMinute] = lesson.startTime.split(':').map(Number);
            const [endHour, endMinute] = lesson.endTime.split(':').map(Number);

            const lessonStart = new Date(today);
            lessonStart.setHours(startHour, startMinute, 0, 0);

            const lessonEnd = new Date(today);
            lessonEnd.setHours(endHour, endMinute, 0, 0);

            // Lesson is current if now is within lesson time
            return now >= lessonStart && now <= lessonEnd;
          });

          if (currentLesson) {
            return {
              id: room.id,
              name: room.name,
              currentLesson: {
                id: currentLesson.id,
                studentName: `${currentLesson.student.user.firstName} ${currentLesson.student.user.lastName}`,
                teacherName: `${currentLesson.teacher.user.firstName} ${currentLesson.teacher.user.lastName}`,
                instrument: currentLesson.instrument,
                startTime: currentLesson.startTime,
                endTime: currentLesson.endTime,
                studentCheckedIn: !!currentLesson.studentCheckIn,
                teacherCheckedIn: !!currentLesson.teacherCheckIn
              }
            };
          }

          return {
            id: room.id,
            name: room.name,
            currentLesson: null
          };
        });

        socket.emit('rooms-update', roomsWithLessons);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        socket.emit('rooms-update', []);
      }
    });

    // Handle get-notifications request
    socket.on('get-notifications', async (userId) => {
      if (!userId) return;

      try {
        const notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });

        socket.emit('notifications-update', { notifications, unreadCount });
      } catch (error) {
        console.error('Error fetching notifications:', error);
        socket.emit('notifications-update', { notifications: [], unreadCount: 0 });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    io.close();
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server is running`);
  });
});
