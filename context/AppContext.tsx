
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus, PanelGrades } from '../types';
// FIX: The `users` service is no longer available on the client. It is imported as `null` from `lib/appwrite`.
import { account, databases, users as appwriteUsers, DATABASE_ID, PROFILES_COLLECTION_ID, GRADESHEETS_COLLECTION_ID, VENUES_COLLECTION_ID, ID, Query } from '../lib/appwrite';
import { Models } from 'appwrite';

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, '$id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    // FIX: Changed passwordHash to password to match client SDK expectations.
    addUser: (userData: Omit<User, '$id' | 'userId'> & { password: string }) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to parse grade sheet documents from Appwrite
// FIX: Cast `doc` to `any` to access custom collection attributes.
const parseGradeSheetDoc = (doc: Models.Document): GradeSheet => ({
    ...doc,
    $id: doc.$id,
    proponents: JSON.parse((doc as any).proponents || '[]'),
    panel1Grades: (doc as any).panel1Grades ? JSON.parse((doc as any).panel1Grades) : undefined,
    panel2Grades: (doc as any).panel2Grades ? JSON.parse((doc as any).panel2Grades) : undefined,
} as unknown as GradeSheet);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = async (authUserId: string) => {
        try {
            const [profileResponse, usersResponse, sheetsResponse, venuesResponse] = await Promise.all([
                databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.equal('userId', authUserId)]),
                databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, GRADESHEETS_COLLECTION_ID, [Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, VENUES_COLLECTION_ID, [Query.limit(100)])
            ]);
            
            if (profileResponse.documents.length > 0) {
                 setCurrentUser(profileResponse.documents[0] as unknown as User);
            } else {
                 throw new Error("User profile not found.");
            }
            
            setUsers(usersResponse.documents as unknown as User[]);
            setGradeSheets(sheetsResponse.documents.map(parseGradeSheetDoc));
            setVenues(venuesResponse.documents.map(v => v.name));

        } catch (error) {
            console.error("Failed to fetch data:", error);
            // If fetching fails, logout to ensure a clean state
            await logout();
        }
    };
    
    useEffect(() => {
        const checkSession = async () => {
            try {
                const session = await account.get();
                await fetchAllData(session.$id);
            } catch (error) {
                // Not logged in
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    const login = async (email: string, pass: string) => {
        setIsLoading(true);
        try {
            const session = await account.createEmailPasswordSession(email, pass);
            await fetchAllData(session.userId);
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Rethrow to be caught by the login page
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
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
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const { $id, ...dataToUpdate } = updatedSheetWithStatus;

        // Prepare data for Appwrite by stringifying complex objects
        const payload = {
            ...dataToUpdate,
            proponents: JSON.stringify(dataToUpdate.proponents),
            panel1Grades: dataToUpdate.panel1Grades ? JSON.stringify(dataToUpdate.panel1Grades) : null,
            panel2Grades: dataToUpdate.panel2Grades ? JSON.stringify(dataToUpdate.panel2Grades) : null,
        };

        await databases.updateDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, $id, payload);
        setGradeSheets(prev => prev.map(s => s.$id === $id ? updatedSheetWithStatus : s));
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, '$id' | 'status'>) => {
        const newSheet: GradeSheet = {
            ...sheetData,
            $id: '', // will be replaced by appwrite response
            status: GradeSheetStatus.NOT_STARTED,
        };

        const payload = {
            ...newSheet,
            proponents: JSON.stringify(newSheet.proponents),
        };
        delete (payload as any).$id; // Remove placeholder id

        const newDoc = await databases.createDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, ID.unique(), payload);
        setGradeSheets(prev => [...prev, parseGradeSheetDoc(newDoc)]);
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
        await databases.deleteDocument(DATABASE_ID, GRADESHEETS_COLLECTION_ID, sheetId);
        setGradeSheets(prev => prev.filter(s => s.$id !== sheetId));
    };

    // FIX: Changed passwordHash to password to match client SDK expectations.
    const addUser = async (userData: Omit<User, '$id' | 'userId'> & { password: string }) => {
        // FIX: The `Users` service is not available in the client SDK. This functionality requires a backend implementation (e.g., Appwrite Functions).
        if (!appwriteUsers) {
            throw new Error("Admin user creation is not supported on the client-side. This requires a backend implementation.");
        }
        // This is an admin action and requires appropriate permissions in Appwrite
        // FIX: Use `appwriteUsers` instead of `users` to call the Appwrite service.
        // FIX: Pass undefined for optional phone param and use plaintext password.
        const authUser = await appwriteUsers.create(ID.unique(), userData.email, undefined, userData.password, userData.name);
        
        const profileData = {
            userId: authUser.$id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
        };
        
        const newProfileDoc = await databases.createDocument(DATABASE_ID, PROFILES_COLLECTION_ID, ID.unique(), profileData);
        setUsers(prev => [...prev, newProfileDoc as unknown as User]);
    };

    const updateUser = async (user: User) => {
        // FIX: The `Users` service is not available in the client SDK. This functionality requires a backend implementation (e.g., Appwrite Functions).
        if (!appwriteUsers) {
            throw new Error("Admin user updates are not supported on the client-side. This requires a backend implementation.");
        }
        const { $id, userId, ...profileData } = user;
        // userId should not be updated.
        await databases.updateDocument(DATABASE_ID, PROFILES_COLLECTION_ID, $id, profileData);
        
        // Also update name in Auth if it changed
        // FIX: Use `appwriteUsers` instead of `users` to call the Appwrite service.
        const currentAuthUser = await appwriteUsers.get(userId);
        if (currentAuthUser.name !== user.name) {
            // FIX: Use `appwriteUsers` instead of `users` to call the Appwrite service.
            await appwriteUsers.updateName(userId, user.name);
        }

        setUsers(prev => prev.map(u => u.$id === $id ? user : u));
        if (currentUser?.$id === $id) {
            setCurrentUser(user);
        }
    };
    
    const deleteUser = async (userId: string) => {
        // FIX: The `Users` service is not available in the client SDK. This functionality requires a backend implementation (e.g., Appwrite Functions).
        if (!appwriteUsers) {
            throw new Error("Admin user deletion is not supported on the client-side. This requires a backend implementation.");
        }
        const userToDelete = users.find(u => u.$id === userId);
        if (!userToDelete) return;

        // Delete profile document first, then auth user
        await databases.deleteDocument(DATABASE_ID, PROFILES_COLLECTION_ID, userId);
        // FIX: Use `appwriteUsers` instead of `users` to call the Appwrite service.
        await appwriteUsers.delete(userToDelete.userId);
        setUsers(prev => prev.filter(u => u.$id !== userId));
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
        try {
            await account.updatePassword(newPass, oldPass);
            return true;
        } catch (error) {
            console.error("Failed to change password", error);
            return false;
        }
    };

    const addVenue = async (venue: string) => {
        if (venue && !venues.includes(venue)) {
            await databases.createDocument(DATABASE_ID, VENUES_COLLECTION_ID, ID.unique(), { name: venue });
            setVenues(prev => [...prev, venue]);
        }
    };
    
    const value = {
        currentUser,
        users,
        gradeSheets,
        venues,
        isLoading,
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
