'use strict';

const axios = require('axios').default;
const Logger = function Logger(config) {
    this.url = config.url;
    this.token = config.token;
    this.payloads = [];
    this.environment = config.environment;
};

Logger.prototype.logEvent = function logEvent(payload) {
    this.payloads.push(JSON.stringify(payload));
};

Logger.prototype.flushAsync = async function flushAsync() {

    let payload = JSON.parse(JSON.stringify(this.payloads.join('')));
    let config = {
        headers: {
            Authorization: `Splunk ${this.token}`,
        }
    };

    let result = await axios.post(this.url, payload, config).then((response) => {
        let responseSummary = {
            status: response.status,
            text: response.data.text
        };

        return responseSummary;
    }).catch((err) => {
        return {
            text: err.message,
            code: err.code,
        }
    });

    return result;
};

module.exports = Logger;
