import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import AsyncStorage, { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { clearProfileCache } from './profileCache';

export const configureGoogleSignin = () => {
  try {
    GoogleSignin.configure({
      scopes: ['email', 'profile'],
    });
  } catch (configErr) {
    console.log('GoogleSignin init notice:', configErr);
  }
};

configureGoogleSignin();

const firebaseConfig = {
  apiKey: "AIzaSyDloIigHTK9KTX5KVL0fjmjVKh3zu5o7eg",
  authDomain: "third-party-c300d.firebaseapp.com",
  projectId: "third-party-c300d",
  storageBucket: "third-party-c300d.firebasestorage.app",
  messagingSenderId: "280216762322",
  appId: "1:280216762322:android:9a9664bed767a19e39fa0b"
};

let app: any;
let auth: any;
let db: any;
let useLocalDb = false;

const DEMO_EMAIL = 'demo@trustledge.app';
const DEMO_PASSWORD = 'Demo@123456';

const createDemoProfile = () => ({
  uid: 'demo_trustledge_user',
  email: DEMO_EMAIL,
  fullName: 'Deepak Kumar',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  verifications: {
    aadhaar: {
      name: 'Deepak Kumar',
      dob: '1990-01-01',
      gender: 'Male',
      district: 'Amritsar',
      state: 'Punjab',
      subDistrict: 'Amritsar II',
      address: 'Chheharta, Amritsar, Punjab',
      verifiedAt: new Date().toISOString(),
    },
    pan: null,
    payment: null,
    land: null,
    landStatus: null
  }
});

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "PLACEHOLDER_API_KEY") {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    try {
      const appStorage = createAsyncStorage('trustledge_auth');
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(appStorage),
      });
    } catch (authError: any) {
      if (authError?.code === 'auth/already-initialized') {
        auth = getAuth(app);
      } else {
        throw authError;
      }
    }
    db = getFirestore(app);
    console.log("Firebase initialized successfully in Remote Cloud Mode.");
  } else {
    console.log("Firebase API Key is placeholder. Switching to Local Storage Database Mode.");
    useLocalDb = true;
  }
} catch (error: any) {
  console.log("Firebase configuration error. Falling back to Local Storage Database Mode:", error.message);
  useLocalDb = true;
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ]);
};

const LOCAL_USERS_KEY = '@trustledge_local_users';
const LOCAL_ACTIVE_USER_KEY = '@trustledge_active_user';

let localAuthListeners: ((user: any) => void)[] = [];

const isDemoLandRecord = (land: any) => {
  if (!land) return false;
  const joinedRows = Array.isArray(land.officialRows)
    ? JSON.stringify(land.officialRows)
    : '';
  const haystack = [
    land.area,
    land.estimatedValuation,
    land.source,
    land.verifiedBy,
    joinedRows,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    haystack.includes('1.24 hectare') ||
    haystack.includes('1.85 acres') ||
    haystack.includes('45,00,000') ||
    haystack.includes('42,50,000') ||
    haystack.includes('4500000') ||
    haystack.includes('4250000') ||
    haystack.includes('state land records department api gateway') ||
    haystack.includes('verified & confirmed') ||
    haystack.includes('zkp cryptographic signature') ||
    haystack.includes('active & validated')
  );
};

const sanitizeProfile = (profile: any) => {
  if (!profile?.verifications?.land || !isDemoLandRecord(profile.verifications.land)) {
    return profile;
  }

  return {
    ...profile,
    verifications: {
      ...profile.verifications,
      land: null,
      landStatus: {
        ...(profile.verifications.landStatus || {}),
        status: 'FAILED',
        message: 'Your data is not available on government portal please add manual',
        cleanedAt: new Date().toISOString(),
      },
    },
  };
};

