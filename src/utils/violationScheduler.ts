import { PrismaClient } from '@prisma/client';
import { sendViolationAlertEmail } from './email';

const prisma = new PrismaClient();

// Map sessionId -> timeout
const sessionTimers: Map<number, NodeJS.Timeout> = new Map();

const scheduleSession = (session: any) => {
    try {
        if (!session || !session.id || !session.expectedEndTime) return;

        const now = new Date();
        const expected = new Date(session.expectedEndTime);
        let ms = expected.getTime() - now.getTime();

        // If expected time already passed, run immediately (0ms)
        if (ms < 0) ms = 0;

        // Clear existing timer if any
        if (sessionTimers.has(session.id)) {
            clearTimeout(sessionTimers.get(session.id)!);
            sessionTimers.delete(session.id);
        }

        const t = setTimeout(async () => {
            try {
                // Re-fetch session to confirm status
                const s = await prisma.breakSession.findUnique({
                    where: { id: session.id },
                    include: { breakType: true }
                });

                if (!s) return;

                // If still ongoing (not ended) and expectedEndTime reached, send alert
                if (s.status === 'ONGOING' && (!s.endTime || new Date(s.endTime) > s.expectedEndTime)) {
                    // Fetch managers and super admins
                    const managers = await prisma.user.findMany({
                        where: { role: { in: ['MANAGER', 'SUPER_ADMIN'] } },
                        select: { email: true }
                    });
                    const recipients = managers.map((m: { email: string }) => m.email).filter(Boolean);

                    if (recipients.length > 0) {
                        await sendViolationAlertEmail(recipients, {
                            agentName: (await prisma.user.findUnique({ where: { id: s.userId } }))?.name || 'Unknown',
                            breakType: s.breakType?.name || 'Unknown',
                            sessionId: s.id
                        });
                    }
                }
            } catch (e) {
                console.error('Error in scheduled violation check:', e);
            } finally {
                sessionTimers.delete(session.id);
            }
        }, ms);

        sessionTimers.set(session.id, t);
    } catch (e) {
        console.error('Failed to schedule session:', e);
    }
};

const initScheduler = async () => {
    try {
        // Find all ongoing sessions with expectedEndTime in the future or past
        const sessions = await prisma.breakSession.findMany({
            where: { status: 'ONGOING' },
            include: { breakType: true }
        });

        sessions.forEach((s: any) => scheduleSession(s));
        console.log(`Scheduled ${sessions.length} ongoing sessions for violation checks.`);
    } catch (e) {
        console.error('Failed to init violation scheduler:', e);
    }
};

export { scheduleSession, initScheduler };
