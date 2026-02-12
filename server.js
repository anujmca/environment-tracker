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
    res.json(config.urls);
});

// API: Add URL
app.post('/api/urls', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('URL required');

    // Validate simple URL
    try {
        new URL(url);
    } catch {
        return res.status(400).send('Invalid URL format');
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    if (!config.urls.includes(url)) {
        config.urls.push(url);
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
    res.json(config.urls);
});

// API: Remove URL
app.delete('/api/urls', (req, res) => {
    const { url } = req.body;
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    config.urls = config.urls.filter(u => u !== url);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    res.json(config.urls);
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
                if (!stats[row.URL]) stats[row.URL] = { days: new Set() };

                const date = row.DATE;
                const status = row.STATUS;

                if (status === 'UP') {
                    stats[row.URL].days.add(date);
                }
            });

            const response = {};
            Object.keys(stats).forEach(url => {
                response[url] = {
                    daysUp: stats[url].days.size
                };
            });

            res.json(response);
        });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
