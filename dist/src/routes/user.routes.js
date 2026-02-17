"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.verifyToken);
router.use(auth_middleware_1.hasReadAccess);
router.post('/', auth_middleware_1.hasWriteAccess, user_controller_1.createUser);
router.get('/', user_controller_1.getUsers);
router.put('/:id', auth_middleware_1.hasWriteAccess, user_controller_1.updateUser);
router.put('/:id/reset-password', auth_middleware_1.hasWriteAccess, user_controller_1.resetPassword);
router.delete('/:id', auth_middleware_1.hasWriteAccess, user_controller_1.deleteUser);
exports.default = router;
