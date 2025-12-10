/**
 * Server Utility
 * Handles HTTP server for bot preview and uptime monitoring
 */

const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');

let startTime = Date.now();

/**
 * Format uptime in human-readable format
 */
function formatUptime() {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Create and start HTTP server
 */
function startServer(port = process.env.PORT || global.config.server?.port || 3400) {
    // Skip server if disabled in config
    if (global.config.server && global.config.server.enabled === false) {
        global.logger.system('HTTP server disabled in config');
        return null;
    }
    const server = http.createServer((req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle API endpoint for stats
        if (req.url === '/api/stats') {
            const stats = {
                uptime: formatUptime(),
                commands: global.client.commands.size,
                events: global.client.events.size
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(stats));
        }
        
        // Serve static files from public directory
        let filePath = path.join(__dirname, '../public', req.url === '/' ? 'index.html' : req.url);
        
        // Check if file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // If file doesn't exist, serve index.html
                filePath = path.join(__dirname, '../public/index.html');
            }
            
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading the file');
                    return;
                }
                
                // Determine content type based on file extension
                const ext = path.extname(filePath);
                let contentType = 'text/html';
                
                switch (ext) {
                    case '.js':
                        contentType = 'text/javascript';
                        break;
                    case '.css':
                        contentType = 'text/css';
                        break;
                    case '.json':
                        contentType = 'application/json';
                        break;
                    case '.png':
                        contentType = 'image/png';
                        break;
                    case '.jpg':
                    case '.jpeg':
                        contentType = 'image/jpeg';
                        break;
                }
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            });
        });
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const newPort = port + 1;
            global.logger.warn(`Port ${port} is in use, trying port ${newPort}`);
            console.log(`[SERVER] Port ${port} is busy, trying ${newPort}...`);
            return startServer(newPort);
        } else {
            global.logger.error('Server error:', err.message);
            console.error('[SERVER] Server error:', err.message);
        }
    });
    
    server.listen(port, () => {
        const serverUrl = `http://localhost:${port}`;
        global.logger.system(`HTTP server running at ${serverUrl}`);
        console.log(`[SERVER] HTTP server running at ${serverUrl}`);
        
        // Store server URL in global config
        global.config.serverUrl = serverUrl;
        
        // Check if running on Render.com
        if (process.env.RENDER_EXTERNAL_URL) {
            global.config.renderUrl = process.env.RENDER_EXTERNAL_URL;
            setupUptimeMonitoring(process.env.RENDER_EXTERNAL_URL);
        }
    });
    
    return server;
}

/**
 * Setup uptime monitoring for Render.com deployment
 */
async function setupUptimeMonitoring(url) {
    // Skip if uptime monitoring is disabled in config
    if (global.config.server && global.config.server.autoUptimeMonitoring === false) {
        global.logger.system('Automatic uptime monitoring disabled in config');
        return;
    }
    
    try {
        global.logger.system(`Setting up uptime monitoring for ${url}`);
        console.log(`[UPTIME] Registered URL for monitoring: ${url}`);
        
        // For Render.com: Keep the service alive by pinging it
        setInterval(async () => {
            try {
                await axios.get(url);
                global.logger.debug(`Pinged ${url} to keep alive`);
            } catch (error) {
                global.logger.error(`Failed to ping ${url}: ${error.message}`);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // For UptimeRobot: You could add API integration here
        // This is a placeholder for future implementation
        // Example: registerWithUptimeRobot(url, 'Facebook Messenger Bot');
    } catch (error) {
        global.logger.error(`Failed to setup uptime monitoring: ${error.message}`);
    }
}

module.exports = {
    startServer,
    formatUptime
};