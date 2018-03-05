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
    console.log('inputs[0].name:     ' + inputs[0].name);
    console.log('outputs:    ' + outputs);
    console.log('bucket:     ' + bucket_name);
    console.log('prefix:     ' + prefix);


    const gcs = gcloud.storage({
        projectId: projectId
    });

    function download(callback) {

        async.each(inputs, function (file_name, callback) {

            file_name = file_name.name;
            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('downloading ' + full_path);


            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);

            // Download a file from your bucket.
            bucket.file(prefix + "/" + file_name).download({
                destination: '/tmp/' + file_name
            }, function (err) {
                if (err) {
                    console.error("Error downloading file " + full_path);
                    console.error(err);
                    callback(err);
                } else {
                    console.log("Downloaded file " + full_path);
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.error('A file failed to process');
                callback('Error downloading')
            } else {
                console.log('All files have been downloaded successfully');
                callback()
            }
        });
    }


    function execute(callback) {
        const proc_name = __dirname + '/' + executable; // use __dirname so we don't need to set env[PATH] and pass env

        console.log('spawning ' + proc_name);
        process.env.PATH = '.:' + __dirname; // add . and __dirname to PATH since e.g. in Montage mDiffFit calls external executables
        const proc = spawn(proc_name, args, {cwd: '/tmp'});

        proc.on('error', function (code) {
            console.error('error!!' + executable + JSON.stringify(code));
        });

        proc.stdout.on('data', function (exedata) {
            console.log('Stdout: ' + executable + exedata);
        });

        proc.stderr.on('data', function (exedata) {
            console.log('Stderr: ' + executable + exedata);
        });

        proc.on('close', function (code) {
            console.log('My GCF exe close' + executable);
            callback()
        });

        proc.on('exit', function (code) {
            console.log('My GCF exe exit' + executable);
        });

    }

    function upload(callback) {

        async.each(outputs, function (file_name, callback) {

            file_name = file_name.name;

            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('uploading ' + full_path);

            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);

            // Upload a file to your bucket.
            bucket.upload('/tmp/' + file_name, {destination: prefix + "/" + file_name}, function (err) {
                if (err) {
                    console.error("Error uploading file " + full_path);
                    console.error(err);
                    callback(err);
                } else {
                    console.log("Uploaded file " + full_path);
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.error('A file failed to process');
                callback('Error uploading')
            } else {
                console.log('All files have been uploaded successfully');
                callback()
            }
        });
    }


    async.waterfall([
        download,
        execute,
        upload
    ], function (err, result) {
        if (err) {
            console.error('Error: ' + err);
            res.status(400).send('Bad Request ' + JSON.stringify(err));
        } else {
            console.log('Success');
            t_end = Date.now();
            const duration = t_end - t_start;
            res.send('GCF Function exit: start ' + t_start + ' end ' + t_end + ' duration ' + duration + ' ms, executable: ' + executable + ' args: ' + args);
        }
    })

};