const getLandCleanupFields = (profile: any) => {
  if (!profile?.verifications?.land || !isDemoLandRecord(profile.verifications.land)) {
    return null;
  }

  return {
    'verifications.land': null,
    'verifications.landStatus': {
      ...(profile.verifications.landStatus || {}),
      status: 'FAILED',
      message: 'Your data is not available on government portal please add manual',
      cleanedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
};

const notifyAuthListeners = (user: any) => {
  localAuthListeners.forEach(listener => {
    try {
      listener(user);
    } catch (err) {
      console.warn("Error calling auth listener:", err);
    }
  });
};

const getLocalUsers = async () => {
  try {
    const data = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveLocalUsers = async (users: any) => {
  try {
    await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("AsyncStorage save users failure", e);
  }
};

export const signUpUser = async (email: string, password: string, fullName: string): Promise<any> => {
  const normalizedEmail = email.toLowerCase().trim();

  if (useLocalDb) {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const users = await getLocalUsers();

    if (users[normalizedEmail]) {
      throw new Error("auth/email-already-in-use: The email address is already in use by another account.");
    }

    const userId = 'local_' + Math.random().toString(36).substring(2, 9);
    const newProfile = {
      uid: userId,
      email: normalizedEmail,
      fullName: fullName,
      createdAt: new Date().toISOString(),
      verifications: {
        aadhaar: null,
        pan: null,
        payment: null,
        land: null,
        landStatus: null
      }
    };

    users[normalizedEmail] = {
      password: password,
      profile: newProfile
    };

    await saveLocalUsers(users);
    await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(newProfile));
    notifyAuthListeners(newProfile);
    return newProfile;
  } else {
    try {
      const userCredential = await withTimeout(createUserWithEmailAndPassword(auth, normalizedEmail, password), 4000);
      const userId = userCredential.user.uid;
      const initialProfile = {
        uid: userId,
        email: normalizedEmail,
        fullName: fullName,
        createdAt: new Date().toISOString(),
        verifications: {
          aadhaar: null,
          pan: null,
          payment: null,
          land: null,
          landStatus: null
        }
      };

      try {
        await withTimeout(setDoc(doc(db, "users", userId), initialProfile), 3000);
      } catch (dbErr) {
        console.log("Firestore signup write failed/timed out, continuing local setup:", dbErr);
      }
      await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(initialProfile));
      notifyAuthListeners(initialProfile);
      return initialProfile;
    } catch (e: any) {
      if (e.message === 'timeout' || e.code === 'auth/network-request-failed') {
        console.log('Firebase signup timed out/failed. Falling back to local DB.');
        useLocalDb = true;
        return signUpUser(email, password, fullName);
      }
      throw e;
    }
  }
};

export const loginUser = async (email: string, password: string): Promise<any> => {
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const demoProfile = createDemoProfile();
    await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(demoProfile));
    notifyAuthListeners(demoProfile);
    return demoProfile;
  }

  if (useLocalDb) {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const users = await getLocalUsers();
    const userData = users[normalizedEmail];

    if (!userData || userData.password !== password) {
      throw new Error("auth/invalid-credential: The email or password entered is incorrect.");
    }

    userData.profile.lastLoginAt = new Date().toISOString();
    users[normalizedEmail].profile = userData.profile;
    await saveLocalUsers(users);

    await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(userData.profile));
    notifyAuthListeners(userData.profile);
    return userData.profile;
  } else {
    try {
      const userCredential = await withTimeout(signInWithEmailAndPassword(auth, normalizedEmail, password), 4000);
      const userId = userCredential.user.uid;

      let profileData: any = {
        uid: userId,
        email: userCredential.user.email || normalizedEmail,
        fullName: userCredential.user.displayName || normalizedEmail.split('@')[0],
      };

      try {
        const docSnap = await withTimeout(getDoc(doc(db, "users", userId)), 3000);
        if (docSnap.exists()) {
          profileData = { ...profileData, ...docSnap.data() };
          profileData.lastLoginAt = new Date().toISOString();
          setDoc(doc(db, "users", userId), { lastLoginAt: profileData.lastLoginAt }, { merge: true }).catch(() => {});
        } else {
          await setDoc(doc(db, "users", userId), profileData, { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.log('Firestore profile read notice:', e);
      }

      await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(profileData));
      notifyAuthListeners(profileData);
      return profileData;
    } catch (error: any) {
      if (error.message === 'timeout' || error.code === 'auth/network-request-failed') {
        console.log('Firebase login timed out/failed. Falling back to local DB.');
        useLocalDb = true;
        return loginUser(email, password);
      }

      // Auto-healing fallback: If user exists in Firestore but is missing in Firebase Auth,
      // try to register them in Firebase Auth with the provided password and migrate their profile!
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.message.includes('invalid-credential')) {
        try {
          console.log('Attempting auto-heal for missing Auth profile...');
          
          // 1. Create the user in Firebase Auth first (to obtain authentication permissions)
          const createCred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          const newUid = createCred.user.uid;
          console.log('Successfully created missing Auth user. New UID:', newUid);
          
          // 2. Query Firestore now that we are authenticated
          let existingProfile: any = null;
          try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", normalizedEmail));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const oldDoc = querySnapshot.docs.find(doc => doc.id !== newUid);
              if (oldDoc) {
                existingProfile = oldDoc.data();
                console.log('Found matching Firestore profile to migrate:', oldDoc.id);
              }
            }
          } catch (queryErr: any) {
            console.log('Firestore query for profile migration failed/timed out:', queryErr.message);
          }
          
          // 3. Copy/migrate the old document data to the new UID document
          const newProfile = {
            uid: newUid,
            email: normalizedEmail,
            fullName: existingProfile?.fullName || normalizedEmail.split('@')[0],
            createdAt: existingProfile?.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            verifications: existingProfile?.verifications || {
              aadhaar: null,
              pan: null,
              payment: null,
              land: null,
              landStatus: null
            }
          };
          
          await setDoc(doc(db, "users", newUid), newProfile);
          console.log('Auto-heal completed. User migrated successfully.');
          
          await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(newProfile));
          notifyAuthListeners(newProfile);
          return newProfile;
        } catch (healErr: any) {
          console.log('Auto-heal check finished or skipped:', healErr.code || healErr.message);
        }
      }

      throw error;
    }
  }
};

