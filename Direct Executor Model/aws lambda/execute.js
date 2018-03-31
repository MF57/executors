module.exports = {
    execute: function(executable, args, waterfallCallback) {

        function errorCallback(code) {
            console.error('Error: ' + executable + JSON.stringify(code));
        }

        function stdoutCallback(stdoutData) {
            console.log('Stdout: ' + executable + stdoutData);
        }

        function stderrCallback(stderrData) {
            console.log('Stderr: ' + executable + stderrData);
        }

        function executableCloseCallback(code) {
            console.log('Executable close ' + executable + ' with code ' + code);
            waterfallCallback()
        }

        function executableExitCallback(code) {
            console.log('Executable exit ' + executable + ' with code ' + code);
        }

        const spawn = require('child_process').spawn;

        // use __dirname so we don't need to set env[PATH] and pass env
        const proc_name = __dirname + '/' + executable;

        console.log('spawning ' + proc_name);
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