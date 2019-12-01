#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
// import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';
import { CdkWorkshopStack } from "../lib/cdk-workshop-stack";

const app = new cdk.App();
new CdkWorkshopStack(app, "dev", {
  env: {
    region: "us-east-1"
  }
});
