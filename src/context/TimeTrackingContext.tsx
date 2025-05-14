import React, { createContext, useContext, useState, useEffect } from 'react';
import { TimeEntry, Break } from '../types';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
  activeEntry: TimeEntry | null;
  clockIn: () => void;
  clockOut: () => void;
  startBreak: () => void;
  endBreak: () => void;
  getEntriesByDate: (date: string) => TimeEntry[];
  getEntriesByUserId: (userId: string) => TimeEntry[];
  calculateTotalHoursForDate: (userId: string, date: string) => number;
  calculateTotalHoursForWeek: (userId: string, startDate: string) => number;
  activeBreak: Break | null;
  isLoading: boolean;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [activeBreak, setActiveBreak] = useState<Break | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load time entries from Firestore when user changes
  useEffect(() => {
    const loadTimeEntries = async () => {
      if (!user) {
        setTimeEntries([]);
        return;
      }

      setIsLoading(true);
      try {
        const entriesCollection = collection(db, 'timeEntries');
        const q = query(
          entriesCollection,
          // We're not filtering by user here - we'll do that in the component
          orderBy('date', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const entries: TimeEntry[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<TimeEntry, 'id'>;
          entries.push({
            ...data,
            id: doc.id
          } as TimeEntry);
        });
        
        setTimeEntries(entries);
      } catch (error) {
        console.error("Error loading time entries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeEntries();
  }, [user]);

  // Identify if there's an active entry for the current user
  useEffect(() => {
    if (user) {
      const active = timeEntries.find(
        entry => entry.userId === user.id && entry.status === 'active'
      );
      setActiveEntry(active || null);

      // Check for active break
      if (active) {
        const lastBreak = active.breaks.length > 0 
          ? active.breaks[active.breaks.length - 1] 
          : null;
        
        if (lastBreak && !lastBreak.endTime) {
          setActiveBreak(lastBreak);
        } else {
          setActiveBreak(null);
        }
      } else {
        setActiveBreak(null);
      }
    } else {
      setActiveEntry(null);
      setActiveBreak(null);
    }
  }, [user, timeEntries]);

  const clockIn = async () => {
    if (!user || activeEntry) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm');

    const newEntry: Omit<TimeEntry, 'id'> = {
      userId: user.id,
      date: today,
      clockIn: now,
      clockOut: null,
      breaks: [],
      totalHours: null,
      status: 'active'
    };

    try {
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'timeEntries'), newEntry);
      
      // Update local state
      const entryWithId = { 
        ...newEntry, 
        id: docRef.id 
      } as TimeEntry;
      
      setTimeEntries(prev => [...prev, entryWithId]);
    } catch (error) {
      console.error("Error clocking in:", error);
    }
  };

  const clockOut = async () => {
    if (!user || !activeEntry) return;

    const now = format(new Date(), 'HH:mm');
    
    // Calculate total hours
    const [inHours, inMinutes] = activeEntry.clockIn.split(':').map(Number);
    const [outHours, outMinutes] = now.split(':').map(Number);
    
    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    
    // Subtract break durations
    const breakMinutes = activeEntry.breaks.reduce((total, breakItem) => {
      if (breakItem.duration) {
        return total + breakItem.duration;
      }
      return total;
    }, 0);
    
    totalMinutes -= breakMinutes;
    const totalHours = totalMinutes / 60;

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'timeEntries', activeEntry.id), {
        clockOut: now,
        totalHours,
        status: 'completed'
      });

      // Update local state
      setTimeEntries(timeEntries.map(entry => {
        if (entry.id === activeEntry.id) {
          return {
            ...entry,
            clockOut: now,
            totalHours,
            status: 'completed'
          };
        }
        return entry;
      }));
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const startBreak = async () => {
    if (!user || !activeEntry) return;

    const now = format(new Date(), 'HH:mm');
    const newBreak: Break = {
      id: Date.now().toString(),
      startTime: now,
      endTime: null,
      duration: null
    };

    const updatedBreaks = [...activeEntry.breaks, newBreak];

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'timeEntries', activeEntry.id), {
        breaks: updatedBreaks
      });

      // Update local state
      setTimeEntries(timeEntries.map(entry => {
        if (entry.id === activeEntry.id) {
          return {
            ...entry,
            breaks: updatedBreaks
          };
        }
        return entry;
      }));
      
      setActiveBreak(newBreak);
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  const endBreak = async () => {
    if (!user || !activeEntry || !activeBreak) return;

    const now = format(new Date(), 'HH:mm');
    
    // Calculate break duration
    const [startHours, startMinutes] = activeBreak.startTime.split(':').map(Number);
    const [endHours, endMinutes] = now.split(':').map(Number);
    
    const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

    const updatedBreaks = activeEntry.breaks.map(breakItem => {
      if (breakItem.id === activeBreak.id) {
        return {
          ...breakItem,
          endTime: now,
          duration
        };
      }
      return breakItem;
    });

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'timeEntries', activeEntry.id), {
        breaks: updatedBreaks
      });

      // Update local state
      setTimeEntries(timeEntries.map(entry => {
        if (entry.id === activeEntry.id) {
          return {
            ...entry,
            breaks: updatedBreaks
          };
        }
        return entry;
      }));
      
      setActiveBreak(null);
    } catch (error) {
      console.error("Error ending break:", error);
    }
  };

  // Utility functions remain the same
  const getEntriesByDate = (date: string) => {
    return timeEntries.filter(entry => entry.date === date);
  };

  const getEntriesByUserId = (userId: string) => {
    return timeEntries.filter(entry => entry.userId === userId);
  };

  const calculateTotalHoursForDate = (userId: string, date: string) => {
    return timeEntries
      .filter(entry => entry.userId === userId && entry.date === date && entry.totalHours !== null)
      .reduce((total, entry) => total + (entry.totalHours || 0), 0);
  };

  const calculateTotalHoursForWeek = (userId: string, startDate: string) => {
    // Simple implementation - you might want to enhance this with proper week filtering
    return timeEntries
      .filter(entry => entry.userId === userId && entry.totalHours !== null)
      .reduce((total, entry) => total + (entry.totalHours || 0), 0);
  };

  return (
    <TimeTrackingContext.Provider value={{
      timeEntries,
      activeEntry,
      activeBreak,
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      getEntriesByDate,
      getEntriesByUserId,
      calculateTotalHoursForDate,
      calculateTotalHoursForWeek,
      isLoading
    }}>
      {children}
    </TimeTrackingContext.Provider>
  );
};

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
};