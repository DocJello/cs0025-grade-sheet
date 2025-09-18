import { Client, Account, Databases, ID, Query } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

// This check is crucial for debugging. If the environment variables aren't set,
// it's better to fail early with a clear error message.
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
    throw new Error(
        'Appwrite configuration error: The VITE_APPWRITE_ENDPOINT and/or VITE_APPWRITE_PROJECT_ID environment variables are not set. Please ensure they are correctly configured with the "VITE_" prefix in your hosting environment (e.g., Netlify).'
    );
}


// Database and Collection IDs - MUST MATCH your Appwrite project setup
export const DATABASE_ID = 'cs0025-db';
export const PROFILES_COLLECTION_ID = 'profiles';
export const GRADESHEETS_COLLECTION_ID = 'gradeSheets';
export const VENUES_COLLECTION_ID = 'venues';


const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
// The `Users` service has been removed from the Appwrite Web SDK for security reasons. 
// User management operations should be performed from a secure backend environment 
// (e.g., in Appwrite Functions).
export const users = null; // For admin user management
export { ID, Query }; // Export ID and Query for conveniencenothing happens in redeploy.