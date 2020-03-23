'use strict';

const zlib = require('zlib');
const CloudwatchHelper = function Helper() {};
const regexPattern = process.env.LOG_GROUP_NAME_REGEX;

CloudwatchHelper.prototype.gunZip = async function (compressedData) {
    return new Promise(function (resolve, reject) {
        zlib.gunzip(compressedData, (err, decompressed) => {
            if (err) {
                reject(err);
            } else {
                resolve(decompressed);
            }
        });
    });
}

CloudwatchHelper.prototype.getLogGroupDetails = async function (parsedEvent) {
    return new Promise(function (resolve, reject) {
        
        if (parsedEvent.logGroup && parsedEvent.logStream) {
            const regex = regexPattern;
            if (regex.test(parsedEvent.logGroup)) {
                let logGroupSplit = parsedEvent.logGroup.split("_");
                let environment = logGroupSplit[1];
                let appName = logGroupSplit[2];
                let componentName = logGroupSplit[3];
                let details = { 
                    logGroup: parsedEvent.logGroup,
                    logStream: parsedEvent.logStream,
                    environment: environment,
                    application: appName,
                    appComponent: componentName,
                    logGroupName: parsedEvent.logGroup
                };

                return resolve(details);
            } else {
                return reject(`logGroupName '${parsedEvent.logGroup}' does not match required naming convention.`);
            }
        } else {
            return reject('required logGroup and logStream properties do not exist in parsedEvent.');
        }
    }).catch((err) => {
        throw new Error(`Failed while getting cloudwatch log details from Lambda parsedEvent: ${err}`);
    });
}

module.exports = CloudwatchHelper;