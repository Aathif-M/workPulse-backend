import express, { Request, Response, NextFunction } from 'express';
import { createUser, getUsers, updateUser, deleteUser, resetPassword } from '../controllers/user.controller';
import { verifyToken, AuthRequest } from '../controllers/auth.controller';

const router = express.Router();

// Middleware to check if manager or admin
const isManagerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole === 'MANAGER' || req.userRole === 'SUPER_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied' });
    }
};

router.use(verifyToken as express.RequestHandler);
router.use(isManagerOrAdmin as express.RequestHandler);

router.post('/', createUser as express.RequestHandler);
router.get('/', getUsers as express.RequestHandler);
router.put('/:id', updateUser as express.RequestHandler);
router.put('/:id/reset-password', resetPassword as express.RequestHandler);
router.delete('/:id', deleteUser as express.RequestHandler);

export default router;
