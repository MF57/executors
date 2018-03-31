module.exports = {
    handleError: function(res, error) {
        console.error('Error: ' + error);
        res.status(400).send('Bad Request ' + JSON.stringify(error));
    },

    handleSuccess: function (res, total_start, executable, args) {
        console.log('Success');
        const total_end = Date.now();
        const duration = total_end - total_start;
        res.send('GCF Function exit: start ' + total_start + ' end ' + total_end + ' duration '
            + duration + ' ms, executable: ' + executable + ' args: ' + args);
    }
};