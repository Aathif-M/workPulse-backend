import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from './auth.controller';

const prisma = new PrismaClient();

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, role, assignedBreaks } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Permission Check: Only Super Admin can create Admins
        if (role === 'ADMIN' && req.userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Only Super Admins can create Admins' });
        }

        // Permission Check: Managers cannot create Super Admins (obviously) or Admins
        if (role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot create Super Admin' });
        }

        const defaultPassword = 'meta@147';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'AGENT',
                mustChangePassword: true,
                createdById: req.userId,
                allowedBreaks: assignedBreaks ? {
                    connect: assignedBreaks.map((id: number) => ({ id }))
                } : undefined,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { userRole } = req;

        // VISIBILITY RULES
        // 1. Agents see NO ONE.
        if (userRole === 'AGENT') {
            return res.json([]);
        }

        let whereClause: any = {};

        // 2. Managers & Admins see: Agents, Managers, Admins (Everything EXCEPT Super Admin)
        if (userRole === 'MANAGER' || userRole === 'ADMIN') {
            whereClause = {
                role: { in: ['AGENT', 'MANAGER', 'ADMIN'] }
            };
        }

        // 3. Super Admin sees EVERYONE (No filter needed, sees Super Admins too)

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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, role, assignedBreaks } = req.body;
        const requestingRole = req.userRole;

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // PROTECT HIGH-LEVEL ROLES
        // If target is ADMIN or SUPER_ADMIN, only SUPER_ADMIN can edit
        if (((targetUser.role as any) === 'ADMIN' || (targetUser.role as any) === 'SUPER_ADMIN') && requestingRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: "Access Denied: Cannot modify this user" });
        }

        // Prevent Manager from promoting someone to Admin/SuperAdmin
        if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && requestingRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: "Access Denied: Cannot assign this role" });
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                role,
                allowedBreaks: assignedBreaks ? {
                    set: assignedBreaks.map((id: number) => ({ id }))
                } : undefined
            },
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // PROTECT HIGH-LEVEL ROLES
        if (((targetUser.role as any) === 'ADMIN' || (targetUser.role as any) === 'SUPER_ADMIN') && req.userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: "Access Denied: Cannot delete this user" });
        }

        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // PROTECT HIGH-LEVEL ROLES
        if (((targetUser.role as any) === 'ADMIN' || (targetUser.role as any) === 'SUPER_ADMIN') && req.userRole !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: "Access Denied: Cannot reset password for this user" });
        }

        const defaultPassword = 'meta@147';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
                mustChangePassword: true
            }
        });

        res.json({ message: 'Password reset to default' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
