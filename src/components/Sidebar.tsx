import { Home, BarChart2, User, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-4 px-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">Staff Dashboard</h2>
        {onClose && (
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive 
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <Home className="mr-3 h-5 w-5" />
          Dashboard
        </NavLink>
        
        <NavLink 
          to="/reports" 
          className={({ isActive }) => 
            `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive 
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <BarChart2 className="mr-3 h-5 w-5" />
          Reports
        </NavLink>
        
        <NavLink 
          to="/profile" 
          className={({ isActive }) => 
            `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive 
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <User className="mr-3 h-5 w-5" />
          Profile
        </NavLink>
        
        {user?.role === 'admin' && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => 
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Users className="mr-3 h-5 w-5" />
            Admin
          </NavLink>
        )}
      </nav>
      
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
            <User className="h-4 w-4" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;