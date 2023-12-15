/**
 * 
 * Allows to upload the configuration data and check for the upload status
 */

const { setOutput, error, info, warning, debug } = require('@actions/core');
const { polling } = require('./do-polling');
const { doGet, doPost } = require('./do-devops-request');
const { normalizeNamePath, isEmpty, isArrayEmpty } = require('./utils');
const fs = require('fs');
const constants = require('./constants');
const path = require('path');
const { glob } = require('glob');

/**
 * Upload the files to the CDM repository and check the status.
 *
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} target - The target type (component, collection, deployable).
 * @param {string} appName - The name of the application.
 * @param {string} deployableName - The name of the deployable.
 * @param {string} collectionName - The name of the collection.
 * @param {string} dataFormat - The data format.
 * @param {boolean} autoCommit - Whether to auto-commit.
 * @param {string} configFilePath - The path to the configuration file.
 * @param {string} namePath - The name path.
 * @param {string} changesetNumber - The changeset number.
 * @param {string} dataFormatAttributes - Data format attributes.
 * @returns {Promise<string>} A promise that resolves to the changeset number.
 */
async function uploadConfig({
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
}) {
    info('UploadConfig begins....');
    const uploadFileEndpoint = getUploadFileEndpointForTarget(snInstanceURL, target);
    const queryParams = getQueryParamsForUpload(appName, deployableName, collectionName, dataFormat, configFilePath, dataFormatAttributes);
    const files = getAllFilesForConfigFilePath(configFilePath);
    let chsetNumber = changesetNumber;

    if(isArrayEmpty(files))
        throw new Error(`No files found for configFilePath: ${configFilePath}`);

    for(let index in files) {
        let file = files[index];
        let fileContent = getFileContent(file);
        let autoCommitFlag = (files.length-1  == index) ? autoCommit: false;
        queryParams.autoCommit = autoCommitFlag;
        queryParams.changesetNumber = chsetNumber;
        setNamePathForCurrentRequest(namePath, file, queryParams);
        let uploadId = await upload(uploadFileEndpoint, fileContent, queryParams);
        chsetNumber = await checkUploadStatus(snInstanceURL, uploadId, appName);
    }
    setOutput(constants.OUTPUT.CHANGESET_NUMBER, chsetNumber);
    return chsetNumber;
}

/**
 * Uploads the file to the CDM repository.
 *
 * @param {string} uploadFileEndpoint - The uploadFile endpoint url .
 * @param {string} fileContent - The fileContent to upload.
 * @param {Object} queryParams - The query params for the upload request.
 * @returns {Promise<string>} A promise that resolves to the upload ID after the upload request is successfully placed.
 */
async function upload(uploadFileEndpoint, fileContent, queryParams) {
    debug("upload begins...");
    const response = await doPost({
        url: uploadFileEndpoint,
        postData: fileContent,
        queryParams: queryParams,
    });
    debug("API response : " + JSON.stringify(response));
    const uploadId = response.result.upload_id;
    info(`uploadId: ${uploadId}\n`);
    return uploadId;

}

/**
 * Checks the upload status.
 *
 * @param {string} snInstanceURL - The ServiceNow instance URL.
 * @param {string} uploadId - The upload ID.
 * @param {string} application - The application name.
 * @returns {Promise<string>} A promise that resolves to the changeset number when the upload is successful.
 * @throws {Error} - Throws an error if the upload status is not `completed`.
 */
