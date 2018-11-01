const jsonfile = require('jsonfile');

const vmTasks = ["mAdd"];
const path = process.argv[2];

const file = path + '/dag.json';


jsonfile.readFile(file, function (err, obj) {
    if (err) console.error(err);
    obj.tasks.forEach(task => {
        if (!!task.config) {
            if (vmTasks.includes(task.name)) {
                task.config.deploymentType = "vm"
            } else {
                task.config.deploymentType = "lambda"
            }
        }
    });
    const output = path + '/dag_decorated.json';
    jsonfile.writeFile(output, obj, function (err) {
        if (err) console.error(err)
    })
});