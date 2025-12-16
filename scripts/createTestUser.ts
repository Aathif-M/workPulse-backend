
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
    try {
        const email = `test.agent.${Date.now()}@workpulse.us`;
        const password = 'Password@123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: 'Test Agent',
                email,
                password: hashedPassword,
                role: 'AGENT',
                isOnline: false
            }
        });

        console.log(`Created User: ${user.email}`);
        console.log(`Password: ${password}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
