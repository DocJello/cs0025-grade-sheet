import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus, PanelGrades } from '../types';
import { initAppwrite, DATABASE_ID, PROFILES_COLLECTION_ID, GRADESHEETS_COLLECTION_ID, VENUES_COLLECTION_ID, ID, Query } from '../lib/appwrite';
import { Models, Account, Databases } from 'appwrite';

interface AppwriteClients {
    account: Account;
    databases: Databases;
}

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    globalError: string | null;
    setGlobalError: (message: string | null) => void;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, '$id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    addUser: (userData: Omit<User, '$id' | 'userId'> & { password: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const parseGradeSheetDoc = (doc: Models.Document): GradeSheet => ({
    ...doc,
    $id: doc.$id,
    proponents: JSON.parse((doc as any).proponents || '[]'),
    panel1Grades: (doc as any).panel1Grades ? JSON.parse((doc as any).panel1Grades) : undefined,
    panel2Grades: (doc as any).panel2Grades ? JSON.parse((doc as any).panel2Grades) : undefined,
} as unknown as GradeSheet);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [appwriteClients, setAppwriteClients] = useState<AppwriteClients | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [globalError, setGlobalError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const clients = initAppwrite();
            setAppwriteClients(clients);
        } catch (error: any) {
            setGlobalError(error.message);
            setIsLoading(false);
        }
    }, []);

    const fetchAllData = async (authUserId: string) => {
        if (!appwriteClients) return;
        try {
            const [profileResponse, usersResponse, sheetsResponse, venuesResponse] = await Promise.all([
                appwriteClients.databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.equal('userId', authUserId)]),
                appwriteClients.databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.limit(100)]),
                appwriteClients.databases.listDocuments(DATABASE_ID, GRADESHEETS_COLLECTION_ID, [Query.limit(100)]),
                appwriteClients.databases.listDocuments(DATABASE_ID, VENUES_COLLECTION_ID, [Query.limit(100)])
            ]);
            
            if (profileResponse.documents.length === 0) {
                 throw new Error("Login successful, but your user profile was not found. Please contact an admin to ensure your account is correctly linked in the 'profiles' database table using the correct User ID.");
            }
            
            setCurrentUser(profileResponse.documents[0] as unknown as User);
            setUsers(usersResponse.documents as unknown as User[]);
            setGradeSheets(sheetsResponse.documents.map(parseGradeSheetDoc));
            setVenues(venuesResponse.documents.map(v => v.name));

        } catch (error: any) {
            console.error("Failed to fetch data:", error);
            if (error.message.includes("user profile was not found")) {
                throw error; 
            }
            throw new Error(
                "Could not load application data after login. This is likely a permission issue. Please ask your administrator to verify that the 'All users' role has 'Read' access on the 'profiles', 'gradeSheets', and 'venues' database collections."
            );
        }
    };
    
    useEffect(() => {
        if (!appwriteClients) {
            if (!globalError) setIsLoading(false); // If no clients and no error, stop loading
            return;
        }

        const checkSession = async () => {
            try {
                const session = await appwriteClients.account.get();
                await fetchAllData(session.$id);
            } catch (error) {
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, [appwriteClients, globalError]);

    const login = async (email: string, pass: string) => {
        if (!appwriteClients) throw new Error("Appwrite is not configured.");
        try {
            const session = await appwriteClients.account.createEmailPasswordSession(email, pass);
            setIsLoading(true);
            await fetchAllData(session.userId);
        } catch (error: any) {
            setIsLoading(false);
            console.error("Login failed:", error);
            let errorMessage = error.message || 'An unexpected error occurred.';
            if (error.code === 401) {
                errorMessage = "Invalid email or password.";
            }
            setGlobalError(errorMessage);
            throw error;
        }
    };

    const logout = async () => {
        if (!appwriteClients) return;
        try {
            await appwriteClients.account.deleteSession('current');
        } catch (error) {
            console.error("Logout failed:", error);
        }
        setCurrentUser(null);
        setUsers([]);
        setGradeSheets([]);
        setVenues([]);
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
        if (!appwriteClients) return;
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const { $id, ...dataToUpdate } = updatedSheetWithStatus;
        const payload = {
            ...dataToUpdate,
            proponents: JSON.stringify(dataToUpdate.proponents),
            panel1Grades: dataToUpdate.panel1Grades ? JSON.stringify(dataToUpdate.panel1Grades) : null,
            panel2Grades: dataToUpdate.panel2Grades ? JSON.stringify(dataToUpdate.panel2Grades) : null,
        };
        await appwriteClients.databases.updateDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, $id, payload);
        setGradeSheets(prev => prev.map(s => s.$id === $id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, '$id' | 'status'>) => {
        if (!appwriteClients) return;
        const newSheet: GradeSheet = { ...sheetData, $id: '', status: GradeSheetStatus.NOT_STARTED };
        const payload = { ...newSheet, proponents: JSON.stringify(newSheet.proponents) };
        delete (payload as any).$id;
        const newDoc = await appwriteClients.databases.createDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, ID.unique(), payload);
        setGradeSheets(prev => [...prev, parseGradeSheetDoc(newDoc)]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        if (!appwriteClients) return;
        await appwriteClients.databases.deleteDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, sheetId);
        setGradeSheets(prev => prev.filter(s => s.$id !== sheetId));
    };

    const addUser = async (userData: Omit<User, '$id' | 'userId'> & { password: string }) => {
        throw new Error("Admin user creation is not supported on the client-side. This requires a backend implementation like Appwrite Functions for security reasons.");
    };

    const updateUser = async (user: User) => {
        if (!appwriteClients) return;
        const { $id, userId, ...profileData } = user;
        await appwriteClients.databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, $id, profileData);
        setUsers(prev => prev.map(u => u.$id === $id ? user : u));
        if (currentUser?.$id === $id) setCurrentUser(user);
    };
    
    const deleteUser = async (userId: string) => {
        throw new Error("Admin user deletion is not supported on the client-side. This requires a backend implementation like Appwrite Functions for security reasons.");
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
        if (!appwriteClients) return false;
        try {
            await appwriteClients.account.updatePassword(newPass, oldPass);
            return true;
        } catch (error) {
            console.error("Failed to change password", error);
            return false;
        }
    };

    const addVenue = async (venue: string) => {
        if (!appwriteClients) return;
        if (venue && !venues.includes(venue)) {
            await appwriteClients.databases.createDocument(DATABASE_ID, VENUES_COLLECTION_ID, ID.unique(), { name: venue });
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        isLoading,
        globalError,
        setGlobalError,
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
