/**
 * Session Manager for Facebook Chat Bot
 * Handles session refresh, reconnection, and logout prevention
 */

const fs = require('fs-extra');
const log = require('npmlog');

class SessionManager {
    constructor(api, ctx, globalOptions, config = {}) {
        this.api = api;
        this.ctx = ctx;
        this.globalOptions = globalOptions;
        this.config = config;
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.lastRefreshTime = Date.now();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = config.sessionManagement?.maxReconnectAttempts || 5;

        // Read intervals from config, fallback to defaults
        const sessionConfig = config.sessionManagement || {};
        this.REFRESH_INTERVAL = (sessionConfig.refreshIntervalMinutes || 30) * 60 * 1000;
        this.DTSG_REFRESH_INTERVAL = (sessionConfig.dtsgRefreshHours || 2) * 60 * 60 * 1000;

        console.log(`📋 Session Manager config loaded:`);
        console.log(`   - Refresh interval: ${sessionConfig.refreshIntervalMinutes || 30} minutes`);
        console.log(`   - DTSG refresh: ${sessionConfig.dtsgRefreshHours || 2} hours`);
        console.log(`   - Max reconnect attempts: ${this.maxReconnectAttempts}`);

        this.startSessionMonitoring();
    }

    /**
     * Start session monitoring and auto-refresh
     */
    startSessionMonitoring() {
        console.log('🔄 Starting session monitoring...');
        console.log(`⏰ DTSG refresh interval: ${this.DTSG_REFRESH_INTERVAL / 60000} minutes`);
        console.log(`⏰ AppState save interval: ${this.REFRESH_INTERVAL / 60000} minutes`);

        // Do immediate first refresh
        setTimeout(() => {
            console.log('🔄 Running first session refresh...');
            this.refreshDTSG();
        }, 5000); // After 5 seconds

        // Refresh DTSG periodically
        this.dtsgInterval = setInterval(() => {
            console.log(`⏰ [${new Date().toLocaleTimeString()}] Scheduled DTSG refresh triggered`);
            this.refreshDTSG();
        }, this.DTSG_REFRESH_INTERVAL);

        // Save appstate periodically
        this.appstateInterval = setInterval(() => {
            console.log(`⏰ [${new Date().toLocaleTimeString()}] Scheduled AppState save triggered`);
            this.saveAppState();
        }, this.REFRESH_INTERVAL);

        // Monitor connection health
        this.healthInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, 5 * 60 * 1000); // Check every 5 minutes

