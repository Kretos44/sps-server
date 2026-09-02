const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.verifyOTPAndResetPassword = functions.https.onCall(async (data, context) => {
  const { email, otp, newPassword } = data;
  if(!email ||!otp ||!newPassword) throw new functions.https.HttpsError("invalid-argument", "Missing fields");
  if(newPassword.length < 6) throw new functions.https.HttpsError("invalid-argument", "Password min 6 chars");

  // 1. Find OTP
  const q = await db.collection("passwordOTPs").where("email","==",email.toLowerCase()).where("used","==",false).orderBy("createdAt","desc").limit(1).get();
  if(q.empty) throw new functions.https.HttpsError("not-found", "No OTP found");
  const doc = q.docs[0];
  const d = doc.data();

  // 2. Check expiry
  if(d.expiry.toDate() < new Date()) throw new functions.https.HttpsError("deadline-exceeded", "OTP expired");
  if(d.otp!== otp) throw new functions.https.HttpsError("permission-denied", "Invalid OTP");

  // 3. Update Firebase Auth password
  try{
    const user = await admin.auth().getUserByEmail(email.toLowerCase());
    await admin.auth().updateUser(user.uid, { password: newPassword });

    // 4. Mark OTP used
    await doc.ref.update({ used: true });

    // 5. Optional: Update Firestore users doc
    const users = await db.collection("users").where("email","==",email.toLowerCase()).get();
    if(!users.empty){
      await users.docs[0].ref.update({ passwordUpdatedAt: new Date() });
    }

    return { success: true, message: "Password reset successful" };
  }catch(e){
    throw new functions.https.HttpsError("internal", e.message);
  }
});