module.exports = {
    upload: function(outputs, bucket_name, prefix, waterfallCallback) {
        const async = require('async');
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({signatureVersion: 'v4'});
        const fs = require('fs');


        const upload_start = Date.now();
        async.each(outputs, function (file_name, callback) {

            file_name = file_name.name;

            const full_path = bucket_name + "/" + prefix + "/" + file_name;
            console.log('uploading ' + full_path);

            const fileStream = fs.createReadStream('/tmp/' + file_name);
            fileStream.on('error', function (err) {
                if (err) {
                    console.error(err);
                    callback(err);
                }
            });
            fileStream.on('open', function () {
                const params = {
                    Bucket: bucket_name,
                    Key: prefix + '/' + file_name,
                    Body: fileStream
                };

                s3.putObject(params, function (err) {
                    if (err) {
                        console.error("Error uploading file " + full_path);
                        console.error(err);
                        callback(err);
                    } else {
                        console.log("Uploaded file " + full_path);
                        callback();
                    }
                });
            });

        }, function (err) {
            if (err) {
                console.error('A file failed to process');
                waterfallCallback('Error uploading')
            } else {
                console.log('All files have been uploaded successfully');
                waterfallCallback()
            }
        });
    }
};