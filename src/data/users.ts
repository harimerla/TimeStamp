import { User } from "../types";

export const defaultUsers: User[] = [
  {
    id: "1",
    username: "admin@tataride.com.au",
    password: "admin123",
    name: "Admin User",
    role: "admin",
  },
  {
    id: "2",
    username: "john",
    password: "password123",
    name: "John Doe",
    role: "staff",
  },
  {
    id: "3",
    username: "jane",
    password: "password123",
    name: "Jane Smith",
    role: "staff",
  },
];
