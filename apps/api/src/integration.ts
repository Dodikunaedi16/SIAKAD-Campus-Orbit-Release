import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard, Roles } from './security';
import { Role } from '@prisma/client';
@Controller('integrations/neo-feeder') @UseGuards(SessionGuard) @Roles(Role.ADMIN)
export class IntegrationController {
 @Get('status') status(){return {mode:'MOCK',connected:false,source:'SIMULATED',message:'Tidak terhubung ke PDDikti resmi'};}
 @Get('prodi') prodi(){return [{id:'PRODI-DEMO-01',nama:'Sistem Informasi',isMock:true},{id:'PRODI-DEMO-02',nama:'Teknik Informatika',isMock:true}];}
}
