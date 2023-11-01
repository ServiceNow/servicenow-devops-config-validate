const { doGet, doPost } = require('./do-request');

async function exponentialPolling(
  requestFunction,
  conditionCheck,
  maxAttempts = 10,
  initialInterval = 1000
) {
  let pollingInterval = initialInterval;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await requestFunction();

      if (conditionCheck(response)) {
        console.log('Polling successful. Condition met.');
        return response;
      } else {
        console.log(`Attempt ${attempt}: Condition not met yet. Continuing polling.`);
      }
    } catch (error) {
      console.error(`Attempt ${attempt}: Polling error - ${error.message}`);
    }

    if (attempt < maxAttempts) {
      pollingInterval *= 2;
      console.log(`Next attempt in ${pollingInterval / 1000} seconds.`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    } else {
      console.log('Maximum polling attempts reached. Condition not met.');
    }
  }

  return null; // Condition was not met within the maximum attempts
}

module.exports = { exponentialPolling };
