
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'test_agent@example.com';
    const hashedPassword = await bcrypt.hash('meta@147', 10);

    // Get a break type to assign
    const breakType = await prisma.breakType.findFirst();

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            name: 'Test Agent',
            email,
            password: hashedPassword,
            role: 'AGENT',
            allowedBreaks: breakType ? {
                connect: [{ id: breakType.id }]
            } : undefined
        } as any // bypass type check for quick script usage or strict input type mismatch
    });

    console.log('Created User:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
