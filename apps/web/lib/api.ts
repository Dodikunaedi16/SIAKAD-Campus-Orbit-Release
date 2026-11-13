export const API=process.env.NEXT_PUBLIC_API_BASE||'http://localhost:3000/api/v1';
export type Profile={id:string;name:string;email:string;role:'ADMIN'|'DOSEN'|'MAHASISWA';mustChangePassword?:boolean};
export async function request<T=any>(path:string,token?:string,options:RequestInit={}):Promise<T>{
 const headers:Record<string,string>={'Content-Type':'application/json',...(options.headers as Record<string,string>||{})};
 if(token)headers.Authorization=`Bearer ${token}`;
 const response=await fetch(`${API}${path}`,{...options,headers,cache:'no-store'});
 const json=await response.json().catch(()=>({}));
 if(response.status===401&&token&&typeof window!=='undefined')window.dispatchEvent(new Event('orbit-session-expired'));
 if(!response.ok)throw new Error(Array.isArray(json.message)?json.message.join(', '):json.message||'Permintaan gagal');
 return json as T;
}
