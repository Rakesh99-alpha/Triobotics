import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';

export async function loginWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'employees', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error('User not found in system. Contact administrator.');
    }
    
    const userData = userDoc.data();
    
    // Redirect based on role
    const roleRedirects: Record<string, string> = {
      'Admin': '/admin',
      'MD': '/rnd',
      'PM': '/pm',
      'HR': '/hr',
      'Manager': '/manager',
      'Supervisor': '/supervisor',
    };
    
    const redirectUrl = roleRedirects[userData.role] || '/login';
    window.location.href = redirectUrl;
    
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
  window.location.href = '/login';
}
