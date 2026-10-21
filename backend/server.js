import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { database } from './db.js';
import { createApp } from './app.js';
if(existsSync('.env'))loadEnvFile('.env');
const db=await database();
const server=createApp(db).listen(Number(process.env.PORT||4000),process.env.HOST||'127.0.0.1',()=>console.log('Orbit is ready on port '+(process.env.PORT||4000)));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
