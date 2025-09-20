import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Models } from 'appwrite';
import { User, UserRole, GradeSheet, GradeSheetStatus } from '../types';
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID, GRADESHEETS_COLLECTION_ID, VENUES_COLLECTION_ID, VENUES_DOCUMENT_ID, Query } from '../lib/appwrite';

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, '$id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<void>;
    addVenue: (venue: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllData = async () => {
        try {
            const [usersResponse, gradeSheetsResponse, venuesResponse] = await Promise.all([
                databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, GRADESHEETS_COLLECTION_ID, [Query.limit(100)]),
                databases.getDocument(DATABASE_ID, VENUES_COLLECTION_ID, VENUES_DOCUMENT_ID)
            ]);
            setUsers(usersResponse.documents as any as User[]);
            setGradeSheets(gradeSheetsResponse.documents as any as GradeSheet[]);
            setVenues(venuesResponse.list || []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Handle error, e.g., show a toast notification
        }
    };

    const init = async () => {
        setLoading(true);
        try {
            const loggedInUser = await account.get();
            const userProfile = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
                Query.equal('userId', loggedInUser.$id)
            ]);

            if (userProfile.documents.length > 0) {
                setCurrentUser(userProfile.documents[0] as any as User);
                await fetchAllData();
            } else {
                // Profile not found, force logout
                await logout();
            }
        } catch (error) {
            // Not logged in
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        init();
    }, []);

    const login = async (email: string, pass: string) => {
        await account.createEmailPasswordSession(email, pass);
        await init(); // Re-initialize app state after login
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } finally {
            setCurrentUser(null);
            setUsers([]);
            setGradeSheets([]);
        }
    };

    const findUserById = (id: string): User | undefined => users.find(u => u.$id === id);

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
    
    const updateGradeSheet = async (sheet: GradeSheet) => {
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const { $id, ...dataToUpdate } = updatedSheetWithStatus;
        await databases.updateDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, $id, dataToUpdate);
        setGradeSheets(prev => prev.map(s => s.$id === $id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, '$id' | 'status'>) => {
        const newSheetData = {
            ...sheetData,
            status: GradeSheetStatus.NOT_STARTED,
        };
        const response = await databases.createDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, 'unique()', newSheetData);
        setGradeSheets(prev => [...prev, response as any as GradeSheet]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        await databases.deleteDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, sheetId);
        setGradeSheets(prev => prev.filter(s => s.$id !== sheetId));
    };

    const changePassword = async (oldPass: string, newPass: string) => {
        await account.updatePassword(newPass, oldPass);
    };

    const addVenue = async (venue: string) => {
        if (venue && !venues.includes(venue)) {
            const updatedVenues = [...venues, venue];
            await databases.updateDocument(DATABASE_ID, VENUES_COLLECTION_ID, VENUES_DOCUMENT_ID, { list: updatedVenues });
            setVenues(updatedVenues);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        loading,
        login,
        logout,
        findUserById,
        getPanelSheets,
        updateGradeSheet,
        addGradeSheet,
        deleteGradeSheet,
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
