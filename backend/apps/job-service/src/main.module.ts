import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { awsConfig } from './configs';
import { AwsModule } from './modules/aws/aws.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [awsConfig],
    }),
    LoggerModule.forRoot(
      process.env['NODE_ENV'] !== 'production'
        ? ({
            pinoHttp: {
              transport: { target: 'pino-pretty', options: { colorize: true } },
            },
          } as Parameters<typeof LoggerModule.forRoot>[0])
        : {},
    ),
    AwsModule,
    JobsModule,
    BillingModule,
  ],
})
export class AppModule {}
