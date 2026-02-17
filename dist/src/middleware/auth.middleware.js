"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAgent = exports.hasWriteAccess = exports.hasReadAccess = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'No token provided' });
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({ message: 'Failed to authenticate token' });
        const payload = decoded;
        req.userId = payload.id;
        req.userRole = payload.role;
        next();
    });
};
exports.verifyToken = verifyToken;
// Middleware for Read Access (View Dashboard, Users, etc.)
const hasReadAccess = (req, res, next) => {
    if (['MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(req.userRole || '')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Access denied' });
    }
};
exports.hasReadAccess = hasReadAccess;
// Middleware for Write Access (Create/Edit/Delete Users)
const hasWriteAccess = (req, res, next) => {
    // Admin is Read-Only
    if (['MANAGER', 'SUPER_ADMIN'].includes(req.userRole || '')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Access Denied: Read-only permissions' });
    }
};
exports.hasWriteAccess = hasWriteAccess;
// Middleware to Check if Agent (Used for filtering breaks, etc.) - Optional helper
const isAgent = (req, res, next) => {
    if (req.userRole === 'AGENT') {
        next();
    }
    else {
        next(); // Not strictly enforcing ONLY agents here unless needed
    }
};
exports.isAgent = isAgent;
