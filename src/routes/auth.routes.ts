import express from 'express';
import { login, logout, updatePassword } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);

export default router;
