import { Body, Controller, Get, Param, Post, Req, UseGuards, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { DbService } from './db.service';
import { Roles, SessionGuard } from './security';
class OpenDto {@IsString() classId!:string; @IsInt() @Min(1) number!:number;}
class ScanDto {@IsString() token!:string;}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
@Controller('attendance') @UseGuards(SessionGuard)
export class AttendanceController {
 constructor(private db:DbService){}
 @Post('open') @Roles(Role.DOSEN,Role.ADMIN) async open(@Body() dto:OpenDto,@Req() req:any){
  const clazz=await this.db.class.findUnique({where:{id:dto.classId},include:{lecturer:true}});
  if(!clazz)throw new NotFoundException('Kelas tidak ditemukan');
  if(req.user.role===Role.DOSEN && clazz.lecturer.userId!==req.user.id)throw new ForbiddenException('Bukan dosen kelas');
  const meeting=await this.db.meeting.upsert({where:{classId_number:{classId:clazz.id,number:dto.number}},update:{},create:{classId:clazz.id,number:dto.number}});
  const token=randomBytes(32).toString('base64url');
  const expiresAt=new Date(Date.now()+90000);
  await this.db.$transaction([this.db.qrSession.updateMany({where:{meetingId:meeting.id},data:{expiresAt:new Date()}}),this.db.qrSession.create({data:{meetingId:meeting.id,tokenHash:hash(token),expiresAt}})]);
  return {token,expiresAt,meetingId:meeting.id,qrPayload:`ORBIT:${token}`};
 }
 @Post('scan') @Roles(Role.MAHASISWA) async scan(@Body() dto:ScanDto,@Req() req:any){
  const raw=dto.token.replace(/^ORBIT:/,'').trim();
  const session=await this.db.qrSession.findUnique({where:{tokenHash:hash(raw)},include:{meeting:true}});
  if(!session || session.expiresAt<=new Date())throw new BadRequestException('QR tidak valid atau kedaluwarsa');
  const student=await this.db.student.findUnique({where:{userId:req.user.id}});
  if(!student)throw new ForbiddenException('Data mahasiswa tidak ditemukan');
  const enrollment=await this.db.enrollment.findUnique({where:{studentId_classId:{studentId:student.id,classId:session.meeting.classId}}});
  if(!enrollment)throw new ForbiddenException('Belum mengambil kelas ini');
  const existing=await this.db.attendance.findUnique({where:{meetingId_studentId:{meetingId:session.meetingId,studentId:student.id}}});
  if(existing)throw new BadRequestException('Presensi sudah tercatat');
  return this.db.attendance.create({data:{meetingId:session.meetingId,studentId:student.id}});
 }
 @Get('class/:id') @Roles(Role.ADMIN,Role.DOSEN) async report(@Param('id') id:string,@Req() req:any){
  const clazz=await this.db.class.findUnique({where:{id},include:{lecturer:true}});
  if(!clazz)throw new NotFoundException('Kelas tidak ditemukan');
  if(req.user.role===Role.DOSEN && clazz.lecturer.userId!==req.user.id)throw new ForbiddenException();
  return this.db.meeting.findMany({where:{classId:id},include:{attendances:{include:{student:{include:{user:{select:{name:true}}}}}}},orderBy:{number:'asc'}});
 }
 @Get('mine') @Roles(Role.MAHASISWA) async mine(@Req() req:any){const s=await this.db.student.findUnique({where:{userId:req.user.id}});return this.db.attendance.findMany({where:{studentId:s?.id||'none'},include:{meeting:{include:{class:{include:{course:true}}}}},orderBy:{markedAt:'desc'}});}
}
