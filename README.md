# cloudwatch-log-group-lambda-to-splunk-hec

A Lambda service that ingests CloudWatch logs (via triggered event inputs from CloudWatch Log Groups), base64 decodes, decompresses, and then forwards them over to a Splunk HEC for ingestion there.

The service will reject logs that don't use a specific convention for their log group name. This is because we parse the log group to derive additional fields for the logs like application name and environment.

The correct CloudWatch Log Group naming convention to use for input triggers is:

`/aws/lambda/somestring-xyz_exampleenvironment_my-test-app_my-app-component`

Where underscores (`_`) are the split characters and:

* `/aws/lambda/` is the starting log group name prefix. Currently we're only supporting and ingesting Lambda CloudWatch logs. More will be added if needed.
* `somestring-xyz` is an alphanumerical string that has to start with `somestring-`. You can put anything else here that you like, before the next underscore.
* `exampleenvironment` is the name of your environment (can be alphanumerical and contain dashes if you want). E.g. "nonprod" or "nonprod1"
* `my-test-app` is the name of your environment (can be alphanumerical and contain dashes if you want). E.g. "myapp" or "my-test-123-app"
* `my-app-component` is the name of your application component (can be alphanumerical and contain dashes if you want). E.g. "user-service" or "mapservice123"

## Splunk HEC Setup

Configure a Splunk HEC token with source type of `_json`. Disable confirmation requirements.

## Deployment

Use serverless framework to deploy.

```
serverless deploy --stage test \
  --iamRole arn:aws:iam::123456789012:role/lambda-vpc-execution-role \
  --securityGroupId sg-12345 \
  --privateSubnetA subnet-123 \
  --privateSubnetB subnet-456 \
  --privateSubnetC subnet-789 \
  --splunkHecUrl https://your-splunk-hec:8088/services/collector \
  --secretManagerItemName your/secretmanager/entry/here
```

The Lambda serverless project is configured to deploy to Lambda in VPC mode. This is so that the Lambda function has access to internal Splunk.

## Working in Dev

First do: `npm install` in the src directory to install the zlib and AWS SDK dev dependencies.

You may wish to employ a bunch of techniques to help with dev and testing. For testing see the Testing section.

For logs and live debugging, you can tail the lambda logs with serverless:

`sls logs -f postToSplunkHec --tail`

Then use something like this to throw some logs into CloudWatch so that the trigger will send these to your lambda function:

`aws logs put-log-events --log-group-name "/aws/lambda/somehost-xyz/testenvironment/my-test-app/my-app-component" --log-stream-name 20200310 --log-events file://~/Desktop/testevents.json`

(Note you will need to create the log group and add it as a trigger to the lambda function first, and also create the testevents.json file on your machine). E.g testevents.json file:

```
[
  {
    "timestamp": 1583932561001,
    "message": "Example Event 1"
  },
  {
    "timestamp": 1583932561002,
    "message": "Example Event 2"
  },
  {
    "timestamp": 1583932561003,
    "message": "Example Event 3"
  }
]
```

Also note, the above `aws logs put-log-events` command will work for the first batch of logs sent to a stream, for further put operations you'll need to include a sequence token. i.e.

`aws logs put-log-events --log-group-name "/aws/lambda/somehost-anything-goes-here_exampleenvironment_my-test-app_my-app-component" --log-stream-name 20200310 --sequence-token 49604419869314427246230109789947028469807372758929385010 --log-events file://~/Desktop/testevents.json`

## Testing

You can test locally using the included `test.js` script.

This script has a sample JSON blob of data with a couple of test events. The test script will compress this to gzip compressed format, base64 encode it, and then pass it into the main Lambda Handler `handler.js` script as an event, just as the live Lambda environment would receive it as an event from CloudWatch Logs.

To use the `test.js` script, just update (locally only) the `handler.js` script section to configure the logger with a valid test environment Splunk HEC token. i.e.

```
const loggerConfig = {
    url: process.env.SPLUNK_HEC_URL || "https://splunkhec.somehost-abc.foo.bar/services/collector",
    environment: process.env.ENVIRONMENT || "dev",
    token: 'ADD-YOUR-TEST-TOKEN-HERE'
};
```

**Note**: The test script dynamically updates the embedded JSON log events sample with current unix epoch timestamps so that the logs will be 'current' in terms of time.
