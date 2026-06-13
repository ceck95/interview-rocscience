import { Global, Module } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';
import { S3Service } from './s3.service';
import { EC2Service } from './ec2.service';

@Global()
@Module({
  providers: [DynamoDBService, S3Service, EC2Service],
  exports: [DynamoDBService, S3Service, EC2Service],
})
export class AwsModule {}
