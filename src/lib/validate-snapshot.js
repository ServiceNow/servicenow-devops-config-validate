const { setOutput, info, debug } = require('@actions/core');
const { polling } = require('./do-polling');
const { doPost, doGet } = require('./do-devops-request');
const constants = require('./constants');
const { isArrayEmpty } = require('./utils');

/**
 * Validates the specified snapshot by triggering snapshot validation.
 *
 * @param {Object} options - The options for validating the snapshot.
 * @param {string} options.snInstanceURL - The ServiceNow instance URL.
 * @param {Object} options.snapshotRec - The snapshot record containing details like sysId, name, etc.
 * @param {number} options.snapshotValidationTimeoutInMin - The snapshot validation timeout in minutes.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the validation status.
 */
async function validateSnapshot({
    snInstanceURL,
    snapshotRec,
    snapshotValidationTimeoutInMin
}) {
    info('ValidateSnapshot begins....');
    if (snapshotRec.publishedStatus === "true") {
        info(`Snapshot ${snapshotRec.name} is already published. No new validation will be performed.`);
        setOutput(constants.OUTPUT.VALIDATION_STATUS, snapshotRec.validationStatus);
        return snapshotRec.validationStatus;
    }
    await triggerSnapshotValidation(snInstanceURL, snapshotRec);
    const snapshotValidationStatus = await waitForSnapshotValidation(snInstanceURL, snapshotRec, snapshotValidationTimeoutInMin);
    info(`Validation status for snapshot ${snapshotRec.name} is ${snapshotValidationStatus}`);
    setOutput(constants.OUTPUT.VALIDATION_STATUS, snapshotValidationStatus);
    return snapshotValidationStatus;
}

/**
 * Triggers snapshot validation for the specified snapshot.
 *
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {Object} snapshotRec - The snapshot record containing details like sysId, name, etc.
 * @returns {Promise<void>} A promise that resolves when the validation is triggered successfully.
 */
async function triggerSnapshotValidation(snInstanceURL, snapshotRec) {
    debug("triggerSnapshotValidation begins...");
    const cdmSnapshotValidateEndpoint = `${snInstanceURL}${constants.API.CDM_SNAPSHOT_VALIDATE.replace('%s', snapshotRec.sysId)}`;

    const response = await doPost({
        url: cdmSnapshotValidateEndpoint,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    debug("API response : " + JSON.stringify(response));
    info(`Validation triggered successfully for snapshot ${snapshotRec.name}`);
}

/**
 * returns the snapshot validation status through polling.
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {Object} snapshotRec - The snapshot record.
 * @param {number} options.snapshotValidationTimeoutInMin - The snapshot validation timeout in minutes.
 * @returns {Promise<string>} A promise that resolves to a string, which is the snapshot validation status.
 * @throws {Error} Throws an error if the snapshot is not validated within the configured polling attempts.
 */
async function waitForSnapshotValidation(snInstanceURL, snapshotRec, snapshotValidationTimeoutInMin) {

    debug("waitForSnapshotValidation begins...");
    const cdmSnapshotEndpoint = `${snInstanceURL}${constants.API.CDM_SNAPSHOT_TABLE}/${snapshotRec.sysId}`;
    const snapshotValidationStatusTerminalStateCheck = (response) => {
        return constants.SNAPSHOT.VALIDATION.TERMINAL_STATES.includes(response.result.validation);
    };
    const snapshotValidationTimeoutInMilliSeconds = snapshotValidationTimeoutInMin * 60 * 1000;
    const snapshotValidationPollingMaxAttempts = Math.ceil(snapshotValidationTimeoutInMilliSeconds / constants.POLLING.SNAPSHOT_VALIDATION_MAX_INTERVAL_MILLISECONDS);

    const response = await polling(async () => {
        const queryParams = {
            sysparm_fields: "validation"
        };
        return await doGet({
            url: cdmSnapshotEndpoint,
            queryParams: queryParams
        });
    }, snapshotValidationStatusTerminalStateCheck, snapshotValidationPollingMaxAttempts, constants.POLLING.SNAPSHOT_VALIDATION_MAX_INTERVAL_MILLISECONDS);

    debug("API response : " + JSON.stringify(response));

    if (!response)
        throw new Error(`Maximum polling attempts reached. Snapshot record with sys id ${snapshotRec.sysId} is not validated yet.`);

    return response.result.validation;
}

module.exports = {
    validateSnapshot
};
