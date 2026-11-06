import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  // segredos/TTL são passados em cada sign/verify (access e refresh usam segredos diferentes)
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
