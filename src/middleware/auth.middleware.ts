
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
        const payload = decoded as { id: number; role: string };
        req.userId = payload.id;
        req.userRole = payload.role;
        next();
    });
};

// Middleware for Read Access (View Dashboard, Users, etc.)
export const hasReadAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (['MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(req.userRole || '')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied' });
    }
};

// Middleware for Write Access (Create/Edit/Delete Users)
export const hasWriteAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Admin is Read-Only
    if (['MANAGER', 'SUPER_ADMIN'].includes(req.userRole || '')) {
        next();
    } else {
        res.status(403).json({ message: 'Access Denied: Read-only permissions' });
    }
};

// Middleware to Check if Agent (Used for filtering breaks, etc.) - Optional helper
export const isAgent = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole === 'AGENT') {
        next();
    } else {
        next(); // Not strictly enforcing ONLY agents here unless needed
    }
};
