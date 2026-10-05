import {rows,one} from './db';
export const teamRoles=['admin','manager','programmer'];
export const managementRoles=['admin','manager'];
export async function visibleTeamTask(taskId:string,user:any){
 const task=await one('SELECT tt.*,s.status AS project_status FROM team_tasks tt JOIN projects p ON p.id=tt.project_id JOIN sales s ON s.id=p.sale_id JOIN clients c ON c.id=s.client_id WHERE tt.id=? AND tt.deleted_at IS NULL',taskId);
 if(!task)return null;
 if(user.role==='programmer'&&(task.assignee_id!==user.id||!await one('SELECT user_id FROM project_members WHERE project_id=? AND user_id=?',task.project_id,user.id)))return null;
 return task;
}
export async function teamWorkData(user:any,projectId:string,offset:number){
 const management=managementRoles.includes(user.role);
 const scope=management?'':' AND EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=?)';
 const args=management?[]:[user.id];
 const projects=await rows(`SELECT p.id,s.name,s.service,s.status,p.start,s.delivery,c.name AS client,(SELECT COUNT(*) FROM team_tasks progress WHERE progress.project_id=p.id AND progress.deleted_at IS NULL) AS taskCount,(SELECT COUNT(*) FROM team_tasks progress WHERE progress.project_id=p.id AND progress.deleted_at IS NULL AND progress.status='done') AS completed FROM projects p JOIN sales s ON s.id=p.sale_id JOIN clients c ON c.id=s.client_id WHERE 1=1${scope} ORDER BY s.name`,...args);
 const taskScope=(management?'':' AND tt.assignee_id=? AND EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=tt.project_id AND pm.user_id=?)')+(projectId?' AND tt.project_id=?':'');
 const taskArgs=[...(management?[]:[user.id,user.id]),...(projectId?[projectId]:[])];
 const base=`FROM team_tasks tt JOIN projects p ON p.id=tt.project_id JOIN sales s ON s.id=p.sale_id JOIN clients c ON c.id=s.client_id WHERE tt.deleted_at IS NULL${taskScope}`;
 const total=await one('SELECT COUNT(*) AS n '+base,...taskArgs);
 const tasks=await rows('SELECT tt.id,tt.project_id,tt.assignee_id,tt.title,tt.description,tt.due_date,tt.status,tt.version,tt.updated_at,s.name AS project_name,u.name AS assignee_name '+base.replace(' WHERE',' LEFT JOIN users u ON u.id=tt.assignee_id WHERE')+' ORDER BY tt.created_at DESC,tt.id LIMIT 50 OFFSET ?',...taskArgs,offset);
 const attachments=tasks.length?await rows('SELECT id,task_id,filename,content_type,size FROM team_attachments WHERE deleted_at IS NULL AND task_id IN ('+tasks.map(()=>'?').join(',')+') ORDER BY created_at',...tasks.map(t=>t.id)):[];
 const stats=await rows('SELECT tt.status,COUNT(*) AS n '+base+' GROUP BY tt.status',...taskArgs);
 const activity=management?await rows("SELECT a.id,a.entity,a.record_id,a.after_json,a.created_at,u.name AS actor,s.name AS project_name,assigned.name AS assignee_name FROM audit_logs a JOIN users u ON u.id=a.user_id LEFT JOIN projects p ON p.id=COALESCE(json_extract(a.after_json,'$.projectId'),CASE WHEN a.entity IN ('projectMember','projectDelivery') THEN a.record_id END) LEFT JOIN sales s ON s.id=p.sale_id LEFT JOIN users assigned ON assigned.id=COALESCE(json_extract(a.after_json,'$.assigneeId'),json_extract(a.after_json,'$.userId')) WHERE a.entity IN ('teamTask','teamAttachment','projectMember','projectDelivery') ORDER BY a.created_at DESC,a.rowid DESC LIMIT 50"):[];
 const cutoff=new Date(Date.now()-7*86400000).toISOString();
 const stale=await rows('SELECT tt.id,tt.title,tt.status,tt.updated_at,s.name AS project_name '+base+" AND tt.status NOT IN ('done','cancelled') AND tt.updated_at<? ORDER BY tt.updated_at LIMIT 50",...taskArgs,cutoff);
 const review=await rows('SELECT tt.id,tt.title,tt.status,tt.updated_at,s.name AS project_name '+base+" AND tt.status='review' ORDER BY tt.updated_at LIMIT 50",...taskArgs);
 const staleCount=await one('SELECT COUNT(*) AS n '+base+" AND tt.status NOT IN ('done','cancelled') AND tt.updated_at<?",...taskArgs,cutoff);
 const monthly=await one('SELECT COUNT(*) AS n '+base+" AND tt.status NOT IN ('done','cancelled') AND substr(tt.created_at,1,7)=?",...taskArgs,new Date().toISOString().slice(0,7));
 const weeks=await rows(`SELECT CASE WHEN a.created_at>=? THEN 'current' ELSE 'previous' END AS period,COUNT(DISTINCT tt.id) AS touched,COUNT(DISTINCT CASE WHEN json_extract(a.after_json,'$.status')='done' AND COALESCE(json_extract(a.before_json,'$.status'),'')!='done' THEN tt.id END) AS completed,COUNT(DISTINCT substr(a.created_at,1,10)) AS active_days FROM audit_logs a JOIN team_tasks tt ON tt.id=a.record_id JOIN projects p ON p.id=tt.project_id JOIN sales s ON s.id=p.sale_id JOIN clients c ON c.id=s.client_id WHERE a.entity='teamTask' AND a.created_at>=? AND a.created_at<=? AND tt.deleted_at IS NULL${taskScope}${management?'':' AND a.user_id=?'} GROUP BY period`,cutoff,new Date(Date.now()-14*86400000).toISOString(),new Date().toISOString(),...taskArgs,...(management?[]:[user.id]));
 return {projects,tasks,attachments,total:total.n,stats,activity,overview:{stale,review,staleCount:staleCount.n,monthlyOpen:monthly.n,weeks}};
}
