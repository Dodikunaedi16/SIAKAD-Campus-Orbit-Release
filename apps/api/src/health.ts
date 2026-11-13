import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DbService } from './db.service';
@Controller('health')
export class HealthController {
 constructor(private db:DbService){}
 @Get() async check(){try{await this.db.$queryRaw`SELECT 1`;return {status:'ok',database:'connected',service:'Campus Orbit API'};}catch{throw new ServiceUnavailableException('Database unavailable');}}
}
