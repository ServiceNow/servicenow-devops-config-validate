const { info, error } = require('@actions/core');
const constants = require('./constants');

/**
 * Provides polling with a specified interval and maximum attempts.
 *
 * @param {Function} requestFunction - A function that makes the polling request.
 * @param {Function} conditionCheck - A function that checks if the condition is met.
 * @param {number} [maxAttempts=25] - The maximum number of polling attempts.
 * @param {number} [initialInterval=5000] - The initial polling interval in milliseconds.
 * @returns {Promise<any|null>} - A promise that resolves with the response when the condition is met or null if the condition is not met within the maximum attempts.
 */
async function polling(requestFunction, conditionCheck, maxAttempts = constants.POLLING.DEFAULT_MAX_ATTEMPTS,
 initialInterval = constants.POLLING.DEFAULT_MAX_INTERVAL_MILLISECONDS) {
  let pollingInterval = initialInterval;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await requestFunction();
      // Check the response for the condition to be met.
      if (conditionCheck(response)) {
        info('Polling successful. Condition met.');
        return response;
      } else {
        info(`Attempt ${attempt}: Condition not met yet. Continuing polling.`);
      }
    } catch (error) {
      // Log the error caught during polling.
      error(`Attempt ${attempt}: Polling error - ${error.message}`);
    }
    // Check the count and continue polling if not exceeded the maximum attempts.
    if (attempt < maxAttempts) {
      info(`Next attempt in ${pollingInterval / 1000} seconds.`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    } else {
      error('Maximum polling attempts reached. Condition not met.');
    }
  }

  return null; // Condition was not met within the maximum attempts.
}

module.exports = { polling };