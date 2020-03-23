'use strict';

const aws = require('aws-sdk');
const secretsManager = new aws.SecretsManager({ apiVersion: '2017-10-17', region: 'us-east-1' });
const SecretsManager = function SecretsManager() {};

SecretsManager.prototype.getSecret = async function (secretName, secretEntry) {

    return new Promise(function (resolve, reject) {
        let params = {
            SecretId: secretName
        };

        console.log(secretName, secretEntry);
    
        secretsManager.getSecretValue(params).promise().then(data => {
            let secretString = data.SecretString;
            let secretData = JSON.parse(secretString);
            
            if (secretData[secretEntry]) {
                resolve(secretData[secretEntry]);
            } else {
                reject(`Secrets Manager get secret error: Could not locate secret entry ${secretEntry} in ${secretName}`);
            }
        }).catch(err => {
            let error = `Secrets Manager get secret error: ${err}`;
            console.error(error);
            reject(error);
        });
    });
};

module.exports = SecretsManager;