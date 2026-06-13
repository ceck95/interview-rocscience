import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMClient, SendCommandCommand } from '@aws-sdk/client-ssm';
import { spawn } from 'child_process';
import * as path from 'path';
import { ComputeType } from '../../enums';

@Injectable()
export class EC2Service {
  private readonly logger = new Logger(EC2Service.name);
  private readonly ssmClient: SSMClient;
  private readonly isLocal: boolean;
  private readonly awsCfg: {
    region: string;
    endpoint?: string;
    credentials?: { accessKeyId: string; secretAccessKey: string };
    ec2InstanceId: string;
    apiUrl: string;
    s3BucketName: string;
  };

  constructor(private readonly configService: ConfigService) {
    this.awsCfg = this.configService.get('aws') as {
      region: string;
      endpoint?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      ec2InstanceId: string;
      apiUrl: string;
      s3BucketName: string;
    };
    this.isLocal = process.env['LOCAL'] === 'true';
    this.ssmClient = new SSMClient({
      region: this.awsCfg.region,
      ...(this.awsCfg.endpoint ? { endpoint: this.awsCfg.endpoint } : {}),
      ...(this.awsCfg.credentials
        ? { credentials: this.awsCfg.credentials }
        : {}),
    });
  }

  async triggerJob(
    jobId: string,
    computeType: ComputeType,
    inputFileKey: string,
  ): Promise<void> {
    if (this.isLocal) {
      this.runLocalJob(jobId, computeType, inputFileKey);
    } else {
      await this.runSSMJob(jobId, computeType, inputFileKey);
    }
  }

  private runLocalJob(
    jobId: string,
    computeType: ComputeType,
    inputFileKey: string,
  ): void {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'job-runner.sh');
    this.logger.log(`Spawning local job-runner.sh for jobId=${jobId}`);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      JOB_ID: jobId,
      COMPUTE_TYPE: computeType,
      INPUT_FILE_KEY: inputFileKey,
      S3_BUCKET: this.awsCfg.s3BucketName,
      API_URL: this.awsCfg.apiUrl,
      AWS_DEFAULT_REGION: this.awsCfg.region,
      ...(this.isLocal
        ? {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_ENDPOINT_URL: this.awsCfg.endpoint ?? 'http://localhost:4566',
          }
        : {}),
    };

    const child = spawn('bash', [scriptPath], {
      env,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    this.logger.log(`Local job spawned pid=${child.pid}`);
  }

  private async runSSMJob(
    jobId: string,
    computeType: ComputeType,
    inputFileKey: string,
  ): Promise<void> {
    const instanceId = this.awsCfg.ec2InstanceId;
    if (!instanceId) {
      throw new Error('EC2_INSTANCE_ID is not configured');
    }

    this.logger.log(`SSM RunCommand jobId=${jobId} instance=${instanceId}`);

    const response = await this.ssmClient.send(
      new SendCommandCommand({
        InstanceIds: [instanceId],
        DocumentName: 'AWS-RunShellScript',
        Parameters: {
          commands: [
            `export JOB_ID="${jobId}"`,
            `export COMPUTE_TYPE="${computeType}"`,
            `export INPUT_FILE_KEY="${inputFileKey}"`,
            `export S3_BUCKET="${this.awsCfg.s3BucketName}"`,
            `export API_URL="${this.awsCfg.apiUrl}"`,
            `bash /opt/job-runner.sh`,
          ],
        },
      }),
    );

    this.logger.log(
      `SSM command sent commandId=${response.Command?.CommandId}`,
    );
  }
}
