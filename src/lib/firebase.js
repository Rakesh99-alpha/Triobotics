// Re-export Firebase clients from the firebase folder so imports to '@/lib/firebase'
// (which resolve to this file) provide the expected `db` and `auth` bindings.
export { db, auth, database } from './firebase/client';