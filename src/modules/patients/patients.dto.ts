import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { Gender } from 'src/generated/prisma/enums'
import { CreateMedicamentDto } from '../medicaments/medicaments.dto'

export const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value

export class AddressDto {
  @ApiPropertyOptional({ example: 'Rua das Flores' })
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  @IsOptional()
  street?: string

  @ApiPropertyOptional({ example: '123' })
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @IsOptional()
  number?: string

  @ApiPropertyOptional({ example: 'Apto 12' })
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  complement?: string

  @ApiPropertyOptional({ example: 'Centro' })
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  district?: string

  @ApiPropertyOptional({ example: 'São Paulo' })
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  city?: string

  @ApiPropertyOptional({ example: 'SP' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || undefined : value,
  )
  @IsString()
  @Length(2, 2, { message: 'Use a sigla do estado (ex.: SP)' })
  @IsOptional()
  state?: string

  @ApiPropertyOptional({ example: '01001-000' })
  @Transform(trim)
  @IsString()
  @MaxLength(9)
  @IsOptional()
  zipCode?: string
}

export class CreatePatientDto {
  @ApiProperty({ example: 'João da Silva' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do paciente' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(255)
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ example: '(11) 97777-6666' })
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender

  @ApiPropertyOptional({ example: '1958-03-21' })
  @IsDateString({ strict: true }, { message: 'Data inválida (use AAAA-MM-DD)' })
  @IsOptional()
  birthDate?: string

  @ApiPropertyOptional({ example: 72.5, description: 'kg' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(500)
  @IsOptional()
  weight?: number

  @ApiPropertyOptional({ example: 1.72, description: 'metros' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.3)
  @Max(2.6)
  @IsOptional()
  height?: number

  @ApiPropertyOptional({ enum: BLOOD_TYPES })
  @IsIn(BLOOD_TYPES)
  @IsOptional()
  bloodType?: string

  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string

  @ApiPropertyOptional({
    type: [CreateMedicamentDto],
    description: 'Medicamentos criados junto com o paciente (mesma transação)',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateMedicamentDto)
  @IsOptional()
  medicaments?: CreateMedicamentDto[]
}

export class UpdatePatientDto extends PartialType(
  OmitType(CreatePatientDto, ['medicaments', 'name'] as const),
) {
  // o nome pode ser omitido na edição, mas nunca apagado (null/"")
  @ApiPropertyOptional({ example: 'João da Silva' })
  @Transform(trim)
  @ValidateIf((_, value) => value !== undefined)
  @IsString({ message: 'Informe o nome do paciente' })
  @IsNotEmpty({ message: 'Informe o nome do paciente' })
  @MaxLength(100)
  name?: string
}
