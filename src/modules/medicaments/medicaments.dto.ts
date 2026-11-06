import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { MedicamentStatus } from 'src/generated/prisma/enums'

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class CreateMedicamentDto {
  @ApiProperty({ example: 'Losartana' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do medicamento' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ example: 'Tomar após o café' })
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ example: '50 mg' })
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  @IsOptional()
  dosage?: string

  @ApiPropertyOptional({ example: 30, description: 'Unidades em estoque' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  @IsOptional()
  quantity?: number

  @ApiPropertyOptional({
    example: 5,
    description: 'Avisar recompra quando o estoque chegar a este valor',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  @IsOptional()
  lowStockAt?: number

  @ApiPropertyOptional({ enum: MedicamentStatus })
  @IsEnum(MedicamentStatus)
  @IsOptional()
  status?: MedicamentStatus

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsDateString({ strict: true }, { message: 'Data inválida (use AAAA-MM-DD)' })
  @IsOptional()
  startDate?: string

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsDateString({ strict: true }, { message: 'Data inválida (use AAAA-MM-DD)' })
  @IsOptional()
  endDate?: string

  @ApiPropertyOptional({
    example: ['08:00', '20:00'],
    description: 'Horários diários (HH:mm). Cada horário vira um lembrete.',
  })
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayUnique()
  @Matches(TIME_REGEX, { each: true, message: 'Horário inválido (use HH:mm)' })
  @IsOptional()
  times?: string[]
}

export class UpdateMedicamentDto extends PartialType(CreateMedicamentDto) {}

export class UpdateReminderDto {
  @ApiPropertyOptional({ example: '09:30' })
  @Matches(TIME_REGEX, { message: 'Horário inválido (use HH:mm)' })
  @IsOptional()
  time?: string

  @ApiPropertyOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  @IsOptional()
  message?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
