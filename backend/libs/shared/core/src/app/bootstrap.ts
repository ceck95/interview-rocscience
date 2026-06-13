import type { Type } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ValidationError } from 'class-validator';
import { Logger } from 'nestjs-pino';
import { AppBadRequestException } from '../exception/app-exception';
import { Environment, setupSwagger } from '../config';

interface BootstrapOptions {
  port?: number;
  serviceName: string;
}

export async function bootstrap(
  MainModule: Type<unknown>,
  options: BootstrapOptions
): Promise<void> {
  process.env['SERVICE_NAME'] = process.env['SERVICE_NAME'] || options.serviceName;
  process.env['PORT'] = process.env['PORT'] || String(options.port ?? 3000);
  process.env['APP_VERSION'] = process.env['APP_VERSION'] || 'unknown';

  const app = await NestFactory.create<NestExpressApplication>(MainModule, {
    bufferLogs: true,
  });

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]): AppBadRequestException => {
        return AppBadRequestException.fromValidationErrors(errors);
      },
    })
  );

  const httpAdapter = app.getHttpAdapter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpAdapter.get('/healthz', (_req: any, res: any) => {
    res.json({ status: 'ok', version: process.env['APP_VERSION'] });
  });

  if (process.env['NODE_ENV'] !== Environment.PRODUCTION) {
    setupSwagger(app, {
      title: `APIs Documentation - ${options.serviceName}`,
      version: process.env['APP_VERSION'],
    });
  }

  app.enableShutdownHooks();

  await app.listen(process.env['PORT'] ?? 3000);

  console.log(`[${options.serviceName}] running on http://localhost:${process.env['PORT']}/api`);
  console.log(`[${options.serviceName}] docs at http://localhost:${process.env['PORT']}/api/docs`);
}
