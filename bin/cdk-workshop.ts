#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
// import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';
import { CdkWorkshopStack } from "../lib/cdk-workshop-stack";

//Build stack for us-east-1
const app = new cdk.App();
new CdkWorkshopStack(app, "dev", {
  env: {
    region: "us-east-1"
  }
});
