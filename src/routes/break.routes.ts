import express from 'express';
import { createBreakType, updateBreakType, deleteBreakType, getBreakTypes, startBreak, endBreak, getHistory, getAllHistory } from '../controllers/break.controller';
import { verifyToken } from '../controllers/auth.controller';

const router = express.Router();

router.use(verifyToken as express.RequestHandler);

// Break Types
router.post('/types', createBreakType as express.RequestHandler);
router.put('/types/:id', updateBreakType as express.RequestHandler);
router.delete('/types/:id', deleteBreakType as express.RequestHandler);
router.get('/types', getBreakTypes as express.RequestHandler);

// Sessions
router.post('/start', startBreak as express.RequestHandler);
router.post('/end', endBreak as express.RequestHandler);
router.get('/history', getHistory as express.RequestHandler);
router.get('/history/all', getAllHistory as express.RequestHandler);

export default router;
