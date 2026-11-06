import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChangePasswordDto, UpdateProfileDto } from './users.dto'
import { toProfile } from './user.mapper'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { professional: true },
    })
    if (!user) throw new NotFoundException('USER_NOT_FOUND')
    return toProfile(user)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { name, phone, ...professional } = dto
    const hasProfessionalFields = Object.values(professional).some(
      (v) => v !== undefined,
    )

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        ...(hasProfessionalFields && {
          professional: {
            upsert: { create: professional, update: professional },
          },
        }),
      },
      include: { professional: true },
    })
    return toProfile(user)
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('USER_NOT_FOUND')

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('CURRENT_PASSWORD_REQUIRED')
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash)
      if (!ok) throw new UnauthorizedException('CURRENT_PASSWORD_INVALID')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    })
  }
}
