import { Client, Account, Databases, ID, Query } from 'appwrite';

// Initialize the Appwrite Client
const client = new Client();

// Configure the client with your Appwrite project credentials.
// These are read from environment variables, which you should set up in your Netlify deployment environment.
const env = (import.meta as any)?.env;
const APPWRITE_ENDPOINT = env?.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
// Use a placeholder if the environment variable is not set. This prevents the console error
// and allows the Appwrite SDK to handle the connection error, which is more informative.
const APPWRITE_PROJECT_ID = env?.VITE_APPWRITE_PROJECT_ID || 'YOUR_APPWRITE_PROJECT_ID';

// Fallback check to guide the user if they're running locally without env vars.
if (APPWRITE_PROJECT_ID === 'YOUR_APPWRITE_PROJECT_ID') {
    console.warn(
        `Appwrite Project ID is not configured. The application will not be able to connect to the backend. ` +
        `Please ensure you have set up VITE_APPWRITE_PROJECT_ID in your environment.`
    );
}

client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Export Appwrite services for use in other parts of the application
export const account = new Account(client);
export const databases = new Databases(client);
export { ID, Query };

/*
 * ===================================================================
 *                    APPWRITE SETUP INSTRUCTIONS
 * ===================================================================
 * 
 * 1. DATABASE & COLLECTIONS:
 *    - In your Appwrite project, create a Database. Use the ID below or change it.
 *    - Create the following collections inside that database with the specified attributes.
 *
 * 2. PERMISSIONS:
 *    - Set collection-level permissions. A good starting point is giving "any" user with a "verified" status read/write access.
 *    - Refine permissions at the attribute or document level for more granular control (e.g., only admins can change user roles).
 * 
 * ===================================================================
*/

// --- DATABASE AND COLLECTION IDs ---
// You can change these, but make sure they match what you create in Appwrite.
export const DATABASE_ID = 'main';

/**
 * COLLECTION: users
 * Description: Stores user profile information, linked to an authenticated user.
 * Attributes:
 *   - userId (string, required): The ID of the authenticated user from Appwrite Auth.
 *   - name (string, required)
 *   - email (string, required)
 *   - role (string, required)
 */
export const USERS_COLLECTION_ID = 'users';


/**
 * COLLECTION: gradeSheets
 * Description: Stores all information for a group's grading sheet.
 * Attributes:
 *   - groupName (string, required)
 *   - proponents (string array, optional): Store as JSON string. Appwrite SDK handles serialization.
 *   - proposedTitles (string array, optional)
 *   - selectedTitle (string, optional)
 *   - program (string, optional)
 *   - date (string, optional)
 *   - venue (string, optional)
 *   - panel1Id (string, optional)
 *   - panel2Id (string, optional)
 *   - panel1Grades (string, optional): Store as JSON string.
 *   - panel2Grades (string, optional): Store as JSON string.
 *   - status (string, required)
 */
export const GRADESHEETS_COLLECTION_ID = 'gradeSheets';

/**
 * COLLECTION: venues
 * Description: Stores application-wide configuration like the list of venues.
 * You only need ONE document in this collection.
 * Attributes:
 *   - list (string array, required)
 */
export const VENUES_COLLECTION_ID = 'venues';
export const VENUES_DOCUMENT_ID = 'main_list'; // The ID of the single document holding the venue list.