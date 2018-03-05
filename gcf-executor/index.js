const projectId = process.env.GCLOUD_PROJECT; // E.g. 'grape-spaceship-123'

const spawn = require('child_process').spawn;
const gcloud = require('google-cloud');
const async = require('async');


exports.hyperflow_executor = function (req, res) {

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


    const gcs = gcloud.storage({
        projectId: projectId
    });

    function download(waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function downloadFinishedCallback(err) {
                if (err) {
                    console.error("Error downloading file " + full_path);
                    console.error(err);
                    next(err);
                } else {
                    console.log("Downloaded file " + full_path);
                    next();
                }
            }

            file_name = file_name.name;
            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('downloading ' + full_path);


            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);
            const downloadOptions = {destination: '/tmp/' + file_name};

            // Download a file from your bucket.
            bucket.file(prefix + "/" + file_name).download(downloadOptions, downloadFinishedCallback);
        }

        function iterationFinishedCallback(error) {
            if (error) {
                console.error('A file failed to process');
                waterfallCallback('Error downloading')
            } else {
                console.log('All files have been downloaded successfully');
                waterfallCallback()
            }
        }

        async.each(inputs, iteratorCallback, iterationFinishedCallback);
    }


    function execute(waterfallCallback) {

        function errorCallback(code) {
            console.error('Error: ' + executable + JSON.stringify(code));
        }

        function stdoutCallback(stdoutData) {
            console.log('Stdout: ' + executable + stdoutData);
        }

        function stderrCallback(stderrData) {
            console.log('Stderr: ' + executable + stderrData);
        }

        function executableCloseCallback(code) {
            console.log('My GCF exe close ' + executable + ' with code ' + code);
            waterfallCallback()
        }

        function executableExitCallback(code) {
            console.log('My GCF exe exit' + executable + ' with code ' + code);
        }

        // use __dirname so we don't need to set env[PATH] and pass env
        const proc_name = __dirname + '/' + executable;

        console.log('spawning ' + proc_name);
        // add . and __dirname to PATH since e.g. in Montage mDiffFit calls external executables
        process.env.PATH = '.:' + __dirname;
        const proc = spawn(proc_name, args, {cwd: '/tmp'});

        proc.stdout.on('data', stdoutCallback);
        proc.stderr.on('data', stderrCallback);
        proc.on('error', errorCallback);
        proc.on('close', executableCloseCallback);
        proc.on('exit', executableExitCallback);

    }

    function upload(waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function uploadFinishedCallback(err) {
                if (err) {
                    console.error("Error uploading file " + full_path);
                    console.error(err);
                    next(err);
                } else {
                    console.log("Uploaded file " + full_path);
                    next();
                }
            }

            file_name = file_name.name;

            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('uploading ' + full_path);

            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);
            const uploadOptions = {destination: prefix + "/" + file_name};


            // Upload a file to your bucket.
            bucket.upload('/tmp/' + file_name, uploadOptions, uploadFinishedCallback);
        }

        function iterationFinishedCallback(err) {
            if (err) {
                console.error('A file failed to process');
                waterfallCallback('Error uploading')
            } else {
                console.log('All files have been uploaded successfully');
                waterfallCallback()
            }
        }

        async.each(outputs, iteratorCallback, iterationFinishedCallback);
    }


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


    const waterfallTasks = [download, execute, upload];
    async.waterfall(waterfallTasks, waterfallCallback);
};
