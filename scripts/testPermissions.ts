

const API_URL = 'http://localhost:3000';

async function login(email: string) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'meta@147' })
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data.message);
        return data.token;
    } catch (e: any) {
        console.error(`Login failed for ${email}:`, e.message);
        return null;
    }
}

async function api(method: string, endpoint: string, token: string, body?: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({})) as any;
    return { status: res.status, data };
}

async function testPermissions() {
    console.log('--- TESTING PERMISSIONS ---');

    console.log('1. Logging in as ADMIN...');
    const adminToken = await login('admin@test.com');
    if (!adminToken) return;

    console.log('2. [ADMIN] Attempting to GET /users...');
    const res1 = await api('GET', '/users', adminToken);
    if (res1.status === 200) console.log('   ✅ Success (Expected): Got users');
    else console.error('   ❌ Failed (Unexpected):', res1.status);

    console.log('3. [ADMIN] Attempting to CREATE user...');
    const res2 = await api('POST', '/users', adminToken, { name: 'Hack', email: 'hack@test.com', role: 'AGENT' });
    if (res2.status === 403) console.log('   ✅ Failed (Expected): 403 Access Denied');
    else console.error('   ❌ Failed (Unexpected Status):', res2.status);

    console.log('4. Logging in as MANAGER...');
    const managerToken = await login('manager@test.com');
    if (!managerToken) return;

    console.log('5. [MANAGER] Attempting to CREATE Agent...');
    const res3 = await api('POST', '/users', managerToken, { name: 'New Agent', email: 'newagent@test.com', role: 'AGENT' });
    if (res3.status === 201) console.log('   ✅ Success (Expected): Created Agent');
    else console.error('   ❌ Failed (Unexpected):', res3.status, res3.data);

    console.log('6. [MANAGER] Attempting to CREATE NEW ADMIN...');
    const res4 = await api('POST', '/users', managerToken, { name: 'Rogue Admin', email: 'rogue@test.com', role: 'ADMIN' });
    if (res4.status === 403) console.log('   ✅ Failed (Expected): 403 Only Super Admin can create Admins');
    else console.error('   ❌ Failed (Unexpected Status):', res4.status, res4.data);

    console.log('--- TEST COMPLETE ---');
}

testPermissions();

