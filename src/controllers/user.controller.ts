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
        let whereClause: any = { role: 'AGENT' };

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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
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

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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
