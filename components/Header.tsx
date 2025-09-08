
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { APP_NAME } from '../constants';
import { LogoutIcon } from './Icons';

const Header: React.FC = () => {
    const { currentUser, logout } = useAppContext();

    if (!currentUser) return null;

    return (
        <header className="bg-white shadow-md z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <h1 className="text-xl font-bold text-green-800">{APP_NAME}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
                            <p className="text-xs text-gray-500">{currentUser.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            aria-label="Logout"
                        >
                            <LogoutIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;