import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';

export interface SwaggerConfig {
  title: string;
  version?: string;
}

export function setupSwagger(app: INestApplication, config: SwaggerConfig): void {
  const { title, version = '1.0' } = config;

  const builder = new DocumentBuilder()
    .setTitle(title)
    .setVersion(version)
    .setDescription('API documentation for Cloud Job Execution System');

  const swaggerConfig = builder.build();

  const document = SwaggerModule.createDocument(
    app as unknown as Parameters<typeof SwaggerModule.createDocument>[0],
    swaggerConfig
  );

  SwaggerModule.setup(
    'api/docs',
    app as unknown as Parameters<typeof SwaggerModule.createDocument>[0],
    document,
    {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelRendering: 'model',
        defaultModelsExpandDepth: -1,
        filter: true,
      },
      customSiteTitle: title,
    }
  );
}

export const Environment = {
  PRODUCTION: 'production',
} as const;
