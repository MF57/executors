#!/usr/bin/env bash
zip -r aws-lambda-executor.zip .
aws lambda create-function --function-name=montageAwsLambda --runtime=nodejs6.10 --role=arn:aws:iam::855494634674:role/service-role/TestRole \
--handler=index.handler --zip-file=fileb://aws-lambda-executor.zip --profile adminuser
rm aws-lambda-executor.zip