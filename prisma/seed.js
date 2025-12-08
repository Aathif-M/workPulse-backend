const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Create Super Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'aathifm19699@gmail.com' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'aathifm19699@gmail.com',
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
            data: bt,
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
