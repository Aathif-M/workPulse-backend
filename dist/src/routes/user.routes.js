"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
// Middleware for Read Access (View Dashboard, Users, etc.)
const hasReadAccess = (req, res, next) => {
    if (['MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(req.userRole || '')) {
        next();
    }
    else {
        res.status(403).json({ message: 'Access denied' });
    }
};
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
router.use(auth_controller_1.verifyToken);
router.use(hasReadAccess);
router.post('/', hasWriteAccess, user_controller_1.createUser);
router.get('/', user_controller_1.getUsers);
router.put('/:id', hasWriteAccess, user_controller_1.updateUser);
router.put('/:id/reset-password', hasWriteAccess, user_controller_1.resetPassword);
router.delete('/:id', hasWriteAccess, user_controller_1.deleteUser);
exports.default = router;
