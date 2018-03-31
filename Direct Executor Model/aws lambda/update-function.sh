#!/usr/bin/env bash
zip -r aws-lambda-executor.zip .
aws lambda update-function-code --function-name=montageAwsLambda \
 --zip-file=fileb://aws-lambda-executor.zip --profile adminuser
rm aws-lambda-executor.zip