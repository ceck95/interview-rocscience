import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BillingController } from './billing.controller';
import { BillingQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BillingController],
  providers: [...BillingQueryHandlers],
})
export class BillingModule {}
