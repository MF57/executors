module.exports = {
    download: function (inputs, bucket_name, prefix, verbose, waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function downloadFinishedCallback(error) {
                if (error) {
                    console.log("File " + file_name + " download error: " + error + " - terminating");
                    error['file_name'] = file_name;
                    next(error);
                } else {
                    if (verbose) {
                        console.log("Downloaded file " + full_path);
                    }
                    next();
                }
            }

            file_name = file_name.name;
            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            if (verbose) {
                console.log('Downloading ' + full_path);
            }

            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);
            const downloadOptions = {destination: '/tmp/' + file_name};


            // Download a file from your bucket.
            bucket.file(prefix + "/" + file_name).download(downloadOptions, downloadFinishedCallback);
        }

        function iterationFinishedCallback(error) {
            if (error) {
                console.log('A file failed to process ' + error.file_name);
                waterfallCallback('Error downloading ' + error);
            } else {
                if (verbose) {
                    console.log('All files have been downloaded successfully');
                }
                waterfallCallback();
            }
        }

        const gcloud = require('google-cloud');
        const async = require('async');
        const gcs = gcloud.storage({
            projectId: process.env.GCLOUD_PROJECT
        });

        async.each(inputs, iteratorCallback, iterationFinishedCallback);
    }

};