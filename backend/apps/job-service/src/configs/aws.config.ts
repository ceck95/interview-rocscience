import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  endpoint:
    process.env['LOCAL'] === 'true' ? 'http://localhost:4566' : undefined,
  credentials:
    process.env['LOCAL'] === 'true'
      ? { accessKeyId: 'test', secretAccessKey: 'test' }
      : undefined,
  dynamoTableName: process.env['DYNAMODB_TABLE_NAME'] ?? 'jobs',
  s3BucketName: process.env['S3_BUCKET_NAME'] ?? 'job-execution-files',
  ec2InstanceId: process.env['EC2_INSTANCE_ID'] ?? '',
  apiUrl: process.env['API_URL'] ?? 'http://localhost:3000',
}));
