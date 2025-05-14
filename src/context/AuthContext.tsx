import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { User } from "../types";
import { defaultUsers } from "../data/users";
import { doc, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

// Update the AuthContextType interface
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
  createUserWithProfile: (userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => Promise<{ success: boolean; error?: Error }>;
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
        // Try to find a matching user in local storage - first check by full username/email
        let matchedUser = users.find((u) => u.username === username);

        // If no match, try extracting username from email format (for backward compatibility)
        if (!matchedUser && username.includes("@")) {
          const extractedUsername = username.split("@")[0];
          matchedUser = users.find((u) => u.username === extractedUsername);
        }

        if (matchedUser) {
          // Use existing user if found
          setUser(matchedUser);
          localStorage.setItem("currentUser", JSON.stringify(matchedUser));
        } else {
          // Create new user object based on Firebase auth
          const displayName = username.includes("@")
            ? username.split("@")[0]
            : username;
          const newUser: User = {
            id: firebaseUser.uid,
            username: username, // Use full email or username as provided
            password: password, // store password for local use
            name: firebaseUser.displayName || displayName,
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
      // Check if username already contains @ (is an email)
      const email = newUser.username.includes("@")
        ? newUser.username
        : `${newUser.username}@timetracker.app`;
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

  const createUserWithProfile = async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const firebaseUser = userCredential.user;

      // Create username from email
      const username = userData.email.split("@")[0];

      // Create a user object for our app
      const newUser: User = {
        id: firebaseUser.uid,
        username: username,
        password: userData.password, // store password for local use
        name: `${userData.firstName} ${userData.lastName}`,
        role: "staff", // default role
      };

      // Add to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        username: username,
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        role: "staff",
        createdAt: new Date(),
      });

      // Add to local users array
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      return { success: true };
    } catch (error) {
      console.error("Error creating user:", error);
      return {
        success: false,
        error:
          error instanceof FirebaseError
            ? error
            : new Error("Registration failed"),
      };
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
        createUserWithProfile,
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
