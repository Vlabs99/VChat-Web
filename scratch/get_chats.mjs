import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAt4Kj_hcc6rMt83WnWl_ZLpxD1FsG-T38",
  authDomain: "vchat-2fbe2.firebaseapp.com",
  projectId: "vchat-2fbe2",
  storageBucket: "vchat-2fbe2.firebasestorage.app",
  messagingSenderId: "917519199193",
  appId: "1:917519199193:web:f91a1d1c7e5109776fc7c8",
  measurementId: "G-L8YQ8VFKTX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(query(collection(db, 'chats'), limit(5)));
  snapshot.forEach(doc => {
    console.log('Chat ID:', doc.id);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

run().catch(console.error);
