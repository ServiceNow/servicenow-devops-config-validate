const {getInput, setOutput, setFailed, info, warning} = require('@actions/core');
const axios = require('axios');
const { uploadConfig } = require('./lib/upload-config');


const main = async() => {
    try {
      let snInstanceURL = getInput('instance-url', { required: true });
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
      const dataFormatAttributes = getInput('data-format-attributes');
      const changesetNumber = getInput('changeset');

      snInstanceURL = snInstanceURL.trim();
      if (snInstanceURL.endsWith('/'))
        snInstanceURL = snInstanceURL.slice(0, -1);
        
      response = await uploadConfig({
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
        changesetNumber,
        dataFormatAttributes
      });
    } catch (error) {
        setFailed(error.message);
    }
}

main();
