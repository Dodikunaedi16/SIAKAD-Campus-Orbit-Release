import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { DbService } from './db.service';
import { Roles, SessionGuard } from './security';

class GradeInput {
  @IsString() classId!: string;
  @IsString() studentId!: string;
  @IsNumber() @Min(0) @Max(100) score!: number;
}
type Rule={min:number;letter:string;weight:number};
const rules:Rule[]=JSON.parse(process.env.GRADE_RULES||'[{"min":85,"letter":"A","weight":4},{"min":75,"letter":"B","weight":3},{"min":65,"letter":"C","weight":2},{"min":50,"letter":"D","weight":1},{"min":0,"letter":"E","weight":0}]');
if(!Array.isArray(rules)||!rules.length||rules.some((r,i)=>!Number.isFinite(r.min)||r.min<0||r.min>100||!r.letter||!Number.isFinite(r.weight)||r.weight<0||r.weight>4||(i>0&&r.min>=rules[i-1].min))||rules[rules.length-1].min!==0||new Set(rules.map(r=>r.letter)).size!==rules.length)throw new Error('GRADE_RULES tidak valid');
const letterOf=(score:number)=>rules.find(r=>score>=r.min)!.letter;
const weightOf=(letter:string)=>rules.find(r=>r.letter===letter)?.weight;


@Controller('grades')
@UseGuards(SessionGuard)
@Injectable()
export class GradesController {
  constructor(private readonly db: DbService) {}
  @Post() @Roles(Role.ADMIN,Role.DOSEN)
  async put(@Body() dto: GradeInput, @Req() req:any) {
    const [clazz,enrollment]=await Promise.all([
      this.db.class.findUnique({where:{id:dto.classId},include:{lecturer:true}}),
      this.db.enrollment.findUnique({where:{studentId_classId:{studentId:dto.studentId,classId:dto.classId}}})
    ]);
    if(!clazz || !enrollment) throw new BadRequestException('Kelas atau peserta tidak ditemukan');
    if(req.user.role===Role.DOSEN && clazz.lecturer.userId!==req.user.id) throw new ForbiddenException('Bukan dosen pengampu');
    return this.db.grade.upsert({where:{studentId_classId:{studentId:dto.studentId,classId:dto.classId}},create:{studentId:dto.studentId,classId:dto.classId,score:dto.score,letter:letterOf(dto.score)},update:{score:dto.score,letter:letterOf(dto.score)}});
  }
  @Get('class/:classId') @Roles(Role.ADMIN,Role.DOSEN)
  async byClass(@Param('classId') classId:string,@Req() req:any) {
    const clazz=await this.db.class.findUnique({where:{id:classId},include:{lecturer:true}});
    if(!clazz) throw new BadRequestException('Kelas tidak ditemukan');
    if(req.user.role===Role.DOSEN && clazz.lecturer.userId!==req.user.id) throw new ForbiddenException();
    return this.db.enrollment.findMany({where:{classId},include:{student:{include:{user:{select:{name:true}}}},class:{include:{course:true}},},orderBy:{student:{nim:'asc'}}}).then(async rows=>{
      const grades=await this.db.grade.findMany({where:{classId}});
      return rows.map(r=>({...r,grade:grades.find(g=>g.studentId===r.studentId)??null}));
    });
  }
  @Get('rules') rules(){return {rules,repeatPolicy:'BEST_GRADE_PER_COURSE'};}
  @Get('transcript/student/:id') @Roles(Role.ADMIN)
  adminTranscript(@Param('id') id:string){return this.forStudent(id);}
  @Get('transcript/me') @Roles(Role.MAHASISWA)
  async transcript(@Req() req:any){const s=await this.db.student.findUnique({where:{userId:req.user.id}});if(!s)throw new BadRequestException('Profil tidak ditemukan');return this.forStudent(s.id);}
  private async forStudent(studentId:string){
    const student=await this.db.student.findUnique({where:{id:studentId}});if(!student)throw new BadRequestException('Mahasiswa tidak ditemukan');
    const all=await this.db.grade.findMany({where:{studentId,score:{gte:0,lte:100}},include:{class:{include:{course:true}}},orderBy:{class:{term:'asc'}}});
    const enrolled=await this.db.enrollment.findMany({where:{studentId},select:{classId:true}});
    const grades=all.filter(g=>weightOf(g.letter)!==undefined&&enrolled.some(e=>e.classId===g.classId));
    const rows=grades.map(g=>({id:g.id,courseId:g.class.courseId,course:g.class.course.name,code:g.class.course.code,credits:g.class.course.credits,term:g.class.term,score:g.score,letter:g.letter,weight:weightOf(g.letter)!}));
    const best=new Map<string,typeof rows[number]>();for(const g of rows){const old=best.get(g.courseId);if(!old||g.weight>old.weight)best.set(g.courseId,g);}
    const calc=(items:typeof rows)=>{const credits=items.reduce((n,g)=>n+g.credits,0);return {credits,gpa:credits?Number((items.reduce((n,g)=>n+g.credits*g.weight,0)/credits).toFixed(2)):null};};
    const cumulative=calc([...best.values()]);
    return {nim:student.nim,program:student.program,totalCredits:cumulative.credits,gpa:cumulative.gpa,rows,terms:[...new Set(rows.map(g=>g.term))].map(term=>({term,...calc(rows.filter(g=>g.term===term))})),repeatPolicy:'Nilai terbaik per mata kuliah untuk IPK; semua pengambilan sah untuk IPS'};
  }
}
