module.exports = {
    upload: function(outputs, bucket_name, prefix, waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function fileOpenCallback() {

                function uploadFinishedCallback(error) {
                    if (error) {
                        console.error("Error uploading file " + full_path);
                        console.error(error);
                        next(error);
                    } else {
                        console.log("Uploaded file " + full_path);
                        next();
                    }
                }

                const params = {
                    Bucket: bucket_name,
                    Key: prefix + '/' + file_name,
                    Body: fileStream
                };
                s3.upload(params, uploadFinishedCallback);
            }

            function fileErrorCallback(error) {
                if (error) {
                    console.error(error);
                    next(error);
                }
            }


            file_name = file_name.name;

            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('uploading ' + full_path);

            const fileStream = fs.createReadStream('/tmp/' + file_name);
            fileStream.on('error', fileErrorCallback);
            fileStream.on('open', fileOpenCallback);
        }

        function iteratorFinishedCallback(error) {
            if (error) {
                console.error('A file failed to process');
                waterfallCallback('Error uploading')
            } else {
                console.log('All files have been uploaded successfully');
                waterfallCallback()
            }
        }

        const async = require('async');
        const AWS = require('aws-sdk');
        const fs = require('fs');
        const s3 = new AWS.S3({signatureVersion: 'v4'});


        const upload_start = Date.now();
        async.each(outputs, iteratorCallback, iteratorFinishedCallback);
    }
};