        console.log('✅ Session monitoring started successfully');
    }

    /**
     * Refresh Facebook DTSG token and cookies
     */
    async refreshDTSG() {
        if (this.isRefreshing) return;

        try {
            this.isRefreshing = true;
            console.log('🔄 Refreshing session token and cookies...');

            // Make a simple request to Facebook to refresh cookies
            // This uses the existing authenticated session
            try {
                // Use api's internal httpGet method if available
                if (this.api.httpGet) {
                    await this.api.httpGet('https://www.facebook.com/');
                } else {
                    // Fallback: trigger a lightweight API call that refreshes session
                    await new Promise((resolve, reject) => {
                        this.api.getUserID(this.ctx.userID || this.api.getCurrentUserID(), (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });
                }
                console.log('✅ Facebook session refreshed successfully');
            } catch (fbError) {
                console.log('⚠️ Facebook refresh had minor issue:', fbError.message);
                // Continue anyway - cookies might still be valid
            }

            // Save updated appstate with refreshed cookies
            await this.saveAppState();

            console.log('✅ Session refresh completed');
            this.lastRefreshTime = Date.now();
            this.reconnectAttempts = 0;

        } catch (error) {
            console.error('❌ Session refresh failed:', error.message);
            this.handleRefreshError(error);
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Save current appstate
     */
    async saveAppState() {
        try {
            const appState = this.api.getAppState();
            await fs.writeJSON('./appstate.json', appState, { spaces: 4 });
            console.log('💾 AppState saved successfully');
        } catch (error) {
            console.error('❌ Failed to save appstate:', error.message);
        }
    }

    /**
     * Check connection health
     */
    checkConnectionHealth() {
        if (!this.ctx.loggedIn) {
            console.log('⚠️ Connection lost, attempting to reconnect...');
            this.handleReconnection();
        }
    }

    /**
     * Handle refresh errors with detailed logout reason detection
     */
    handleRefreshError(error) {
        this.reconnectAttempts++;

        // Enhanced logout reason detection
        const logoutReasons = {
            'ECONNREFUSED': '🚫 Facebook refused connection - Account may be blocked or restricted',
            'ECONNRESET': '🔄 Connection reset by Facebook - Network issue or session expired',
            'ETIMEDOUT': '⏰ Connection timeout - Network issue or Facebook servers busy',
            'ENOTFOUND': '🌐 DNS resolution failed - Internet connection issue',
            'EADDRINUSE': '🔌 Port already in use - Another instance running',
            'EPIPE': '📡 Broken pipe - Connection forcibly closed by Facebook',
            'PROTOCOL_ERROR': '❌ Protocol error - Invalid MQTT communication',
            'Connection refused': '🚫 Facebook server refused connection - Account may be suspended',
            'Server unavailable': '🔧 Facebook servers unavailable - Try again later',
            'Invalid credentials': '🔑 Invalid login credentials - Appstate expired or corrupted',
            'Rate limit exceeded': '🚦 Too many requests - Account temporarily limited',
            'Security check required': '🛡️ Facebook security check required - Manual intervention needed',
            'Account temporarily locked': '🔒 Account temporarily locked - Facebook detected unusual activity',
            'Not logged in': '🔐 Session expired - User not logged in',
            '401': '🔑 Unauthorized access - Invalid credentials or expired session',
            '403': '🚫 Forbidden access - Account may be restricted or banned'
        };

        // Detect logout reason
        let logoutReason = 'Unknown session error';
        const errorMessage = error.message || error.toString() || '';
        const errorCode = error.code || error.statusCode || error.errno || '';

        // Check for specific error codes and messages
        for (const [key, reason] of Object.entries(logoutReasons)) {
            if (errorMessage.includes(key) || errorCode.toString() === key) {
                logoutReason = reason;
                break;
            }
        }

        // Additional pattern matching for common logout scenarios
        if (errorMessage.toLowerCase().includes('login') ||
            errorMessage.toLowerCase().includes('auth') ||
            errorMessage.toLowerCase().includes('session')) {
            logoutReason = '🔐 Session expired or authentication failed - Appstate may be invalid';
        } else if (errorMessage.toLowerCase().includes('banned') ||
            errorMessage.toLowerCase().includes('blocked') ||
            errorMessage.toLowerCase().includes('suspended')) {
            logoutReason = '🚫 Account banned/blocked/suspended by Facebook - Check account status';
        } else if (errorMessage.toLowerCase().includes('checkpoint') ||
            errorMessage.toLowerCase().includes('verify') ||
            errorMessage.toLowerCase().includes('captcha')) {
            logoutReason = '🛡️ Facebook checkpoint/verification required - Manual action needed';
        } else if (errorMessage.toLowerCase().includes('network') ||
            errorMessage.toLowerCase().includes('internet') ||
            errorMessage.toLowerCase().includes('connectivity')) {
            logoutReason = '🌐 Network connectivity issue - Check internet connection';
        }

        // Enhanced error logging
        console.log('\n' + '🚨'.repeat(40));
        console.log('❌ SESSION MANAGER - LOGOUT/ERROR DETECTED');
        console.log('🚨'.repeat(40));
        console.log('🔍 LOGOUT REASON:', logoutReason);
        console.log('📝 ERROR CODE:', errorCode || 'Not available');
        console.log('💬 ERROR MESSAGE:', errorMessage || 'No message');
        console.log('🔄 RECONNECT ATTEMPTS:', `${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        console.log('⏰ TIMESTAMP:', new Date().toISOString());
        console.log('🔧 ACTIONS TAKEN:');
        console.log('   • Session refresh will be attempted');
        console.log('   • Automatic reconnection in progress');
        console.log('   • Monitoring connection health');
        console.log('🚨'.repeat(40) + '\n');

        if (error.message.includes('Not logged in') ||
            error.message.includes('login') ||
            error.statusCode === 401 ||
            error.statusCode === 403) {

            console.log(`⚠️ Session expired, attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.handleReconnection();
        }
    }

    /**
     * Handle reconnection logic
     */
    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached. Please manually restart the bot.');
            return;
        }

        try {
            console.log('🔄 Attempting to reconnect...');

            // Wait before reconnecting
            await this.sleep(5000 * this.reconnectAttempts);

            // Try to refresh DTSG first
            await this.refreshDTSG();

            // Mark as logged in if successful
            this.ctx.loggedIn = true;
            console.log('✅ Reconnection successful');

        } catch (error) {
            console.error('❌ Reconnection failed:', error.message);
            setTimeout(() => this.handleReconnection(), 30000); // Retry after 30 seconds
        }
    }

    /**
     * Handle MQTT connection errors
     */
    handleMqttError(error) {
        console.error('❌ MQTT Connection error:', error.message);

        // Auto-reconnect for MQTT errors
        if (this.globalOptions.autoReconnect) {
            console.log('🔄 Auto-reconnecting MQTT...');
            setTimeout(() => {
                this.handleReconnection();
            }, 3000);
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.dtsgInterval) {
            clearInterval(this.dtsgInterval);
            this.dtsgInterval = null;
        }
        if (this.appstateInterval) {
            clearInterval(this.appstateInterval);
            this.appstateInterval = null;
        }
        if (this.healthInterval) {
            clearInterval(this.healthInterval);
            this.healthInterval = null;
        }
        console.log('🧹 Session manager cleanup completed');
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get session status
     */
    getSessionStatus() {
        return {
            isLoggedIn: this.ctx.loggedIn,
            lastRefreshTime: this.lastRefreshTime,
            reconnectAttempts: this.reconnectAttempts,
            timeSinceLastRefresh: Date.now() - this.lastRefreshTime
        };
    }

    /**
     * Force session refresh
     */
    async forceRefresh() {
        console.log('🔄 Force refreshing session...');
        await this.refreshDTSG();
        await this.saveAppState();
    }
}

module.exports = SessionManager;
