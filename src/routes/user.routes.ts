import express, { Request, Response, NextFunction } from 'express';
import { createUser, getUsers, updateUser, deleteUser, resetPassword } from '../controllers/user.controller';
import { verifyToken, AuthRequest } from '../controllers/auth.controller';

const router = express.Router();

// Middleware for Read Access (View Dashboard, Users, etc.)
const hasReadAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (['MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(req.userRole || '')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied' });
    }
};

// Middleware for Write Access (Create/Edit/Delete Users)
const hasWriteAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Admin is Read-Only
    if (['MANAGER', 'SUPER_ADMIN'].includes(req.userRole || '')) {
        next();
    } else {
        res.status(403).json({ message: 'Access Denied: Read-only permissions' });
    }
};

router.use(verifyToken as express.RequestHandler);
router.use(hasReadAccess as express.RequestHandler);

router.post('/', hasWriteAccess as express.RequestHandler, createUser as express.RequestHandler);
router.get('/', getUsers as express.RequestHandler);
router.put('/:id', hasWriteAccess as express.RequestHandler, updateUser as express.RequestHandler);
router.put('/:id/reset-password', hasWriteAccess as express.RequestHandler, resetPassword as express.RequestHandler);
router.delete('/:id', hasWriteAccess as express.RequestHandler, deleteUser as express.RequestHandler);

export default router;
