const constants = require('./constants');

/**
 * Normalises the namePath to use the new name path separator `�`.
 * @param {string} namePath - The namePath.
 * @returns {string} the normalized namePath.
 */
function normalizeNamePath(namePath) {
    if (!namePath || (Array.isArray(namePath) && namePath.length == 0)) return namePath;
    let tempNamePath = namePath;
    if (typeof namePath == 'string') {
      
        if (tempNamePath.indexOf(constants.NAME_PATH_SEPARATOR) !== -1) 
          return trimTrailingNodeSeparator(tempNamePath);
      
        tempNamePath = getNamePathForStringifiedArray(namePath);
    }
  
    if (Array.isArray(tempNamePath)) 
      return constants.NAME_PATH_SEPARATOR + tempNamePath.join(constants.NAME_PATH_SEPARATOR);
  
    //if namePath is string and contains legacy "NamePathSeperator"
    tempNamePath = tempNamePath.split(constants.LEGACY_NAME_PATH_SEPARATOR).join(constants.NAME_PATH_SEPARATOR);
    return trimTrailingNodeSeparator(tempNamePath);
}

/**
 * If the namePath can be parsed as a JSON array, returns the JSON array. Else,return the namePath as-is.
 * @param {string} namePath - The namePath.
 * @returns {string} returns the namePath after parsing to a JSON array.
 */
function getNamePathForStringifiedArray(namePath) {
    try {
        let tempNamePath = JSON.parse(namePath);
        if (Array.isArray(tempNamePath)) 
          return tempNamePath;
    } catch (ex) {
        
    }
    return namePath;
}

/**
 * returns the namePath after trimming the trailing node separators, if any.
 * @param {string} namePath - The namePath.
 * @returns {string} Returns the namePath after trimming the trailing node separators, if any.
 */
function trimTrailingNodeSeparator(namePath) {
    if (namePath && namePath.length > 0 && namePath.endsWith(constants.NAME_PATH_SEPARATOR)) namePath = namePath.slice(0, -1);
    return namePath;
}

/**
 * Checks if a variable is empty, null, or undefined.
 * @param {*} value - The variable to check.
 * @returns {boolean} Returns true if the variable is empty, null, or undefined, otherwise false.
 */
function isEmpty(value) {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * Checks if a Array is empty, null, or undefined.
 * @param {*} arr - The array to check.
 * @returns {boolean} Returns true if the array is empty, null, or undefined, otherwise false.
 */
function isArrayEmpty(arr) {
    return arr === null || arr === undefined || (Array.isArray(arr) && arr.length === 0);
}
module.exports = {
    normalizeNamePath,
    isEmpty,
    isArrayEmpty
};
