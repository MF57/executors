module.exports = {
    execute: function (executable, args, verbose, waterfallCallback) {

        function errorCallback(code) {
            console.error('Error: ' + executable + JSON.stringify(code));
        }

        function stdoutCallback(stdoutData) {
            if (verbose) {
                console.log('Stdout: ' + executable + stdoutData);
            }
            if (stdoutData.indexOf("ERROR") !== -1) {
                console.log("Executable error: " + stdoutData.toString());
                waterfallCallback("Executable error: " + stdoutData.toString())
            }
        }

        function stderrCallback(stderrData) {
            console.log('Stderr: ' + executable + stderrData);
            waterfallCallback("Executable error: " + stderrData.toString());
        }

        function executableCloseCallback(code) {
            if (verbose) {
                console.log('Executable close ' + executable + ' with code ' + code);
            }
            waterfallCallback();
        }

        function executableExitCallback(code) {
            if (verbose) {
                console.log('Executable exit ' + executable + ' with code ' + code);
            }
        }

        const spawn = require('child_process').spawn;

        // use __dirname so we don't need to set env[PATH] and pass env
        const proc_name = __dirname + '/' + executable;

        if (verbose) {
            console.log('spawning ' + proc_name);
        }
        // add . and __dirname to PATH since e.g. in Montage mDiffFit calls external executables
        process.env.PATH = '.:' + __dirname;
        const proc = spawn(proc_name, args, {cwd: '/tmp'});

        proc.stdout.on('data', stdoutCallback);
        proc.stderr.on('data', stderrCallback);
        proc.on('error', errorCallback);
        proc.on('close', executableCloseCallback);
        proc.on('exit', executableExitCallback);

    }
};