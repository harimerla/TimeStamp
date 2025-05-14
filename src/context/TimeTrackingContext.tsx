import React, { createContext, useContext, useState, useEffect } from "react";
import { TimeEntry, Break } from "../types";
import { useAuth } from "./AuthContext";
import { format } from "date-fns";
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
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

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

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(
  undefined
);

export const TimeTrackingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
        const entriesCollection = collection(db, "timeEntries");
        const q = query(
          entriesCollection,
          // We're not filtering by user here - we'll do that in the component
          orderBy("date", "desc")
        );

        const querySnapshot = await getDocs(q);
        const entries: TimeEntry[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<TimeEntry, "id">;
          entries.push({
            ...data,
            id: doc.id,
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
        (entry) => entry.userId === user.id && entry.status === "active"
      );
      setActiveEntry(active || null);

      // Check for active break
      if (active) {
        const lastBreak =
          active.breaks.length > 0
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
    if (!user || activeEntry) {
      console.log(
        "Cannot clock in: User not logged in or already has active entry",
        { user, activeEntry }
      );
      return;
    }

    try {
      const now = format(new Date(), "HH:mm");
      const today = format(new Date(), "yyyy-MM-dd");

      console.log("Attempting to clock in user:", user.id);

      // Create new time entry document with minimal required fields
      const entryData = {
        userId: user.id,
        date: today,
        clockIn: now,
        clockOut: null,
        breaks: [] as Break[],
        totalHours: null,
        status: "active" as "active" | "completed",
      };

      console.log("Creating time entry with data:", entryData);

      // Try to write to Firestore
      const docRef = await addDoc(collection(db, "timeEntries"), entryData);

      // If we get here, the write was successful
      console.log("Successfully created time entry with ID:", docRef.id);

      // Update local state with the new entry
      const newEntry: TimeEntry = {
        id: docRef.id,
        ...entryData,
      };

      setTimeEntries((prev) => [newEntry, ...prev]);
      setActiveEntry(newEntry);
    } catch (error) {
      console.error("Error clocking in:", error);

      // As a fallback for demo purposes, create entry in local state only
      // Remove this in production when Firestore rules are properly set
      if (import.meta.env.DEV) {
        console.log("DEV MODE: Creating local-only time entry as fallback");

        const now = format(new Date(), "HH:mm");
        const today = format(new Date(), "yyyy-MM-dd");

        const fallbackEntry: TimeEntry = {
          id: `local-${Date.now()}`,
          userId: user.id,
          date: today,
          clockIn: now,
          clockOut: null,
          breaks: [] as Break[],
          totalHours: null,
          status: "active" as "active" | "completed",
        };

        setTimeEntries((prev) => [fallbackEntry, ...prev]);
        setActiveEntry(fallbackEntry);
      }
    }
  };

  const clockOut = async () => {
    if (!user || !activeEntry) return;

    const now = format(new Date(), "HH:mm");

    // Calculate total hours
    const [inHours, inMinutes] = activeEntry.clockIn.split(":").map(Number);
    const [outHours, outMinutes] = now.split(":").map(Number);

    let totalMinutes = outHours * 60 + outMinutes - (inHours * 60 + inMinutes);

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
      await updateDoc(doc(db, "timeEntries", activeEntry.id), {
        clockOut: now,
        totalHours,
        status: "completed",
      });

      // Update local state
      setTimeEntries(
        timeEntries.map((entry) => {
          if (entry.id === activeEntry.id) {
            return {
              ...entry,
              clockOut: now,
              totalHours,
              status: "completed",
            };
          }
          return entry;
        })
      );
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const startBreak = async () => {
    if (!user || !activeEntry) return;

    const now = format(new Date(), "HH:mm");
    const newBreak: Break = {
      id: Date.now().toString(),
      startTime: now,
      endTime: null,
      duration: null,
    };

    const updatedBreaks = [...activeEntry.breaks, newBreak];

    try {
      // Update in Firestore
      await updateDoc(doc(db, "timeEntries", activeEntry.id), {
        breaks: updatedBreaks,
      });

      // Update local state
      setTimeEntries(
        timeEntries.map((entry) => {
          if (entry.id === activeEntry.id) {
            return {
              ...entry,
              breaks: updatedBreaks,
            };
          }
          return entry;
        })
      );

      setActiveBreak(newBreak);
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  const endBreak = async () => {
    if (!user || !activeEntry || !activeBreak) return;

    const now = format(new Date(), "HH:mm");

    // Calculate break duration
    const [startHours, startMinutes] = activeBreak.startTime
      .split(":")
      .map(Number);
    const [endHours, endMinutes] = now.split(":").map(Number);

    const duration =
      endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

    const updatedBreaks = activeEntry.breaks.map((breakItem) => {
      if (breakItem.id === activeBreak.id) {
        return {
          ...breakItem,
          endTime: now,
          duration,
        };
      }
      return breakItem;
    });

    try {
      // Update in Firestore
      await updateDoc(doc(db, "timeEntries", activeEntry.id), {
        breaks: updatedBreaks,
      });

      // Update local state
      setTimeEntries(
        timeEntries.map((entry) => {
          if (entry.id === activeEntry.id) {
            return {
              ...entry,
              breaks: updatedBreaks,
            };
          }
          return entry;
        })
      );

      setActiveBreak(null);
    } catch (error) {
      console.error("Error ending break:", error);
    }
  };

  // Utility functions remain the same
  const getEntriesByDate = (date: string) => {
    return timeEntries.filter((entry) => entry.date === date);
  };

  const getEntriesByUserId = (userId: string) => {
    return timeEntries.filter((entry) => entry.userId === userId);
  };

  const calculateTotalHoursForDate = (userId: string, date: string) => {
    return timeEntries
      .filter(
        (entry) =>
          entry.userId === userId &&
          entry.date === date &&
          entry.totalHours !== null
      )
      .reduce((total, entry) => total + (entry.totalHours || 0), 0);
  };

  const calculateTotalHoursForWeek = (userId: string, startDate: string) => {
    // Simple implementation - you might want to enhance this with proper week filtering
    return timeEntries
      .filter((entry) => entry.userId === userId && entry.totalHours !== null)
      .reduce((total, entry) => total + (entry.totalHours || 0), 0);
  };

  return (
    <TimeTrackingContext.Provider
      value={{
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
        isLoading,
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
};

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error(
      "useTimeTracking must be used within a TimeTrackingProvider"
    );
  }
  return context;
};
