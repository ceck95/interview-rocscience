import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { JobExecutionStack } from '../lib/job-execution-stack';

const app = new cdk.App();
new JobExecutionStack(app, 'JobExecutionStack', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'] || '000000000000',
    region: process.env['CDK_DEFAULT_REGION'] || 'us-east-1',
  },
});
