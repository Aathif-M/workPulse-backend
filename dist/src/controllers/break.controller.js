"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllHistory = exports.getHistory = exports.endBreak = exports.startBreak = exports.getBreakTypes = exports.deleteBreakType = exports.updateBreakType = exports.createBreakType = void 0;
const client_1 = require("@prisma/client");
const email_1 = require("../utils/email");
const violationScheduler_1 = require("../utils/violationScheduler");
const prisma = new client_1.PrismaClient();
// Break Types
const createBreakType = async (req, res) => {
    try {
        const { name, duration } = req.body;
        if (!name || !duration) {
            return res.status(400).json({ message: 'Name and duration are required' });
        }
        const durationInt = parseInt(duration);
        if (isNaN(durationInt) || durationInt <= 0) {
            return res.status(400).json({ message: 'Duration must be a positive number' });
        }
        const breakType = await prisma.breakType.create({
            data: { name, duration: durationInt },
        });
        res.status(201).json(breakType);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBreakType = createBreakType;
const updateBreakType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, duration } = req.body;
        const breakType = await prisma.breakType.findUnique({
            where: { id: parseInt(id) }
        });
        if (!breakType) {
            return res.status(404).json({ message: "Break type not found" });
        }
        let durationInt = breakType.duration;
        if (duration !== undefined) {
            const parsed = parseInt(duration);
            if (isNaN(parsed) || parsed <= 0) {
                return res.status(400).json({ message: 'Duration must be a positive number' });
            }
            durationInt = parsed;
        }
        const updated = await prisma.breakType.update({
            where: { id: parseInt(id) },
            data: {
                name: name ?? breakType.name,
                duration: durationInt
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateBreakType = updateBreakType;
const deleteBreakType = async (req, res) => {
    try {
        const { id } = req.params;
        const breakType = await prisma.breakType.findUnique({
            where: { id: parseInt(id) }
        });
        if (!breakType) {
            return res.status(404).json({ message: "Break type not found" });
        }
        // Soft delete by setting isActive to false
        const deleted = await prisma.breakType.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.json({ message: "Break type deleted successfully", breakType: deleted });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteBreakType = deleteBreakType;
const getBreakTypes = async (req, res) => {
    try {
        const { userId, userRole } = req;
        let whereClause = { isActive: true };
        // If user is AGENT, only show assigned breaks
        // If agent has NO specific assignments, show ALL active breaks (legacy behavior)
        if (userRole === 'AGENT') {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { allowedBreaks: true }
            });
            if (user?.allowedBreaks && user.allowedBreaks.length > 0) {
                whereClause.id = {
                    in: user.allowedBreaks.map((b) => b.id)
                };
            }
        }
        const breakTypes = await prisma.breakType.findMany({
            where: whereClause
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
        // Schedule a check to alert managers at expected end time (if session still ongoing)
        try {
            (0, violationScheduler_1.scheduleSession)(session);
        }
        catch (e) {
            console.error('Failed to schedule violation check for session:', e);
        }
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
                const recipients = managers.map((manager) => manager.email);
                if (agent && recipients.length > 0) {
                    const actualDurationSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
                    await (0, email_1.sendViolationEmail)(recipients, {
                        agentName: agent.name,
                        breakType: session.breakType.name,
                        expectedDuration: Math.floor(session.breakType.duration / 60),
                        actualDuration: Math.floor(actualDurationSeconds / 60),
                        violationDuration: Math.floor(violationDuration / 60),
                        startTime: session.startTime,
                        endTime: endTime
                    });
                }
            }
            catch (emailError) {
                console.error('Failed to send violation email:', emailError);
            }
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
