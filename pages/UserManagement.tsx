import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { USER_ROLES } from '../constants';
import { EditIcon, TrashIcon } from '../components/Icons';

declare const XLSX: any; // From SheetJS CDN

interface UserModalProps {
    user: Omit<User, 'id'> | User | null;
    onClose: () => void;
    onSave: (user: Omit<User, 'id'> | User) => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
    const { currentUser } = useAppContext();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || UserRole.PANEL);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const isEditing = user && 'id' in user;
    const canChangeRole = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.COURSE_ADVISER;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!isEditing && password.length < 1) {
             setError('Password is required for new users.');
             return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const baseData = { name, email, role };
        let finalData: Omit<User, 'id'> | User;

        if (isEditing) {
            const passwordHash = password ? password : user.passwordHash;
            finalData = { ...user, ...baseData, passwordHash };
        } else {
            finalData = { ...baseData, passwordHash: password };
        }
        
        onSave(finalData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} disabled={!canChangeRole} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100">
                            {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" placeholder={isEditing ? "Leave blank to keep current" : "Enter password"} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required={!isEditing} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!isEditing && !!password} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const UserManagement: React.FC = () => {
    const { currentUser, users, addUser, updateUser, deleteUser } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert("Spreadsheet is empty.");
                    return;
                }

                let addedCount = 0;
                const errors: string[] = [];
                const firstRow: any = json[0];
                const nameKey = Object.keys(firstRow).find(k => k.toLowerCase().trim() === 'name');
                const emailKey = Object.keys(firstRow).find(k => k.toLowerCase().trim() === 'email');
                const roleKey = Object.keys(firstRow).find(k => k.toLowerCase().trim() === 'role');

                if (!nameKey || !emailKey || !roleKey) {
                    alert("Spreadsheet must contain 'Name', 'Email', and 'Role' headers.");
                    return;
                }

                json.forEach((row: any, index: number) => {
                    const name = row[nameKey];
                    const email = row[emailKey];
                    const roleStr = row[roleKey];

                    if (!name || !email) {
                        errors.push(`Row ${index + 2}: Skipped because Name or Email is empty.`);
                        return;
                    }

                    if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
                        errors.push(`Row ${index + 2}: Skipped because email "${email}" already exists.`);
                        return;
                    }
                    
                    let role: UserRole = UserRole.PANEL; // Default role
                    if (roleStr && Object.values(UserRole).includes(roleStr as UserRole)) {
                        role = roleStr as UserRole;
                    } else if (roleStr) {
                        errors.push(`Row ${index + 2}: Invalid role "${roleStr}" for user "${name}". Defaulted to 'Panel'.`);
                    }

                    const newUser: Omit<User, 'id'> = {
                        name: String(name),
                        email: String(email),
                        role: role,
                        passwordHash: '123'
                    };
                    addUser(newUser);
                    addedCount++;
                });

                let alertMessage = `${addedCount} user(s) added successfully.`;
                if (errors.length > 0) {
                    alertMessage += `\n\nNotes/Errors during import:\n${errors.join('\n')}`;
                }
                alert(alertMessage);
            } catch (error) {
                alert("Failed to process the file. Please ensure it's a valid .xlsx or .csv file.");
                console.error(error);
            } finally {
                 event.target.value = ''; // Reset file input
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const handleAdd = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = (userId: string) => {
        if (userId === currentUser?.id) {
            alert("You cannot delete your own account.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this user?')) {
            deleteUser(userId);
        }
    };
    
    const handleSave = (data: Omit<User, 'id'> | User) => {
        if ('id' in data) {
            updateUser(data);
        } else {
            addUser(data);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-gray-800">User Management</h2>
                 <button onClick={handleAdd} className="px-4 py-2 bg-green-700 text-white font-medium rounded-md hover:bg-green-800">
                    Add New User
                </button>
            </div>

            <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-black mb-2">Bulk Add Users</h3>
                <p className="text-base text-black mb-4">Add multiple users by uploading an XLSX or CSV file.</p>
                <input
                    type="file"
                    id="user-file-upload"
                    className="hidden"
                    accept=".xlsx, .csv"
                    onChange={handleFileChange}
                />
                <label htmlFor="user-file-upload" className="w-full cursor-pointer flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                        <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium text-green-700">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">XLSX, CSV up to 10MB</p>
                    </div>
                </label>
                <div className="mt-4 text-sm text-gray-800 bg-gray-50 p-3 rounded-md">
                    <p className="font-bold text-black mb-1">Spreadsheet Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Must have a header row with columns named <span className="font-mono bg-gray-200 px-1 rounded">Name</span>, <span className="font-mono bg-gray-200 px-1 rounded">Email</span>, and <span className="font-mono bg-gray-200 px-1 rounded">Role</span>.</li>
                        <li>New users will be assigned a password of '123'.</li>
                        <li>Valid roles are: 'Admin', 'Course Adviser', 'Panel'. Invalid roles will default to 'Panel'.</li>
                    </ul>
                </div>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-right text-sm font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-black">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-base text-black">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-base text-black">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => handleEdit(user)} className="text-green-700 hover:text-green-900 p-1" aria-label={`Edit ${user.name}`}><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 p-1 disabled:opacity-50" disabled={user.id === currentUser?.id} aria-label={`Delete ${user.name}`}><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <UserModal user={editingUser} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default UserManagement;