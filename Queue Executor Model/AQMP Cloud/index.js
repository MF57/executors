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


            function responseCallback(error, response, body) {
                console.log("Function: " + message.executable + " status: " + response.statusCode);

                if (error) {
                    console.log("Function: " + message.executable + " error: " + error);
                    //todo send error to hyperflow
                    // hyperflow_callback(error, outs);
                    return
                }
                if (response) {
                   console.log("Function: " + message.executable + " response status code: " +
                       response.statusCode + " number of request attempts: " + response.attempts)
                }
                console.log("Function: " + message.executable + " data: " + body.toString());
                ch.sendToQueue(msg.properties.replyTo, new Buffer(JSON.stringify(message)), {
                    contentType: 'application/json',
                    correlationId: msg.properties.correlationId
                });
                ch.ack(msg);

            }


            console.log("Executing:  " + JSON.stringify(message));

            const requestBody = {
                timeout: 600000,
                url: cloudProvider.url,
                json: message,
                headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
            };
            request.post(requestBody, responseCallback);


        }, {noAck: false});
    });
});