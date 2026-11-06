import { Module } from '@nestjs/common'
import { PatientsModule } from '../patients/patients.module'
import { MedicamentsController } from './medicaments.controller'
import { MedicamentsService } from './medicaments.service'

@Module({
  imports: [PatientsModule],
  controllers: [MedicamentsController],
  providers: [MedicamentsService],
  exports: [MedicamentsService],
})
export class MedicamentsModule {}
