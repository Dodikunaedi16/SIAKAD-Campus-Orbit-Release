import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
 catch(e:Prisma.PrismaClientKnownRequestError,host:ArgumentsHost){
  const status=e.code==='P2025'?404:['P2002','P2003','P2034'].includes(e.code)?409:500;
  const message=e.code==='P2002'?'Identitas unik sudah digunakan (NIM, NIDN, email atau kode)':e.code==='P2003'?'Data masih terhubung atau referensi tidak ditemukan':e.code==='P2025'?'Data tidak ditemukan':e.code==='P2034'?'Perubahan bersamaan terdeteksi. Silakan ulangi.':'Operasi database gagal';
  host.switchToHttp().getResponse().status(status).json({statusCode:status,message});
 }
}
