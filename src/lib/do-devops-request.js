/**
 * This is a wrapper over `doRequest`. Handles any additional logic specific to CDM requests.
 *
 */
const doRequest = require('./do-request');
const authHeader = require('./auth-header');

/**
 * Performs a GET request with authentication handling.
 *
 * @param {object} requestObj - The request object containing request details.
 * @returns {Promise<any>} - A promise that resolves with the response of the GET request.
 */
async function doGet(requestObj) {
    // Add the authentication header to the requestObj.
    // The requestObj.headers has higher precedance over authHeader.getAuthHeader()
    requestObj.headers = {
        ...authHeader.getAuthHeader(),
        ...requestObj.headers
    };
    return await doRequest.doGet(requestObj);
}

/**
 * Performs a POST request with authentication handling.
 *
 * @param {object} requestObj - The request object containing request details.
 * @returns {Promise<any>} - A promise that resolves with the response of the POST request.
 */
async function doPost(requestObj) {
    requestObj.headers = {
        ...authHeader.getAuthHeader(),
        ...requestObj.headers
    };
    return await doRequest.doPost(requestObj);
}

module.exports = {
    doGet,
    doPost
};
