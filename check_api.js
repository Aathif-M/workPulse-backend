async function checkApi() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'veloura5610@gmail.com',
                password: 'v123'
            })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${loginData.message}`);

        const token = loginData.token;
        console.log('Login successful. Token:', token.substring(0, 20) + '...');
        console.log('User Role:', loginData.user.role);

        console.log('Fetching Users...');
        const usersRes = await fetch('http://localhost:3000/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const usersData = await usersRes.json();

        console.log('Users found:', usersData.length);
        console.log('Users Data:', JSON.stringify(usersData, null, 2));

        console.log('Fetching Breaks...');
        const breaksRes = await fetch('http://localhost:3000/api/breaks/types', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const breaksData = await breaksRes.json();
        console.log('Breaks found:', breaksData.length);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkApi();
