const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { createObjectCsvWriter } = require('csv-writer');
const csv = require('csv-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = 'uptime_log.csv';
const CONFIG_FILE = 'config.json';

// Initialize data files if not exist
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ urls: [] }, null, 2));
}

// Ensure CSV exists with headers
if (!fs.existsSync(DATA_FILE)) {
    const csvWriter = createObjectCsvWriter({
        path: DATA_FILE,
        header: [
            { id: 'timestamp', title: 'TIMESTAMP' },
            { id: 'date', title: 'DATE' },
            { id: 'url', title: 'URL' },
            { id: 'status', title: 'STATUS' }
        ]
    });
    csvWriter.writeRecords([]).then(() => console.log('CSV initialized'));
}

// Helper to write to CSV
const writeLog = async (data) => {
    // always append
    const csvWriter = createObjectCsvWriter({
        path: DATA_FILE,
        header: [
            { id: 'timestamp', title: 'TIMESTAMP' },
            { id: 'date', title: 'DATE' },
            { id: 'url', title: 'URL' },
            { id: 'status', title: 'STATUS' }
        ],
        append: true
    });
    await csvWriter.writeRecords(data);
};

// API: Get URLs
app.get('/api/urls', (req, res) => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    // Migrate manually on read if needed, or just return normalized list
    const normalizedUrls = config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '' };
        }
        return u;
    });
    res.json(normalizedUrls);
});

// API: Add URL
app.post('/api/urls', (req, res) => {
    const { url, name, usage } = req.body;
    if (!url) return res.status(400).send('URL required');

    // Validate simple URL
    try {
        new URL(url);
    } catch {
        return res.status(400).send('Invalid URL format');
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));

    // Check for duplicates. Config.urls can contain strings or objects.
    const exists = config.urls.some(u => {
        const existingUrl = typeof u === 'string' ? u : u.url;
        return existingUrl === url;
    });

    if (!exists) {
        config.urls.push({ url, name: name || '', usage: usage || '' });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    // Return normalized list
    const normalizedUrls = config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '' };
        }
        return u;
    });
    res.json(normalizedUrls);
});

// API: Remove URL
app.delete('/api/urls', (req, res) => {
    const { url } = req.body;
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));

    config.urls = config.urls.filter(u => {
        const existingUrl = typeof u === 'string' ? u : u.url;
        return existingUrl !== url;
    });

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    // Return normalized list
    const normalizedUrls = config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '' };
        }
        return u;
    });
    res.json(normalizedUrls);
});

// API: Edit URL
app.put('/api/urls', (req, res) => {
    const { url, name, usage } = req.body;
    if (!url) return res.status(400).send('URL required');

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));

    // Config.urls can contain strings or objects. 
    // We must find and update the object, or convert string to object.
    let found = false;
    config.urls = config.urls.map(u => {
        const currentUrl = typeof u === 'string' ? u : u.url;
        if (currentUrl === url) {
            found = true;
            return {
                url: currentUrl,
                name: name !== undefined ? name : (typeof u === 'object' ? u.name : ''),
                usage: usage !== undefined ? usage : (typeof u === 'object' ? u.usage : '')
            };
        }
        return u;
    });

    if (!found) return res.status(404).send('URL not found');

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    // Return normalized list
    const normalizedUrls = config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '' };
        }
        return u;
    });
    res.json(normalizedUrls);
});

// API: Check specific URL (called by frontend)
app.post('/api/check', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('URL required');

    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];

    try {
        await axios.get(url, { timeout: 5000 });
        // Success
        await writeLog([{ timestamp, date, url, status: 'UP' }]);
        res.json({ status: 'UP' });
    } catch (error) {
        // Fail
        await writeLog([{ timestamp, date, url, status: 'DOWN' }]);
        res.json({ status: 'DOWN' });
    }
});

// API: Get Stats (Consecutive Days Up, etc)
app.get('/api/stats', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) return res.json({});

    const results = [];
    fs.createReadStream(DATA_FILE)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            const stats = {};
            results.forEach(row => {
                if (!row.URL) return;
                if (!stats[row.URL]) stats[row.URL] = { days: new Set(), lastOnline: null };

                const date = row.DATE;
                const status = row.STATUS;

                if (status === 'UP') {
                    stats[row.URL].days.add(date);

                    // track max date
                    if (!stats[row.URL].lastOnline || date > stats[row.URL].lastOnline) {
                        stats[row.URL].lastOnline = date;
                    }
                }
            });

            const response = {};
            Object.keys(stats).forEach(url => {
                response[url] = {
                    daysUp: stats[url].days.size,
                    lastOnline: stats[url].lastOnline
                };
            });

            res.json(response);
        });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
