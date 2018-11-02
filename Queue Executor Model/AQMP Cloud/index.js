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
    conn.createChannel((err, ch) => {
        const q = 'hyperflow.jobs';

        ch.assertQueue(q, {durable: true});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, msg => {

            const message = JSON.parse(msg.content.toString());
            const verbose = message.verbose;


            function responseCallback(error, response, body) {
                console.log("Function: " + message.executable + " response status code: " +
                    response.statusCode + " number of request attempts: " + response.attempts);

                if (error || response.statusCode !== 200) {
                    if (error) {
                        console.log("Function: " + message.executable + " error: " + error);
                    }
                    const error_message = (response.body.message) ? response.body.message : response.body;
                    console.log("Function: " + message.executable + " error: " + error_message);
                    message.exit_status = 1;
                    message.error = error_message;
                    ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(message)), {
                        contentType: 'application/json',
                        correlationId: msg.properties.correlationId
                    });
                    ch.ack(msg);
                    return
                }
                if (verbose) {
                    console.log("Function: " + message.executable + " data: " + body.toString());
                }
                message.exit_status = 0;
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

            function myRetryStrategy(err, response) {
                // retry the request if we had an error or if the response was a 'Bad Gateway'
                if (response && response.statusCode && response.statusCode !== 200) {
                    const error_message = (response.body.message) ? response.body.message : response.body;
                    console.log(message.executable + " - " + response.statusCode + " - " + error_message + " - retrying");
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
