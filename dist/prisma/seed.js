"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Create Super Admin
    const hashedPassword = await bcryptjs_1.default.hash('v123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'veloura5610@gmail.com' },
        update: {},
        create: {
            name: 'Veloura',
            email: 'veloura5610@gmail.com',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
        },
    });
    console.log({ admin });
    // Create Break Types
    const breakTypes = [
        { name: 'Tea Break', duration: 600 }, // 10 mins
        { name: 'Lunch Break', duration: 3600 }, // 60 mins
        { name: 'Prayer Break', duration: 900 }, // 15 mins
        { name: 'Chill Break', duration: 300 }, // 5 mins
    ];
    for (const bt of breakTypes) {
        await prisma.breakType.create({
            data: {
                name: bt.name,
                duration: bt.duration,
                isActive: true
            },
        });
    }
    console.log('Break types seeded');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
