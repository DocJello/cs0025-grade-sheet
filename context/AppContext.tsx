import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, GradeSheet, GradeSheetStatus } from '../types';
import { account, databases } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { APPWRITE_DATABASE_ID, APPWRITE_USERS_COLLECTION_ID, APPWRITE_GRADESHEETS_COLLECTION_ID, APPWRITE_VENUES_COLLECTION_ID } from '../constants';

interface AppContextType {
    currentUser: User | null;
    users: User[];
    gradeSheets: GradeSheet[];
    venues: string[];
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => Promise<void>;
    findUserById: (id: string) => User | undefined;
    getPanelSheets: (panelId: string) => GradeSheet[];
    updateGradeSheet: (sheet: GradeSheet) => Promise<void>;
    addGradeSheet: (sheetData: Omit<GradeSheet, 'id' | 'status'>) => Promise<void>;
    deleteGradeSheet: (sheetId: string) => Promise<void>;
    addUser: (userData: Omit<User, 'id'> & {password: string}) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
    addVenue: (venue: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mapUserDocumentToUser = (doc: any): User => ({
    id: doc.$id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
});

const mapGradeSheetDocumentToGradeSheet = (doc: any): GradeSheet => ({
    id: doc.$id,
    groupName: doc.groupName,
    proponents: JSON.parse(doc.proponents),
    proposedTitles: doc.proposedTitles,
    selectedTitle: doc.selectedTitle,
    program: doc.program,
    date: doc.date,
    venue: doc.venue,
    panel1Id: doc.panel1Id,
    panel2Id: doc.panel2Id,
    panel1Grades: doc.panel1Grades ? JSON.parse(doc.panel1Grades) : undefined,
    panel2Grades: doc.panel2Grades ? JSON.parse(doc.panel2Grades) : undefined,
    status: doc.status,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [gradeSheets, setGradeSheets] = useState<GradeSheet[]>([]);
    const [venues, setVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [usersResponse, gradeSheetsResponse, venuesResponse] = await Promise.all([
                databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_USERS_COLLECTION_ID, [Query.limit(100)]),
                databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_GRADESHEETS_COLLECTION_ID, [Query.limit(100)]),
                databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_VENUES_COLLECTION_ID, [Query.limit(100)])
            ]);
            setUsers(usersResponse.documents.map(mapUserDocumentToUser));
            setGradeSheets(gradeSheetsResponse.documents.map(mapGradeSheetDocumentToGradeSheet));
            setVenues(venuesResponse.documents.map(doc => doc.name));
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    const loadSession = async () => {
        setIsLoading(true);
        try {
            const acc = await account.get();
            const userDoc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_USERS_COLLECTION_ID, acc.$id);
            setCurrentUser(mapUserDocumentToUser(userDoc));
            await fetchData();
        } catch (e) {
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        loadSession();
    }, []);

    const login = async (email: string, pass: string): Promise<boolean> => {
        try {
            await account.createEmailPasswordSession(email, pass);
            await loadSession();
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setCurrentUser(null);
            setUsers([]);
            setGradeSheets([]);
            setVenues([]);
        } catch (error) {
            console.error("Logout failed:", error);
        }
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
    
    const updateGradeSheet = async (sheet: GradeSheet) => {
        const updatedSheetWithStatus = { ...sheet, status: updateGradeSheetStatus(sheet) };
        const { id, ...dataToUpdate } = updatedSheetWithStatus;
        
        const payload = {
            ...dataToUpdate,
            proponents: JSON.stringify(dataToUpdate.proponents),
            panel1Grades: dataToUpdate.panel1Grades ? JSON.stringify(dataToUpdate.panel1Grades) : null,
            panel2Grades: dataToUpdate.panel2Grades ? JSON.stringify(dataToUpdate.panel2Grades) : null,
        };

        try {
            const updatedDoc = await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_GRADESHEETS_COLLECTION_ID, id, payload);
            setGradeSheets(prev => prev.map(s => s.id === id ? mapGradeSheetDocumentToGradeSheet(updatedDoc) : s));
        } catch (error) {
            console.error("Failed to update grade sheet:", error);
        }
    };

    const addGradeSheet = async (sheetData: Omit<GradeSheet, 'id' | 'status'>) => {
        const newSheet = {
            ...sheetData,
            status: GradeSheetStatus.NOT_STARTED,
        };
         const payload = {
            ...newSheet,
            proponents: JSON.stringify(newSheet.proponents),
        };
        try {
            const newDoc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_GRADESHEETS_COLLECTION_ID, ID.unique(), payload);
            setGradeSheets(prev => [...prev, mapGradeSheetDocumentToGradeSheet(newDoc)]);
        } catch (error) {
            console.error("Failed to add grade sheet:", error);
        }
    };
    
    const deleteGradeSheet = async (sheetId: string) => {
         try {
            await databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_GRADESHEETS_COLLECTION_ID, sheetId);
            setGradeSheets(prev => prev.filter(s => s.id !== sheetId));
        } catch (error) {
            console.error("Failed to delete grade sheet:", error);
        }
    };

    const addUser = async (userData: Omit<User, 'id'> & {password: string}) => {
       try {
            // Note: In a real app, this should be a server-side function for security.
            const newAuthUser = await account.create(ID.unique(), userData.email, userData.password, userData.name);
            const userProfileData = {
                name: userData.name,
                email: userData.email,
                role: userData.role,
            };
            const newDoc = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_USERS_COLLECTION_ID, newAuthUser.$id, userProfileData);
            setUsers(prev => [...prev, mapUserDocumentToUser({ ...newDoc, $id: newAuthUser.$id })]);
        } catch (error) {
            console.error("Failed to add user:", error);
            throw error; // Re-throw to be caught in the component
        }
    };

    const updateUser = async (user: User) => {
        try {
             const { id, ...profileData } = user;
             const updatedDoc = await databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_USERS_COLLECTION_ID, id, profileData);
             setUsers(prev => prev.map(u => u.id === id ? mapUserDocumentToUser(updatedDoc) : u));
             if (currentUser?.id === user.id) {
                setCurrentUser(mapUserDocumentToUser(updatedDoc));
             }
        } catch (error) {
             console.error("Failed to update user:", error);
        }
    };
    
    // NOTE: Deleting users from the client-side is a protected action in Appwrite for security.
    // This function is now a placeholder and will not delete users.
    const deleteUser = async (userId: string) => {
        console.warn("User deletion from client-side is disabled for security reasons.");
        // In a real application, you would trigger a server-side Appwrite Function here.
    };

    const changePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
        try {
            await account.updatePassword(newPass, oldPass);
            return true;
        } catch (error) {
            console.error("Failed to change password:", error);
            return false;
        }
    };

    const addVenue = async (venue: string) => {
        if (venue && !venues.includes(venue)) {
            try {
                await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_VENUES_COLLECTION_ID, ID.unique(), { name: venue });
                setVenues(prev => [...prev, venue]);
            } catch (error) {
                console.error("Failed to add venue:", error);
            }
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
