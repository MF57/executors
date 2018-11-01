#!/usr/bin/env bash
gcloud beta functions deploy hyperflow_executor --region europe-west1 --stage-bucket mf57testcloudstorage --trigger-http
