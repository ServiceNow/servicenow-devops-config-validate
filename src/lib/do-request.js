const axios = require('axios');
const {info} = require('@actions/core');
async function makeHttpRequest(url, method, data, headers) {
  try {
    const response = await axios({
      url,
      method,
      data,
      headers,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Status code: ${error.response.status}. Response data: ${error.response.data}`);
    } else if (error.request) {
      throw new Error(`No response received. Error: ${error.message}`);
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

function constructHeaders(username, passwd) {
  const base64Credentials = Buffer.from(`${username}:${passwd}`).toString('base64');
  return {
    'Authorization': `Basic ${base64Credentials}`,
    'Content-Type': 'text/plain'
  };
}

function constructUrlWithParams(url, queryParams) {
  return queryParams ? `${url}?${new URLSearchParams(queryParams)}` : url;
}

async function doGet({ url, username, passwd, queryParams }) {
  const headers = constructHeaders(username, passwd);
  const urlWithParams = constructUrlWithParams(url, queryParams);
  info(`Request : ${urlWithParams} initiating.`)
  const response = await makeHttpRequest(urlWithParams, 'GET', null, headers);
  info(`Response : ${urlWithParams} received.`)
  return response;
}

async function doPost({ url, username, passwd, postData, queryParams }) {
  const headers = constructHeaders(username, passwd);
  const urlWithParams = constructUrlWithParams(url, queryParams);
  info(`Request : ${urlWithParams} initiating.`)
  const response = await makeHttpRequest(urlWithParams, 'POST', postData, headers);
  info(`Response : ${urlWithParams} received.`)
  return response;
}

module.exports = { doGet, doPost };
