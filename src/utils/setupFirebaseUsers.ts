import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { defaultUsers } from '../data/users';

export const setupFirebaseUsers = async () => {
  try {
    // Create each default user in Firebase
    for (const user of defaultUsers) {
      const email = `${user.username}@timetracker.app`;
      try {
        await createUserWithEmailAndPassword(auth, email, user.password);
        console.log(`Created Firebase user for: ${user.username}`);
      } catch (error: any) {
        // Skip if user already exists
        if (error.code === 'auth/email-already-in-use') {
          console.log(`User ${user.username} already exists in Firebase`);
        } else {
          console.error(`Error creating ${user.username}:`, error);
        }
      }
    }
    
    console.log('Firebase users setup completed');
    localStorage.setItem('firebaseUsersSetup', 'true');
  } catch (error) {
    console.error('Setup error:', error);
  }
};