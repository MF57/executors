module.exports = {
    clean: function (waterfallCallback) {
        const exec = require('child_process').exec;
        console.log("Clearing tmp directory");
        exec('rm ./tmp/*', function () {
            console.log("Tmp directory cleared");
            waterfallCallback();
        });
    }
};