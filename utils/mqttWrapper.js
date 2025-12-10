/**
 * Enhanced MQTT Wrapper with better error handling and reconnection
 */

const log = require('npmlog');

class MqttWrapper {
    constructor(api, sessionManager) {
        this.api = api;
        this.sessionManager = sessionManager;
        this.originalListener = null;
        this.isListening = false;
        this.reconnectTimeout = null;
        this.errorCount = 0;
        this.maxErrors = 5;
    }

    /**
     * Start listening with enhanced error handling
     */
    async startListening(callback) {
        try {
            console.log('🎧 Starting enhanced MQTT listener...');
            
            this.originalListener = this.api.listenMqtt((err, message) => {
                if (err) {
                    this.handleError(err, callback);
                    return;
                }
                
                // Reset error count on successful message
                this.errorCount = 0;
                
                // Process message normally
                if (callback) {
                    callback(err, message);
                }
            });

            this.isListening = true;
            console.log('✅ Enhanced MQTT listener started successfully');
            
            return this.originalListener;
            
        } catch (error) {
            console.error('❌ Failed to start MQTT listener:', error.message);
            this.handleError(error, callback);
            throw error;
        }
    }

    /**
     * Handle MQTT errors with smart reconnection and detailed logout reason detection
     */
    handleError(error, callback) {
        console.error('🚨 MQTT Error detected:', error);
        
        this.errorCount++;
        
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
            'Account temporarily locked': '🔒 Account temporarily locked - Facebook detected unusual activity'
        };
        
        // Detect logout reason
        let logoutReason = 'Unknown MQTT error';
        const errorMessage = error.message || error.toString() || '';
        const errorCode = error.code || error.errno || '';
        
        // Check for specific error codes and messages
        for (const [key, reason] of Object.entries(logoutReasons)) {
            if (errorMessage.includes(key) || errorCode === key) {
                logoutReason = reason;
                break;
            }
        }
        
        // Additional pattern matching for common logout scenarios
        if (errorMessage.includes("Cannot read properties of undefined (reading 'uri')")) {
            logoutReason = '❌ Session expired during runtime - Facebook cookies became invalid while bot was running';
        } else if (errorMessage.toLowerCase().includes('login') || 
            errorMessage.toLowerCase().includes('auth') ||
            errorMessage.toLowerCase().includes('session')) {
            logoutReason = '🔐 Session expired or authentication failed - Appstate may be invalid';
        } else if (errorMessage.toLowerCase().includes('banned') ||
                  errorMessage.toLowerCase().includes('blocked') ||
                  errorMessage.toLowerCase().includes('suspended')) {
            logoutReason = '🙫 Account banned/blocked/suspended by Facebook - Check account status';
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
        console.log('\n' + '🚨'.repeat(45));
        console.log('❌ MQTT WRAPPER - LOGOUT/ERROR DETECTED');
        console.log('🚨'.repeat(45));
        console.log('🔍 LOGOUT REASON:', logoutReason);
        console.log('📝 ERROR CODE:', errorCode || 'Not available');
        console.log('💬 ERROR MESSAGE:', errorMessage || 'No message');
        console.log('📊 ERROR COUNT:', `${this.errorCount}/${this.maxErrors}`);
        console.log('⏰ TIMESTAMP:', new Date().toISOString());
        console.log('🔧 RECOVERY ACTIONS:');
        
        // Check for session-related errors
        if (this.isSessionError(error)) {
            console.log('   • Session error detected - Refreshing session...');
            console.log('🔄 Session error detected, refreshing session...');
            this.sessionManager.forceRefresh();
        }
        
        // Check for connection errors
        if (this.isConnectionError(error)) {
            console.log('   • Connection error detected - Attempting reconnection...');
            console.log('🔄 Connection error detected, attempting reconnection...');
            this.attemptReconnection(callback);
        }
        
        // Check for too many errors
        if (this.errorCount >= this.maxErrors) {
            console.log('   • Too many errors - Stopping listener and attempting full restart...');
            console.log('🚨'.repeat(45) + '\n');
            console.error('❌ Too many errors, stopping listener...');
            this.stopListening();
            
            // Attempt full restart after delay
            setTimeout(() => {
                console.log('🔄 Attempting full restart after too many errors...');
                this.restartWithDelay(callback);
            }, 60000); // Wait 1 minute before full restart
        } else {
            console.log('   • Monitoring for additional errors...');
            console.log('🚨'.repeat(45) + '\n');
        }
        
        // Pass enhanced error to original callback
        if (callback) {
            callback({
                ...error,
                logoutReason: logoutReason,
                errorCode: errorCode,
                errorMessage: errorMessage,
                timestamp: new Date().toISOString(),
                errorCount: this.errorCount
            }, null);
        }
    }

