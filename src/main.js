const { getInput, setOutput, setFailed, info, warning } = require('@actions/core');
const { uploadConfig } = require('./lib/upload-config');
const { fetchSnapshot } = require('./lib/fetch-snapshot');
const { validateSnapshot } = require('./lib/validate-snapshot');
const { publishSnapshot } = require('./lib/publish-snapshot');
const { fetchValidationResults } = require('./lib/validation-results');
const authHeader = require('./lib/auth-header');
const constants = require('./lib/constants');

const main = async() => {
    try {
        let snInstanceURL = getInput('instance-url', { required: true });
        const snUser = getInput('devops-integration-username', { required: true });
        const snPassword = getInput('devops-integration-user-password', { required: true });
        const target = getInput('target', { required: true });
        const appName = getInput('application-name', { required: true });
        const collectionName = getInput('collection-name');
        const deployableName = getInput('deployable-name', { required: true });
        const dataFormat = getInput('data-format', { required: true });
        const autoValidate = getInput('auto-validate', { required: true });
        const autoCommit = getInput('auto-commit', { required: true });
        const autoPublish = getInput('auto-publish', { required: true });
        const configFilePath = getInput('config-file-path', { required: true });
        const namePath = getInput('name-path');
        const dataFormatAttributes = getInput('data-format-attributes');
        const snapshotValidationTimeoutInMin = getInput('snapshot-validation-timeout', { required: true });
        let changesetNumber = getInput('changeset');
        const terminateOnPolicyValidationFailures = getInput('terminate-on-policy-validation-failures', { required: true });

        // input validation
        if(isNaN(String(snapshotValidationTimeoutInMin)) || Number(snapshotValidationTimeoutInMin) <= 0) {
            throw new Error(`The value of snapshot-validation-timeout flag should be a number greater than 0. Value is ${snapshotValidationTimeoutInMin}. Further evaluation of the action is stopped.`);
        }

        snInstanceURL = snInstanceURL.trim();
        if (snInstanceURL.endsWith('/'))
            snInstanceURL = snInstanceURL.slice(0, -1);

        // Init authHeader with the credentials
        authHeader.init(snUser, snPassword)

        changesetNumber = await uploadConfig({
            snInstanceURL,
            target,
            appName,
            deployableName,
            collectionName,
            dataFormat,
            autoCommit,
            configFilePath,
            namePath,
            changesetNumber,
            dataFormatAttributes
        });

        // Stop further evaluation of the action if autoCommit is not true
        if ("true" !== String(autoCommit).toLowerCase()) {
            info(`The auto-commit input argument is set to ${String(autoCommit)}. Further evaluation of the action was stopped.`)
            return;
        }
        // Stop further evaluation of the action if autoValidate is not true
        else if ("true" !== String(autoValidate).toLowerCase()) {
            info(`The auto-validate input argument is set to ${String(autoValidate)}. Further evaluation of the action was stopped.`)
            return;
        }
        
        const snapshotRec = await fetchSnapshot({
            snInstanceURL,
            appName,
            deployableName,
            changesetNumber
        });


        // Perform the validation on snapshot.
        const validationStatus = await validateSnapshot({
            snInstanceURL,
            snapshotRec,
            snapshotValidationTimeoutInMin
        });

        let publishStatus = false;
        if ("true" === String(autoPublish).toLowerCase()) {
            // Publish the snapshot if not already.
            publishStatus = await publishSnapshot({
                snInstanceURL,
                validationStatus,
                snapshotRec
            });
        }
        else
        {
            info(`The auto-publish input argument is set to ${String(autoPublish)}. No snapshot will be published in this action.`)
        }

        // Fetch validation results of the snapshot
        await fetchValidationResults({
            snInstanceURL,
            appName,
            deployableName,
            validationStatus,
            publishStatus,
            snapshotRec
        });
        // Terminate the flow based on the flag
        if("true" === String(terminateOnPolicyValidationFailures).toLowerCase() && !constants.SNAPSHOT.VALIDATION_PASS_STATES.includes(validationStatus))
            throw new Error(`Validation failed for the snapshot '${snapshotRec.name}'. The validation status of the snapshot is ${validationStatus}.`)

    } catch (error) {
        setFailed(error.message);
    }
}

main();
