import { Client, Account, Databases, ID, Query } from 'appwrite';

// Database and Collection IDs - MUST MATCH your Appwrite project setup
export const DATABASE_ID = 'cs0025-db';
export const PROFILES_COLLECTION_ID = 'profiles';
export const GRADESHEETS_COLLECTION_ID = 'gradeSheets';
export const VENUES_COLLECTION_ID = 'venues';

// The `Users` service has been removed from the Appwrite Web SDK for security reasons.
export const users = null; // For admin user management

export { ID, Query }; // Export ID and Query for convenience

// This function will be the single point of initialization.
// It will throw a clear error if configuration is missing, which will be caught by the App context.
export const initAppwrite = () => {
    const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
        throw new Error(
            'The VITE_APPWRITE_ENDPOINT and/or VITE_APPWRITE_PROJECT_ID environment variables are not set. Please go to your Netlify project settings, navigate to "Build & deploy" > "Environment", and ensure these variables are defined. They must start with the "VITE_" prefix. After setting them, you must trigger a new deploy by selecting "Clear cache and deploy site".'
        );
    }

    const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID);

    const account = new Account(client);
    const databases = new Databases(client);
    
    return { account, databases };
};
