// npx ts-node backend/scripts/createUser.ts - to run script
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Configuration for the new user
const USER_CONFIG = {
    name: 'New User',
    email: 'newuser@example.com',
    password: 'meta@147',
    role: 'AGENT', // 'AGENT', 'MANAGER', 'SUPER_ADMIN'
    breakTypeIds: [] as number[], // Array of break IDs to assign (e.g., [1, 2])
    // If empty and role is AGENT, they might get all breaks depending on logic, or none.
    // Our strict logic says: if alignedBreaks is empty, they have access to NONE (if we strictly follow the new logic)
    // OR ALL (if we follow legacy fallback). 
    // Best to specify IDs if you want specific ones.
};

async function main() {
    console.log(`Creating user: ${USER_CONFIG.email}...`);

    const hashedPassword = await bcrypt.hash(USER_CONFIG.password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email: USER_CONFIG.email },
            update: {
                name: USER_CONFIG.name,
                role: USER_CONFIG.role as any,
                allowedBreaks: USER_CONFIG.breakTypeIds.length > 0 ? {
                    set: USER_CONFIG.breakTypeIds.map(id => ({ id }))
                } : undefined
            },
            create: {
                name: USER_CONFIG.name,
                email: USER_CONFIG.email,
                password: hashedPassword,
                role: USER_CONFIG.role as any,
                allowedBreaks: USER_CONFIG.breakTypeIds.length > 0 ? {
                    connect: USER_CONFIG.breakTypeIds.map(id => ({ id }))
                } : undefined,
                mustChangePassword: true
            }
        });

        console.log('User created/updated successfully:');
        console.log(user);

    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
