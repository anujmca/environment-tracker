# Environment Tracker

A simple uptime monitor that tracks the availability of a list of URLs and maintains a daily uptime log in a CSV file.

## Features
- **Configurable URLs**: Add or remove URLs via the web interface.
- **Uptime Tracking**: Checks URL status (UP/DOWN).
- **History**: Logs every check to `uptime_log.csv`.
- **Stats**: distinct days uptime counter.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   (or `node server.js`)

3. Open your browser to:
   [http://localhost:3000](http://localhost:3000)

## Usage
- Keep the page open to ensure continuous monitoring (checks every 10 minutes).
- The logs are stored in `uptime_log.csv` in the project root.
