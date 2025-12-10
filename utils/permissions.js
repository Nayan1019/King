/**
 * Permissions Utility
 * Handles permission checks for commands
 */

/**
 * Check if user has permission to use command
 * @param {string} userID - User ID to check
 * @param {string|string[]} permission - Required permission level(s)
 * @returns {Promise<boolean>} Has permission
 */
async function checkPermission(userID, permission) {
  // Handle array of permissions (user needs at least one)
  if (Array.isArray(permission)) {
    // Check each permission, return true if any match
    for (const perm of permission) {
      if (await checkPermission(userID, perm)) {
        return true;
      }
    }
    return false;
  }
  
  // Convert permission to uppercase for consistency
  permission = permission.toUpperCase();
  
  // Everyone has PUBLIC permission
  if (permission === 'PUBLIC') return true;
  
  // Owner always has all permissions, even if banned
  if (userID === global.config.ownerID) return true;
  
  // Check for OWNER permission - only actual owner
  if (permission === 'OWNER') {
    return userID === global.config.ownerID;
  }
  
  // Check for ADMIN permission
  if (permission === 'ADMIN') {
    return userID === global.config.ownerID || global.config.adminIDs.includes(userID);
  }
  
  // Check for SUPPORTER permission
  if (permission === 'SUPPORTER') {
    return userID === global.config.ownerID || 
           global.config.adminIDs.includes(userID) || 
           global.config.supportIDs.includes(userID);
  }
  
  // Default to no permission
  return false;
}

/**
 * Check if user has permission to use command (alias for checkPermission)
 * @param {string} userID - User ID to check
 * @param {string|string[]} permission - Required permission level(s)
 * @returns {Promise<boolean>} Has permission
 */
async function check(userID, permission) {
  return checkPermission(userID, permission);
}

module.exports = {
  checkPermission,
  check
};