export const loginWithGoogle = async (googleEmail?: string, googleName?: string) => {
  const normalizedEmail = (googleEmail || 'alex.mercer.google@gmail.com').toLowerCase().trim();
  const displayName = googleName || 'Alex Mercer';

  const users = await getLocalUsers();
  let userData = users[normalizedEmail];
  let userProfile;

  if (!userData) {
    const userId = 'google_' + Math.random().toString(36).substring(2, 9);
    userProfile = {
      uid: userId,
      email: normalizedEmail,
      fullName: displayName,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      verifications: {
        aadhaar: null,
        pan: null,
        payment: null,
        land: null,
        landStatus: null,
      },
    };

    users[normalizedEmail] = {
      password: '',
      profile: userProfile,
    };
    await saveLocalUsers(users);
  } else {
    userProfile = userData.profile;
    userProfile.lastLoginAt = new Date().toISOString();
    users[normalizedEmail].profile = userProfile;
    await saveLocalUsers(users);
  }

  if (!useLocalDb && db) {
    try {
      await withTimeout(setDoc(doc(db, 'users', userProfile.uid), userProfile), 3000);
    } catch (e: any) {
      console.log('Firestore write notice (continuing with local session):', e?.message || e);
      if (e.message === 'timeout') {
        useLocalDb = true;
      }
    }
  }

  await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(userProfile));
  notifyAuthListeners(userProfile);
  return userProfile;
};

export const WEB_CLIENT_ID: string = '280216762322-ij2vs7vrtc5vcpu1c0222gp96gouia2i.apps.googleusercontent.com';

