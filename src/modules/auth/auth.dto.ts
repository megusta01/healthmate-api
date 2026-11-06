import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class LoginDto {
  @ApiProperty({ example: 'ana@clinica.com' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string

  @ApiProperty({ example: 'SenhaForte123' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  password: string
}

export class RegisterDto {
  @ApiProperty({ example: 'Ana Souza' })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'ana@clinica.com' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(255)
  email: string

  @ApiProperty({ example: 'SenhaForte123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'A senha precisa ter letras e números',
  })
  password: string

  @ApiPropertyOptional({ example: '(11) 98888-7777' })
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ example: 'Enfermagem' })
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  specialty?: string

  @ApiPropertyOptional({ example: 'COREN-SP 123456' })
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  @IsOptional()
  license?: string
}

export class GoogleLoginDto {
  @ApiProperty({
    description:
      'ID token (credential) retornado pelo Google Identity Services',
  })
  @IsString()
  @IsNotEmpty()
  credential: string
}
