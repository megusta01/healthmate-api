import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  specialty?: string

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  @IsOptional()
  license?: string

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  bio?: string

  @ApiPropertyOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  @IsOptional()
  avatarUrl?: string
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Obrigatória se a conta já tem senha' })
  @IsString()
  @IsOptional()
  currentPassword?: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'A senha precisa ter letras e números',
  })
  newPassword: string
}
