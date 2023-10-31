const core = require('@actions/core');

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

    console.log('UploadConfig begins....');
}

module.exports = { uploadConfig };