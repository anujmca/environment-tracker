const axios = require('axios');

async function check() {
    try {
        const res = await axios.get('http://localhost:3000/api/status');
        console.log('Status:', res.status);
        console.log('Data:', res.data);
    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response data:', e.response.data);
        }
    }
}

check();
