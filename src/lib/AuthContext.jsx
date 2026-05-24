import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { appClient } from "@/lib/local-client";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const currentUser = await appClient.auth.me();
      if (!mounted) return;
      setUser(currentUser);
      setIsLoadingAuth(false);
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      currentUser: user,
      isAuthenticated: Boolean(user),
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      logout: () => appClient.auth.logout(),
      navigateToLogin: () => appClient.auth.redirectToLogin(),
      checkUserAuth: async () => {
        const currentUser = await appClient.auth.me();
        setUser(currentUser);
        return currentUser;
      },
      checkAppState: async () => null,
    }),
    [isLoadingAuth, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
