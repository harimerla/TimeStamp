import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";
import { auth } from "../firebase";
import { User } from "../types";
import { defaultUsers } from "../data/users";

// Keep the existing AuthContextType
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  users: User[];
  addUser: (user: Omit<User, "id">) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Keep both user types - our app User type and Firebase User
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const storedUsers = localStorage.getItem("users");
    return storedUsers ? JSON.parse(storedUsers) : defaultUsers;
  });
  // Track firebase user separately
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Set up Firebase auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setFirebaseUser(authUser);

      if (authUser) {
        // If user is authenticated in Firebase, find matching local user
        const email = authUser.email;
        if (email) {
          const username = email.split("@")[0]; // Assuming email format is username@domain.com
          const matchedUser = users.find((u) => u.username === username);

          if (matchedUser) {
            setUser(matchedUser);
            localStorage.setItem("currentUser", JSON.stringify(matchedUser));
          }
        }
      } else {
        // If no Firebase user, clear local user
        setUser(null);
        localStorage.removeItem("currentUser");
      }
    });

    return () => unsubscribe();
  }, [users]);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Use whatever the user entered directly for Firebase auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        username,
        password
      );
      const firebaseUser = userCredential.user;

      // If Firebase authentication succeeds, create a user object
      if (firebaseUser) {
        // Try to find a matching user in local storage
        const emailUsername = username.includes("@")
          ? username.split("@")[0]
          : username;
        const matchedUser = users.find((u) => u.username === emailUsername);

        if (matchedUser) {
          // Use existing user if found
          setUser(matchedUser);
          localStorage.setItem("currentUser", JSON.stringify(matchedUser));
        } else {
          // Create new user object based on Firebase auth
          const newUser: User = {
            id: firebaseUser.uid,
            username: emailUsername,
            password: password, // store password for local use
            name: firebaseUser.displayName || emailUsername,
            role: "staff", // default role
          };

          setUser(newUser);

          // Add to users list
          const updatedUsers = [...users, newUser];
          setUsers(updatedUsers);
          localStorage.setItem("users", JSON.stringify(updatedUsers));
          localStorage.setItem("currentUser", JSON.stringify(newUser));
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Firebase login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("currentUser");
    } catch (error) {
      console.error("Firebase logout error:", error);
    }
  };

  const updatePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      if (!firebaseUser) return false;

      // Firebase requires recent authentication before password update
      // In a real app, you'd re-authenticate here

      // Update Firebase password
      await firebaseUpdatePassword(firebaseUser, newPassword);

      // If Firebase update succeeded, update local user data
      if (user) {
        const updatedUser = { ...user, password: newPassword };
        const updatedUsers = users.map((u) =>
          u.id === user.id ? updatedUser : u
        );

        setUsers(updatedUsers);
        setUser(updatedUser);
        localStorage.setItem("users", JSON.stringify(updatedUsers));
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }

      return true;
    } catch (error) {
      console.error("Password update error:", error);
      return false;
    }
  };

  const addUser = async (newUser: Omit<User, "id">) => {
    try {
      // Create user in Firebase first
      const email = `${newUser.username}@timetracker.app`;
      await createUserWithEmailAndPassword(auth, email, newUser.password);

      // Then create in local storage
      const userWithId: User = {
        ...newUser,
        id: Date.now().toString(),
      };

      const updatedUsers = [...users, userWithId];
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      return true;
    } catch (error) {
      console.error("Add user error:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updatePassword,
        users,
        addUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
