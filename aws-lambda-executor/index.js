exports.hyperflow_executor = function (req, res) {

    const async = require('async');
    const downloader = require('./download');
    const executor = require('./execute');
    const uploader = require('./upload');

    const executable = req.body.executable;
    const args = req.body.args;
    const inputs = req.body.inputs;
    const outputs = req.body.outputs;

    let bucket_name, prefix;

    if (typeof req.body.options === 'undefined') {
        //AWS
        const json_request = JSON.parse(req.body);
        bucket_name = json_request.options.bucket;
        prefix = json_request.options.prefix;
    } else {
        //GCF
        bucket_name = req.body.options.bucket;
        prefix = req.body.options.prefix;
    }

    const total_start = Date.now();
    let total_end;

    console.log('executable: ' + executable);
    console.log('args:       ' + args);
    console.log('inputs:     ' + inputs);
    console.log('outputs:    ' + outputs);
    console.log('bucket:     ' + bucket_name);
    console.log('prefix:     ' + prefix);

    const waterfallTasks = [
        async.apply(downloader.download, inputs, bucket_name, prefix),
        async.apply(executor.execute, executable, args),
        async.apply(uploader.upload, outputs, bucket_name, prefix)
    ];
    async.waterfall(waterfallTasks, waterfallCallback);

    function waterfallCallback(error) {
        const isAws = typeof res.succeed !== 'undefined';
        if (error && !isAws) {
            gcfError()
        } else if (error && isAws) {
            awsError()
        } else if(!error && !isAws) {
            gcfSuccess()
        } else {
            awsSuccess()
        }

        function gcfError() {
            console.error('Error: ' + error);
            res.status(400).send('Bad Request ' + JSON.stringify(error));
        }

        function awsError() {
            console.error('Error: ' + error);
            const response = {
                statusCode: '400',
                body: JSON.stringify({message: error}),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            res.succeed(response);
        }

        function gcfSuccess() {
            console.log('Success');
            total_end = Date.now();
            const duration = total_end - total_start;
            res.send('GCF Function exit: start ' + total_start + ' end ' + total_end + ' duration '
                + duration + ' ms, executable: ' + executable + ' args: ' + args);
        }

        function awsSuccess() {
            console.log('Success');
            total_end = Date.now();
            const duration = total_end - total_start;

            let message = 'AWS Lambda Function exit: start ' + total_start + ' end ' + total_end + ' duration '
                + duration + ' ms, executable: ' + executable + ' args: ' + args;

            const response = {
                statusCode: '200',
                body: message,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            res.succeed(response);
        }
    }
};