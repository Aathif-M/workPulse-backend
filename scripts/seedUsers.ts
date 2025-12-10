
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
    { name: 'Super Admin', email: 'aathifm99@gmail.com', role: 'SUPER_ADMIN' },
    { name: 'Manager', email: 'manager@test.com', role: 'MANAGER' },
    { name: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
    { name: 'Agent', email: 'agent@test.com', role: 'AGENT' }
];

async function main() {
    console.log('Seeding users...');
    const password = await bcrypt.hash('meta@147', 10);

    for (const u of USERS) {
        try {
            const user = await prisma.user.upsert({
                where: { email: u.email },
                update: {
                    name: u.name,
                    role: u.role as any, // Cast to any to avoid TS issues if enum mismatch slightly
                },
                create: {
                    name: u.name,
                    email: u.email,
                    password: password,
                    role: u.role as any,
                    mustChangePassword: false // Convenience for testing
                }
            });
            console.log(`Created/Updated: ${u.email} (${u.role})`);
        } catch (e) {
            console.error(`Error creating ${u.email}:`, e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