const getGoogleAuthMessage = (error: any) => {
  const rawMessage = String(error?.message || error?.code || error || '');
  const code = String(error?.code || '').toLowerCase();
  const message = rawMessage.toLowerCase();

  if (code.includes('sign_in_cancelled') || message.includes('cancel')) {
    return 'SIGN_IN_CANCELLED';
  }

  if (code.includes('play_services') || message.includes('play services')) {
    return 'Google Play Services is missing or outdated on this device.';
  }

  if (
    code.includes('developer_error') ||
    message.includes('developer_error') ||
    message.includes('10:')
  ) {
    return 'Google sign-in is not configured for this app build. Add this app signing SHA-1/SHA-256 in Firebase, download the new google-services.json, rebuild the APK, and try again.';
  }

  if (message.includes('network')) {
    return 'Network error while connecting to Google. Please check internet and try again.';
  }

  return rawMessage || 'Google authentication failed.';
};

export interface GoogleAuthResponse {
  idToken: string | null;
  accessToken: string | null;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  backendAuthPayload: {
    idToken: string | null;
    provider: 'google';
    email: string;
    uid: string;
  };
}

export const AuthService = {
  signInWithGoogle: async (): Promise<GoogleAuthResponse | null> => {
    try {
      if (WEB_CLIENT_ID && WEB_CLIENT_ID !== 'YOUR_WEB_CLIENT_ID_FROM_FIREBASE_CONSOLE') {
        GoogleSignin.configure({
          webClientId: WEB_CLIENT_ID,
          scopes: ['email', 'profile'],
          offlineAccess: true,
        });
      } else {
        GoogleSignin.configure({
          scopes: ['email', 'profile'],
        });
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if not previously signed in
      }

      const response = await withTimeout(GoogleSignin.signIn(), 20000);
      const idToken = (response as any)?.data?.idToken || (response as any)?.idToken || null;
      const tokens = await withTimeout(
        GoogleSignin.getTokens().catch(() => ({ accessToken: null })),
        6000,
      ).catch(() => ({ accessToken: null }));
      const accessToken = tokens?.accessToken || null;

      const googleUser = (response as any)?.data?.user || (response as any)?.user;

      if (!googleUser || !googleUser.email) {
        throw new Error('Google Sign-In failed to retrieve user credentials.');
      }

      const email = googleUser.email.toLowerCase().trim();
      const displayName = googleUser.name || googleUser.givenName || email.split('@')[0];
      const photoURL = googleUser.photo || null;

      let uid = 'google_' + Math.random().toString(36).substring(2, 9);

      if (!useLocalDb && auth && idToken) {
        try {
          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await withTimeout(signInWithCredential(auth, credential), 4000);
          const firebaseUser = userCredential.user;
          uid = firebaseUser.uid;
        } catch (fbAuthErr: any) {
          console.log('Firebase Auth credential notice:', fbAuthErr?.message || fbAuthErr);
          if (fbAuthErr.message === 'timeout') {
            useLocalDb = true;
          }
        }
      }

      let existingProfile: any = null;
      if (!useLocalDb && db) {
        try {
          const existingDoc = await withTimeout(getDoc(doc(db, 'users', uid)), 4000);
          existingProfile = existingDoc.exists() ? existingDoc.data() : null;
        } catch (readErr: any) {
          console.log('Firestore Google profile read notice:', readErr?.message || readErr);
        }
      }

      const userProfile = {
        ...(existingProfile || {}),
        uid,
        email,
        fullName: existingProfile?.fullName || displayName,
        displayName,
        photoURL,
        authProvider: 'google',
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        verifications: existingProfile?.verifications || {
          aadhaar: null,
          pan: null,
          payment: null,
          land: null,
          landStatus: null,
        },
      };

      if (!useLocalDb && db) {
        try {
          await withTimeout(setDoc(doc(db, 'users', uid), userProfile, { merge: true }), 3000);
        } catch (e: any) {
          console.log('Firestore write notice:', e?.message || e);
          if (e.message === 'timeout') {
            useLocalDb = true;
          }
        }
      }

      await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(userProfile));
      notifyAuthListeners(userProfile);

      return {
        idToken,
        accessToken,
        uid,
        displayName,
        email,
        photoURL,
        backendAuthPayload: {
          idToken,
          provider: 'google',
          email,
          uid,
        },
      };
    } catch (error: any) {
      const message = getGoogleAuthMessage(error);
      if (message === 'SIGN_IN_CANCELLED') {
        throw new Error('SIGN_IN_CANCELLED');
      }
      console.log('AuthService.signInWithGoogle notice:', message, error?.code || '');
      throw new Error(message);
    }
  },

  signOut: async (): Promise<boolean> => {
    try {
      await GoogleSignin.signOut().catch(() => {});
    } catch {}

    try {
      if (auth) await signOut(auth).catch(() => {});
    } catch {}

    clearProfileCache();
    await AsyncStorage.removeItem(LOCAL_ACTIVE_USER_KEY);
    notifyAuthListeners(null);
    return true;
  },

  getCurrentUser: async () => {
    try {
      const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
      if (activeUser) {
        return JSON.parse(activeUser);
      }
      if (auth && auth.currentUser) {
        return auth.currentUser;
      }
    } catch (err) {
      console.log('AuthService.getCurrentUser error:', err);
    }
    return null;
  },
};

