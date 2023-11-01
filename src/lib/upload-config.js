const { getInput, setOutput, setFailed, info, warning } = require('@actions/core');
const { exponentialPolling } = require('./do-polling'); 
const { doGet, doPost } = require('./do-request');
async function uploadConfig({
	snInstance,
	snUser,
	snPassword,
	target,
	appName,
	deployableName,
	collectionName,
	dataFormat,
	autoValidate,
	autoCommit,
	configFilePath,
	namePath,
	changesetNumber
}) {
	info('UploadConfig begins....');
	// Define query parameters as an object
	const uploadId = "dc7d8fe84352311010eb598e75b8f2b0";
	await checkUploadStatus(snInstance, snUser, snPassword, uploadId, appName);
}

async function checkUploadStatus(snInstance, snUser, snPassword, uploadId, application, failOnPolicyError) {
	const uploadAPIEndpoint = `${snInstance}/api/sn_cdm/applications/upload-status/${uploadId}`;
	const conditionCheck = (response) => {
		// Replace with your specific condition check logic
		return response !== null;
	};

	// Start polling
	const response = await exponentialPolling(async () => {
		const queryParams = {
			param1: 'value1',
			param2: 'value2',
		};

		return await doGet({
			url: uploadAPIEndpoint,
			username: snUser,
			passwd: snPassword,
			queryParams: queryParams,
		});
	}, conditionCheck);
	
	info(JSON.stringify(response));
}

module.exports = { uploadConfig };
