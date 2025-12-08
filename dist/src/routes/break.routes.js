"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const break_controller_1 = require("../controllers/break.controller");
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
router.use(auth_controller_1.verifyToken);
// Break Types
router.post('/types', break_controller_1.createBreakType);
router.put('/types/:id', break_controller_1.updateBreakType);
router.get('/types', break_controller_1.getBreakTypes);
// Sessions
router.post('/start', break_controller_1.startBreak);
router.post('/end', break_controller_1.endBreak);
router.get('/history', break_controller_1.getHistory);
router.get('/history/all', break_controller_1.getAllHistory);
exports.default = router;
