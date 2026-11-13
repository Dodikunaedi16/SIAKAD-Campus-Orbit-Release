import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Campus Orbit | Akademik dalam satu orbit',description:'Sistem informasi akademik modern untuk kampus.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
