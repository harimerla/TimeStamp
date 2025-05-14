import React, { createContext, useContext, useState, useEffect } from 'react';
import { TimeEntry, Break } from '../types';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';

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
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [activeBreak, setActiveBreak] = useState<Break | null>(null);

  // Load time entries from localStorage on mount
  useEffect(() => {
    const storedEntries = localStorage.getItem('timeEntries');
    if (storedEntries) {
      setTimeEntries(JSON.parse(storedEntries));
    }
  }, []);

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

  // Save time entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
  }, [timeEntries]);

  const clockIn = () => {
    if (!user || activeEntry) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm');

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      userId: user.id,
      date: today,
      clockIn: now,
      clockOut: null,
      breaks: [],
      totalHours: null,
      status: 'active'
    };

    setTimeEntries(prev => [...prev, newEntry]);
  };

  const clockOut = () => {
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

    // Update the entry
    const updatedEntries = timeEntries.map(entry => {
      if (entry.id === activeEntry.id) {
        return {
          ...entry,
          clockOut: now,
          totalHours,
          status: 'completed'
        };
      }
      return entry;
    });

    setTimeEntries(updatedEntries);
  };

  const startBreak = () => {
    if (!user || !activeEntry) return;

    const now = format(new Date(), 'HH:mm');
    const newBreak: Break = {
      id: Date.now().toString(),
      startTime: now,
      endTime: null,
      duration: null
    };

    const updatedEntries = timeEntries.map(entry => {
      if (entry.id === activeEntry.id) {
        return {
          ...entry,
          breaks: [...entry.breaks, newBreak]
        };
      }
      return entry;
    });

    setTimeEntries(updatedEntries);
    setActiveBreak(newBreak);
  };

  const endBreak = () => {
    if (!user || !activeEntry || !activeBreak) return;

    const now = format(new Date(), 'HH:mm');
    
    // Calculate break duration
    const [startHours, startMinutes] = activeBreak.startTime.split(':').map(Number);
    const [endHours, endMinutes] = now.split(':').map(Number);
    
    const duration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

    const updatedEntries = timeEntries.map(entry => {
      if (entry.id === activeEntry.id) {
        return {
          ...entry,
          breaks: entry.breaks.map(breakItem => {
            if (breakItem.id === activeBreak.id) {
              return {
                ...breakItem,
                endTime: now,
                duration
              };
            }
            return breakItem;
          })
        };
      }
      return entry;
    });

    setTimeEntries(updatedEntries);
    setActiveBreak(null);
  };

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
    // For simplicity, we're just calculating total hours for all entries
    // In a real app, you'd filter by the week range
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
      calculateTotalHoursForWeek
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