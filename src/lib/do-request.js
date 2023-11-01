const axios = require('axios');


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

async function doGet({ url, username, passwd, queryParams }) {
  const urlWithParams = queryParams ? `${url}?${new URLSearchParams(queryParams)}` : url;

  const base64Credentials = Buffer.from(`${username}:${passwd}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${base64Credentials}`,
    'Content-Type': 'text/plain'
  };

  const response = await makeHttpRequest(urlWithParams, 'GET', null, headers);
  return response;
}

async function doPost({ url, username, passwd, postData, queryParams }) {
  const urlWithParams = queryParams ? `${url}?${new URLSearchParams(queryParams)}` : url;
  console.log(urlWithParams);
  const base64Credentials = Buffer.from(`${username}:${passwd}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${base64Credentials}`,
    'Content-Type': 'text/plain'
  };

  const response = await makeHttpRequest(urlWithParams, 'POST', postData, headers);
  return response;
}

module.exports = { doGet, doPost };
