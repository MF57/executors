exports.handler = function (event, context) {

    const async = require('async');
    const cleaner = require('./cleaner');
    const downloader = require('./download');
    const executor = require('./execute');
    const uploader = require('./upload');


    const json_request = JSON.parse(event.body);

    const executable = json_request.executable;
    const args = json_request.args;
    const inputs = json_request.inputs;
    const outputs = json_request.outputs;

    console.log("Executable: " + executable);
    console.log("Args: " + args);

    const bucket_name = json_request.options.bucket;
    const prefix = json_request.options.prefix;

    const total_start = Date.now();
    let total_end;

    let download_start = Date.now();
    let execute_start = Date.now();
    let upload_start = Date.now();

    console.log('executable: ' + executable);
    console.log('args:       ' + args);
    console.log('inputs:     ' + inputs);
    console.log('inputs[0].name:     ' + inputs[0].name);
    console.log('outputs:    ' + outputs);
    console.log('bucket:     ' + bucket_name);
    console.log('prefix:     ' + prefix);

    async.waterfall([
        async.apply(cleaner.clean),
        async.apply(downloader.download, inputs, bucket_name, prefix),
        async.apply(executor.execute, executable, args),
        async.apply(uploader.upload, outputs, bucket_name, prefix)
    ], waterfallCallback);

    function waterfallCallback(error) {
        let response;
        if (error) {
            response = {
                statusCode: '400',
                body: JSON.stringify({message: error}),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        } else {
            console.log('Success');
            total_end = Date.now();

            const duration = total_end - total_start;
            const download_duration = execute_start - download_start;
            const execution_duration = upload_start - execute_start;
            const upload_duration = total_end - upload_start;

            let message = 'AWS Lambda Function exit: start ' + total_start + ' end ' + total_end + ' duration ' + duration + ' ms, executable: ' + executable + ' args: ' + args;
            message += ' download time: ' + download_duration + ' ms, execution time: ' + execution_duration + ' ms, upload time ' + upload_duration + ' ms';

            response = {
                statusCode: '200',
                body: message,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        console.log(response);
        context.succeed(response);
    }
};


// const printDir = function (p) {
//     const path = require("path");
//
//     return new Promise(function (resolve, reject) {
//         fs.readdir(p, function (err, files) {
//             if (err) {
//                 throw err;
//             }
//
//             console.log("Logging all files");
//             console.log("FILES: " + files);
//
//             files.map(function (file) {
//                 return path.join(p, file);
//             }).filter(function (file) {
//                 return fs.statSync(file).isFile();
//             }).forEach(function (file) {
//                 const stats = fs.statSync(file);
//                 const fileSizeInBytes = stats["size"];
//                 //Convert the file size to megabytes (optional)
//                 const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;
//
//                 console.log("%s (%s) (%s)", file, fileSizeInMegabytes, path.extname(file));
//             });
//             resolve();
//         });
//     })
// };
