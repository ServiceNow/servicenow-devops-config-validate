const { setOutput, info, warning, debug } = require('@actions/core');
const { polling } = require('./do-polling');
const { doGet } = require('./do-devops-request');
const constants = require('./constants');
const { isEmpty, isArrayEmpty } = require('./utils');
/**
 * Fetches the snapshot by checking its generation status and deployable impact.
 * @param {Object} options - The options for fetching the snapshot.
 * @param {string} options.snInstanceURL - The ServiceNow instance URL.
 * @param {string} options.appName - The name of the application.
 * @param {string} options.deployableName - The name of the deployable.
 * @param {string} options.changesetNumber - The changeset number.
 * @returns {Promise<void>} A promise that resolves once the snapshot status and deployable impact are checked.
 */
async function fetchSnapshot({
    snInstanceURL,
    appName,
    deployableName,
    changesetNumber
}) {
    info('FetchSnapshot begins....');
    if (await isDeployableImpacted(snInstanceURL, changesetNumber, deployableName) && 
        isSnapshotGenerated(await waitForSnapshotGeneration(snInstanceURL, changesetNumber), changesetNumber)) {        
        info("Fetching the snapshot with changesetNumber..");
        return await getSnapshotByChangesetNumber(snInstanceURL, deployableName, changesetNumber);
    }
    else {
        info("Fetching the latest snapshot..");
        return await getLatestSnapshot(snInstanceURL, appName, deployableName);
    }

}


/**
 * Checks if the deployable passed as argument got changed with the changeset.
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} changesetNumber - The changeset number.
 * @param {string} deployableName - The name to check against the 'name' property.
 * @returns {Promise<boolean>} Returns a promise that resolves to a boolean, indicating if the deployable is impacted.
 */
async function isDeployableImpacted(snInstanceURL, changesetNumber, deployableName) {
    debug("isDeployableImpacted begins...");
    const impactedDeployablesEndpoint = `${snInstanceURL}${constants.API.IMPACTED_DEPLOYABLES}`;
    const queryParams = {
        changesetNumber: changesetNumber,
        returnFields: "sys_id,name,state"
    };
    response = await doGet({
        url: impactedDeployablesEndpoint,
        queryParams: queryParams,
    });
    debug("API response : " + JSON.stringify(response));
    const otherImpactedDeployables = response.result.filter(impactedDeployable => !isEmpty(impactedDeployable.name) && String(impactedDeployable.name).toLowerCase() !== deployableName.toLowerCase());

    const isPrimaryDeployableImpacted = response.result.some(impactedDeployable => !isEmpty(impactedDeployable.name) && String(impactedDeployable.name).toLowerCase() === deployableName.toLowerCase());
    // Set warning if other than the deployableName got impacted
    if (!isArrayEmpty(otherImpactedDeployables)) {
        if(isPrimaryDeployableImpacted)
        {
            warning(`The config data was uploaded and will be validated against the deployable '${deployableName}'. However the impacted deployables are '${deployableName}, ${otherImpactedDeployables.map(dep => dep.name).join(', ')}'.`);
        }
        else
        {
            warning(`Deployable '${deployableName}' was not impacted with the changeset ${changesetNumber}. However the impacted deployables are '${otherImpactedDeployables.map(dep => dep.name).join(', ')}' and no validation will be performed on them.`);
        } 
    }
    
    if (isPrimaryDeployableImpacted) {
        info(`Deployable ${deployableName} is impacted..`);
        return true;
    }

    info(`No deployables are impacted for ${changesetNumber}..`);
    return false;
}

/**
 * Checks the snapshot generation status through polling.
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} changesetNumber - The changeset number.
 * @returns {Promise<boolean>} A promise that resolves to a string, which is the snapshot status.
 * @throws {Error} Throws an error if the snapshot generation fails or times out.
 */
async function waitForSnapshotGeneration(snInstanceURL, changesetNumber) {
    debug("waitForSnapshotGeneration begins...");
    const changeSetTableEndpoint = `${snInstanceURL}${constants.API.CDM_CHANGESET_TABLE}`;

    const snapshotGenerationTerminalStateCheck = (response) => {
        // Wait until state is moved to any of termination states.
        if(!response || isArrayEmpty(response.result))
            return false;
        return constants.SNAPSHOT.TERMINAL_STATES.includes(response.result[0].snapshot_status);
    };

    // Start polling
    const response = await polling(async () => {
        const queryParams = {
            sysparm_query: `number=${changesetNumber}`,
            sysparm_fields: "number,sys_id,snapshot_status"
        };
        return await doGet({
            url: changeSetTableEndpoint,
            queryParams: queryParams,
        });
    }, snapshotGenerationTerminalStateCheck);
    debug("API response : " + JSON.stringify(response));
    if (!response || isArrayEmpty(response.result))
        throw new Error(`Maximum polling attempts reached. Snapshot process request of changeset : ${changesetNumber} is not yet completed.`);

    const snapshotStatus = response.result[0].snapshot_status;

    if (snapshotStatus == constants.SNAPSHOT.STATUS_ERROR) {
        throw new Error(`The snapshot generation failed for changeset : ${changesetNumber}.`);
    }

    return snapshotStatus;
}


