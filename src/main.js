const {getInput, setOutput, setFailed, info, warning} = require('@actions/core');
const axios = require('axios');
const { uploadConfig } = require('./lib/upload-config');

const main = async() => {
    try {
      const snInstance = getInput('instance-url', { required: true });
      const snUser = getInput('devops-integration-user-name', { required: true });
      const snPassword = getInput('devops-integration-user-password', { required: true });
      const target = getInput('target', { required: true });
      const appName = getInput('application-name', { required: true });
      const collectionName = getInput('target-name');
      const deployableName = getInput('deployable-name');
      const dataFormat = getInput('data-format', { required: true });
      const autoValidate = getInput('auto-validate', { required: true });
      const autoCommit = getInput('auto-commit', { required: true });
      const configFilePath = getInput('config-file-path', { required: true });
      const namePath = getInput('name-path');
      const changesetNumber = getInput('changeset');
    } catch (error) {
      setFailed(error.message);
    }
    try {
      response = await uploadConfig({
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
      });
    } catch (err) {
        setFailed(error.message);
    }
}

main();
