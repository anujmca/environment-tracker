const axios = require('axios');

const url = "https://www.natwestgroup.com/";

async function test() {
    console.log(`Testing ${url}...`);
    try {
        const res = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log('Status:', res.status);
        console.log('Headers:', res.headers);
    } catch (e) {
        console.error('Error Code:', e.code);
        console.error('Error Message:', e.message);
        if (e.response) {
            console.log('Response Status:', e.response.status);
            console.log('Response Data:', e.response.data);
        }
    }
}

test();
