import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { resolve } from 'node:path';
const hash=s=>createHash('sha256').update(s).digest('hex');
const encode=p=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');};
const matches=(p,encoded)=>{const [salt,key]=encoded.split(':');return timingSafeEqual(Buffer.from(key,'hex'),scryptSync(p,salt,64));};
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createApp(db) {
 const app=express();app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'32kb'}));
 app.use('/api',(req,res,next)=>{
  res.set('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)) {
   if(!req.is('application/json')) return res.status(415).json({error:'Send application/json.'});
   const origin=process.env.APP_ORIGIN||`${req.protocol}://${req.get('host')}`;
   if(req.get('origin')&&req.get('origin')!==origin)return res.status(403).json({error:'Origin not allowed.'});
  } next();
 });
 const authLimit=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
 async function session(req,res,user){
  const token=randomBytes(32).toString('hex');await db.query('DELETE FROM sessions WHERE expires < ?',[Date.now()]);
  await db.query('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)',[hash(token),user.id,Date.now()+7*86400000]);
  res.cookie('orbit',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000,path:'/'});
  res.json({id:user.id,name:user.name,email:user.email});
 }
 app.post('/api/auth/register',authLimit,async(req,res)=>{
  const {name,email,password}=req.body;
  if(typeof name!=='string'||!name.trim()||name.trim().length>80||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)throw fail(422,'Enter your name, a valid email, and a 10–128 character password.');
  if((await db.query('SELECT id FROM users WHERE email=?',[email.toLowerCase().trim()])).length)throw fail(409,'An account with this email already exists.');
  await db.query('INSERT INTO users (name,email,password) VALUES (?,?,?)',[name.trim(),email.toLowerCase().trim(),encode(password)]);
  const [user]=await db.query('SELECT id,name,email FROM users WHERE email=?',[email.toLowerCase().trim()]);await session(req,res,user);
 });
 app.post('/api/auth/login',authLimit,async(req,res)=>{
  const {email,password}=req.body;if(typeof email!=='string'||typeof password!=='string'||password.length>128)throw fail(401,'Email or password is incorrect.');
  const [user]=await db.query('SELECT * FROM users WHERE email=?',[email.trim().toLowerCase()]);
  // Perform the expensive hash even when the account is absent.
  if(!user){scryptSync(password,'orbit-login',64);throw fail(401,'Email or password is incorrect.');}
  if(!matches(password,user.password))throw fail(401,'Email or password is incorrect.');await session(req,res,user);
 });
 app.get('/api/health',async(req,res)=>{await db.query('SELECT 1');res.json({status:'ok'});});
 app.use('/api',async(req,res,next)=>{
  const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('orbit='))?.slice(6);
  const [user]=token?await db.query('SELECT users.id,users.name,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?',[hash(token),Date.now()]):[];
  if(!user)return res.status(401).json({error:'Please sign in.'});req.user=user;req.token=token;next();
 });
 app.get('/api/auth/me',(req,res)=>res.json(req.user));
 app.post('/api/auth/logout',async(req,res)=>{await db.query('DELETE FROM sessions WHERE token=?',[hash(req.token)]);res.clearCookie('orbit',{path:'/'}).sendStatus(204);});
 app.get('/api/tasks',async(req,res)=>res.json(await db.query('SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC',[req.user.id])));
 const validated=body=>{
  const {title,notes='',project='Personal',priority='medium',status='planned',due_date=null}=body;
  if(typeof title!=='string'||!title.trim()||title.trim().length>200||typeof notes!=='string'||notes.length>2000||typeof project!=='string'||!project.trim()||project.length>60||!['low','medium','high'].includes(priority)||!['planned','active','done'].includes(status))throw fail(422,'Check the task title, project, priority, and status.');
  if(due_date!==null&&(typeof due_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due_date)||!Number.isFinite(Date.parse(due_date))||new Date(due_date).toISOString().slice(0,10)!==due_date))throw fail(422,'Choose a valid due date.');
  return [title.trim(),notes,project.trim(),priority,status,due_date];
 };
 app.post('/api/tasks',async(req,res)=>{const values=validated(req.body);const result=await db.query('INSERT INTO tasks (title,notes,project,priority,status,due_date,user_id,created_at) VALUES (?,?,?,?,?,?,?,?)',[...values,req.user.id,new Date().toISOString()]);const id=Number(result.insertId??result.lastInsertRowid);res.status(201).json((await db.query('SELECT * FROM tasks WHERE id=? AND user_id=?',[id,req.user.id]))[0]);});
 app.put('/api/tasks/:id',async(req,res)=>{const [task]=await db.query('SELECT * FROM tasks WHERE id=? AND user_id=?',[req.params.id,req.user.id]);if(!task)throw fail(404,'Task not found.');await db.query('UPDATE tasks SET title=?,notes=?,project=?,priority=?,status=?,due_date=? WHERE id=? AND user_id=?',[...validated(req.body),task.id,req.user.id]);res.json((await db.query('SELECT * FROM tasks WHERE id=? AND user_id=?',[task.id,req.user.id]))[0]);});
 app.delete('/api/tasks/:id',async(req,res)=>{const [task]=await db.query('SELECT id FROM tasks WHERE id=? AND user_id=?',[req.params.id,req.user.id]);if(!task)throw fail(404,'Task not found.');await db.query('DELETE FROM tasks WHERE id=? AND user_id=?',[task.id,req.user.id]);res.sendStatus(204);});
 app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}));
 app.use(express.static(resolve('frontend/dist')));
 app.use((err,req,res,next)=>{if(err.status>=400&&err.status<500)return res.status(err.status).json({error:err.message});console.error('Request failed:',err.code||err.name);res.status(500).json({error:'Something went wrong. Please try again.'});});
 return app;
}
