module.exports = {
    handleError: function(res, error) {
        console.error('Error: ' + error);
        const response = {
            statusCode: '400',
            body: JSON.stringify({message: error}),
            headers: {
                'Content-Type': 'application/json'
            }
        };
        res.succeed(response);
    },

    handleSuccess: function (res, total_start, executable, args) {
        console.log('Success');
        const total_end = Date.now();
        const duration = total_end - total_start;

        const message = 'AWS Lambda Function exit: start ' + total_start + ' end ' + total_end + ' duration '
            + duration + ' ms, executable: ' + executable + ' args: ' + args;

        const response = {
            statusCode: '200',
            body: message,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        res.succeed(response);
    }
};