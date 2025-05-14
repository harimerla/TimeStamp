import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks, subWeeks } from 'date-fns';
import TimeEntryList from '../components/TimeEntryList';
import { useAuth } from '../context/AuthContext';
import { useTimeTracking } from '../context/TimeTrackingContext';
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react';

const ReportPage = () => {
  const { user } = useAuth();
  const { calculateTotalHoursForDate } = useTimeTracking();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  
  // Calculate week start and end dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  // Get all days in the current week
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Format the selected date for filtering
  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  
  // Navigate to previous day/week
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
    } else {
      setSelectedDate(prev => subWeeks(prev, 1));
    }
  };
  
  // Navigate to next day/week
  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 1)));
    } else {
      setSelectedDate(prev => addWeeks(prev, 1));
    }
  };
  
  // Set to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  // Calculate weekly total hours
  const calculateWeeklyTotal = () => {
    if (!user) return 0;
    
    return daysInWeek.reduce((total, day) => {
      return total + calculateTotalHoursForDate(user.id, format(day, 'yyyy-MM-dd'));
    }, 0);
  };
  
  const weeklyTotal = calculateWeeklyTotal();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Time Reports</h1>
        <p className="text-gray-600">View and analyze your work hours.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Time Report</h2>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'day' 
                  ? 'bg-white text-primary-600' 
                  : 'text-white hover:bg-primary-500'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'week' 
                  ? 'bg-white text-primary-600' 
                  : 'text-white hover:bg-primary-500'
              }`}
            >
              Week
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={goToPrevious}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="text-center">
              {viewMode === 'day' ? (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-500" />
                  <span className="text-lg font-medium">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-500" />
                  <span className="text-lg font-medium">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              <button
                onClick={goToToday}
                className="mt-2 text-sm text-primary-600 hover:text-primary-800"
              >
                Go to Today
              </button>
            </div>
            
            <button 
              onClick={goToNext}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ArrowRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {viewMode === 'week' && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="font-medium">Weekly Total</div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-primary-500" />
                  <span className="font-semibold">
                    {Math.floor(weeklyTotal)}h {Math.round((weeklyTotal % 1) * 60)}m
                  </span>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-7 gap-2">
                {daysInWeek.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const hours = user ? calculateTotalHoursForDate(user.id, dayStr) : 0;
                  
                  return (
                    <div key={dayStr} className="text-center">
                      <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                      <div className={`text-sm mt-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'font-bold text-primary-600' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="text-xs mt-1">
                        {hours > 0 ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {user && (viewMode === 'day' ? (
            <TimeEntryList userId={user.id} date={formattedSelectedDate} />
          ) : (
            <div className="space-y-4">
              {daysInWeek.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                return (
                  <div key={dayStr}>
                    <h3 className="text-md font-medium mb-2">
                      {format(day, 'EEEE, MMMM d')}
                    </h3>
                    <TimeEntryList userId={user.id} date={dayStr} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportPage;