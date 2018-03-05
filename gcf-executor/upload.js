module.exports = {
    upload: function(outputs, bucket_name, prefix, waterfallCallback) {

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

        function iterationFinishedCallback(error) {
            if (error) {
                console.error('A file failed to process');
                waterfallCallback('Error uploading')
            } else {
                console.log('All files have been uploaded successfully');
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