async function checkUploadStatus(snInstanceURL, uploadId, application) {
    debug("checkUploadStatus begins...");
    const uploadStatusEndpoint = `${snInstanceURL}${constants.API.UPLOAD_STATUS}/${uploadId}`;
    const uploadStatusTerminalStatesCheck = (response) => {
        const terminalStates = ['completed','error','expired'];
        return terminalStates.includes(response.result.state);
    };

    // Start polling
    const response = await polling(async () => {
        return await doGet({
            url: uploadStatusEndpoint,
            queryParams: null,
        });
    }, uploadStatusTerminalStatesCheck, constants.POLLING.UPLOAD_CONFIG_MAX_ATTEMPTS, constants.POLLING.UPLOAD_CONFIG_MAX_INTERVAL_MILLISECONDS);
    
    debug("API response : " + JSON.stringify(response));
    if(!response)
        throw new Error(`Maximum polling attempts reached. Upload request with id ${uploadId} is not processed yet.`);

    const { result, result: { state: uploadStatus } } = response;
    info(`uploadStatus for uploadId ${uploadId}: ${uploadStatus}\n`);

    if (uploadStatus == 'completed')
        return result.output.number;
    else if (uploadStatus == 'expired')
        throw new Error(`Upload request with id ${uploadId} is taking longer time causing it to expire.\n`);
    else
        throw new Error(`Upload failed due to : ${result.output}`);

}

/**
 * returns the endpoint that handles the file upload for the given target.
 * @param {string} snInstanceURL - the servicenow instance base url.
 * @param {string} target - one of component/collection/deployable.
 * @returns {string} the upload endpoint.
 * @throws {Error} - Throws an error target is not one of component/collection/deployable.
 */
function getUploadFileEndpointForTarget(snInstanceURL, target) {
    let uploadFileEndpoint = `${snInstanceURL}${constants.API.UPLOAD_CONFIG_DATA}`;
    switch (target) {
        case 'component':
            uploadFileEndpoint += "/components";
            break;
        case 'collection':
            uploadFileEndpoint += "/collections";
            break;
        case 'deployable':
            uploadFileEndpoint += "/deployables";
            break;
        default:
            throw new Error(`The input parameter target should be one of: component, collection, or deployable. The target provided is ${target}.`);
    }
    return uploadFileEndpoint;
}

/**
 * returns the query params object built based on the passed parameters.
 *
 * @param {string} appName - The name of the application.
 * @param {string} deployableName - The name of the deployable.
 * @param {string} collectionName - The name of the collection.
 * @param {string} dataFormat - The data format.
 * @param {string} configFilePath - The path to the configuration file.
 * @param {string} dataFormatAttributes - Data format attributes.
 * @returns {Object} A query params object.
 */
function getQueryParamsForUpload(appName, deployableName, collectionName, dataFormat, configFilePath, dataFormatAttributes) {
    return {
        appName: appName,
        dataFormat: dataFormat,
        autoValidate: 'false',
        publishOption: 'publish_none',
        collectionName: collectionName,
        deployableName: deployableName,
        dataFormatAttributes: dataFormatAttributes,
        autoDelete: 'true',
        deleteRedundantOverrides: 'false',
        ignoreAttributes: 'false'
    };
}

/**
 * returns the file content for the given file path.
 * @param {string} file - the file.
 * @returns {string} the file content.
 * @throws {Error} - Throws an error if file does not exist at the given path or fails to read the content.
 */
function getFileContent(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch(error) {
        throw new Error(`Error while reading the content from the file ${file} : ${error.message}`);
    }
}

/**
 * sets namePath on the queryParams.
 * @param {string} namePath - the namePath.
 * @param {string} file - the file.
 * @param {Object} queryParams - The query params for the upload request.
 * @returns None
 */
function setNamePathForCurrentRequest(namePath, file, queryParams) {
    let fileName = path.basename(file);

    if (!isEmpty(namePath))
        queryParams.namePath = normalizeNamePath(namePath).concat(constants.NAME_PATH_SEPARATOR).concat(fileName);
    else
        queryParams.namePath = fileName;

    info(`Effective namePath: ${queryParams.namePath}\n`);
}

/**
 * returns an array of file names that matches the pattern.
 * @param {string} configFilePath - pattern that match the files for upload.
 * @returns {Array<string>} array of file names matching the pattern.
 * @throws {Error} - Throws an error if there is an issue fetching the files using glob module.
 */
function getAllFilesForConfigFilePath(configFilePath) {
    try {
        return glob.sync(configFilePath, 
            { 
                ignore: ['node_modules/**'],
                nodir: true
            }
        );
    } catch(error) {
        throw new Error(`Error while trying to fetch the files matching the pattern ${configFilePath} : ${error.message}`);
    }

}

module.exports = { uploadConfig };
