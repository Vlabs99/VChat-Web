import { db } from '../src/services/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function run() {
  const snapshot = await getDocs(query(collection(db, 'chats'), limit(3)));
  snapshot.forEach(doc => {
    console.log('Chat ID:', doc.id);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
  process.exit(0);
}

run().catch(console.error);
