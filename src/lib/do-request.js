/**
 * Wrapper over the axios library.
 * Currently supports doGet and doPost.
 */

const axios = require('axios');
const { info } = require('@actions/core');

/**
 * Initiates the actual HTTP request.
 *
 * @param {string} url - The URL to make the request to.
 * @param {string} method - The HTTP method (e.g., 'GET' or 'POST').
 * @param {object} data - The request data (for 'POST' requests).
 * @param {object} headers - The HTTP headers for the request.
 * @returns {Promise<object>} - A promise that resolves with the response data.
 * @throws {Error} - Throws an error if the request fails.
 */
async function makeHttpRequest(url, method, data, headers) {
  try {
    // Make the request and wait for the response.
    const response = await axios({
      url,
      method,
      data,
      headers
    });

    return response.data;
  } catch (error) {
    // Throw an exception with the error message.
    if (error.response) {
      throw new Error(`Status code: ${error.response.status}. Response data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`No response received. Error: ${error.message}`);
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

/**
 * Appends the URL with the query parameters.
 *
 * @param {string} url - The URL.
 * @param {object} queryParams - The query parameters to append to the URL.
 * @returns {string} - The URL with appended query parameters.
 */
function constructUrlWithParams(url, queryParams) {
  return queryParams ? `${url}?${new URLSearchParams(queryParams)}` : url;
}

/**
 * Initiates a GET request.
 *
 * @param {object} options - GET request options.
 * @param {string} options.url - The URL to make the GET request to.
 * @param {object} options.queryParams - The query parameters.
 * @param {object} options.headers - The HTTP headers for the request.
 * @returns {Promise<object>} - A promise that resolves with the response data.
 */
async function doGet({ url, queryParams, headers }) {
  const urlWithParams = constructUrlWithParams(url, queryParams);
  info(`Request: ${urlWithParams} initiating.`);
  const response = await makeHttpRequest(urlWithParams, 'GET', null, headers);
  info(`Response: ${urlWithParams} received.`);
  return response;
}

/**
 * Initiates a POST request.
 *
 * @param {object} options - POST request options.
 * @param {string} options.url - The URL to make the POST request to.
 * @param {object} options.postData - The data to include in the POST request.
 * @param {object} options.queryParams - The query parameters.
 * @param {object} options.headers - The HTTP headers for the request.
 * @returns {Promise<object>} - A promise that resolves with the response data.
 */
async function doPost({ url, postData, queryParams, headers }) {
  const urlWithParams = constructUrlWithParams(url, queryParams);
  info(`Request: ${urlWithParams} initiating.`);
  const response = await makeHttpRequest(urlWithParams, 'POST', postData, headers);
  info(`Response: ${urlWithParams} received.`);
  return response;
}

module.exports = { doGet, doPost };
