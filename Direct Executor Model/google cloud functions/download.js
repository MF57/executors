module.exports = {
    download: function (inputs, bucket_name, prefix, waterfallCallback) {

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

        const gcloud = require('google-cloud');
        const async = require('async');
        const gcs = gcloud.storage({
            projectId: process.env.GCLOUD_PROJECT
        });

        async.each(inputs, iteratorCallback, iterationFinishedCallback);
    }

};