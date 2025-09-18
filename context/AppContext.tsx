import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus } from '../types';

// Dummy data
const initialUsers: User[] = [
    { id: 'u1', name: 'Dr. Admin', email: 'admin@example.com', role: UserRole.ADMIN, passwordHash: '123' },
    { id: 'u2', name: 'Dr. Angelo C. Arguson', email: 'acarguson@feutech.edu.ph', role: UserRole.COURSE_ADVISER, passwordHash: '123' },
    { id: 'u3', name: 'Prof. Elisa V. Malasaga', email: 'evmalasaga@feutech.edu.ph', role: UserRole.COURSE_ADVISER, passwordHash: '123' },
    { id: 'u4', name: 'Dr. Beau Gray M. Habal', email: 'bmhabal@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
    { id: 'u5', name: 'Mr. Jeneffer A. Sabonsolin', email: 'jasabonsolin@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
    { id: 'u6', name: 'Dr. Shaneth C. Ambat', email: 'scambat@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
];

const initialGradeSheets: GradeSheet[] = [];

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    login: (email: string, pass: string) => boolean;
    logout: () => void;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => void;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => void;
    deleteGradeSheet: (sheetId: string) => void;
    addUser: (userData: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    deleteUser: (userId: string) => void;
    changePassword: (oldPass: string, newPass: string) => boolean;
    addVenue: (venue: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [users, setUsers] = useState<User[]>(() => {
        const storedUsers = localStorage.getItem('users');
        return storedUsers ? JSON.parse(storedUsers) : initialUsers;
    });
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>(() => {
        const storedSheets = localStorage.getItem('gradeSheets');
        return storedSheets ? JSON.parse(storedSheets) : initialGradeSheets;
    });
    const [venues, setVenues] = useState<string[]>(['Room 404', 'Room 405', 'Auditorium']);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        localStorage.setItem('gradeSheets', JSON.stringify(gradeSheets));
    }, [gradeSheets]);

    const login = (email: string, pass: string): boolean => {
        const user = users.find(u => u.email === email && u.passwordHash === pass);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const findUserById = (id: string): User | undefined => users.find(u => u.id === id);

    const getPanelSheets = (panelId: string): GradeSheet[] =>
        gradeSheets.filter(sheet => sheet.panel1Id === panelId || sheet.panel2Id === panelId);
    
    const updateGradeSheetStatus = (sheet: GradeSheet): GradeSheetStatus => {
        const p1Done = sheet.panel1Grades?.submitted;
        const p2Done = sheet.panel2Grades?.submitted;
        if (p1Done && p2Done) return GradeSheetStatus.COMPLETED;
        if (p1Done) return GradeSheetStatus.PANEL_1_SUBMITTED;
        if (p2Done) return GradeSheetStatus.PANEL_2_SUBMITTED;
        
        const p1Started = sheet.panel1Grades && (Object.keys(sheet.panel1Grades.titleDefenseScores).length > 0 || sheet.panel1Grades.comments);
        const p2Started = sheet.panel2Grades && (Object.keys(sheet.panel2Grades.titleDefenseScores).length > 0 || sheet.panel2Grades.comments);
        if(p1Started || p2Started) return GradeSheetStatus.IN_PROGRESS;

        return GradeSheetStatus.NOT_STARTED;
    };
    
    const updateGradeSheet = (sheet: GradeSheet) => {
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        setGradeSheets(prev => prev.map(s => s.id === sheet.id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const newSheet: GradeSheet = {
            ...sheetData,
            id: `gs_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: GradeSheetStatus.NOT_STARTED,
        };
        setGradeSheets(prev => [...prev, newSheet]);
    };
    
    const deleteGradeSheet = (sheetId: string) => {
        setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
    };

    const addUser = (userData: Omit<User, 'id'>) => {
        const newUser: User = {
            ...userData,
            id: `u_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        setUsers(prev => [...prev, newUser]);
    };

    const updateUser = (user: User) => {
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
        if (currentUser?.id === user.id) {
            setCurrentUser(user);
        }
    };
    
    const deleteUser = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
    };

    const changePassword = (oldPass: string, newPass: string): boolean => {
        if (currentUser && currentUser.passwordHash === oldPass) {
            const updatedUser = { ...currentUser, passwordHash: newPass };
            updateUser(updatedUser);
            return true;
        }
        return false;
    };

    const addVenue = (venue: string) => {
        if (venue && !venues.includes(venue)) {
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        login,
        logout,
        findUserById,
        getPanelSheets,
        updateGradeSheet,
        addGradeSheet,
        deleteGradeSheet,
        addUser,
        updateUser,
        deleteUser,
        changePassword,
        addVenue,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};