import { Module } from '@nestjs/common'
import { PatientAccessService } from './patient-access.service'
import { PatientsController } from './patients.controller'
import { PatientsService } from './patients.service'

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PatientAccessService],
  exports: [PatientAccessService],
})
export class PatientsModule {}
