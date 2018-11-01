module.exports = {
    upload: function (outputs, bucket_name, prefix, verbose, waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function uploadFinishedCallback(error) {
                if (error) {
                    console.log("File " + file_name + " upload finished error: " + error + " - terminating");
                    error['file_name'] = file_name;
                    next(error);
                } else {
                    if (verbose) {
                        console.log("Uploaded file " + full_path);
                    }
                    next();
                }
            }

            file_name = file_name.name;
            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            if (verbose) {
                console.log('Uploading ' + full_path);
            }


            // Reference an existing bucket.
            const bucket = gcs.bucket(bucket_name);
            const uploadOptions = {destination: prefix + "/" + file_name, resumable: false};


            // Upload a file to your bucket.
            bucket.upload('/tmp/' + file_name, uploadOptions, uploadFinishedCallback);
        }

        function iterationFinishedCallback(error) {
            if (error) {
                console.log('A file failed to process ' + error.file_name);
                waterfallCallback('Error uploading')
            } else {
                if (verbose) {
                    console.log('All files have been uploaded successfully');
                }
                waterfallCallback()
            }
        }

        const gcloud = require('google-cloud');
        const async = require('async');
        const gcs = gcloud.storage({
            projectId: process.env.GCLOUD_PROJECT
        });

        async.each(outputs, iteratorCallback, iterationFinishedCallback);
    }

};