/**
 * Checks the snapshot is created or not.
 * @param {string} snapshotStatus - The status of snapshot generation.
 * @param {string} changesetNumber - The changeset number.
 * @returns boolean - Bool value indicating if the snapshot is generated.
 */
function isSnapshotGenerated(snapshotStatus, changesetNumber) {

    if (snapshotStatus == constants.SNAPSHOT.STATUS_CREATED) {
        info(`Snapshot created successfully for ${changesetNumber}`);
        return true;
    }
    else {
        info(`No new snapshot created for changeset : ${changesetNumber}`);
        return false;
    }
}

/**
 * Retrieves the latest snapshot of a deployable in a specific application.
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} appName - The name of the application.
 * @param {string} deployableName - The name of the deployable.
 * @returns {Promise<Object>} A promise that resolves to an object containing snapshot details.
 * @throws {Error} Throws an error if the latest snapshot is not found.
 */
async function getLatestSnapshot(snInstanceURL, appName, deployableName) {
    debug("getLatestSnapshot begins...");
    const cdmSnapshotEndpoint = `${snInstanceURL}${constants.API.CDM_SNAPSHOT_TABLE}`;
    const queryParams = {
        sysparm_query: `cdm_application_id.name=${appName}^cdm_deployable_id.name=${deployableName}^ORDERBYDESCsys_created_on`,
        sysparm_fields: "sys_id,name,validation,published,sys_created_on",
        sysparm_limit: "1"
    };
    response = await doGet({
        url: cdmSnapshotEndpoint,
        queryParams: queryParams,
    });
    debug("API response : " + JSON.stringify(response));
    if (!response || isArrayEmpty(response.result))
        throw new Error(`The latest snapshot of deployable ${deployableName} in the application ${appName} is not found.`);
    
    // Extract snapshot details from the response
    const { result: [{ sys_id, name, published, validation }] } = response;
    info(`Snapshot found with sys_id : ${sys_id}, name : ${name}, validation status: ${validation}, published status: ${published}.`);
    setOutput(constants.OUTPUT.SNAPSHOT_NAME, name);
    return { "sysId" : sys_id, "name" : name, "publishedStatus" : published, "validationStatus": validation };
}

/**
 * Retrieves a snapshot by the changeset number of a deployable.
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} deployableName - The name of the deployable.
 * @param {string} changesetNumber - The changeset number.
 * @returns {Promise<Object>} A promise that resolves to an object containing snapshot details.
 * @throws {Error} Throws an error if the snapshot with the specified changeset number is not found.
 */
async function getSnapshotByChangesetNumber(snInstanceURL, deployableName, changesetNumber) {
    debug("getSnapshotByChangesetNumber begins...");
    const cdmSnapshotEndpoint = `${snInstanceURL}${constants.API.CDM_SNAPSHOT_TABLE}`;
    const queryParams = {
        sysparm_query: `changeset_id.number=${changesetNumber}^cdm_deployable_id.name=${deployableName}`,
        sysparm_fields: "sys_id,name,validation,published,sys_created_on"
    };
    response = await doGet({
        url: cdmSnapshotEndpoint,
        queryParams: queryParams,
    });
    debug("API response : " + JSON.stringify(response));
    if (!response || isArrayEmpty(response.result))
        throw new Error(`The snapshot with changeset number : ${changesetNumber} of deployable : ${deployableName} in the application ${appName} is not found.`);

    // Extract snapshot details from the response
    const { result: [{ sys_id, name, published, validation }] } = response;
    info(`Snapshot found with sys_id : ${sys_id}, name : ${name}, validation status: ${validation}, published status: ${published}.`);
    setOutput(constants.OUTPUT.SNAPSHOT_NAME, name);
    return { "sysId" : sys_id, "name" : name, "publishedStatus" : published, "validationStatus": validation };
}
module.exports = { fetchSnapshot };
