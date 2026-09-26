import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

import Navigator from './src/screenRoute/navigators';
import { subscribeAuthState, getUserData } from './src/services/firebase';
import { setCachedProfile } from './src/services/profileCache';

function App() {
  const [user, setUser] = useState<any>(null);
  const userRef = React.useRef<any>(null);

  useEffect(() => {
    // Listen to Firebase Auth / AsyncStorage Auth changes
    const unsubscribe = subscribeAuthState((currentUser: any) => {
      const prevUid = userRef.current?.uid || userRef.current?.email;
      const currentUid = currentUser?.uid || currentUser?.email;

      if (currentUser && currentUser.uid) {
        getUserData(currentUser.uid)
          .then((profile) => {
            if (profile) {
              setCachedProfile(profile);
            }
          })
          .catch((e) => {
            console.log('App boot cache error:', e);
          });
      }

      // Guard state mutation so background/foreground transitions do not trigger app refresh
      if (prevUid !== currentUid || userRef.current === null) {
        userRef.current = currentUser;
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#050608' }}>
      <StatusBar barStyle="light-content" backgroundColor="#050608" />
      <Navigator user={user} />
    </SafeAreaProvider>
  );
}

export default App;
