import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export async function database(options = {}) {
 const driver = options.driver || process.env.DB_DRIVER || 'sqlite';
 let query, close;
 if (driver === 'mysql') {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASS,database:process.env.DB_NAME||'task_organizer_db',dateStrings:true,connectionLimit:10});
  query = async (sql,args=[]) => (await pool.execute(sql,args))[0]; close=()=>pool.end();
 } else if (driver === 'sqlite') {
  const { DatabaseSync } = await import('node:sqlite');
  const file=options.file||process.env.SQLITE_PATH||'data/orbit.sqlite';
  if(file!==':memory:') mkdirSync(dirname(file),{recursive:true});
  const db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  query=async(sql,args=[])=>{const s=db.prepare(sql);return /^\s*SELECT/i.test(sql)?s.all(...args):s.run(...args);};close=()=>db.close();
 } else throw new Error('DB_DRIVER must be sqlite or mysql');
 const id=driver==='mysql'?'INTEGER PRIMARY KEY AUTO_INCREMENT':'INTEGER PRIMARY KEY AUTOINCREMENT';
 for(const sql of [
 `CREATE TABLE IF NOT EXISTS users (id ${id}, name VARCHAR(80) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS sessions (token VARCHAR(64) PRIMARY KEY, user_id INTEGER NOT NULL, expires BIGINT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`,
 `CREATE TABLE IF NOT EXISTS tasks (id ${id}, user_id INTEGER NOT NULL, title VARCHAR(200) NOT NULL, notes TEXT NOT NULL, project VARCHAR(60) NOT NULL, priority VARCHAR(10) NOT NULL, status VARCHAR(12) NOT NULL, due_date VARCHAR(10), created_at VARCHAR(30) NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`
 ]) await query(sql);
 return {query,close};
}
