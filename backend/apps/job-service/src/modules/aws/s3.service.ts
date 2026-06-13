import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PRESIGNED_URL_EXPIRY_SECONDS } from '../../constants';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const awsCfg = this.configService.get('aws');
    this.client = new S3Client({
      region: awsCfg.region,
      ...(awsCfg.endpoint ? { endpoint: awsCfg.endpoint } : {}),
      ...(awsCfg.credentials ? { credentials: awsCfg.credentials } : {}),
      forcePathStyle: !!awsCfg.endpoint,
    });
    this.bucketName = awsCfg.s3BucketName;
  }

  getInputFileKey(jobId: string, fileName: string): string {
    return `jobs/${jobId}/input/${fileName}`;
  }

  getOutputFileKey(jobId: string, fileName: string): string {
    return `jobs/${jobId}/output/${fileName}`;
  }

  async getPresignedUploadUrl(key: string): Promise<string> {
    this.logger.log(`getPresignedUploadUrl key=${key}`);
    const command = new PutObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    this.logger.log(`getPresignedDownloadUrl key=${key}`);
    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });
  }
}
