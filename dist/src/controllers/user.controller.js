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
        // Permission Check: Only Super Admin can create Admins
        if (role === client_1.Role.ADMIN && req.userRole !== client_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Only Super Admins can create Admins' });
        }
        // Permission Check: Managers cannot create Super Admins (obviously) or Admins
        if (role === client_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ message: 'Cannot create Super Admin' });
        }
        const defaultPassword = 'meta@147';
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || client_1.Role.AGENT,
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
        // VISIBILITY RULES
        // 1. Agents see NO ONE.
        if (userRole === client_1.Role.AGENT) {
            return res.json([]);
        }
        let whereClause = {
            id: { not: req.userId }
        };
        // 2. Managers & Admins see: Agents, Managers, Admins (Everything EXCEPT Super Admin)
        if (userRole === client_1.Role.MANAGER || userRole === client_1.Role.ADMIN) {
            whereClause.role = { in: [client_1.Role.AGENT, client_1.Role.MANAGER, client_1.Role.ADMIN] };
        }
        // 3. Super Admin sees EVERYONE (But NOT other Super Admins [security choice], and NOT themselves)
        if (userRole === client_1.Role.SUPER_ADMIN) {
            whereClause.role = { not: client_1.Role.SUPER_ADMIN };
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
        const requestingRole = req.userRole;
        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser)
            return res.status(404).json({ message: "User not found" });
        // PROTECT HIGH-LEVEL ROLES
        // If target is ADMIN or SUPER_ADMIN, only SUPER_ADMIN can edit
        if ((targetUser.role === client_1.Role.ADMIN || targetUser.role === client_1.Role.SUPER_ADMIN) && requestingRole !== client_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ message: "Access Denied: Cannot modify this user" });
        }
        // Prevent Manager from promoting someone to Admin/SuperAdmin
        if ((role === client_1.Role.ADMIN || role === client_1.Role.SUPER_ADMIN) && requestingRole !== client_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ message: "Access Denied: Cannot assign this role" });
        }
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
        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser)
            return res.status(404).json({ message: "User not found" });
        // PROTECT HIGH-LEVEL ROLES
        if ((targetUser.role === client_1.Role.ADMIN || targetUser.role === client_1.Role.SUPER_ADMIN) && req.userRole !== client_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ message: "Access Denied: Cannot delete this user" });
        }
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
        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser)
            return res.status(404).json({ message: "User not found" });
        // PROTECT HIGH-LEVEL ROLES
        if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') && req.userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: "Access Denied: Cannot reset password for this user" });
        }
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
