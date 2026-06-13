import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class JobExecutionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const jobsTable = new dynamodb.Table(this, 'JobsTable', {
      tableName: 'jobs',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    jobsTable.addGlobalSecondaryIndex({
      indexName: 'entityType-createdAt-index',
      partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const jobFilesBucket = new s3.Bucket(this, 'JobFilesBucket', {
      bucketName: `job-execution-files-${this.account}-${this.region}`,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const ec2Role = new iam.Role(this, 'Ec2JobRunnerRole', {
      roleName: 'ec2-job-runner-role',
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    jobFilesBucket.grantReadWrite(ec2Role);
    jobsTable.grantReadWriteData(ec2Role);

    new cdk.CfnOutput(this, 'JobsTableName', {
      value: jobsTable.tableName,
      description: 'DynamoDB jobs table name',
    });

    new cdk.CfnOutput(this, 'JobFilesBucketName', {
      value: jobFilesBucket.bucketName,
      description: 'S3 bucket for job files',
    });

    new cdk.CfnOutput(this, 'Ec2RoleArn', {
      value: ec2Role.roleArn,
      description: 'IAM role ARN for EC2 job runner',
    });
  }
}
