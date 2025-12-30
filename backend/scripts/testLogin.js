const axios = require('axios');

const testLogin = async () => {
    try {
        console.log('Testing Login with admin@aureole.com / Aureole@2025...');
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@aureole.com',
            password: 'Aureole@2025'
        });
        console.log('✅ Login Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.log('❌ Login Failed with status:', error.response.status);
            console.log('Response data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Error connecting to server:', error.message);
        }
    }
};

testLogin();
