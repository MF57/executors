module.exports = {
    download: function (inputs, bucket_name, prefix, waterfallCallback) {
        const async = require('async');
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({signatureVersion: 'v4'});
        const Promise = require('bluebird');
        const fs = require('fs');

        let download_start = Date.now();
        async.each(inputs, function (file_name, callback) {
            file_name = file_name.name;
            console.log('Downloading ' + bucket_name + "/" + prefix + "/" + file_name);

            // Reference an existing bucket.
            const params = {
                Bucket: bucket_name,
                Key: prefix + '/' + file_name
            };

            const file = fs.createWriteStream('/tmp/' + file_name);

            new Promise(function (resolve, reject) {
                file
                    .on('open', function () {
                        console.log('File OPENED ' + '/tmp/' + file_name);
                        resolve();
                    })
                    .on('error', function (err) {
                        console.log("FILE OPEN ERROR " + err);
                        reject(err);
                    })
                    .on('finish', function () {
                        console.log("FILE OPEN FINISH");
                        resolve();
                    });
            }).then(function () {
                return new Promise(function (resolve, reject) {
                    s3.getObject(params).createReadStream().on('end', function () {
                        return resolve();
                    }).on('error', function (error) {
                        return reject(error);
                    }).pipe(file)
                }).then(function () {
                    callback();
                }, function (err) {
                    err['file_name'] = file_name;
                    callback(err);
                });
            });

        }, function (err) {
            if (err) {
                console.log('A file failed to process ' + err.file_name);
                waterfallCallback('Error downloading ' + err);
            } else {
                console.log('All files have been downloaded successfully');
                waterfallCallback();
            }
        });
    }
};