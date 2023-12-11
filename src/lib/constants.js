const NAME_PATH_SEPARATOR = "�";
const LEGACY_NAME_PATH_SEPARATOR = "/";
const POLLING = {
"DEFAULT_MAX_INTERVAL_MILLISECONDS" : 5000,
"DEFAULT_MAX_ATTEMPTS" : 25,
"UPLOAD_CONFIG_MAX_INTERVAL_MILLISECONDS" : 7000,
"UPLOAD_CONFIG_MAX_ATTEMPTS" : 70,
"SNAPSHOT_VALIDATION_MAX_INTERVAL_MILLISECONDS" : 60000
};
const SNAPSHOT = {
    TERMINAL_STATES : [ "created", "error", "none" ],
    STATUS_CREATED : "created",
    STATUS_ERROR : "error",
    STATUS_NONE : "none",
    VALIDATION_PASS_STATES :[ "passed", "passed_with_exception" ],
    VALIDATION: {
        STATE: {
            REQUESTED: "requested",
            NOT_VALIDATED: "not_validated",
            IN_PROGRESS: "in_progress",
            PASSED: "passed",
            PASSED_WITH_EXCEPTION: "passed_with_exception",
            FAILED: "failed",
            EXECUTION_ERROR: "execution_error"
        },
        TERMINAL_STATES: ["not_validated", "passed", "passed_with_exception", "failed", "execution_error"]
    }
};
const API = {
    IMPACTED_DEPLOYABLES : "/api/sn_cdm/changesets/impacted-deployables",
    UPLOAD_CONFIG_DATA : "/api/sn_cdm/applications/uploads",
    UPLOAD_STATUS : "/api/sn_cdm/applications/upload-status",
    CDM_CHANGESET_TABLE : "/api/now/table/sn_cdm_changeset",
    CDM_SNAPSHOT_TABLE : "/api/now/table/sn_cdm_snapshot",
    CDM_SNAPSHOT_VALIDATE : "/api/sn_cdm/snapshots/%s/validate",
    CDM_SNAPSHOT_PUBLISH : "/api/sn_cdm/snapshots/%s/publish",
    CDM_POLICY_VALIDATION_RESULT : "/api/now/table/sn_cdm_policy_validation_result"
};
const OUTPUT = {
    VALIDATION_STATUS : "validation-status",
    CHANGESET_NUMBER : "changeset-number",
    SNAPSHOT_NAME : "snapshot-name",
    VALIDATION_RESULTS : "validation-results",
    VALIDATION_RESULTS_SARIF_FILE : "validation-results.sarif",
    VALIDATION_RESULTS_JSON_FILE : "validation-results.json"
};
module.exports = {
    NAME_PATH_SEPARATOR,
    LEGACY_NAME_PATH_SEPARATOR,
    POLLING,
    SNAPSHOT,
    API,
    OUTPUT
};
