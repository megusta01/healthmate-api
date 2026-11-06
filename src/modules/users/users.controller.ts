import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser, CurrentUser } from 'src/common/decorators'
import { ChangePasswordDto, UpdateProfileDto } from './users.dto'
import { UsersService } from './users.service'

@ApiTags('users')
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil do usuário logado' })
  get(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.userId)
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza o perfil do usuário logado' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto)
  }

  @Patch('password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Troca (ou define) a senha' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.users.changePassword(user.userId, dto)
  }
}
