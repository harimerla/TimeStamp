import { useEffect, useState } from 'react';
import TimeTracker from '../components/TimeTracker';
import TimeEntryList from '../components/TimeEntryList';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useTimeTracking } from '../context/TimeTrackingContext';
import { Clock, BarChart2 } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { calculateTotalHoursForDate, calculateTotalHoursForWeek } = useTimeTracking();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0
  });

  useEffect(() => {
    if (user) {
      setStats({
        todayHours: calculateTotalHoursForDate(user.id, today),
        weekHours: calculateTotalHoursForWeek(user.id, today)
      });
    }
  }, [user, today, calculateTotalHoursForDate, calculateTotalHoursForWeek]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your work hours and view your recent activity.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeTracker />
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-secondary-600 text-white px-4 py-3 flex items-center">
            <BarChart2 className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-semibold">Your Stats</h2>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">Today</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 text-primary-500 mr-2" />
                  <div className="text-xl font-bold">
                    {Math.floor(stats.todayHours)}h {Math.round((stats.todayHours % 1) * 60)}m
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-sm text-gray-500">This Week</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 text-primary-500 mr-2" />
                  <div className="text-xl font-bold">
                    {Math.floor(stats.weekHours)}h {Math.round((stats.weekHours % 1) * 60)}m
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Time Entries</h2>
        {user && <TimeEntryList userId={user.id} limit={5} />}
      </div>
    </div>
  );
};

export default Dashboard;