"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = 'Asia/Kolkata';
console.log('Server time:', new Date().toString());
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const break_routes_1 = __importDefault(require("./routes/break.routes"));
const violationScheduler_1 = require("./utils/violationScheduler");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://workpulse.us", // Allow all for now, restrict in production
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
});
// Make io available in routes
app.set('io', io);
// CORS configuration
app.use((0, cors_1.default)({
    origin: ['https://workpulse.us', 'https://www.workpulse.us', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express_1.default.json());
app.use(['/api/auth', '/auth'], auth_routes_1.default);
app.use(['/api/users', '/users'], user_routes_1.default);
app.use(['/api/breaks', '/breaks'], break_routes_1.default);
// Basic route
app.get('/', (req, res) => {
    res.send('WorkPulse API is running');
});
// Socket.IO connection
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);
    const userId = socket.handshake.query.userId;
    if (userId) {
        try {
            await prisma.user.update({
                where: { id: Number(userId) },
                data: { isOnline: true }
            });
            io.emit('break_update'); // Notify others
        }
        catch (e) {
            console.error("Error updating user online status:", e);
        }
    }
    socket.on('join_manager', () => {
        socket.join('managers');
        console.log(`User ${socket.id} joined managers room`);
    });
    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        if (userId) {
            try {
                await prisma.user.update({
                    where: { id: Number(userId) },
                    data: { isOnline: false }
                });
                io.emit('break_update'); // Notify others
            }
            catch (e) {
                console.error("Error updating user offline status:", e);
            }
        }
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initialize violation scheduler for ongoing sessions
    (0, violationScheduler_1.initScheduler)().catch(e => console.error('Violation scheduler init failed:', e));
});
