const amqp = require('amqplib/callback_api');
const request = require('requestretry');
const executor_config = require('./config.js');



amqp.connect('amqp://localhost', function (err, conn) {
    conn.createChannel(function (err, ch) {
        const q = 'hyperflow.jobs';

        ch.assertQueue(q, {durable: true});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, function (msg) {
          //  console.log(msg.properties.replyTo);

            // ch.assertQueue(msg.properties.replyTo, {exclusive: true, autoDelete: true});
            // ch.sendToQueue(msg.properties.replyTo, new Buffer("YAAAAAAAAAY"), {
            //     contentType: 'application/json',
            //     correlationId: msg.properties.correlationId
            // });

            const message = JSON.parse(msg.content.toString());


            function responseCallback(error, response, body) {
               console.log("Function: " + message.executable + " status: " + response.statusCode);

                if (error) {
                   console.log("Function: " + message.executable + " error: " + error);
                   // hyperflow_callback(error, outs);
                    return
                }
                if (response) {
                   console.log("Function: " + message.executable + " response status code: " + response.statusCode + " number of request attempts: " + response.attempts)
                }
               console.log("Function: " + message.executable + " data: " + body.toString());
                //hyperflow_callback(null, outs);
            }



            console.log("Executing:  " + JSON.stringify(message));

            const requestBody = {
                timeout: 600000,
                url: executor_config.function_trigger_url,
                json: message,
                headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
            };
            request.post(requestBody, responseCallback);



        }, {noAck: false});
    });
});