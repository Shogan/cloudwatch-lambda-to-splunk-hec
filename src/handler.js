'use strict';

const SplunkLogger = require('./modules/splunkLogger');
const CloudwatchHelper = require('./modules/cloudwatchHelper');
const SecretsManager = require('./modules/secretsManager');
const secretsManager = new SecretsManager();
const secretName = process.env.SECRET_MANAGER_ITEM_NAME || "somehost/infrastructure/nonprod/cloudwatch-to-splunk";
const cloudwatchHelper = new CloudwatchHelper();

module.exports.sendToSplunk = async (event, context) => {
  try {

    const splunkHecToken = '';
    if (process.env.SPLUNK_HEC_TOKEN) {
      splunkHecToken = process.env.SPLUNK_HEC_TOKEN;
    } else {
      splunkHecToken = await secretsManager.getSecret(secretName, "SPLUNK_HEC_TOKEN");
    }

    const loggerConfig = {
      url: process.env.SPLUNK_HEC_URL,
      environment: process.env.ENVIRONMENT || "dev",
      token: splunkHecToken
    };

    const logger = new SplunkLogger(loggerConfig);

    // CloudWatch Logs gzipped data is base64 encoded so decode here
    const payload = Buffer.from(event.awslogs.data, 'base64');

    // CloudWatch Logs are gzip compressed so gunzip here
    let decompressedEvent = await cloudwatchHelper.gunZip(payload);
    const parsedEvent = JSON.parse(decompressedEvent.toString('ascii'));

    if (!parsedEvent.logGroup) {
      throw new Error(`This function is only compatible with CloudWatch Log Group triggers`);
    }

    let count = 0;
    if (parsedEvent.logEvents) {
      // Log the events to the log 'buffer' (splunkLogger)
      let logDetails = await cloudwatchHelper.getLogGroupDetails(parsedEvent);
      await Promise.all(parsedEvent.logEvents.map(item => {
        return new Promise((resolve) => {

          let awsRequestId = '';
          if (typeof context !== 'undefined') {
            awsRequestId = context.awsRequestId;
          }

          logger.logEvent({
              time: new Date(item.timestamp).getTime() / 1000,
              host: 'cloudwatch-lambda-to-splunk-hec',
              source: `lambda:${context.functionName}`,
              sourcetype: '_json',
              event: {
                environment: logDetails.environment,
                application: logDetails.application,
                application_component: logDetails.appComponent,
                log_group: logDetails.logGroupName,
                awsRequestId: awsRequestId,
                message: item.message
              }
          });

          count += 1;
          resolve();
        })
      }));

      // Send all the events in the log 'buffer' in a single batch to Splunk
      console.log(`flushing ${logger.payloads.length} events to splunk HEC...`);
      let response = await logger.flushAsync();
      let results = {
        text: response.text,
        processedEvents: 0,
        status: ''
      };

      if (response.status == 200) {
        results.processedEvents = count;
        results.status = response.status;
        console.log(`Successfully processed ${count} log event(s).`, results);
        return results;
      } else {
        results.status = 'failed';
        console.log(`Failed to process ${count} log event(s).`, results);
        return results;
      }
    }
  } catch (error) {
    console.log(`Handler error: ${error}`);
  }
};
