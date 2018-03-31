exports.hyperflow_executor = function (req, res) {

    const async = require('async');
    const downloader = require('./download');
    const executor = require('./execute');
    const uploader = require('./upload');
    const response_handler = require('./response_handler');

    let bucket_name, prefix, executable, args, inputs, outputs;

    if (typeof req.body.options === 'undefined') {
        //AWS
        const json_request = JSON.parse(req.body);
        bucket_name = json_request.options.bucket;
        prefix = json_request.options.prefix;
        executable = json_request.executable;
        args = json_request.args;
        inputs = json_request.inputs;
        outputs = json_request.outputs;
    } else {
        //GCF
        bucket_name = req.body.options.bucket;
        prefix = req.body.options.prefix;
        executable = req.body.executable;
        args = req.body.args;
        inputs = req.body.inputs;
        outputs = req.body.outputs;
    }

    const total_start = Date.now();

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
        if (error) {
            response_handler.handleError(res, error)
        } else {
            response_handler.handleSuccess(res, total_start, executable, args)
        }
    }
};