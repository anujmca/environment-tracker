const fs = require('fs');
const csv = require('csv-parser');

const results = [];
fs.createReadStream('uptime_log.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        console.log('First row keys:', Object.keys(results[0]));
        console.log('Sample row:', results[0]);
        console.log('Total rows:', results.length);

        // Check specific google row
        const googleRows = results.filter(r => r.URL && r.URL.includes('google'));
        console.log('Google rows count:', googleRows.length);
        if (googleRows.length > 0) {
            console.log('Sample Google row:', googleRows[googleRows.length - 1]);
            console.log('Status of last Google row:', googleRows[googleRows.length - 1].STATUS);
            console.log('Is UP?', googleRows[googleRows.length - 1].STATUS === 'UP');
        }
    });
