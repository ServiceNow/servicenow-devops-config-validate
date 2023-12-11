const { setOutput, info, warning, error } = require('@actions/core');
const { doGet } = require('./do-devops-request');
const constants = require('./constants');
const { isArrayEmpty, isEmpty } = require('./utils');
const fs = require('fs');

/**
 * Fetch validation results from the ServiceNow instance.
 *
 * @param {Object} options - Options for fetching validation results.
 * @param {string} options.snInstanceURL - The ServiceNow instance URL.
 * @param {string} options.deployableName - The name of the deployable.
 * @param {string} options.validationStatus - The validation status.
 * @param {string} options.publishStatus - The publish status.
 * @param {Object} options.snapshotRec - The snapshot record object.
 * @returns {Promise<void>} - A Promise that resolves when the validation results are fetched and processed.
 */
async function fetchValidationResults({
    snInstanceURL,
    deployableName,
    validationStatus,
    publishStatus,
    snapshotRec
}) {

    info('FetchValidationResults begins....');

    const response = await fetchResults(snInstanceURL, deployableName, snapshotRec);
    await generateValidationResults(response, deployableName, snapshotRec, validationStatus, publishStatus);
}

/**
 * Fetch results from the ServiceNow instance based on the provided parameters.
 *
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} deployableName - The name of the deployable.
 * @param {Object} snapshotRec - The snapshot record object.
 * @returns {Promise<Object>} - A Promise that resolves with the fetched results.
 */
async function fetchResults(snInstanceURL, deployableName, snapshotRec) {

    const cdmPolicyValidationResultEndpoint = `${snInstanceURL}${constants.API.CDM_POLICY_VALIDATION_RESULT}`;
    const queryParams = {
        sysparm_query: `snapshot.sys_id=${snapshotRec.sysId}^is_latest=true`,
        sysparm_fields: "snapshot.application_id.name,policy.name,snapshot.name,impacted_node.name,node_path,policy_execution.output"
    };
    response = await doGet({
        url: cdmPolicyValidationResultEndpoint,
        queryParams: queryParams,
    });

    if (!response || isArrayEmpty(response.result))
        warning(`Validation results are empty. No policy validation results found for deployable '${deployableName}'.`);

    return response;
}

/**
 * Generate validation results based on the fetched response.
 *
 * @param {Object} response - The response containing validation results.
 * @param {string} deployableName - The name of the deployable.
 * @param {Object} snapshotRec - The snapshot record object.
 * @param {string} validationStatus - The validation status.
 * @param {string} publishStatus - The publish status.
 * @returns {Promise<void>} - A Promise that resolves when the validation results are generated and processed.
 */
async function generateValidationResults(response, deployableName, snapshotRec, validationStatus, publishStatus) {
    // Array for keeping policy names
    let policyNamesSet = new Set();
    let jsonOutput = {};
    jsonOutput.sys_id = snapshotRec.sysId;
    jsonOutput.name = snapshotRec.name;
    jsonOutput.deployableName = deployableName;
    // If snapshot is already published and auto publish is false, then we need to set the status of latest snapshot.
    jsonOutput.published = snapshotRec.publishedStatus === "true"? true : publishStatus;
    jsonOutput.validation = validationStatus;
    jsonOutput.validationResults = {};
    validationResultsArray = [];
    response.result.forEach(result => {
        const policyExecution = JSON.parse(result['policy_execution.output']);
        // The policy_execution.output has the details of all failures, so we dont need to add each failure entries of same policy in the sn_cdm_policy_validation_result.
        if(!policyNamesSet.has(result["policy.name"])) {
            validationResultsArray.push(result);
            policyNamesSet.add(result["policy.name"]);
            if (policyExecution.decision === 'non_compliant') {
                let failureMessage = `Policy '${result["policy.name"]}' is found non_compliant.`;
                if (!isArrayEmpty(policyExecution.failures))
                {
                    failureMessage = failureMessage + ` Total number of failures messages : ${policyExecution.failures.length}.`;
                }
                failureMessage = failureMessage + " Check the validation results for details."
                error(failureMessage);
            } else if (isEmpty(policyExecution)) {
                error(`Policy '${result["policy.name"]}' is not executed properly. No execution output found.`);
            }
        }
    });
    // Generate the sarif data.
    const sarifData = {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "Devops config policy content pack",
                    "version": "1.2.0",
                    "fullName": "Devops config policy content pack",
                    "rules": validationResultsArray
                        .filter(result => {
                            const decision = result["policy_execution.output"] ? JSON.parse(result["policy_execution.output"]).decision : undefined;
                            return decision === "non_compliant";
                        })
                        .map(result => ({
                            "id": `${result["snapshot.name"]}:${result["policy.name"]}`,
                            "name": result["policy.name"],
                            "shortDescription": {
                                "text": `${result["snapshot.name"]}:${result["policy.name"]}`
                            },
                            "fullDescription": {
                                "text": `application.name: ${result["snapshot.application_id.name"]}, snapshot.name: ${result["snapshot.name"]}`
                            },
                            "defaultConfiguration": {
                                "level": "error",
                            }
                        }))
                }
            },
            "results": validationResultsArray
                .filter(result => {
                    const decision = result["policy_execution.output"] ? JSON.parse(result["policy_execution.output"]).decision : undefined;
                    return decision === "non_compliant";
                })
                .map(result => ({
                    "ruleId": `${result["snapshot.name"]}:${result["policy.name"]}`,
                    "kind": "fail",
                    "message": {
                        "text": result["policy_execution.output"]
                    },
                    "locations": [{
                        "physicalLocation": {
                            "artifactLocation": {
                                "uri": result["snapshot.name"]
                            }
                        }
                    }]
                }))
        }]
    };
    jsonOutput.validationResults.result = validationResultsArray;
    // Set the response to output variable
    setOutput(constants.OUTPUT.VALIDATION_RESULTS, JSON.stringify(jsonOutput));
    // Write SARIF content to file
    fs.writeFileSync(constants.OUTPUT.VALIDATION_RESULTS_SARIF_FILE, JSON.stringify(sarifData, null, 2));
    // Write response content to file
    fs.writeFileSync(constants.OUTPUT.VALIDATION_RESULTS_JSON_FILE, JSON.stringify(jsonOutput, null, 2));

}
module.exports = {
    fetchValidationResults
};