export const nativeGoogleSignIn = async () => {
  const result = await AuthService.signInWithGoogle();
  if (result) {
    const users = await getLocalUsers();
    return users[result.email]?.profile || {
      uid: result.uid,
      email: result.email,
      fullName: result.displayName,
    };
  }
  return null;
};

export const logoutUser = async () => {
  return await AuthService.signOut();
};

export const getUserData = async (userId: string) => {
  if (!useLocalDb && db) {
    try {
      const docSnap = await withTimeout(getDoc(doc(db, "users", userId)), 3000);
      if (docSnap.exists()) {
        const rawProfile = docSnap.data();
        const cleanupFields = getLandCleanupFields(rawProfile);
        const profile = sanitizeProfile(rawProfile);
        if (profile) {
          const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
          if (activeUser) {
            const parsed = JSON.parse(activeUser);
            if (parsed?.uid === userId || parsed?.email === profile?.email) {
              await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(profile));
            }
          }
          if (cleanupFields) {
            await withTimeout(updateDoc(doc(db, "users", userId), cleanupFields), 4000).catch(() => {});
          }
        }
        return profile;
      }
    } catch (err: any) {
      console.log("Firestore read notice (falling back to local storage):", err?.message || err);
      if (err.message === 'timeout') {
        useLocalDb = true;
      }
    }
  }

  const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
  if (activeUser) {
    const parsed = sanitizeProfile(JSON.parse(activeUser));
    const users = await getLocalUsers();
    if (users[parsed.email]) {
      users[parsed.email].profile = sanitizeProfile(users[parsed.email].profile);
      await saveLocalUsers(users);
      await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(users[parsed.email].profile));
      return users[parsed.email].profile;
    }
    await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(parsed));
    return parsed;
  }
  throw new Error("No active user session.");
};

