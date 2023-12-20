const { setOutput, info, warning, error, debug } = require('@actions/core');
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
    appName,
    deployableName,
    validationStatus,
    publishStatus,
    snapshotRec
}) {

    info('FetchValidationResults begins....');

    const response = await fetchResults(snInstanceURL, deployableName, snapshotRec);
    await generateValidationResults(response, appName, deployableName, snapshotRec, validationStatus, publishStatus);
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
        sysparm_query: `snapshot.sys_id=${snapshotRec.sysId}^is_latest=true^ORDERBYpolicy.name`,
        sysparm_fields: "policy.name,node_path_ui,description,type,policy_execution.output"
    };
    response = await doGet({
        url: cdmPolicyValidationResultEndpoint,
        queryParams: queryParams,
    });

    if (!response || isArrayEmpty(response.result))
        warning(`No validation results available for the deployable '${deployableName}' because it has no associated policies.`);

    debug("API response : " + JSON.stringify(response));

    return response;
}

/**
 * Add a result to a policy map. If the policy name exists in the map, the result
 * is pushed to the existing array. If the policy name doesn't exist, a new array
 * is created with the result and set as the value for the key.
 *
 * @param {Map<string, Array>} policyMap - The Map representing policies with associated results.
 * @param {string} policyName - The name of the policy.
 * @param {*} result - The result to be added to the policy.
 * @returns {void}
 */
function addResultToPolicyMap(policyMap, policyName, result) {
  // Check if the key exists in the map
  if (policyMap.has(policyName)) {
    // Key exists, push the element to the existing array
    policyMap.get(policyName).push(result);
  } else {
    // Key doesn't exist, create a new array with the element and set it as the value
    policyMap.set(policyName, [result]);
  }
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
async function generateValidationResults(response, appName, deployableName, snapshotRec, validationStatus, publishStatus) {
    // Array for keeping policy names
    let failedPolicies = new Set();
    let warningPolicies = new Set();
    let passedWithExceptionPolicies = new Set();
    let failedPoliciesResultMap = new Map();
    let warningPoliciesResultMap = new Map();
    let passedPoliciesResultMap = new Map();
    
    let jsonOutput = {};
    jsonOutput.sys_id = snapshotRec.sysId;
    jsonOutput.name = snapshotRec.name;
    jsonOutput.deployableName = deployableName;
    // If snapshot is already published and auto publish is false, then we need to set the status of latest snapshot.
    jsonOutput.published = snapshotRec.publishedStatus === "true" ? true : publishStatus;
    jsonOutput.validation = validationStatus;

    // Set the github annotation errors for failed policies.
    response.result.forEach(result => {
        // Get the policy execution output
        const policyExecution = JSON.parse(result['policy_execution.output']);
        result.decision = policyExecution.decision;
        // Delete the policy_execution.output as it has redundant informations same as sn_cdm_policy_validation_result
        delete result['policy_execution.output'];
        if (result.decision === 'compliant_with_exception') {
            if (!passedWithExceptionPolicies.has(result["policy.name"])) {
                passedWithExceptionPolicies.add(result["policy.name"]);
                info(`Policy '${result["policy.name"]}' is passed with exception.`);
            }
            addResultToPolicyMap(passedPoliciesResultMap, result["policy.name"], result);
        }
        else if (result.type === 'failure') {
            if (!failedPolicies.has(result["policy.name"])) {
                failedPolicies.add(result["policy.name"]);
                error(`Policy '${result["policy.name"]}' is non-compliant. Check the validation results for details.`);
            }

            addResultToPolicyMap(failedPoliciesResultMap, result["policy.name"], result);

        } else if (result.type === 'warning') {
            if (!warningPolicies.has(result["policy.name"])) {
                warningPolicies.add(result["policy.name"]);
                warning(`Policy '${result["policy.name"]}' resulted in warnings. Check the validation results for details.`);
            }

            addResultToPolicyMap(warningPoliciesResultMap, result["policy.name"], result);

        } else {
            addResultToPolicyMap(passedPoliciesResultMap, result["policy.name"], result);
        }
    });
    // Arrange the results in the order or failed, warning and info.
    jsonOutput.result = [...failedPoliciesResultMap.values(), ...warningPoliciesResultMap.values(), ...passedPoliciesResultMap.values()].flat();
    // Generate the sarif data.
    const sarifData = generateSarifResults(snapshotRec, appName, failedPolicies, warningPolicies, failedPoliciesResultMap, warningPoliciesResultMap);
    // Set the response to output variable
    setOutput(constants.OUTPUT.VALIDATION_RESULTS, JSON.stringify(jsonOutput));
    // Write SARIF content to file
    fs.writeFileSync(constants.OUTPUT.VALIDATION_RESULTS_SARIF_FILE, JSON.stringify(sarifData, null, 2));
    // Write response content to file
    fs.writeFileSync(constants.OUTPUT.VALIDATION_RESULTS_JSON_FILE, JSON.stringify(jsonOutput, null, 2));

}

/**
 * Generate SARIF results based on failed and warning policies.
 *
 * @param {Object} snapshotRec - The snapshot record.
 * @param {string} appName - The application name.
 * @param {Set<string>} failedPolicies - Set of failed policy names.
 * @param {Set<string>} warningPolicies - Set of warning policy names.
 * @param {Map<string, Object>} failedPoliciesResultMap - Map containing failed policy results.
 * @param {Map<string, Object>} warningPoliciesResultMap - Map containing warning policy results.
 * @returns {Object} - SARIF results object.
 */
function generateSarifResults(snapshotRec, appName, failedPolicies, warningPolicies, failedPoliciesResultMap, warningPoliciesResultMap) {

    // Prepare the rules for failed and warning policies
    let failedPoliciesRulesSarifArray = [];
    let failedPoliciesRulesResultSarifArray = [];
    let warningPoliciesRulesSarifArray = [];
    let warningPoliciesRulesResultSarifArray = [];
    for (const policyName of failedPolicies) {
        failedPoliciesRulesSarifArray.push({
            "id": `${snapshotRec.name}:${policyName}`,
            "name": policyName,
            "shortDescription": {
                "text": `${snapshotRec.name}:${policyName}`
            },
            "fullDescription": {
                "text": `application.name: ${appName}, snapshot.name: ${snapshotRec.name}`
            },
            "defaultConfiguration": {
                "level": "error",
            }
        });
        failedPoliciesRulesResultSarifArray.push({
            "ruleId": `${snapshotRec.name}:${policyName}`,
            "kind": "fail",
            "message": {
                "text": JSON.stringify(failedPoliciesResultMap.get(policyName))
            },
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {
                        "uri": snapshotRec.name
                    }
                }
            }]
        })
    }

    for (const policyName of warningPolicies) {
        warningPoliciesRulesSarifArray.push({
            "id": `${snapshotRec.name}:${policyName}`,
            "name": policyName,
            "shortDescription": {
                "text": `${snapshotRec.name}:${policyName}`
            },
            "fullDescription": {
                "text": `application.name: ${appName}, snapshot.name: ${snapshotRec.name}`
            },
            "defaultConfiguration": {
                "level": "warning",
            }
        });
        warningPoliciesRulesResultSarifArray.push({
            "ruleId": `${snapshotRec.name}:${policyName}`,
            "message": {
                "text": JSON.stringify(warningPoliciesResultMap.get(policyName))
            },
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {
                        "uri": snapshotRec.name
                    }
                }
            }]
        })
    }
    // Return the final sarif file
    return {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "Devops config policy content pack",
                    "version": "1.2.0",
                    "fullName": "Devops config policy content pack",
                    "rules": [...failedPoliciesRulesSarifArray, ...warningPoliciesRulesSarifArray]
                }
            },
            "results": [...failedPoliciesRulesResultSarifArray, ...warningPoliciesRulesResultSarifArray]
        }]
    };
}

module.exports = {
    fetchValidationResults
};
