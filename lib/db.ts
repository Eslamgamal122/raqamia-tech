import {nodeDatabase} from './node-database.mjs';
export type {PreparedStatement} from './node-database.mjs';
export const db=nodeDatabase;
export const uid=()=>crypto.randomUUID();
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// All business reads exclude deleted records, including SQL subqueries.
function activeReads(sql:string){return sql.replace(/\b(FROM|JOIN)\s+(clients|sales|projects|payments|employees|settings|expenses|design_tasks|tasks)\b/gi,(match,op,t,offset,input)=>/\bDELETE\s*$/i.test(input.slice(0,offset))?match:op+' active_'+t.toLowerCase());}
export async function rows(sql:string,...args:any[]){return (await db().prepare(activeReads(sql)).bind(...args).all()).results as any[];}
export async function one(sql:string,...args:any[]){return await db().prepare(activeReads(sql)).bind(...args).first() as any;}
export function stmt(sql:string,...args:any[]){return db().prepare(activeReads(sql)).bind(...args);}
