import { Module } from '@nestjs/common';

import { CentralKpisService } from './central-kpis.service';
import { CentralController } from './central.controller';

@Module({
  controllers: [CentralController],
  providers: [CentralKpisService],
  exports: [CentralKpisService],
})
export class CentralModule {}
