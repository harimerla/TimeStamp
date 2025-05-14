import { format, parseISO } from "date-fns";
import { useTimeTracking } from "../context/TimeTrackingContext";
import { useAuth } from "../context/AuthContext";
import { Calendar, Clock, Coffee } from "lucide-react";

interface TimeEntryListProps {
  userId?: string;
  date?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  limit?: number;
}

const TimeEntryList = ({
  userId,
  date,
  dateRange,
  limit,
}: TimeEntryListProps) => {
  const { timeEntries } = useTimeTracking();
  const { user, users } = useAuth();

  // Filter entries based on props
  let filteredEntries = timeEntries.filter((entry) => {
    // Filter by user
    if (userId && entry.userId !== userId) {
      return false;
    }

    // Filter by date
    if (date && entry.date !== date) {
      return false;
    }

    // Filter by date range
    if (dateRange) {
      const entryDate = entry.date;
      return entryDate >= dateRange.startDate && entryDate <= dateRange.endDate;
    }

    return true;
  });

  // Sort by date (newest first) then by clock in time
  filteredEntries = filteredEntries.sort((a, b) => {
    if (a.date === b.date) {
      return b.clockIn.localeCompare(a.clockIn);
    }
    return b.date.localeCompare(a.date);
  });

  // Apply limit if provided
  if (limit) {
    filteredEntries = filteredEntries.slice(0, limit);
  }

  // Find user name by ID
  const getUserName = (id: string) => {
    const foundUser = users.find((u) => u.id === id);
    return foundUser?.name || "Unknown User";
  };

  if (filteredEntries.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No time entries found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredEntries.map((entry) => (
        <div
          key={entry.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium">
                {format(parseISO(entry.date), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            {user?.role === "admin" && !userId && (
              <div className="text-sm text-gray-500">
                {getUserName(entry.userId)}
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex justify-between mb-3">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-primary-500 mr-2" />
                <span className="text-sm font-medium">Clock In:</span>
                <span className="ml-2 text-sm">{entry.clockIn}</span>
              </div>

              <div className="flex items-center">
                <Clock className="h-4 w-4 text-error-500 mr-2" />
                <span className="text-sm font-medium">Clock Out:</span>
                <span className="ml-2 text-sm">
                  {entry.clockOut ||
                    (entry.status === "active" ? "Active" : "Not recorded")}
                </span>
              </div>
            </div>

            {entry.breaks.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2 flex items-center">
                  <Coffee className="h-4 w-4 mr-2 text-warning-500" />
                  Breaks:
                </div>
                <div className="pl-6 space-y-1">
                  {entry.breaks.map((breakItem) => (
                    <div
                      key={breakItem.id}
                      className="text-sm flex justify-between"
                    >
                      <div>
                        {breakItem.startTime} - {breakItem.endTime || "Active"}
                      </div>
                      {breakItem.duration && (
                        <div className="text-gray-500">
                          {Math.floor(breakItem.duration / 60)}h{" "}
                          {breakItem.duration % 60}m
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entry.totalHours !== null && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium">Total Hours:</span>
                <span className="text-sm font-semibold">
                  {Math.floor(entry.totalHours)}h{" "}
                  {Math.round((entry.totalHours % 1) * 60)}m
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimeEntryList;
