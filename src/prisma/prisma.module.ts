import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/** Global: uma única instância (e um único pool de conexões) para a app toda. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
