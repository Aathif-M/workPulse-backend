import express from 'express';
import { login, verifyToken, logout } from '../controllers/auth.controller';
import { updatePassword } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);

export default router;
