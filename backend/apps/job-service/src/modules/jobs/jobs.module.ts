import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JobsController } from './jobs.controller';
import { JobCommandHandlers } from './commands';
import { JobQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [JobsController],
  providers: [...JobCommandHandlers, ...JobQueryHandlers],
})
export class JobsModule {}
