import { Body, Controller, Get, Post, Req, UseGuards, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { DbService } from './db.service';
import { SessionGuard } from './security';
import * as bcrypt from 'bcryptjs';
class LoginDto { @IsEmail() email!:string; @IsString() @MinLength(1) @MaxLength(72) password!:string; }
class PasswordDto { @IsString() currentPassword!:string; @IsString() @MinLength(12) @MaxLength(72) newPassword!:string; }
@Injectable()
export class AuthService {
 constructor(private db:DbService,private jwt:JwtService){}
 async login(dto:LoginDto){
  const user=await this.db.user.findUnique({where:{email:dto.email.trim().toLowerCase()}});
  if(!user || !await bcrypt.compare(dto.password,user.passwordHash))throw new UnauthorizedException('Email atau password salah');
  const profile={id:user.id,name:user.name,email:user.email,role:user.role,mustChangePassword:user.mustChangePassword};
  return {accessToken:await this.jwt.signAsync({...profile,tokenVersion:user.tokenVersion}),user:profile};
 }
 async password(id:string,dto:PasswordDto){
  const user=await this.db.user.findUniqueOrThrow({where:{id}});
  if(!await bcrypt.compare(dto.currentPassword,user.passwordHash))throw new UnauthorizedException('Password lama salah');
  if(dto.currentPassword===dto.newPassword)throw new BadRequestException('Gunakan password baru');
  await this.db.user.update({where:{id},data:{passwordHash:await bcrypt.hash(dto.newPassword,12),mustChangePassword:false,tokenVersion:{increment:1}}});
  return {message:'Password diganti. Silakan login kembali.'};
 }
 async logout(id:string){await this.db.user.update({where:{id},data:{tokenVersion:{increment:1}}});return {message:'Sesi diakhiri'};}
}
@Controller('auth')
export class AuthController {
 constructor(private auth:AuthService){}
 @Throttle({default:{limit:10,ttl:60000}}) @Post('login') login(@Body() dto:LoginDto){return this.auth.login(dto);}
 @UseGuards(SessionGuard) @Get('me') me(@Req() req:any){return req.user;}
 @UseGuards(SessionGuard) @Post('password') password(@Req() req:any,@Body() dto:PasswordDto){return this.auth.password(req.user.id,dto);}
 @UseGuards(SessionGuard) @Post('logout') logout(@Req() req:any){return this.auth.logout(req.user.id);}
}
