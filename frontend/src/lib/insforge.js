import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

// A reactive pub-sub system for auth state changes
const listeners = new Set();

const notifyListeners = (event, session) => {
  listeners.forEach((callback) => {
    try {
      callback(event, session);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
};

// Shim missing/differently-named methods for full client compatibility
if (client.auth) {
  // 1. getUser -> getCurrentUser
  if (!client.auth.getUser) {
    client.auth.getUser = async function () {
      return this.getCurrentUser();
    };
  }

  // Intercept signInWithPassword to notify listeners
  const originalSignIn = client.auth.signInWithPassword;
  if (originalSignIn) {
    client.auth.signInWithPassword = async function (...args) {
      try {
        const res = await originalSignIn.apply(this, args);
        if (res && !res.error && res.data?.user) {
          notifyListeners('SIGNED_IN', { user: res.data.user });
        }
        return res;
      } catch (e) {
        console.error("SignIn Intercept Error:", e);
        return { data: null, error: e };
      }
    };
  }

  // Intercept signUp to notify listeners
  const originalSignUp = client.auth.signUp;
  if (originalSignUp) {
    client.auth.signUp = async function (...args) {
      try {
        const res = await originalSignUp.apply(this, args);
        if (res && !res.error && res.data?.user) {
          notifyListeners('SIGNED_IN', { user: res.data.user });
        }
        return res;
      } catch (e) {
        console.error("SignUp Intercept Error:", e);
        return { data: null, error: e };
      }
    };
  }

  // Intercept signOut to notify listeners
  const originalSignOut = client.auth.signOut;
  if (originalSignOut) {
    client.auth.signOut = async function (...args) {
      try {
        localStorage.removeItem("remember_me");
        sessionStorage.removeItem("session_active");
        sessionStorage.setItem("manual_logout", "true");
        
        const res = await originalSignOut.apply(this, args);
        // Defensively trigger SIGNED_OUT event to reset UI
        notifyListeners('SIGNED_OUT', null);
        return res || { error: null };
      } catch (e) {
        console.error("SignOut Intercept Error:", e);
        // Fallback: guarantee UI resets
        notifyListeners('SIGNED_OUT', null);
        return { error: e };
      }
    };
  }

  // 2. onAuthStateChange
  client.auth.onAuthStateChange = function (callback) {
    listeners.add(callback);

    // Trigger callback with current user session initially if active
    this.getCurrentUser().then(({ data, error }) => {
      if (!error && data?.user) {
        callback('SIGNED_IN', { user: data.user });
      } else {
        callback('SIGNED_OUT', null);
      }
    }).catch(() => {
      callback('SIGNED_OUT', null);
    });

    // Return subscription with unsubscribe method
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(callback);
          }
        }
      }
    };
  };

  // 3. updateUser
  if (!client.auth.updateUser) {
    client.auth.updateUser = async function (attrs) {
      let res;
      try {
        if (attrs.password) {
          res = await this.resetPassword({ newPassword: attrs.password, otp: '' });
        } else if (attrs.profile || attrs.data) {
          res = await this.setProfile(attrs.profile || attrs.data);
        } else {
          res = { data: null, error: null };
        }
      } catch (e) {
        res = { data: null, error: e };
      }
      
      // Notify updates
      this.getCurrentUser().then(({ data, error }) => {
        if (!error && data?.user) {
          notifyListeners('USER_UPDATED', { user: data.user });
        }
      }).catch(() => {});

      return res;
    };
  }
}

export const insforge = client;
