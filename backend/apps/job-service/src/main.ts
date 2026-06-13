import 'reflect-metadata';
import { AppModule } from './main.module';
import { bootstrap } from '@interview/core';

bootstrap(AppModule, { serviceName: 'job-service' });
