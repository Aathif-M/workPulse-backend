import express, { Request, Response, NextFunction } from 'express';
import { createUser, getUsers, updateUser, deleteUser, resetPassword } from '../controllers/user.controller';
import { verifyToken, hasReadAccess, hasWriteAccess } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = express.Router();

router.use(verifyToken as express.RequestHandler);
router.use(hasReadAccess as express.RequestHandler);

router.post('/', hasWriteAccess as express.RequestHandler, createUser as express.RequestHandler);
router.get('/', getUsers as express.RequestHandler);
router.put('/:id', hasWriteAccess as express.RequestHandler, updateUser as express.RequestHandler);
router.put('/:id/reset-password', hasWriteAccess as express.RequestHandler, resetPassword as express.RequestHandler);
router.delete('/:id', hasWriteAccess as express.RequestHandler, deleteUser as express.RequestHandler);

export default router;
