import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Code2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const { developer, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-dark-900 border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Code2 className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold text-white">
                NullStack
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {developer && (
              <>
                <div className="flex items-center space-x-2 text-dark-300">
                  <User className="h-5 w-5" />
                  <span className="text-sm">{developer.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