const updateProfileField = async (userId: string, field: string, data: any) => {
  const deepClean = (value: any, insideArray = false): any => {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const cleanItems = value
        .map((item) => deepClean(item, true))
        .filter((item) => item !== undefined);
      return insideArray ? { values: cleanItems } : cleanItems;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [key, deepClean(item)])
          .filter(([, item]) => item !== undefined)
      );
    }

    return value;
  };

  const isClearingField = data === null;
  if (field === 'land' && !isClearingField && isDemoLandRecord(data)) {
    throw new Error('Your data is not available on government portal please add manual');
  }
  const cleanData = isClearingField ? null : deepClean(data || {});

  if (useLocalDb) {
    const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
    if (!activeUser) throw new Error("No logged in user.");

    const parsedUser = JSON.parse(activeUser);
    const users = await getLocalUsers();
    let userAccount = users[parsedUser.email];

    if (!userAccount) {
      userAccount = {
        password: '',
        profile: {
          uid: parsedUser.uid || 'local_' + Math.random().toString(36).substring(2, 9),
          email: parsedUser.email,
          fullName: parsedUser.fullName || parsedUser.displayName || parsedUser.email.split('@')[0],
          createdAt: parsedUser.createdAt || new Date().toISOString(),
          verifications: parsedUser.verifications || {
            aadhaar: null,
            pan: null,
            payment: null,
            land: null,
            landStatus: null
          }
        }
      };
      users[parsedUser.email] = userAccount;
      await saveLocalUsers(users);
    }

    userAccount.profile.verifications[field] = isClearingField
      ? null
      : {
          ...cleanData,
          timestamp: new Date().toISOString()
        };

    users[parsedUser.email] = userAccount;
    await saveLocalUsers(users);
    userAccount.profile = sanitizeProfile(userAccount.profile);
    await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(userAccount.profile));
    notifyAuthListeners(userAccount.profile);
    return userAccount.profile;
  } else {
    try {
      const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
      const parsedUser = activeUser ? JSON.parse(activeUser) : {};
      const resolvedUserId = userId || parsedUser.uid;
      if (!resolvedUserId) {
        throw new Error("No logged in user.");
      }

      const timestamp = new Date().toISOString();
      const userRef = doc(db, "users", resolvedUserId);
      const verificationData = isClearingField
        ? null
        : {
            ...cleanData,
            timestamp,
          };
      const updateData: any = {
        uid: resolvedUserId,
        updatedAt: timestamp,
        [`verifications.${field}`]: verificationData,
      };
      if (parsedUser.email) updateData.email = parsedUser.email;
      if (parsedUser.fullName || parsedUser.displayName) {
        updateData.fullName = parsedUser.fullName || parsedUser.displayName;
      }

      const baseProfileUpdate: any = {
        uid: resolvedUserId,
        updatedAt: timestamp,
      };
      if (updateData.email) baseProfileUpdate.email = updateData.email;
      if (updateData.fullName) baseProfileUpdate.fullName = updateData.fullName;

      await withTimeout(setDoc(userRef, baseProfileUpdate, { merge: true }), 6000);
      await withTimeout(updateDoc(userRef, {
        [`verifications.${field}`]: verificationData,
        updatedAt: timestamp,
      }), 6000);
      const updatedDoc = await withTimeout(getDoc(userRef), 4000);
      const profile = updatedDoc.exists()
        ? sanitizeProfile(updatedDoc.data())
        : {
          ...parsedUser,
          ...updateData,
          verifications: {
            ...(parsedUser.verifications || {}),
              [field]: verificationData,
            },
          };
      
      if (profile) {
        await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(profile));
        notifyAuthListeners(profile);
      }
      
      return profile;
    } catch (err: any) {
      console.log("Firestore write timed out/failed. Falling back to local DB:", err?.message || err);
      useLocalDb = true;
      return updateProfileField(userId, field, data);
    }
  }
};

export const saveAadhaarData = (userId: string, data: any) => updateProfileField(userId, 'aadhaar', data);
export const savePanData = (userId: string, data: any) => updateProfileField(userId, 'pan', data);
export const savePaymentData = (userId: string, data: any) => updateProfileField(userId, 'payment', data);
export const saveLandData = (userId: string, data: any) => updateProfileField(userId, 'land', data);
export const saveLandStatusData = (userId: string, data: any) => updateProfileField(userId, 'landStatus', data);
export const saveBeneficiariesData = (userId: string, data: any) => updateProfileField(userId, 'beneficiaries', data);

