import express from "express";
import session from "cookie-session";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database(path.join(__dirname, "rankforge.db"));
const PORT = Number(process.env.PORT || 3000);
const FREE_CREDITS = Number(process.env.FREE_CREDITS || 100);
const SEO_COST = Number(process.env.SEO_COST || 5);

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 credits INTEGER NOT NULL DEFAULT 100,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS generations(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 platform TEXT NOT NULL,
 input TEXT NOT NULL,
 output TEXT NOT NULL,
 credits_used INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 amount TEXT,
 credits INTEGER,
 status TEXT,
 reference TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

app.use(express.json({limit:"8mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  name:"rankforge_session",
  keys:[process.env.SESSION_SECRET || "CHANGE_ME_IN_PRODUCTION"],
  httpOnly:true,
  sameSite:"lax",
  secure:process.env.NODE_ENV==="production"
}));
app.use(express.static(path.join(__dirname,"public")));

const adminUser = process.env.ADMIN_USERNAME || "ali";
const adminHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "ABC321", 10);

function userAuth(req,res,next){
  if(!req.session.userId) return res.status(401).json({error:"Login required"});
  next();
}

function adminAuth(req,res,next){
  if(!req.session.admin) return res.status(403).json({error:"Admin access required"});
  next();
}

function makeSEO(platform, idea, content){
  const words = [...new Set((idea+" "+content).toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu," ").split(/\s+/)
    .filter(w=>w.length>2 && !["the","and","for","with","this","that","from","your","you","are","is","of","to","a","an","in","on"].includes(w)))].slice(0,12);

  const kw=words.join(", ");
  const title = `${idea || "Your Content"} | Complete Guide & Key Details`;

  const description = `Discover ${idea || "this topic"}. ${content || "Useful information and key details are covered in this content."}

This ${platform} content covers ${words.slice(0,6).join(", ") || "the main topic"}. Save, share and follow for more useful content.

Keywords: ${kw}`;

  const hashtags=words.slice(0,8).map(x=>"#"+x.replace(/-/g,"")).join(" ");

  return {
    title,
    description,
    primary_keyword: words[0] || idea || "main topic",
    keywords: words,
    tags: kw,
    hashtags,
    thumbnail_text: idea || "Your Topic",
    cta:`Learn more about ${idea || "this topic"}. Follow/subscribe for more content.`,
    score: Math.min(96, 60 + Math.min(words.length,8)*4 + (content?8:0))
  };
}

app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"public","app.html")));
app.get("/app",(req,res)=>res.sendFile(path.join(__dirname,"public","app.html")));
app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));

app.post("/api/signup",(req,res)=>{
  const {name,email,password}=req.body;

  if(!name||!email||!password||password.length<6)
    return res.status(400).json({
      error:"Name, valid email and password (6+ characters) required"
    });

  try{
    const hash=bcrypt.hashSync(password,10);

    const info=db.prepare(
      "INSERT INTO users(name,email,password_hash,credits) VALUES(?,?,?,?)"
    ).run(name,email.toLowerCase(),hash,FREE_CREDITS);

    req.session.userId=info.lastInsertRowid;

    res.json({ok:true,credits:FREE_CREDITS});
  }catch(e){
    res.status(400).json({error:"Email already registered"})
  }
});

app.post("/api/login",(req,res)=>{
  const {email,password}=req.body;

  const u=db.prepare(
    "SELECT * FROM users WHERE email=?"
  ).get((email||"").toLowerCase());

  if(!u || !bcrypt.compareSync(password||"",u.password_hash))
    return res.status(401).json({error:"Invalid login"});

  req.session.userId=u.id;

  res.json({
    ok:true,
    name:u.name,
    credits:u.credits
  });
});

app.post("/api/logout",(req,res)=>{
  req.session=null;
  res.json({ok:true})
});

app.get("/api/me",userAuth,(req,res)=>{
  const u=db.prepare(
    "SELECT id,name,email,credits,created_at FROM users WHERE id=?"
  ).get(req.session.userId);

  res.json(u);
});

app.post("/api/generate",userAuth,(req,res)=>{
  const {
    platform="YouTube",
    idea="",
    content=""
  }=req.body;

  const u=db.prepare(
    "SELECT credits FROM users WHERE id=?"
  ).get(req.session.userId);

  if(u.credits<SEO_COST)
    return res.status(402).json({
      error:`Not enough credits. ${SEO_COST} credits are required.`
    });

  const output=makeSEO(platform,idea,content);

  db.prepare(
    "UPDATE users SET credits=credits-? WHERE id=?"
  ).run(SEO_COST,req.session.userId);

  db.prepare(
    "INSERT INTO generations(user_id,platform,input,output,credits_used) VALUES(?,?,?,?,?)"
  ).run(
    req.session.userId,
    platform,
    JSON.stringify({idea,content}),
    JSON.stringify(output),
    SEO_COST
  );

  const left=db.prepare(
    "SELECT credits FROM users WHERE id=?"
  ).get(req.session.userId).credits;

  res.json({
    output,
    credits:left,
    cost:SEO_COST
  });
});

app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body;

  if(username===adminUser && bcrypt.compareSync(password||"",adminHash)){
    req.session.admin=true;
    return res.json({ok:true})
  }

  res.status(401).json({error:"Invalid admin credentials"});
});

app.post("/api/admin/logout",(req,res)=>{
  req.session.admin=false;
  res.json({ok:true})
});

app.get("/api/admin/stats",adminAuth,(req,res)=>{
  const users=db.prepare(
    "SELECT COUNT(*) c FROM users"
  ).get().c;

  const generations=db.prepare(
    "SELECT COUNT(*) c FROM generations"
  ).get().c;

  const payments=db.prepare(
    "SELECT COUNT(*) c FROM payments WHERE status='paid'"
  ).get().c;

  const credits=db.prepare(
    "SELECT COALESCE(SUM(credits),0) c FROM users"
  ).get().c;

  res.json({
    users,
    generations,
    paidPayments:payments,
    creditsRemaining:credits
  });
});

app.get("/api/admin/users",adminAuth,(req,res)=>{
  res.json(
    db.prepare(
      "SELECT id,name,email,credits,created_at FROM users ORDER BY id DESC LIMIT 200"
    ).all()
  );
});

app.post("/api/admin/credits",adminAuth,(req,res)=>{
  const {userId,credits}=req.body;

  db.prepare(
    "UPDATE users SET credits=credits+? WHERE id=?"
  ).run(
    Number(credits)||0,
    Number(userId)
  );

  res.json({ok:true});
});

app.listen(PORT,()=>console.log(
  `RankForge running on http://localhost:${PORT}`
));
