"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
// Middleware to check if manager or admin
const isManagerOrAdmin = (req, res, next) => {
    if (req.userRole === 'MANAGER' || req.userRole === 'SUPER_ADMIN') {
        next();
    }
    else {
        res.status(403).json({ message: 'Access denied' });
    }
};
router.use(auth_controller_1.verifyToken);
router.use(isManagerOrAdmin);
router.post('/', user_controller_1.createUser);
router.get('/', user_controller_1.getUsers);
router.put('/:id', user_controller_1.updateUser);
router.put('/:id/reset-password', user_controller_1.resetPassword);
router.delete('/:id', user_controller_1.deleteUser);
exports.default = router;
