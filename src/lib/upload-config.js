const { getInput, setOutput, setFailed, info, warning } = require('@actions/core');
const { exponentialPolling } = require('./do-polling');
const { doGet, doPost } = require('./do-request');
async function uploadConfig({
	snInstanceURL,
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
	const uploadId = await upload(snInstanceURL, snUser, snPassword, target, appName, deployableName, collectionName, dataFormat, autoValidate, autoCommit, configFilePath, namePath, changesetNumber);
	await checkUploadStatus(snInstanceURL, snUser, snPassword, uploadId, appName);

}

async function upload(snInstanceURL, snUser, snPassword, target, appName, deployableName, collectionName, dataFormat, autoValidate, autoCommit, configFilePath, namePath, changesetNumber) {
	let uploadFileEndpoint = `${snInstanceURL}/api/sn_cdm/applications/uploads/`;

	let queryParams = {
		appName: appName,
		dataFormat: dataFormat,
		autoCommit: autoCommit,
		autoValidate: autoValidate,

	};

	if (changesetNumber && changesetNumber !== '') {
		queryParams.changesetNumber = changesetNumber;
	}

	if (deployableName && deployableName !== '') {
		queryParams.deployableName = deployableName;
	}

	if (collectionName && collectionName !== '') {
		queryParams.collectionName = collectionName;
	}

	if (namePath && namePath !== '') {
		queryParams.namePath = namePath;
	}

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
			error(`Target should be one of: component, collection, or deployable, ${target} provided.`);
			return;
	}

	const fileContents = '{ "key_001" : "value_001" }'

	const response = await doPost({
			url: uploadFileEndpoint,
			username: snUser,
			passwd: snPassword,
			postData: fileContents,
			queryParams: queryParams,
		});

	return response.result.upload_id;

}

async function checkUploadStatus(snInstanceURL, snUser, snPassword, uploadId, application, failOnPolicyError) {
	const uploadStatusEndpoint = `${snInstanceURL}/api/sn_cdm/applications/upload-status/${uploadId}`;
	const conditionCheck = (response) => {
		// Wait till state is completed
		return response.result.state == "completed";
	};

	// Start polling
	const response = await exponentialPolling(async () => {
		const queryParams = {
			param1: 'value1',
			param2: 'value2',
		};

		return await doGet({
			url: uploadStatusEndpoint,
			username: snUser,
			passwd: snPassword,
			queryParams: queryParams,
		});
	}, conditionCheck);

	info(`Status of uploadId ${uploadId} : ${response.result.state}`);
	setOutput('changeset-number', response.result.output.number);
	return response.result.output.number;
}

module.exports = { uploadConfig };
