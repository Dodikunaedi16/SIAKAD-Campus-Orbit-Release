import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password.includes('CHANGE_ME')) {
    throw new Error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters) in apps/api/.env first.');
  }
  await db.user.upsert({where:{email},update:{},create:{email,name:'Administrator Orbit',role:Role.ADMIN,passwordHash:await bcrypt.hash(password,12)}});
  const lecturerEmail='dosen@demo.local';
  const studentEmail='mahasiswa@demo.local';
  const demo = process.env.DEMO_PASSWORD;
  if (demo && demo.length >= 12) {
    const lecturer=await db.user.upsert({where:{email:lecturerEmail},update:{},create:{email:lecturerEmail,name:'Nadia Pratama',role:Role.DOSEN,passwordHash:await bcrypt.hash(demo,12)}});
    const student=await db.user.upsert({where:{email:studentEmail},update:{},create:{email:studentEmail,name:'Arka Mahendra',role:Role.MAHASISWA,passwordHash:await bcrypt.hash(demo,12)}});
    const dosen=await db.lecturer.upsert({where:{nidn:'DEMO-NIDN-001'},update:{},create:{nidn:'DEMO-NIDN-001',userId:lecturer.id}});
    const mhs=await db.student.upsert({where:{nim:'DEMO-24001'},update:{},create:{nim:'DEMO-24001',program:'Sistem Informasi',userId:student.id}});
    const course=await db.course.upsert({where:{code:'SI-301'},update:{},create:{code:'SI-301',name:'Basis Data Lanjut',credits:3}});
    const clazz=await db.class.upsert({where:{code:'SI301-A'},update:{},create:{code:'SI301-A',term:'2026/2027 Ganjil',room:'Lab Digital 02',day:'Senin',startsAt:'09:00',courseId:course.id,lecturerId:dosen.id}});
    await db.enrollment.upsert({where:{studentId_classId:{studentId:mhs.id,classId:clazz.id}},update:{},create:{studentId:mhs.id,classId:clazz.id}});
  }
  console.log('Seed complete. All demo identities are fictional.');
}
main().finally(()=>db.$disconnect());
