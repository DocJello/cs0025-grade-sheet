import React, { useState, ReactNode } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Page, UserRole } from './types';

// Import all page components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GradingSheet from './pages/GradingSheet';
import UserManagement from './pages/UserManagement';
import Masterlist from './pages/Masterlist';
import ChangePassword from './pages/ChangePassword';
import GroupManagement from './pages/GroupManagement';

// Import icons for sidebar
import { DashboardIcon, UsersIcon, ListIcon, DocumentAddIcon, KeyIcon } from './components/Icons';
import Header from './components/Header';


const NavLink: React.FC<{
    icon: ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-green-800 text-white'
                : 'text-gray-200 hover:bg-green-600 hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const Sidebar: React.FC<{
    currentPage: Page;
    setPage: (page: Page) => void;
}> = ({ currentPage, setPage }) => {
    const { currentUser } = useAppContext();
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isAdviser = currentUser?.role === UserRole.COURSE_ADVISER;

    return (
        <aside className="w-64 bg-green-700 text-white flex flex-col p-4">
            <nav className="flex-1 space-y-2">
                <NavLink
                    icon={<DashboardIcon className="w-6 h-6" />}
                    label="Dashboard"
                    isActive={currentPage === 'dashboard'}
                    onClick={() => setPage('dashboard')}
                />
                {(isAdmin || isAdviser) && (
                    <div>
                        <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Management
                        </div>
                        <div className="space-y-2">
                             <NavLink
                                icon={<DocumentAddIcon className="w-6 h-6" />}
                                label="Group Management"
                                isActive={currentPage === 'group-management'}
                                onClick={() => setPage('group-management')}
                            />
                            <NavLink
                                icon={<ListIcon className="w-6 h-6" />}
                                label="Masterlist"
                                isActive={currentPage === 'masterlist'}
                                onClick={() => setPage('masterlist')}
                            />
                             <NavLink
                                icon={<UsersIcon className="w-6 h-6" />}
                                label="User Management"
                                isActive={currentPage === 'user-management'}
                                onClick={() => setPage('user-management')}
                            />
                        </div>
                    </div>
                )}
            </nav>
            <div className="mt-auto">
                 <NavLink
                    icon={<KeyIcon className="w-6 h-6" />}
                    label="Change Password"
                    isActive={currentPage === 'change-password'}
                    onClick={() => setPage('change-password')}
                />
            </div>
        </aside>
    );
};


const AppContent: React.FC = () => {
    const { currentUser } = useAppContext();
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedGradeSheetId, setSelectedGradeSheetId] = useState<string>('');

    if (!currentUser) {
        return <Login />;
    }
    
    const navigateToGradeSheet = (id: string) => {
        setSelectedGradeSheetId(id);
        setPage('grading-sheet');
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
            case 'grading-sheet':
                return <GradingSheet gradeSheetId={selectedGradeSheetId} setPage={setPage} />;
            case 'user-management':
                 return <UserManagement />;
            case 'masterlist':
                return <Masterlist />;
            case 'group-management':
                return <GroupManagement setPage={setPage} />;
            case 'change-password':
                return <ChangePassword />;
            default:
                return <Dashboard navigateToGradeSheet={navigateToGradeSheet} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="no-print">
                <Sidebar currentPage={page} setPage={setPage} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="no-print">
                    <Header />
                </div>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 printable-area">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;