import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  exports: [],
  providers: [],
})
export class SharedModule {}
