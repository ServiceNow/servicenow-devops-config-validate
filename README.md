# ServiceNow DevOps Config Validate GitHub Action

This custom action needs to be added at the step level in a GitHub job to upload and validate configuration data in a ServiceNow instance and terminate the associated GitHub workflow upon policy validation failures.

# Prerequisites
The DevOps Config Validate GitHub Action requires Node v16 or later versions. However, the GitHub Actions runner images come with pre-installed Node.js versions. See [actions/runner-images](https://github.com/actions/runner-images).
To install a specific Node.js version, run the following step in your GitHub job:
```yaml
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: 16
```
Where, the node-version input is the specific node version that you want to install; for example, `16` for Node v16 in the step.

# Usage
## Step 1: Configure secrets in your GitHub ogranization or GitHub repository.
In GitHub, go to your organization settings or repository settings, and then navigate to **Secrets > Actions** and create the following secrets:
- `SN_INSTANCE_URL` your ServiceNow instance URL, for example, `https://<instance name>.service-now.com`
- `SN_DEVOPS_CONFIG_USERNAME`
- `SN_DEVOPS_CONFIG_PASSWORD`

## Step 2: Identify the upstream job that you must complete before running the job that uses the custom action.
Refer to the workflow samples for usage:

-  [uploading_config_files_to_deployable.yml](.github/workflows/uploading_config_files_to_deployable.yml)
-  [uploading_config_files_to_collection.yml](.github/workflows/uploading_config_files_to_collection.yml)
-  [uploading_config_files_to_component.yml](.github/workflows/uploading_config_files_to_component.yml)
-  [upload_mulitple_files_in_single_commit.yml](.github/workflows/upload_mulitple_files_in_single_commit.yml)

## Step 3: Customize your action inputs based on your DevOps Config data model schema.

You can refer to the following examples for different upload scenarios:
### Uploading config files to a deployable
```yaml
upload_and_validate_job:
    name: Upload and validate
    needs: <upstream job>
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow Devops Config Validate
        uses: ServiceNow/servicenow-devops-config-validate@v1.0.0-beta
        with:
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          devops-integration-username: ${{ secrets.SN_DEVOPS_CONFIG_USERNAME }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_CONFIG_PASSWORD }}
          application-name: PaymentDemo
          target: deployable
          deployable-name: Production
          name-path: web-api-v1.0
          auto-commit: true
          auto-validate: true
          auto-publish: true
          config-file-path: data/k8s/helm/*.yml
          data-format: yaml
          snapshot-validation-timeout: 60
          terminate-on-policy-validation-failures: true
```

### Uploading config files to a collection
```yaml
upload_and_validate_job:
    name: Upload and validate
    needs: <upstream job>
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow Devops Config Validate
        uses: ServiceNow/servicenow-devops-config-validate@v1.0.0-beta
        with:
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          devops-integration-username: ${{ secrets.SN_DEVOPS_CONFIG_USERNAME }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_CONFIG_PASSWORD }}
          application-name: PaymentDemo
          target: collection
          deployable-name: Production
          collection-name: release-1.0
          name-path: web-api-v1.0
          auto-commit: true
          auto-validate: true
          auto-publish: true
          config-file-path: data/k8s/helm/*.yml
          data-format: yaml
          snapshot-validation-timeout: 60
          terminate-on-policy-validation-failures: true
```
### Uploading config files to a component
```yaml
upload_and_validate_job:
    name: Upload and validate
    needs: <upstream job>
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow Devops Config Validate
        uses: ServiceNow/servicenow-devops-config-validate@v1.0.0-beta
        with:
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          devops-integration-username: ${{ secrets.SN_DEVOPS_CONFIG_USERNAME }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_CONFIG_PASSWORD }}
          application-name: PaymentDemo
          target: component
          deployable-name: Production
          name-path: web-api-v1.0
          auto-commit: true
          auto-validate: true
          auto-publish: true
          config-file-path: data/k8s/helm/*.yml
          data-format: yaml
          snapshot-validation-timeout: 60
          terminate-on-policy-validation-failures: true
```
###  Uploading multiple config files in a single commit
```yaml
upload_and_validate_job:
    name: Upload and validate
    
    needs: <upstream job>
    runs-on: ubuntu-latest
    # Upload an XML file to a component
    steps:     
      - name: ServiceNow Devops Config Validate
        id: upload_and_validate_xml
        uses: ServiceNow/servicenow-devops-config-validate@v1.0.0-beta
        with:
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          devops-integration-username: ${{ secrets.SN_DEVOPS_CONFIG_USERNAME }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_CONFIG_PASSWORD }}
          application-name: PaymentDemo
          target: component
          deployable-name: Production
          name-path: web-api-v1.0
          auto-commit: false
          auto-validate: true
          auto-publish: true
          config-file-path: data/infra/v1/*.xml
          data-format: xml
          snapshot-validation-timeout: 60
          terminate-on-policy-validation-failures: true

    # Upload a JSON file to the vars folder of a deployable
    steps:     
      - name: ServiceNow Devops Config Validate
        id: upload_and_validate_json
        uses: ServiceNow/servicenow-devops-config-validate@v1.0.0-beta
        with:
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          devops-integration-username: ${{ secrets.SN_DEVOPS_CONFIG_USERNAME }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_CONFIG_PASSWORD }}
          application-name: PaymentDemo
          target: component
          deployable-name: Production
          name-path: web-api-v1.0
          auto-commit: true
          auto-validate: true
          auto-publish: true
          config-file-path: data/infra/prod/*.json
          data-format: json
          snapshot-validation-timeout: 60
          terminate-on-policy-validation-failures: true
          changeset : ${{ steps.upload_and_validate_xml.outputs.changeset-number }}
```


## Inputs 

### `instance-url`

**Required.**  ServiceNow instance URL. 

### `devops-integration-username`

**Required.**  DevOps Config integration username. 

### `devops-integration-user-password`

**Required.**  DevOps Config integration user password. 

### `application-name`

**Required.**  DevOps Config application name.

### `target`

**Required.**  Data model target where configuration files are uploaded. Example: `component`, `collection`, `deployable`

### `deployable-name`

**Required.**  Deployable name in the DevOps Config data model.

### `collection-name`

Collection name in the data model. Required when target is collection.

### `name-path`

Name path of the node in the data model where the configuration files are uploaded.

### `config-file-path`

**Required**  File path when uploading a single file or file path pattern based on the Ant-style pattern when uploading multiple files to the data model. See [Directory-based Tasks](https://ant.apache.org/manual/dirtasks.html) for information on Ant-style patterns.

### `data-format`

**Required.**  Data format of the configuration files. Example: `CSV`, `INI`, `JSON`, `Properties`, `RAW`, `XML`, `YAML`

### `data-format-attribute`

Extended data format attributes for parsing configuration data.

### `auto-commit`

**Required.**  Boolean (true or false) input to commit configuration data upon successful upload.  
**Default value**: `true`

### `auto-validate`  
**Required.**  Boolean (true or false) input to validate configuration data upon successful commit.  
**Default value**: `true`

### `auto-publish`  
**Required.**  Boolean (true or false) input to publish configuration data upon successful validation.  
**Default value**: `true`

### `changeset`  
Open changeset associated with the upload action. If not provided, a new changeset is created.

### `snapshot-validation-timeout`  
Maximum time in minutes for validation to complete before failing the action.  
**Default value**: `60`

### `terminate-on-policy-validation-failures`  
Boolean (true or false) input to terminate the GitHub workflow upon policy validation failures.   
**Default value**: `false`

## Outputs

### `changeset-number`  
Changeset number associated with the upload action.

### `snapshot-name`  
Name of the latest snapshot of the deployable.

### `validation-status`  
Validation status of the snapshot. Example: `passed`, `passed_with_exception`, `failed`, `execution_error`, `not_validated`

### `validation-results`  
Validation results in the JSON format for the snapshot.

# Notices

## Support Model  
ServiceNow customers may request support through the [Now Support (HI) portal](https://support.servicenow.com/nav_to.do?uri=%2Fnow_support_home.do).

## Governance Model  
Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers.
