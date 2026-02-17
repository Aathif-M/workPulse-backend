
import { Request } from 'express';

// Extend Request to include userId (from token)
export interface AuthRequest extends Request {
    userId?: number;
    userRole?: string;
}
