"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReports = exports.getAllHistory = exports.getHistory = exports.endBreak = exports.startBreak = exports.getBreakTypes = exports.createBreakType = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Break Types
const createBreakType = async (req, res) => {
    try {
        const { name, duration } = req.body;
        const breakType = await prisma.breakType.create({
            data: { name, duration: parseInt(duration) },
        });
        res.status(201).json(breakType);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBreakType = createBreakType;
const getBreakTypes = async (req, res) => {
    try {
        const breakTypes = await prisma.breakType.findMany({
            where: { isActive: true }
        });
        res.json(breakTypes);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBreakTypes = getBreakTypes;
// Break Sessions
const startBreak = async (req, res) => {
    try {
        const { breakTypeId } = req.body;
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Check if user has ongoing break
        const ongoing = await prisma.breakSession.findFirst({
            where: { userId, status: 'ONGOING' }
        });
        if (ongoing) {
            return res.status(400).json({ message: 'You already have an ongoing break' });
        }
        const breakType = await prisma.breakType.findUnique({ where: { id: parseInt(breakTypeId) } });
        if (!breakType)
            return res.status(404).json({ message: 'Break type not found' });
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
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to('managers').emit('break_update', { type: 'START', session, userId });
        }
        res.json(session);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.startBreak = startBreak;
const endBreak = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
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
        const io = req.app.get('io');
        if (io) {
            io.to('managers').emit('break_update', { type: 'END', session: updatedSession, userId });
        }
        // Send email if violation
        if (violationDuration > 0) {
            // TODO: Implement email sending
            console.log('Sending violation email...');
        }
        res.json(updatedSession);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.endBreak = endBreak;
const getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const history = await prisma.breakSession.findMany({
            where: { userId },
            include: { breakType: true },
            orderBy: { startTime: 'desc' }
        });
        res.json(history);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getHistory = getHistory;
const getAllHistory = async (req, res) => {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllHistory = getAllHistory;
const getReports = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.startTime = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        if (userId) {
            where.userId = parseInt(userId);
        }
        const sessions = await prisma.breakSession.findMany({
            where,
            include: {
                user: true,
                breakType: true,
            },
            orderBy: {
                startTime: 'desc',
            },
        });
        res.json(sessions);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getReports = getReports;
