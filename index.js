import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const otpStore = {};

app.get("/", (req,res)=>res.send("SPS Server Running with Brevo"));

app.post("/send-otp", async (req,res)=>{
  try{
    const {email}=req.body;
    if(!email) return res.status(400).json({error:"Email required"});
    const otp = Math.floor(100000 + Math.random()*900000).toString();
    otpStore[email]={otp, expires: Date.now()+5*60*1000};

    const response = await fetch("https://api.brevo.com/v3/smtp/email",{
      method:"POST",
      headers:{
        "accept":"application/json",
        "content-type":"application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender:{ name:"SPS Bank", email:"zarakretos44@gmail.com" },
        to:[{email:email}],
        subject:"Your SPS OTP Code",
        htmlContent:`<h1>Your OTP is: ${otp}</h1><p>Valid for 5 minutes</p>`
      })
    });
    const data = await response.json();
    console.log("Brevo:",data);
    if(!response.ok) throw new Error(JSON.stringify(data));

    res.json({success:true, message:"OTP sent to any user"});
  }catch(err){
    console.error(err);
    res.status(500).json({error:err.message});
  }
});

app.post("/verify-otp",(req,res)=>{
  const {email,otp}=req.body;
  const rec=otpStore[email];
  if(!rec) return res.status(400).json({error:"No OTP"});
  if(Date.now()>rec.expires) return res.status(400).json({error:"Expired"});
  if(rec.otp!==otp) return res.status(400).json({error:"Invalid"});
  delete otpStore[email];
  res.json({success:true});
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("Running "+PORT));
