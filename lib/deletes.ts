import {commitMutation,MutationContext,canonical,conflict} from './sync-server';
import {db,uid} from './db';
const tables:Record<string,string>={client:'clients',sale:'sales',project:'projects',payment:'payments',expense:'expenses',design:'design_tasks',employee:'employees',task:'tasks',settings:'settings'};
// Keep original records and a complete audit snapshot; remove their financial effect atomically.
export async function deleteRecord(type:string,id:string,userId:string,ctx?:MutationContext,expectedTree?:any){
 const table=tables[type];if(!table)throw new Error('نوع الحذف غير صالح');
 if(type==='settings'&&id==='initial')throw new Error('الإعدادات الأساسية لا تُحذف؛ يمكنك تعديلها');
 const database=db();const query=async(sql:string,...args:any[])=>(await database.prepare(sql).bind(...args).all()).results as any[];
 const root=(await query('SELECT * FROM '+table+' WHERE id=? AND deleted_at IS NULL',id))[0];if(!root)throw new Error('السجل غير موجود أو محذوف بالفعل');
 if(type==='expense'&&(root.source?.startsWith('sales-commission:')||root.source?.startsWith('sales-salary:')))throw new Error('مستحق السيلز مرتبط باتفاق أو ديل؛ عدّل بياناته من إدارة السيلز');
 const affected=new Map<string,Map<string,any>>();const queue:Array<[string,any]>=[];
 const add=(t:string,r:any)=>{if(!affected.has(t))affected.set(t,new Map());if(!affected.get(t)!.has(r.id)){affected.get(t)!.set(r.id,r);queue.push([t,r]);}};
 const children=async(t:string,column:string,value:string)=>{for(const r of await query('SELECT * FROM '+t+' WHERE '+column+'=? AND deleted_at IS NULL',value))add(t,r);};
 add(table,root);
 for(let i=0;i<queue.length;i++){const [t,r]=queue[i];
  if(t==='clients')await children('sales','client_id',r.id);
  if(t==='sales'){await children('projects','sale_id',r.id);await children('payments','sale_id',r.id);}
  if(t==='projects'){await children('sales','id',r.sale_id);await children('tasks','project_id',r.id);await children('design_tasks','project_id',r.id);await children('expenses','project_id',r.id);}
  if(t==='expenses'){await children('expenses','parent_id',r.id);await children('design_tasks','expense_id',r.id);}
  if(t==='design_tasks')await children('expenses','id',r.expense_id);
  if(t==='employees')await children('expenses','employee_id',r.id);
 }
 const at=new Date().toISOString();const before=Object.fromEntries([...affected].map(([t,rs])=>[t,[...rs.values()]]));if(expectedTree){const normalized=(tree:any)=>Object.fromEntries(Object.keys(tree).sort().map(t=>[t,[...tree[t]].sort((a:any,b:any)=>a.id.localeCompare(b.id))]));if(canonical(normalized(before))!==canonical(normalized(expectedTree)))conflict();}const batch:D1PreparedStatement[]=[];
 for(const [t,rs] of affected)for(const key of rs.keys())batch.push(database.prepare('UPDATE '+t+' SET deleted_at=?'+(t==='employees'?',active=0':'')+' WHERE id=? AND deleted_at IS NULL').bind(at,key));
 batch.push(database.prepare('INSERT INTO audit_logs(id,user_id,entity,record_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(uid(),userId,type,id,JSON.stringify(before),JSON.stringify({action:'delete',deleted_at:at}),at));
 return await commitMutation(batch,{ok:true,id,deleted:queue.length},ctx);
}
