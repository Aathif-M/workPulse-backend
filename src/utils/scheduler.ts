import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import moment from 'moment-timezone';

const prisma = new PrismaClient();

// Sri Lankan Timezone
const TIMEZONE = 'Asia/Colombo';

export const initAutoLogoutScheduler = (io: Server) => {
    console.log('Initializing Auto-Logout Scheduler...');

    // Job 1: 14:30 LK Time - Logout users NOT on break (TEST)
    cron.schedule('30 14 * * *', async () => {
        console.log('Running 20:30 Auto-Logout Job');
        try {
            // Find users who are online and NOT on an active break
            const users = await prisma.user.findMany({
                where: {
                    isOnline: true,
                    breakSessions: {
                        none: {
                            status: 'ONGOING'
                        }
                    }
                }
            });

            for (const user of users) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isOnline: false }
                });

                // Emit force_logout event to specific user if possible, or broadcast
                // Ideally we should emit to a specific socket room for the user
                // Assuming client listens to 'force_logout' and checks if it applies to them
                // For now, we can emit with userId payload
                io.emit('force_logout', { userId: user.id, reason: 'Auto-logout time reached' });
            }
            console.log(`Auto-logged out ${users.length} users.`);
        } catch (error) {
            console.error('Error in 20:30 Auto-Logout Job:', error);
        }
    }, {
        timezone: TIMEZONE
    });

    // Job 2: 14:32 LK Time - Warn users on break (TEST)
    cron.schedule('32 14 * * *', async () => {
        console.log('Running 20:55 Break Warning Job');
        try {
            // Find users currently on break
            const activeSessions = await prisma.breakSession.findMany({
                where: { status: 'ONGOING' },
                include: { user: true }
            });

            for (const session of activeSessions) {
                io.emit('break_warning', {
                    userId: session.userId,
                    message: 'Your break must end by 21:00 or you will be forcibly logged out.',
                    timeLeftMinutes: 5
                });
            }
            console.log(`Warned ${activeSessions.length} users on break.`);
        } catch (error) {
            console.error('Error in 20:55 Break Warning Job:', error);
        }
    }, {
        timezone: TIMEZONE
    });

    // Job 3: 14:34 LK Time - Force End Breaks & Logout Everyone (TEST)
    cron.schedule('34 14 * * *', async () => {
        console.log('Running 21:00 Force Logout Job');
        try {
            // 1. End all active breaks
            const activeSessions = await prisma.breakSession.findMany({
                where: { status: 'ONGOING' }
            });

            const endTime = new Date(); // Use server time, but the cron is triggered at 21:00 LK time

            for (const session of activeSessions) {
                await prisma.breakSession.update({
                    where: { id: session.id },
                    data: {
                        status: 'ENDED',
                        endTime: endTime,
                        // Calculate violation if any? 
                        // If pushed past 21:00 it might be a violation, but we just want to close it.
                    }
                });

                // Notify managers of forced end? Maybe not needed for this requirement.
            }

            // 2. Logout ALL online users (including those who were on break)
            const onlineUsers = await prisma.user.findMany({
                where: { isOnline: true }
            });

            for (const user of onlineUsers) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isOnline: false }
                });
                io.emit('force_logout', { userId: user.id, reason: 'System shutdown time 21:00' });
            }

            console.log(`Force ended ${activeSessions.length} breaks and logged out ${onlineUsers.length} users.`);
        } catch (error) {
            console.error('Error in 21:00 Force Logout Job:', error);
        }
    }, {
        timezone: TIMEZONE
    });
};
