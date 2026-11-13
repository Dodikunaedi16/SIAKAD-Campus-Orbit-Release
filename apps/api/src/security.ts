import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { DbService } from './db.service';
export type UserSession={id:string;role:Role;email:string;name:string;tokenVersion:number};
export const Roles=(...roles:Role[])=>SetMetadata('roles',roles);
@Injectable()
export class SessionGuard implements CanActivate {
 constructor(private jwt:JwtService,private reflector:Reflector,private db:DbService){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest();
  const auth=req.headers.authorization||'';
  if(!auth.startsWith('Bearer '))throw new UnauthorizedException('Login diperlukan');
  let claims:UserSession;
  try { claims=await this.jwt.verifyAsync<UserSession>(auth.slice(7)); }
  catch {throw new UnauthorizedException('Sesi kedaluwarsa atau tidak valid');}
  const user=await this.db.user.findUnique({where:{id:claims.id},select:{id:true,name:true,email:true,role:true,tokenVersion:true,mustChangePassword:true}});
  if(!user || user.tokenVersion!==claims.tokenVersion)throw new UnauthorizedException('Silakan login kembali');
  req.user=user;
  const roles=this.reflector.getAllAndOverride<Role[]>('roles',[context.getHandler(),context.getClass()]);
  if(roles && !roles.includes(user.role))throw new ForbiddenException('Akses ditolak');
  return true;
 }
}
