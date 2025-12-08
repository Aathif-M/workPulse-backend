"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.deleteUser = exports.updateUser = exports.getUsers = exports.createUser = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const createUser = async (req, res) => {
    try {
        const { name, email, role, assignedBreaks } = req.body;
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const defaultPassword = 'meta@147';
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'AGENT',
                mustChangePassword: true,
                createdById: req.userId,
                allowedBreaks: assignedBreaks ? {
                    connect: assignedBreaks.map((id) => ({ id }))
                } : undefined,
            },
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createUser = createUser;
const getUsers = async (req, res) => {
    try {
        const { userRole } = req;
        let whereClause = { role: 'AGENT' };
        if (userRole === 'SUPER_ADMIN') {
            whereClause = {
                role: { in: ['AGENT', 'MANAGER'] }
            };
        }
        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                breakSessions: {
                    where: { status: 'ONGOING' },
                    include: { breakType: true }
                },
                createdBy: {
                    select: { name: true }
                },
                allowedBreaks: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, assignedBreaks } = req.body;
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                role,
                allowedBreaks: assignedBreaks ? {
                    set: assignedBreaks.map((id) => ({ id }))
                } : undefined
            },
        });
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'User deleted' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteUser = deleteUser;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const defaultPassword = 'meta@147';
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });
        res.json({ message: 'Password reset to default' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.resetPassword = resetPassword;
