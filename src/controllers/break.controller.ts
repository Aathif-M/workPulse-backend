import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.controller';
import { Server } from 'socket.io';
import { sendViolationEmail } from '../utils/email';
import { scheduleSession } from '../utils/violationScheduler';

const prisma = new PrismaClient();

// Break Types
export const createBreakType = async (req: Request, res: Response) => {
    try {
        const { name, duration } = req.body;
        const breakType = await prisma.breakType.create({
            data: { name, duration: parseInt(duration) },
        });
        res.status(201).json(breakType);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateBreakType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, duration } = req.body;

        const breakType = await prisma.breakType.findUnique({
            where: { id: parseInt(id) }
        });

        if (!breakType) {
            return res.status(404).json({ message: "Break type not found" });
        }

        const updated = await prisma.breakType.update({
            where: { id: parseInt(id) },
            data: {
                name: name ?? breakType.name,
                duration: duration ? parseInt(duration) : breakType.duration
            }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


export const getBreakTypes = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, userRole } = req;

        let whereClause: any = { isActive: true };

        // If user is AGENT, only show assigned breaks
        // If agent has NO specific assignments, show ALL active breaks (legacy behavior)
        if (userRole === 'AGENT') {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { allowedBreaks: true }
            });

            if (user?.allowedBreaks && user.allowedBreaks.length > 0) {
                whereClause.id = {
                    in: user.allowedBreaks.map((b: { id: number }) => b.id)
                };
            }
        }

        const breakTypes = await prisma.breakType.findMany({
            where: whereClause
        });
        res.json(breakTypes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Break Sessions
export const startBreak = async (req: AuthRequest, res: Response) => {
    try {
        const { breakTypeId } = req.body;
        const userId = req.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Check if user has ongoing break
        const ongoing = await prisma.breakSession.findFirst({
            where: { userId, status: 'ONGOING' }
        });

        if (ongoing) {
            return res.status(400).json({ message: 'You already have an ongoing break' });
        }

        const breakType = await prisma.breakType.findUnique({ where: { id: parseInt(breakTypeId) } });
        if (!breakType) return res.status(404).json({ message: 'Break type not found' });

        const startTime = new Date();
        const expectedEndTime = new Date(startTime.getTime() + breakType.duration * 1000);

        const session = await prisma.breakSession.create({
            data: {
                userId,
                breakTypeId: parseInt(breakTypeId),
                startTime,
                expectedEndTime,
                status: 'ONGOING'
            },
            include: { breakType: true }
        });

        // Schedule a check to alert managers at expected end time (if session still ongoing)
        try {
            scheduleSession(session);
        } catch (e) {
            console.error('Failed to schedule violation check for session:', e);
        }

        // Emit socket event
        const io: Server = req.app.get('io');
        if (io) {
            io.to('managers').emit('break_update', { type: 'START', session, userId });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const endBreak = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const session = await prisma.breakSession.findFirst({
            where: { userId, status: 'ONGOING' },
            include: { breakType: true }
        });

        if (!session) {
            return res.status(400).json({ message: 'No ongoing break found' });
        }

        const endTime = new Date();
        let violationDuration = 0;
        if (endTime > session.expectedEndTime) {
            violationDuration = Math.floor((endTime.getTime() - session.expectedEndTime.getTime()) / 1000);
        }

        const updatedSession = await prisma.breakSession.update({
            where: { id: session.id },
            data: {
                endTime,
                status: 'ENDED',
                violationDuration: violationDuration > 0 ? violationDuration : null
            }
        });

        // Emit socket event
        const io: Server = req.app.get('io');
        if (io) {
            io.to('managers').emit('break_update', { type: 'END', session: updatedSession, userId });
        }

        // Send email if violation
        if (violationDuration > 0) {
            try {
                // Fetch agent details
                const agent = await prisma.user.findUnique({
                    where: { id: userId }
                });

                // Fetch all Managers and Super Admins
                const managers = await prisma.user.findMany({
                    where: {
                        role: { in: ['MANAGER', 'SUPER_ADMIN'] }
                    },
                    select: { email: true }
                });

                const recipients = managers.map((manager: { email: string }) => manager.email);

                if (agent && recipients.length > 0) {
                    const actualDurationSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

                    await sendViolationEmail(recipients, {
                        agentName: agent.name,
                        breakType: session.breakType.name,
                        expectedDuration: Math.floor(session.breakType.duration / 60),
                        actualDuration: Math.floor(actualDurationSeconds / 60),
                        violationDuration: Math.floor(violationDuration / 60),
                        startTime: session.startTime,
                        endTime: endTime
                    });
                }
            } catch (emailError) {
                console.error('Failed to send violation email:', emailError);
            }
        }

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const history = await prisma.breakSession.findMany({
            where: { userId },
            include: { breakType: true },
            orderBy: { startTime: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllHistory = async (req: AuthRequest, res: Response) => {
    try {
        // TODO: Add filtering by date/agent
        const history = await prisma.breakSession.findMany({
            include: {
                breakType: true,
                user: { select: { name: true, email: true } }
            },
            orderBy: { startTime: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
