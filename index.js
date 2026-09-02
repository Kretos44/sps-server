import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Resend - NO MORE TIMEOUT
const resend = new Resend(process.env.RESEND_API_KEY);

const otpStore = {};

app.get("/", (req, res) => {
  res.send("SPS Server Running with Resend");
});

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await resend.emails.send({
      from: "SPS Bank <onboarding@resend.dev>",
      to: email,
      subject: "Your SPS OTP Code",
      html: `<h2>Your OTP is: ${otp}</h2><p>Valid for 5 minutes</p>`
    });

    console.log(`OTP ${otp} sent to ${email}`);
    res.json({ success: true, message: "OTP sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (!record) return res.status(400).json({ error: "No OTP found" });
  if (Date.now() > record.expires) return res.status(400).json({ error: "OTP expired" });
  if (record.otp!== otp) return res.status(400).json({ error: "Invalid OTP" });

  delete otpStore[email];
  res.json({ success: true, message: "OTP verified" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
