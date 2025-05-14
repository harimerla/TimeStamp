export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'staff';
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string; // ISO string
  clockIn: string; // HH:MM format
  clockOut: string | null; // HH:MM format
  breaks: Break[];
  totalHours: number | null;
  status: 'active' | 'completed';
}

export interface Break {
  id: string;
  startTime: string; // HH:MM format
  endTime: string | null; // HH:MM format
  duration: number | null; // minutes
}