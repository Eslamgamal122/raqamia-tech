import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'raqamia tech | إدارة الشركة',manifest:'/manifest.webmanifest',description:'المبيعات والمشاريع والمالية في مكان واحد',icons:{icon:'/brand/icon-192.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>;}
