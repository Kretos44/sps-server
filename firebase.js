import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"; 
const firebaseConfig = {
  apiKey: "AIzaSyBQMAbwEb9j4S8NzYcn6kcnzBvY8oHCums",
  authDomain: "kretos-wallet.firebaseapp.com",
  projectId: "kretos-wallet",
  storageBucket: "kretos-wallet.firebasestorage.app",
  messagingSenderId: "879933843002",
  appId: "1:879933843002:web:3661deecb4f27c358f7703"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);