    /**
     * Check if error is session-related
     */
    isSessionError(error) {
        if (!error) return false;
        
        const sessionErrorKeywords = [
            'Not logged in',
            'login',
            'session',
            'expired',
            'unauthorized',
            '401',
            '403',
            'dtsg'
        ];
        
        const errorMessage = error.message || error.toString() || '';
        return sessionErrorKeywords.some(keyword => 
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Check if error is connection-related
     */
    isConnectionError(error) {
        if (!error) return false;
        
        const connectionErrorKeywords = [
            'ECONNRESET',
            'ECONNREFUSED', 
            'ETIMEDOUT',
            'ENOTFOUND',
            'Connection',
            'timeout',
            'network',
            'socket',
            'closed'
        ];
        
        const errorMessage = error.message || error.toString() || '';
        return connectionErrorKeywords.some(keyword => 
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    attemptReconnection(callback) {
        if (this.reconnectTimeout) {
            return; // Already attempting reconnection
        }
        
        const delay = Math.min(5000 * Math.pow(2, this.errorCount - 1), 60000); // Max 1 minute
        
        console.log(`⏳ Attempting reconnection in ${delay/1000} seconds...`);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                console.log('🔄 Reconnecting MQTT...');
                
                // Stop current listener
                this.stopListening();
                
                // Wait a bit more
                await this.sleep(2000);
                
                // Restart listening
                await this.startListening(callback);
                
                console.log('✅ MQTT reconnection successful');
                this.errorCount = Math.max(0, this.errorCount - 1); // Reduce error count on success
                
            } catch (error) {
                console.error('❌ MQTT reconnection failed:', error.message);
                
                // Try again if not too many errors
                if (this.errorCount < this.maxErrors) {
                    this.reconnectTimeout = null;
                    this.attemptReconnection(callback);
                }
            } finally {
                this.reconnectTimeout = null;
            }
        }, delay);
    }

    /**
     * Restart with delay after critical failure
     */
    async restartWithDelay(callback) {
        try {
            console.log('🔄 Performing full restart...');
            
            // Reset error count
            this.errorCount = 0;
            
            // Force session refresh
            await this.sessionManager.forceRefresh();
            
            // Wait a bit
            await this.sleep(5000);
            
            // Start listening again
            await this.startListening(callback);
            
            console.log('✅ Full restart completed successfully');
            
        } catch (error) {
            console.error('❌ Full restart failed:', error.message);
            
            // Schedule another restart
            setTimeout(() => {
                this.restartWithDelay(callback);
            }, 300000); // Wait 5 minutes before trying again
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (this.originalListener && typeof this.originalListener.stopListening === 'function') {
            try {
                console.log('🛑 Stopping MQTT listener...');
                this.originalListener.stopListening();
                this.isListening = false;
            } catch (error) {
                console.error('❌ Error stopping MQTT listener:', error.message);
            }
        }
        
        // Clear reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Get listener status
     */
    getStatus() {
        return {
            isListening: this.isListening,
            errorCount: this.errorCount,
            hasReconnectScheduled: !!this.reconnectTimeout
        };
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stopListening();
        console.log('🧹 MQTT wrapper cleanup completed');
    }
}

module.exports = MqttWrapper;
