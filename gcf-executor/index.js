exports.hyperflow_executor = function (req, res) {

    const async = require('async');
    const executor = require('./execute');
    const downloader = require('./download');
    const uploader = require('./upload');

    const executable = req.body.executable;
    const args = req.body.args;
    const inputs = req.body.inputs;
    const outputs = req.body.outputs;
    const bucket_name = req.body.options.bucket;
    const prefix = req.body.options.prefix;

    const t_start = Date.now();
    let t_end;

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
            console.error('Error: ' + error);
            res.status(400).send('Bad Request ' + JSON.stringify(error));
        } else {
            console.log('Success');
            t_end = Date.now();
            const duration = t_end - t_start;
            res.send('GCF Function exit: start ' + t_start + ' end ' + t_end + ' duration '
                + duration + ' ms, executable: ' + executable + ' args: ' + args);
        }
    }
};
