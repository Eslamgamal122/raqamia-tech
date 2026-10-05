import {rows,one} from './db';
export const workStatuses=['todo','in_progress','review','done'] as const;
export {workLabels} from './work-access-labels';
export async function workData(userId:string){
// Whitelist columns. Never send sales amounts, payments, expenses, salaries or client contact details.
const projects=await rows(`SELECT p.id,s.name,s.service,s.status,p.start,s.delivery,c.name AS client FROM projects p JOIN project_members m ON m.project_id=p.id JOIN sales s ON s.id=p.sale_id JOIN clients c ON c.id=s.client_id WHERE m.user_id=? ORDER BY s.delivery,p.id`,userId);
const tasks=await rows(`SELECT t.id,t.project_id,t.name,t.done,t.work_status,t.assignee_id,t.version,t.updated_at,u.name AS assignee_name FROM tasks t JOIN projects p ON p.id=t.project_id JOIN sales s ON s.id=p.sale_id JOIN project_members m ON m.project_id=p.id LEFT JOIN users u ON u.id=t.assignee_id WHERE m.user_id=? ORDER BY t.rowid`,userId);
return{projects:projects.map(p=>{const list=tasks.filter(t=>t.project_id===p.id);const completed=list.filter(t=>t.done).length;return{...p,taskCount:list.length,completed,progress:list.length?Math.round(completed/list.length*100):p.status==='تم التسليم'?100:0};}),tasks};
}
export async function requireProgrammer(userId:string){return one("SELECT id FROM users WHERE id=? AND role='programmer' AND active=1",userId);}
