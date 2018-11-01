const amqp = require('amqplib/callback_api');
const request = require('requestretry');
const executor_config = require('./config.js');

const availableCloudProviders = [
    {
        name: 'aws',
        url: executor_config.aws_url
    },
    {
        name: 'gcf',
        url: executor_config.gcf_url
    }
    ];

if (process.argv.length !== 3 || availableCloudProviders.find(cloudProvider => cloudProvider.name === process.argv[2]) === undefined) {
    console.error("Incorrect usage - correct usage is 'node index.js <cloud_provider>' where <cloud_provider> could be 'aws' or 'gcf'");
    return;
}

const cloudProvider = availableCloudProviders.find(cloudProvider => cloudProvider.name === process.argv[2]);

console.log("Running for cloud provider: " + cloudProvider.name);

amqp.connect('amqp://localhost', function (err, conn) {
    conn.createChannel(function (err, ch) {
        const q = 'hyperflow.jobs';

        ch.assertQueue(q, {durable: true});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, function (msg) {

            const message = JSON.parse(msg.content.toString());
            message.options.bucket = message.options[cloudProvider.name+'Bucket'];
            message.options.prefix = message.options[cloudProvider.name+'Prefix'];
            const verbose = message.verbose;


            function responseCallback(error, response, body) {
                console.log("Function: " + message.executable + " response status code: " +
                    response.statusCode + " number of request attempts: " + response.attempts);

                if (error || response.statusCode !== 200) {
                    console.log("Function: " + executable + " error: " + error);
                    console.log(response.body);
                    //todo send error to hyperflow
                    // hyperflow_callback(error, outs);
                    return
                }
                if (verbose) {
                    console.log("Function: " + message.executable + " data: " + body.toString());
                }
                ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(message)), {
                    contentType: 'application/json',
                    correlationId: msg.properties.correlationId
                });
                ch.ack(msg);

            }


            if (verbose) {
                console.log("Executing:  " + JSON.stringify(message));
            } else {
                console.log("Executing:  " + message.executable);
            }

            function myRetryStrategy(err, response, body){
                // retry the request if we had an error or if the response was a 'Bad Gateway'
                if (response && response.statusCode && response.statusCode !== 200) {
                    console.log(message.executable + " - " + response.statusCode + " - " + response.body.message);
                }
                return err || !response || response.statusCode !== 200;
            }

            const requestBody = {
                timeout: 600000,
                retryStrategy: myRetryStrategy,
                url: cloudProvider.url,
                maxAttempts: 5,   // (default) try 5 times
                retryDelay: 5000,  // (default) wait for 5s before trying again
                json: message,
                headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
            };
            request.post(requestBody, responseCallback);


        }, {noAck: false});
    });
});