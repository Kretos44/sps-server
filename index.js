const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Init Firebase Admin - uses your Firebase.js file OR env
try {
  if (!admin.apps.length) {
    // If you have a serviceAccountKey.json, use it, else use default
    admin.initializeApp();
  }
} catch (e) { console.log("Admin init error", e); }

const db = admin.firestore();

// Test route
app.get("/", (req, res) => {
  res.send("SPS BANK - KretosWallet LIVE 🔥");
});

// Render version of your OTP reset
app.post("/verifyOTPAndResetPassword", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email ||!otp ||!newPassword) return res.status(400).json({ error: "Missing fields" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password min 6 chars" });

    // 1. Find OTP
    const q = await db.collection("passwordOTPs").where("email", "==", email.toLowerCase()).where("used", "==", false).orderBy("createdAt", "desc").limit(1).get();
    if (q.empty) return res.status(404).json({ error: "No OTP found" });
    const doc = q.docs[0];
    const d = doc.data();

    // 2. Check expiry
    const expiryDate = d.expiry.toDate? d.expiry.toDate() : new Date(d.expiry);
    if (expiryDate < new Date()) return res.status(400).json({ error: "OTP expired" });
    if (d.otp!== otp) return res.status(400).json({ error: "Invalid OTP" });

    // 3. Update Firebase Auth password
    const user = await admin.auth().getUserByEmail(email.toLowerCase());
    await admin.auth().updateUser(user.uid, { password: newPassword });

    // 4. Mark OTP used
    await doc.ref.update({ used: true });

    // 5. Update users doc
    const users = await db.collection("users").where("email", "==", email.toLowerCase()).get();
    if (!users.empty) {
      await users.docs[0].ref.update({ passwordUpdatedAt: new Date() });
    }

    return res.json({ success: true, message: "Password reset successful" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const db = require("firebase-admin").firestore();
    await db.collection("passwordOTPs").add({
      email: email.toLowerCase(),
      otp,
      expiry: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date(),
      used: false
    });
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: `"SPS BANK" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your SPS BANK OTP Code",
      html: `<h2>Your OTP is: <b>${otp}</b></h2><p>Expires in 10 minutes</p>`
    });
    return res.json({ success: true, message: "OTP sent" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.post("/sendOTP", (req, res) => {
  req.url = "/send-otp";
  app._router.handle(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SPS BANK LIVE on ${PORT}`);
});
