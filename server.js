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

// Helper to normalize URLs
const getNormalizedUrls = (config) => {
    return config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '', interval: 10 };
        }
        return { ...u, interval: u.interval || 10 };
    });
};

// API: Get URLs
app.get('/api/urls', (req, res) => {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    res.json(getNormalizedUrls(config));
});

// API: Add URL
app.post('/api/urls', async (req, res) => {
    const { url, name, usage, interval } = req.body;
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
        config.urls.push({
            url,
            name: name || '',
            usage: usage || '',
            interval: interval ? parseInt(interval) : 10
        });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

        // Trigger immediate check in background so it doesn't stay "Checking..."
        await checkUrl(url);
    }

    res.json(getNormalizedUrls(config));
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

    res.json(getNormalizedUrls(config));
});

// API: Edit URL
app.put('/api/urls', (req, res) => {
    const { url, name, usage, interval } = req.body;
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
                usage: usage !== undefined ? usage : (typeof u === 'object' ? u.usage : ''),
                interval: interval ? parseInt(interval) : (typeof u === 'object' && u.interval ? u.interval : 10)
            };
        }
        return u;
    });

    if (!found) return res.status(404).send('URL not found');

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    res.json(getNormalizedUrls(config));
});

// API: Bulk update intervals
app.put('/api/urls/intervals/all', (req, res) => {
    const { interval } = req.body;
    if (!interval) return res.status(400).send('Interval required');

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    const newInterval = parseInt(interval);

    config.urls = config.urls.map(u => {
        if (typeof u === 'string') {
            return { url: u, name: '', usage: '', interval: newInterval };
        }
        return { ...u, interval: newInterval };
    });

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

    res.json(getNormalizedUrls(config));
});

// In-memory store for latest status and check times
const lastCheckResults = {};
const lastCheckTimes = {};

// Helper: Check single URL
const checkUrl = async (url) => {
    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];
    let status = 'DOWN';

    try {
        await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        status = 'UP';
    } catch (error) {
        status = 'DOWN';
    }

    // Log to CSV
    await writeLog([{ timestamp, date, url, status }]);

    // Update memory
    lastCheckResults[url] = status;
    lastCheckTimes[url] = Date.now();
    return status;
};

// Start background job
const checkAllUrls = async () => {
    if (!fs.existsSync(CONFIG_FILE)) return;

    const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
    const normalized = getNormalizedUrls(config);

    const now = Date.now();
    for (const item of normalized) {
        const url = item.url;
        const intervalMs = item.interval * 60 * 1000;
        const lastCheck = lastCheckTimes[url] || 0;

        if (now - lastCheck >= intervalMs) {
            await checkUrl(url);
        }
    }
};

// Schedule: Run every 1 minute (60000 ms)
setInterval(checkAllUrls, 60000);

// Run once on startup after short delay
setTimeout(checkAllUrls, 5000);


// API: Get Current Status (from memory)
app.get('/api/status', (req, res) => {
    res.json(lastCheckResults);
});

// API: Manual Check (Optional, forces a check now)
app.post('/api/check', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('URL required');

    const status = await checkUrl(url);
    res.json({ status });
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
                // Initialize stats object for URL if not exists
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

// API: Get History (Blocks of continuity)
app.get('/api/history', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL required');

    if (!fs.existsSync(DATA_FILE)) return res.json([]);

    const results = [];
    fs.createReadStream(DATA_FILE)
        .pipe(csv())
        .on('data', (data) => {
            if (data.URL === url) {
                results.push(data);
            }
        })
        .on('end', () => {
            // Sort by timestamp just in case (though log is append-only)
            results.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

            const history = [];
            let currentBlock = null;

            results.forEach((row) => {
                const timestamp = row.TIMESTAMP;
                const status = row.STATUS;

                if (!currentBlock) {
                    currentBlock = { status, start: timestamp, end: timestamp };
                } else if (currentBlock.status !== status) {
                    // Status changed, push old block and start new
                    history.push(currentBlock);
                    currentBlock = { status, start: timestamp, end: timestamp };
                } else {
                    // Same status, extend end time
                    currentBlock.end = timestamp;
                }
            });

            if (currentBlock) {
                history.push(currentBlock);
            }

            // Reverse to show latest first
            res.json(history.reverse());
        });
});

// API: Get Raw Logs
app.get('/api/logs', (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL required');

    if (!fs.existsSync(DATA_FILE)) return res.json([]);

    const results = [];
    fs.createReadStream(DATA_FILE)
        .pipe(csv())
        .on('data', (data) => {
            if (data.URL === url) {
                results.push(data);
            }
        })
        .on('end', () => {
            results.sort((a, b) => new Date(b.TIMESTAMP) - new Date(a.TIMESTAMP));
            res.json(results);
        });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