export const subscribeAuthState = (onStateChange: (user: any) => void) => {
  const checkInitial = async () => {
    try {
      const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
      onStateChange(activeUser ? JSON.parse(activeUser) : null);
    } catch {
      onStateChange(null);
    }
  };

  checkInitial();
  localAuthListeners.push(onStateChange);

  let checkInterval = setInterval(async () => {
    try {
      const activeUser = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
      onStateChange(activeUser ? JSON.parse(activeUser) : null);
    } catch {}
  }, 1000);

  let unsubscribeFirebase = () => {};
  if (!useLocalDb && auth) {
    try {
      unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
          try {
            const activeUserStr = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
            if (activeUserStr) {
              const docSnap = await withTimeout(getDoc(doc(db, "users", firebaseUser.uid)), 3000);
              let profileData = docSnap.exists() ? docSnap.data() : {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                fullName: firebaseUser.displayName || firebaseUser.email || ''
              };
              const fullProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...profileData
              };
              const stillActive = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
              if (stillActive) {
                await AsyncStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(fullProfile));
                notifyAuthListeners(fullProfile);
              }
            }
          } catch {
            // Keep existing session
          }
        } else {
          const activeUserStr = await AsyncStorage.getItem(LOCAL_ACTIVE_USER_KEY);
          if (!activeUserStr) {
            notifyAuthListeners(null);
          }
        }
      });
    } catch (e) {
      console.log("Firebase auth state listener notice:", e);
    }
  }

  return () => {
    localAuthListeners = localAuthListeners.filter(l => l !== onStateChange);
    clearInterval(checkInterval);
    if (unsubscribeFirebase) unsubscribeFirebase();
  };
};

export const getDatabaseMode = () => {
  return useLocalDb ? "LOCAL_STORAGE" : "FIREBASE_CLOUD";
};

export const checkAadhaarUniqueness = async (userId: string, aadhaarNo: string): Promise<boolean> => {
  if (!aadhaarNo) return true;

  if (useLocalDb) {
    const users = await getLocalUsers();
    for (const email of Object.keys(users)) {
      const user = users[email];
      if (
        user?.profile?.verifications?.aadhaar?.aadhaarNo === aadhaarNo &&
        user?.profile?.uid !== userId
      ) {
        return false;
      }
    }
    return true;
  } else {
    try {
      const q = query(
        collection(db, "users"),
        where("verifications.aadhaar.aadhaarNo", "==", aadhaarNo)
      );
      const querySnapshot = await withTimeout(getDocs(q), 3000);
      for (const docSnap of querySnapshot.docs) {
        if (docSnap.id !== userId) {
          return false;
        }
      }
      return true;
    } catch (e: any) {
      console.log("Firestore uniqueness check failed, falling back to local DB check", e);
      const users = await getLocalUsers();
      for (const email of Object.keys(users)) {
        const user = users[email];
        if (
          user?.profile?.verifications?.aadhaar?.aadhaarNo === aadhaarNo &&
          user?.profile?.uid !== userId
        ) {
          return false;
        }
      }
      return true;
    }
  }
};

export const checkPanUniqueness = async (userId: string, panNo: string): Promise<boolean> => {
  if (!panNo) return true;

  if (useLocalDb) {
    const users = await getLocalUsers();
    for (const email of Object.keys(users)) {
      const user = users[email];
      if (
        user?.profile?.verifications?.pan?.panNo === panNo &&
        user?.profile?.uid !== userId
      ) {
        return false;
      }
    }
    return true;
  } else {
    try {
      const q = query(
        collection(db, "users"),
        where("verifications.pan.panNo", "==", panNo)
      );
      const querySnapshot = await withTimeout(getDocs(q), 3000);
      for (const docSnap of querySnapshot.docs) {
        if (docSnap.id !== userId) {
          return false;
        }
      }
      return true;
    } catch (e: any) {
      console.log("Firestore uniqueness check failed, falling back to local DB check", e);
      const users = await getLocalUsers();
      for (const email of Object.keys(users)) {
        const user = users[email];
        if (
          user?.profile?.verifications?.pan?.panNo === panNo &&
          user?.profile?.uid !== userId
        ) {
          return false;
        }
      }
      return true;
    }
  }
};
