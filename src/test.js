const handler = require('./handler');
const zlib = require('zlib');

// note, cloudwatch events seem to be in epoch format: 1583490141525,
// so they still need to be divided by 1000 to get a valid timestamp for Splunk.
// The handler handles this division as it pushes logs to the splunkLogger module.

const currentEpochTime = new Date().getTime();
const rawCloudWatchEvent = {
    "messageType": "DATA_MESSAGE",
    "owner": "123456789000",
    "logGroup": "/aws/lambda/somehost-xyz_nonprod_myapp_mycomponent",
    "logStream": "info/test/1bb25899-12f9-47c7-82a6-3da2140cc380",
    "subscriptionFilters": [
        "testing"
    ],
    "logEvents": [
        {
            "id": "22313010293812740119828441488434332332452187456210010112",
            "timestamp": currentEpochTime,
            "message": "this is a test message 1"
        },
        {
            "id": "22313010327130053446433192461888695431788839546144751617",
            "timestamp": currentEpochTime + 1,
            "message": "this is a test message 2"
        }
    ]
}

let input = Buffer.from(JSON.stringify(rawCloudWatchEvent));
zlib.gzip(input, (err, compressedData) => {
    if (err) {
        console.log("error in gzip compression using zlib module", err);
    } else {
        
        let encodedCompressed = Buffer.from(compressedData).toString('base64');
        let event = {
            "awslogs": {
                "data": encodedCompressed
            }
        }

        let context = {
            functionVersion: '$LATEST',
            functionName: 'somehost-localdev-test',
            memoryLimitInMB: '512',
            logGroupName: rawCloudWatchEvent.logGroup,
            logStreamName: '2020/03/06/[$LATEST]f1935ed191f0489cb1d78ec0f9f5ab05',
            clientContext: undefined,
            identity: undefined,
            invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:somehost-foo-bar',
            awsRequestId: '4567b7eb-3bc3-4f2b-8e8c-126d5c37779e',
        };

        handler.sendToSplunk(event, context);
    }
});
