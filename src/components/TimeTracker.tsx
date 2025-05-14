import { Play, Pause, Clock, AlarmCheck } from 'lucide-react';
import { useTimeTracking } from '../context/TimeTrackingContext';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

const TimeTracker = () => {
  const { activeEntry, activeBreak, clockIn, clockOut, startBreak, endBreak } = useTimeTracking();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [elapsedBreakTime, setElapsedBreakTime] = useState(0);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time for active session
  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime(0);
      return;
    }

    const calculateElapsed = () => {
      const [hours, minutes] = activeEntry.clockIn.split(':').map(Number);
      const clockInTime = new Date();
      clockInTime.setHours(hours, minutes, 0);
      
      // Calculate total break time
      const breakMinutes = activeEntry.breaks.reduce((total, breakItem) => {
        if (breakItem.duration) {
          return total + breakItem.duration;
        }
        
        // For active break, calculate current duration
        if (breakItem.id === activeBreak?.id) {
          const [startHours, startMinutes] = breakItem.startTime.split(':').map(Number);
          const startTime = new Date();
          startTime.setHours(startHours, startMinutes, 0);
          
          return total + (new Date().getTime() - startTime.getTime()) / 60000;
        }
        
        return total;
      }, 0);
      
      const totalMinutes = (new Date().getTime() - clockInTime.getTime()) / 60000 - breakMinutes;
      setElapsedTime(Math.max(0, totalMinutes));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 60000);
    
    return () => clearInterval(interval);
  }, [activeEntry, activeBreak]);

  // Calculate elapsed time for active break
  useEffect(() => {
    if (!activeBreak) {
      setElapsedBreakTime(0);
      return;
    }

    const calculateBreakElapsed = () => {
      const [hours, minutes] = activeBreak.startTime.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(hours, minutes, 0);
      
      const elapsed = (new Date().getTime() - startTime.getTime()) / 60000;
      setElapsedBreakTime(elapsed);
    };

    calculateBreakElapsed();
    const interval = setInterval(calculateBreakElapsed, 60000);
    
    return () => clearInterval(interval);
  }, [activeBreak]);

  const formatElapsedTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-semibold">Time Tracker</h2>
        </div>
        <div className="text-sm font-medium">
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">Current time</div>
            <div className="text-xl font-semibold">{format(currentTime, 'h:mm a')}</div>
          </div>
          
          {activeEntry && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Clock in time</div>
              <div className="text-md font-medium">{activeEntry.clockIn}</div>
            </div>
          )}
        </div>

        {activeEntry ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <div className="text-sm text-gray-500">Elapsed time</div>
                <div className="text-lg font-semibold">{formatElapsedTime(elapsedTime)}</div>
              </div>
              {activeBreak ? (
                <div className="text-right text-warning-700">
                  <div className="text-sm">On break</div>
                  <div className="text-md font-medium">{formatElapsedTime(elapsedBreakTime)}</div>
                </div>
              ) : null}
            </div>
            
            <div className="flex space-x-2">
              {activeBreak ? (
                <button
                  onClick={endBreak}
                  className="flex-1 bg-warning-500 text-white py-2 px-4 rounded-md hover:bg-warning-600 transition-colors flex items-center justify-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  End Break
                </button>
              ) : (
                <button
                  onClick={startBreak}
                  className="flex-1 bg-warning-500 text-white py-2 px-4 rounded-md hover:bg-warning-600 transition-colors flex items-center justify-center"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Take Break
                </button>
              )}
              
              <button
                onClick={clockOut}
                className="flex-1 bg-error-500 text-white py-2 px-4 rounded-md hover:bg-error-600 transition-colors flex items-center justify-center"
              >
                <AlarmCheck className="h-4 w-4 mr-2" />
                Clock Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <p className="text-gray-500 mb-4">You're not clocked in</p>
            <button
              onClick={clockIn}
              className="bg-primary-600 text-white py-2 px-6 rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <Play className="h-4 w-4 mr-2" />
              Clock In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker;