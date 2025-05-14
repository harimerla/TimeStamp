import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { defaultUsers } from '../data/users';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Load users from localStorage or use defaults
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      setUsers(defaultUsers);
      localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    // Check for existing session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        const foundUser = users.find(
          (u) => u.username === username && u.password === password
        );
        
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('currentUser', JSON.stringify(foundUser));
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user || user.password !== oldPassword) {
      return false;
    }

    const updatedUser = { ...user, password: newPassword };
    const updatedUsers = users.map((u) => 
      u.id === user.id ? updatedUser : u
    );

    setUser(updatedUser);
    setUsers(updatedUsers);
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    return true;
  };

  const addUser = (newUser: Omit<User, 'id'>) => {
    const userWithId = {
      ...newUser,
      id: Date.now().toString(),
    };

    const updatedUsers = [...users, userWithId];
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updatePassword,
      users,
      addUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};