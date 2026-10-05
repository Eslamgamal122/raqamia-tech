 'use client';
import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {t} from '../lib/i18n';
export function PasswordField(props:React.InputHTMLAttributes<HTMLInputElement>){const [show,setShow]=useState(false);return <span className="password-input"><input {...props} type={show?'text':'password'} dir="ltr"/><button type="button" className="icon-btn" aria-label={t(show?'إخفاء كلمة المرور':'إظهار كلمة المرور')} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>;}
