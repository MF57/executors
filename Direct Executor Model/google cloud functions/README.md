# Hyperflow GCF Executor

This is an Executor for HyperFlow https://github.com/dice-cyfronet/hyperflow  workflow engine which uses Google Cloud Functions (GCF) alpha release: https://cloud.google.com/functions/.

## Installation

### Prerequsites

To run the Executor you need to install Cloud SDK from Google and follow the steps in the Quickstart: https://cloud.google.com/functions/docs/quickstart to set up a new project and your credentials.

To run HyperFlow, you need Node.js: https://nodejs.org and Redis: http://redis.io/

### Installing HyperFlow

Currently you should use the fork of HyperFlow whic hsupports GCF:

    npm install https://github.com/malawski/hyperflow/archive/develop.tar.gz

### Installing Executor

You need to clone the sources of the executor to your local machine in order to deploy it into Google Cloud together with your application specific binaries.

    git clone https://github.com/malawski/hyperflow-gcf-executor.git

### Preparing binaries

You should not  make any assumptions regarding the execution environment the functions are deployed into, except that it is Linux.

One way to make sure that your executables will run in the cloud is to link them statically. For example, to compile Montage binaries you need to add the follwing flags to the `LIBS` variable in the Makefiles:

    -static  -static-libgcc 

Once the static version of binaries is ready, you should copy them to your local `hyperflow-gcf-executor ` directory containing the main `index.js` of the Executor.

### Preparing the workflow

For running Montage workflow, you should follow the tutorial at https://github.com/dice-cyfronet/hyperflow/wiki/TutorialAMQP. You do not need to install AMQP Executor or RabbitMQ, since the GCF is a fully serverless solution. When converting the workflow from DAX to JSON format, you should use `gcfCommand` option:

    hflow-convert-dax 0.25/workdir/dag.xml gcfCommand > 0.25/workdir/dag.json

### Preparing input data

If your workflow uses input or output files, the executor can stage them from the Google Cloud Storage. You need to create a bucket, e.g. `maciek-test` and copu all the input files into this bucket, You can do it using the Web console: https://console.cloud.google.com/storage/browser or using the `gsutil` command line client, for example for Montage workflow with degree 0.25 you need to copy:

    gsutil cp -r data/0.25/input/ gs://maciek-test/data/0.25


## Deployment of Executor

You need to deploy the executor as a Google Cloud Function.

    gcloud alpha functions deploy hyperflow_executor --bucket maciek-test --trigger-http

You should see the confirmation message (please note it uploads all the static binaries, so it takes 20 MiB in the case of Montage):

```
Copying file:///tmp/tmpHnCjqD/fun.zip [Content-Type=application/zip]...
Uploading   .../us-central1-hyperflow_executor-kbdqffwordtt.zip: 20.39 MiB/20.39 MiB    
Waiting for operation to finish...done.
entryPoint: hyperflow_executor
gcsUrl: gs://maciek-test/us-central1-hyperflow_executor-kbdqffwordtt.zip
latestOperation: operation-021191f2-afff-41ca-9a4d-148cb54ad135
name: projects/hyperflow-functions/regions/us-central1/functions/hyperflow_executor
status: READY
timeout: 60.000s
triggers:
- webTrigger:
    url: https://us-central1-hyperflow-functions.cloudfunctions.net/hyperflow_executor
```

The URL in the last line will show the endpoint where your Executor function is available.

You should use this URL in your HyperFlow configuration, under `hyperflow/functions/gcfCommand.config.js`:

    var GCF_URL  = process.env.GCF_URL ? process.env.GCF_URL : "https://us-central1.hyperflow-functions.cloudfunctions.net/hyperflow_executor";

You need to replace `hyperflow-executor` with your function name. 


## Running the workflow

### Configuration of HyperFlow

Please check your cinfiguration file `hyperflow/functions/gcfCommand.config.js` to make sure that you have the correct URL, bucket name and prefix.

### Execution of workflow

    ./bin/hflow run /path/to/your/montage/0.25/workdir/dag.json -s

