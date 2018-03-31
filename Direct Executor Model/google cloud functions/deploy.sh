#!/usr/bin/env bash
gcloud beta functions deploy hyperflow_executor --stage-bucket mf57testcloudstorage --trigger-http
