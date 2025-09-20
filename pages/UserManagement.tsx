import React from 'react';
import { useAppContext } from '../context/AppContext';

const UserManagement: React.FC = () => {
    const { users } = useAppContext();

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold text-gray-800">User Management</h2>
            </div>

            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-8 rounded-md" role="alert">
                <p className="font-bold">Administrator Notice</p>
                <p>To maintain application security, user creation, password resets, and account deletion are managed by administrators directly in the Appwrite Console.</p>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-800 uppercase tracking-wider">Role</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.$id}>
                                <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-black">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-base text-black">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-base text-black">{user.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;