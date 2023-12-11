/**
 * Storing the credentials/tokens needed for authenticating to ServiceNow instance.
 */
const authHeader = {
    snUser: null,
    snPassword: null,

    /**
     * Initialize the authHeader with the provided credentials.
     * @param {string} snUser - The ServiceNow username.
     * @param {string} snPassword - The ServiceNow password.
     */
    init: function(snUser, snPassword) {
        this.snUser = snUser;
        this.snPassword = snPassword;
    },

    /**
     * Create the required authentication header for HTTP requests.
     * @returns {Object} - An object containing the HTTP headers for authentication.
     */
    getAuthHeader() {
        const base64Credentials = Buffer.from(`${this.snUser}:${this.snPassword}`).toString('base64');
        return {
            'Authorization': `Basic ${base64Credentials}`,
            'Content-Type': 'text/plain',
        };
    },
};

module.exports = authHeader;
