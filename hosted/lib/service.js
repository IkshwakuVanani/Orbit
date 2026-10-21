import {identity,error,json,body,wrap,rows,sql,text} from './http.js';
export const handle=wrap(async(req,db)=>{
 const user=identity(req),url=new URL(req.url),path=url.pathname,method=req.method;
 if(path==='/api/auth/me')return json(user);
 if(path==='/api/health')return json({status:'ok'});
 if(path==='/api/tasks'&&method==='GET')return json(await rows(db,'SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC',[user.id]));
 if(!path.match(/^\/api\/tasks(?:\/\d+)?$/))error(404,'Endpoint not found.');
 const data=await body(req),id=Number(path.split('/')[3]);
 if(id){const [task]=await rows(db,'SELECT id FROM tasks WHERE id=? AND user_id=?',[id,user.id]);if(!task)error(404,'Task not found.');if(method==='DELETE'){await sql(db,'DELETE FROM tasks WHERE id=? AND user_id=?',[id,user.id]).run();return new Response(null,{status:204});}}
 const {title,notes='',project='Personal',priority='medium',status='planned',due_date=null}=data;
 if(!text(title,200)||!text(notes,2000,false)||!text(project,60)||!['low','medium','high'].includes(priority)||!['planned','active','done'].includes(status))error(422,'Check the task title, project, priority, and status.');
 if(due_date!==null&&(typeof due_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due_date)||!Number.isFinite(Date.parse(due_date))||new Date(due_date).toISOString().slice(0,10)!==due_date))error(422,'Choose a valid due date.');
 const args=[title.trim(),notes,project.trim(),priority,status,due_date];
 if(id&&method==='PUT'){await sql(db,'UPDATE tasks SET title=?,notes=?,project=?,priority=?,status=?,due_date=? WHERE id=? AND user_id=?',[...args,id,user.id]).run();return json((await rows(db,'SELECT * FROM tasks WHERE id=? AND user_id=?',[id,user.id]))[0]);}
 if(!id&&method==='POST'){const result=await sql(db,'INSERT INTO tasks (title,notes,project,priority,status,due_date,user_id,created_at) VALUES (?,?,?,?,?,?,?,?)',[...args,user.id,new Date().toISOString()]).run();return json((await rows(db,'SELECT * FROM tasks WHERE id=? AND user_id=?',[result.meta.last_row_id,user.id]))[0],201);}
 error(405,'Method not allowed.');
});
