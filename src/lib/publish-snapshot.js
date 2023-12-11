const { info, warning, debug } = require('@actions/core');
const { doPost } = require('./do-devops-request');
const constants = require('./constants');

/**
 * Publishes the specified snapshot if it's not already published and has a valid validation status.
 *
 * @param {Object} options - The options for publishing the snapshot.
 * @param {string} options.snInstanceURL - The ServiceNow instance URL.
 * @param {string} options.validationStatus - The validation status of the snapshot.
 * @param {Object} options.snapshotRec - The snapshot record containing details like sysId, name, etc.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the publish action.
 *                             Returns `true` if the snapshot is successfully published or no action is required.
 *                             Returns `false` if the validation status is not 'passed' or 'passed_with_exception'.
 */
async function publishSnapshot({
    snInstanceURL,
    validationStatus,
    snapshotRec
}) {

    info('PublishSnapshot begins....');

    if (snapshotRec.publishedStatus === "true") {
        info(`No action required as snapshot '${snapshotRec.name}' is already published.`);
        return true;
    }
    else if (!constants.SNAPSHOT.VALIDATION_PASS_STATES.includes(validationStatus))
    {
        warning(`Snapshot '${snapshotRec.name}' cannot be published as the validation status is not 'passed' or 'passed_with_exception'. The validation status is ${validationStatus}.`);
        return false;
    }
    await publishValidatedSnapshot(snInstanceURL, snapshotRec);
    return true;
}

/**
 * Publishes the validated snapshot to ServiceNow.
 *
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {Object} snapshotRec - The snapshot record containing details like sysId, name, etc.
 * @returns {Promise<void>} A promise that resolves when the snapshot is published successfully.
 */
async function publishValidatedSnapshot(snInstanceURL, snapshotRec) {

    debug("publishValidatedSnapshot begins...");
    const cdmSnapshotPublishEndpoint = `${snInstanceURL}${constants.API.CDM_SNAPSHOT_PUBLISH.replace('%s', snapshotRec.sysId)}`;

    const response = await doPost({
        url: cdmSnapshotPublishEndpoint,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    debug("API response : " + JSON.stringify(response));
    info(`Snapshot '${snapshotRec.name}' published successfully.`);
}

module.exports = {
    publishSnapshot
};
