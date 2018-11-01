module.exports = {
    download: function (inputs, bucket_name, prefix, verbose, waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function openFileLocally(resolve, reject) {

                function fileOpenCallback() {
                    if (verbose) {
                        console.log('File OPENED ' + '/tmp/' + file_name);
                    }
                    resolve();
                }

                function fileErrorCallback(error) {
                    console.log("File " + file_name + " open error: " + error);
                    reject(error);
                }

                function fileOpenFinishedCallback() {
                    resolve();
                }

                file.on('open', fileOpenCallback)
                    .on('error', fileErrorCallback)
                    .on('finish', fileOpenFinishedCallback);
            }

            function copyContentFromS3() {

                function downloadFile(resolve, reject) {

                    function s3ConnectionSuccessful() {
                        return resolve();
                    }

                    function s3ConnectionFailed(error) {
                        console.log("File " + file_name + " download error: " + error + " - retrying");
                        return reject(error);
                    }


                    s3.getObject(params).createReadStream()
                        .on('end', s3ConnectionSuccessful)
                        .on('error', s3ConnectionFailed)
                        .pipe(file);

                }

                function downloadSuccessCallback() {
                    if (verbose) {
                        //Confirm that the file has been downloaded
                        const fs = require("fs"); //Load the filesystem module
                        const stats = fs.statSync("/tmp/"+file_name);
                        const fileSizeInBytes = stats.size;
                        console.log("Downloaded: " + file_name + " - " + fileSizeInBytes + " bytes");
                    }
                    next();
                }

                function downloadErrorCallback(error) {
                    console.log("File " + file_name + " download error: " + error + " - terminating");
                    error['file_name'] = file_name;
                    next(error);
                }


                let promiseRetry = require('promise-retry');
                return promiseRetry(function (retry, number) {
                   if (verbose || number > 1) {
                        console.log('Attempt to download ' + file_name + " - attempt number ", number);
                   }
                    return new Promise(downloadFile).catch(retry);
                }, {retries: 5}).then(downloadSuccessCallback, downloadErrorCallback);

            }

            file_name = file_name.name;
            if (verbose) {
                console.log('Downloading ' + bucket_name + "/" + prefix + "/" + file_name);
            }

            const params = {
                Bucket: bucket_name,
                Key: prefix + '/' + file_name
            };

            const file = fs.createWriteStream('/tmp/' + file_name);
            new Promise(openFileLocally).then(copyContentFromS3);

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


        const async = require('async');
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({signatureVersion: 'v4'});
        const Promise = require('bluebird');
        const fs = require('fs');

        async.each(inputs, iteratorCallback, iterationFinishedCallback);
    }
};
