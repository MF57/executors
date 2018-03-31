module.exports = {
    download: function (inputs, bucket_name, prefix, waterfallCallback) {

        function iteratorCallback(file_name, next) {

            function openFileLocally(resolve, reject) {

                function fileOpenCallback() {
                    console.log('File OPENED ' + '/tmp/' + file_name);
                    resolve();
                }

                function fileErrorCallback(error) {
                    console.log("FILE OPEN ERROR " + error);
                    reject(error);
                }

                function fileOpenFinishedCallback() {
                    console.log("FILE OPEN FINISH");
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
                        return reject(error);
                    }

                    s3.getObject(params).createReadStream()
                        .on('end', s3ConnectionSuccessful)
                        .on('error', s3ConnectionFailed)
                        .pipe(file)
                }

                function downloadSuccessCallback() {
                    next();
                }

                function downloadErrorCallback(error) {
                    error['file_name'] = file_name;
                    next(error);
                }

                return new Promise(downloadFile).then(downloadSuccessCallback, downloadErrorCallback);
            }

            file_name = file_name.name;
            console.log('Downloading ' + bucket_name + "/" + prefix + "/" + file_name);

            // Reference an existing bucket.
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
                console.log('All files have been downloaded successfully');
                waterfallCallback();
            }
        }


        const async = require('async');
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({signatureVersion: 'v4'});
        const Promise = require('bluebird');
        const fs = require('fs');

        let download_start = Date.now();
        async.each(inputs, iteratorCallback, iterationFinishedCallback);
    }
};

// const printDir = function (p) {
//     const path = require("path");
//
//     return new Promise(function (resolve, reject) {
//         fs.readdir(p, function (err, files) {
//             if (err) {
//                 throw err;
//             }
//
//             console.log("Logging all files");
//             console.log("FILES: " + files);
//
//             files.map(function (file) {
//                 return path.join(p, file);
//             }).filter(function (file) {
//                 return fs.statSync(file).isFile();
//             }).forEach(function (file) {
//                 const stats = fs.statSync(file);
//                 const fileSizeInBytes = stats["size"];
//                 //Convert the file size to megabytes (optional)
//                 const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;
//
//                 console.log("%s (%s) (%s)", file, fileSizeInMegabytes, path.extname(file));
//             });
//             resolve();
//         });
//     })
// };