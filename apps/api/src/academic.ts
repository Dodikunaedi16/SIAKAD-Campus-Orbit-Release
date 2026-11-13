import { Body, Controller, Get, Param, Post, Put, Delete, Req, Query, UseGuards, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsEmail, IsInt, IsOptional, IsString, Min, Max, MinLength, MaxLength, Matches, IsIn } from 'class-validator';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DbService } from './db.service';
import { Roles, SessionGuard } from './security';
class PersonDto { @IsString() @MinLength(2) name!:string; @IsEmail() email!:string; @IsString() @MinLength(2) program!:string; }
class StudentDto extends PersonDto { @IsString() @Matches(/^[a-zA-Z0-9-]{3,30}$/) nim!:string; }
class NewStudentDto extends StudentDto { @IsString() @MinLength(12) @MaxLength(72) password!:string; }
class LecturerDto extends PersonDto { @IsString() @Matches(/^[a-zA-Z0-9-]{3,30}$/) nidn!:string; }
class NewLecturerDto extends LecturerDto { @IsString() @MinLength(12) @MaxLength(72) password!:string; }
class CourseDto { @IsString() @MinLength(2) code!:string; @IsString() @MinLength(2) name!:string; @IsInt() @Min(1) @Max(12) credits!:number; @IsString() @MinLength(2) program!:string; }
class NewClassDto { @IsString() @MinLength(2) code!:string; @IsString() @Matches(/^\d{4}\/\d{4}-(GANJIL|GENAP|PENDEK)$/) term!:string; @IsString() @MinLength(1) room!:string; @IsIn(['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']) day!:string; @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startsAt!:string; @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endsAt!:string; @IsString() courseId!:string; @IsString() lecturerId!:string; }
class EnrollmentDto { @IsString() classId!:string; @IsOptional() @IsString() studentId?:string; }
const userSelect={id:true,name:true,email:true,role:true,mustChangePassword:true};
const classInclude={course:true,lecturer:{include:{user:{select:{name:true}}}},_count:{select:{enrollments:true}}};
@Controller('academic') @UseGuards(SessionGuard)
export class AcademicController {
 constructor(private db:DbService){const max=Number(process.env.MAX_KRS_CREDITS||24);if(!Number.isInteger(max)||max<1||max>60)throw new Error('MAX_KRS_CREDITS harus bilangan bulat 1–60');}
 private student(userId:string){return this.db.student.findUnique({where:{userId},include:{user:{select:userSelect}}});}
 @Get('profile') async profile(@Req() req:any){if(req.user.role===Role.MAHASISWA)return this.student(req.user.id);if(req.user.role===Role.DOSEN)return this.db.lecturer.findUnique({where:{userId:req.user.id},include:{user:{select:userSelect}}});return req.user;}
 @Get('summary') async summary(@Req() req:any){
  if(req.user.role!==Role.ADMIN){const classes=await this.classes(req);const s=await this.student(req.user.id);return {students:0,lecturers:0,courses:classes.length,classes:classes.length,attendances:s?await this.db.attendance.count({where:{studentId:s.id}}):await this.db.attendance.count({where:{meeting:{class:{lecturer:{userId:req.user.id}}}}}),role:req.user.role};}
  const [students,lecturers,courses,classes,attendances]=await Promise.all([this.db.student.count(),this.db.lecturer.count(),this.db.course.count(),this.db.class.count(),this.db.attendance.count()]);return {students,lecturers,courses,classes,attendances,role:req.user.role};
 }
 @Get('accounts') @Roles(Role.ADMIN) accounts(){return this.db.user.findMany({select:userSelect,orderBy:{name:'asc'}});}
 @Get('students') @Roles(Role.ADMIN) students(){return this.db.student.findMany({include:{user:{select:userSelect}},orderBy:{nim:'asc'}});}
 @Post('students') @Roles(Role.ADMIN) async createStudent(@Body() b:NewStudentDto){return this.db.user.create({data:{email:b.email.trim().toLowerCase(),name:b.name,role:Role.MAHASISWA,mustChangePassword:true,passwordHash:await bcrypt.hash(b.password,12),student:{create:{nim:b.nim,program:b.program}}},select:{...userSelect,student:true}});}
 @Put('students/:id') @Roles(Role.ADMIN) updateStudent(@Param('id') id:string,@Body() b:StudentDto){return this.db.student.update({where:{id},data:{nim:b.nim,program:b.program,user:{update:{name:b.name,email:b.email.trim().toLowerCase()}}},include:{user:{select:userSelect}}});}
 @Delete('students/:id') @Roles(Role.ADMIN) async deleteStudent(@Param('id') id:string){return this.db.$transaction(async tx=>{const s=await tx.student.findUnique({where:{id},include:{_count:{select:{enrollments:true,attendances:true,grades:true}}}});if(!s)throw new NotFoundException();if(Object.values(s._count).some(n=>n>0))throw new BadRequestException('Mahasiswa memiliki KRS, nilai atau presensi; data akademik harus dipertahankan');await tx.user.delete({where:{id:s.userId}});return {deleted:true};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 @Get('lecturers') @Roles(Role.ADMIN) lecturers(){return this.db.lecturer.findMany({include:{user:{select:userSelect}},orderBy:{nidn:'asc'}});}
 @Post('lecturers') @Roles(Role.ADMIN) async createLecturer(@Body() b:NewLecturerDto){return this.db.user.create({data:{email:b.email.trim().toLowerCase(),name:b.name,role:Role.DOSEN,mustChangePassword:true,passwordHash:await bcrypt.hash(b.password,12),lecturer:{create:{nidn:b.nidn,program:b.program}}},select:{...userSelect,lecturer:true}});}
 @Put('lecturers/:id') @Roles(Role.ADMIN) updateLecturer(@Param('id') id:string,@Body() b:LecturerDto){return this.db.lecturer.update({where:{id},data:{nidn:b.nidn,program:b.program,user:{update:{name:b.name,email:b.email.trim().toLowerCase()}}},include:{user:{select:userSelect}}});}
 @Delete('lecturers/:id') @Roles(Role.ADMIN) async deleteLecturer(@Param('id') id:string){return this.db.$transaction(async tx=>{const l=await tx.lecturer.findUnique({where:{id},include:{_count:{select:{classes:true}}}});if(!l)throw new NotFoundException();if(l._count.classes)throw new BadRequestException('Pindahkan penugasan kelas terlebih dahulu');await tx.user.delete({where:{id:l.userId}});return {deleted:true};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 @Get('courses') courses(){return this.db.course.findMany({orderBy:{code:'asc'}});}
 @Post('courses') @Roles(Role.ADMIN) createCourse(@Body() dto:CourseDto){return this.db.course.create({data:dto});}
 @Put('courses/:id') @Roles(Role.ADMIN) async updateCourse(@Param('id') id:string,@Body() dto:CourseDto){const used=await this.db.enrollment.count({where:{class:{courseId:id}}});if(used)throw new BadRequestException('Mata kuliah sudah digunakan KRS; pertahankan data historis');return this.db.course.update({where:{id},data:dto});}
 @Delete('courses/:id') @Roles(Role.ADMIN) async deleteCourse(@Param('id') id:string){if(await this.db.class.count({where:{courseId:id}}))throw new BadRequestException('Mata kuliah masih memiliki kelas');return this.db.course.delete({where:{id}});}
 @Get('classes') async classes(@Req() req:any){const where:Prisma.ClassWhereInput=req.user.role===Role.DOSEN?{lecturer:{userId:req.user.id}}:req.user.role===Role.MAHASISWA?{enrollments:{some:{student:{userId:req.user.id}}}}:{};return this.db.class.findMany({where,include:classInclude,orderBy:{code:'asc'}});}
 @Get('available-classes') @Roles(Role.ADMIN,Role.MAHASISWA) available(){return this.db.class.findMany({include:classInclude,orderBy:{term:'desc'}});}
 private async saveClass(dto:NewClassDto,id?:string){
  if(dto.startsAt>=dto.endsAt)throw new BadRequestException('Jam selesai harus setelah jam mulai');
  const years=dto.term.split('-')[0].split('/').map(Number);if(years[1]!==years[0]+1)throw new BadRequestException('Tahun akademik tidak valid');
  return this.db.$transaction(async tx=>{
   if(id){const existing=await tx.class.findUnique({where:{id}});if(!existing)throw new NotFoundException();if((existing.term!==dto.term||existing.courseId!==dto.courseId)&&await tx.enrollment.count({where:{classId:id}}))throw new BadRequestException('Term dan mata kuliah kelas berpeserta tidak dapat diubah');}
   const conflicts=await tx.class.count({where:{id:id?{not:id}:undefined,term:dto.term,day:dto.day,startsAt:{lt:dto.endsAt},endsAt:{gt:dto.startsAt},OR:[{room:dto.room},{lecturerId:dto.lecturerId}]}});
   if(conflicts)throw new BadRequestException('Jadwal dosen atau ruang bentrok');
   if(id){const participants=await tx.enrollment.findMany({where:{classId:id},select:{studentId:true}});if(participants.length&&await tx.enrollment.count({where:{studentId:{in:participants.map(p=>p.studentId)},classId:{not:id},class:{term:dto.term,day:dto.day,startsAt:{lt:dto.endsAt},endsAt:{gt:dto.startsAt}}}}))throw new BadRequestException('Jadwal peserta bentrok');}
   return id?tx.class.update({where:{id},data:dto}):tx.class.create({data:dto});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 @Post('classes') @Roles(Role.ADMIN) createClass(@Body() dto:NewClassDto){return this.saveClass(dto);}
 @Put('classes/:id') @Roles(Role.ADMIN) updateClass(@Param('id') id:string,@Body() dto:NewClassDto){return this.saveClass(dto,id);}
 @Delete('classes/:id') @Roles(Role.ADMIN) async deleteClass(@Param('id') id:string){if(await this.db.enrollment.count({where:{classId:id}})||await this.db.meeting.count({where:{classId:id}}))throw new BadRequestException('Kelas memiliki peserta atau pertemuan');return this.db.class.delete({where:{id}});}
 @Get('enrollments') async enrollments(@Req() req:any){const where:Prisma.EnrollmentWhereInput=req.user.role===Role.MAHASISWA?{student:{userId:req.user.id}}:req.user.role===Role.DOSEN?{class:{lecturer:{userId:req.user.id}}}:{};return this.db.enrollment.findMany({where,include:{class:{include:classInclude},student:{select:{id:true,nim:true,program:true,user:{select:{name:true}}}}}});}
 @Post('enrollments') @Roles(Role.ADMIN,Role.MAHASISWA) async enroll(@Body() dto:EnrollmentDto,@Req() req:any){
  if(req.user.role===Role.MAHASISWA&&dto.studentId)throw new ForbiddenException('Identitas peserta ditentukan sesi');
  return this.db.$transaction(async tx=>{
   const student=await tx.student.findUnique({where:req.user.role===Role.MAHASISWA?{userId:req.user.id}:{id:dto.studentId||''}});if(!student)throw new BadRequestException('Mahasiswa tidak ditemukan');
   const clazz=await tx.class.findUnique({where:{id:dto.classId},include:{course:true}});if(!clazz)throw new NotFoundException('Kelas tidak ditemukan');
   const rows=await tx.enrollment.findMany({where:{studentId:student.id,class:{term:clazz.term}},include:{class:{include:{course:true}}}});
   if(rows.some(r=>r.classId===dto.classId||r.class.courseId===clazz.courseId))throw new BadRequestException('Mata kuliah sudah diambil pada semester ini');
   const max=Number(process.env.MAX_KRS_CREDITS||24);if(rows.reduce((n,r)=>n+r.class.course.credits,0)+clazz.course.credits>max)throw new BadRequestException('Batas SKS terlampaui: '+max);
   if(rows.some(r=>r.class.day===clazz.day&&r.class.startsAt<clazz.endsAt&&r.class.endsAt>clazz.startsAt))throw new BadRequestException('Jadwal kuliah bentrok');
   return tx.enrollment.create({data:{studentId:student.id,classId:dto.classId}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 @Delete('enrollments/:id') @Roles(Role.ADMIN,Role.MAHASISWA) async drop(@Param('id') id:string,@Req() req:any){return this.db.$transaction(async tx=>{const e=await tx.enrollment.findUnique({where:{id},include:{student:true}});if(!e)throw new NotFoundException();if(req.user.role===Role.MAHASISWA&&e.student.userId!==req.user.id)throw new ForbiddenException();if(await tx.grade.count({where:{studentId:e.studentId,classId:e.classId}})||await tx.attendance.count({where:{studentId:e.studentId,meeting:{classId:e.classId}}}))throw new BadRequestException('KRS sudah memiliki nilai atau presensi');return tx.enrollment.delete({where:{id}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
}
