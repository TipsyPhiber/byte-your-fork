const axios = require('axios');

async function test() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@admin.com',
      password: 'password'
    });
    console.log('Login successful', loginRes.data);
  } catch (err) {
    console.error('Login failed', err.response?.data || err.message);
  }
}
test();
