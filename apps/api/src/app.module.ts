import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DbService } from './db.service';
import { AuthController, AuthService } from './auth';
import { AcademicController } from './academic';
import { AttendanceController } from './attendance';
import { IntegrationController } from './integration';
import { HealthController } from './health';
import { GradesController } from './grades';
@Module({imports:[ConfigModule.forRoot({isGlobal:true}),JwtModule.registerAsync({global:true,inject:[ConfigService],useFactory:(cfg:ConfigService)=>{const secret=cfg.get<string>('JWT_SECRET');if(!secret||secret.length<32||secret.includes('REPLACE_'))throw new Error('Set strong JWT_SECRET in apps/api/.env');return {secret,signOptions:{expiresIn:'2h'}};}}),ThrottlerModule.forRoot([{ttl:60000,limit:150}])],controllers:[AuthController,AcademicController,AttendanceController,IntegrationController,HealthController,GradesController],providers:[DbService,AuthService,{provide:APP_GUARD,useClass:ThrottlerGuard}]})
export class AppModule {}
