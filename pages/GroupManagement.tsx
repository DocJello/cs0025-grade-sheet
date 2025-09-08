// FIX: Full content for pages/GroupManagement.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { GradeSheet, Page, Student } from '../types';
import { EditIcon, TrashIcon, InfoIcon } from '../components/Icons';

declare const XLSX: any; // From SheetJS CDN

interface GroupModalProps {
    sheet: Omit<GradeSheet, 'id' | 'status'> | GradeSheet | null;
    onClose: () => void;
    onSave: (data: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ sheet, onClose, onSave }) => {
    const [groupName, setGroupName] = useState(sheet?.groupName || '');
    const [proponents, setProponents] = useState(sheet?.proponents.map(p => p.name).join(', ') || '');
    const [selectedTitle, setSelectedTitle] = useState(sheet?.selectedTitle || '');
    const [program, setProgram] = useState(sheet?.program || '');
    const [date, setDate] = useState(sheet?.date || '');
    const [venue, setVenue] = useState(sheet?.venue || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const proponentList: Student[] = proponents
            .split(',')
            .map(name => name.trim())
            .filter(name => name)
            .map((name, index) => ({ id: sheet?.proponents[index]?.id || `s_new_${index}_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name }));
            
        const baseData = {
            groupName,
            proponents: proponentList,
            proposedTitles: sheet?.proposedTitles || [], // Keep existing or default
            selectedTitle,
            program: program as GradeSheet['program'],
            date,
            venue,
            panel1Id: sheet?.panel1Id || '',
            panel2Id: sheet?.panel2Id || '',
        };

        if (sheet && 'id' in sheet) {
            onSave({ ...sheet, ...baseData });
        } else {
            onSave(baseData);
        }
        
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">{sheet ? 'Edit Group Details' : 'Add Group Manually'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Group Name</label>
                        <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Program</label>
                        <select value={program} onChange={e => setProgram(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                            <option value="" disabled>Select a program</option>
                            <option value="BSCS-AI">BSCS-AI</option>
                            <option value="BSCS-DS">BSCS-DS</option>
                            <option value="BSCS-SE">BSCS-SE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Proponents (comma-separated, 3-4 members)</label>
                        <input type="text" value={proponents} onChange={e => setProponents(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Project Title</label>
                        <input type="text" value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                             <label className="block text-sm font-medium text-gray-700">Date / Time</label>
                            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">Venue</label>
                            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Save Group</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface GroupManagementProps {
    setPage: (page: Page) => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ setPage }) => {
    const { gradeSheets, addGradeSheet, updateGradeSheet, deleteGradeSheet } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSheet, setEditingSheet] = useState<GradeSheet | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (json.length < 2) {
                alert("Spreadsheet is empty or has no data rows.");
                return;
            }
            
            const headers: string[] = json[0] as string[];
            const groupNameIndex = headers.findIndex(h => h.toLowerCase().replace(/\s/g, '') === 'groupname');

            if (groupNameIndex === -1) {
                alert("Could not find 'Group Name' or 'GroupName' column header.");
                return;
            }

            const programIndex = headers.findIndex(h => h.toLowerCase() === 'program');

            let addedCount = 0;
            const errors: string[] = [];

            for (let i = 1; i < json.length; i++) {
                const row: any[] = json[i] as any[];
                if (!row.some(cell => cell)) continue; // Skip empty rows

                const groupName = row[groupNameIndex];
                if (!groupName) {
                    errors.push(`Row ${i + 1}: Skipped because Group Name is empty.`);
                    continue;
                }
                
                if (gradeSheets.some(gs => gs.groupName.toLowerCase() === groupName.toLowerCase())) {
                     errors.push(`Row ${i + 1}: Skipped because group "${groupName}" already exists.`);
                    continue;
                }

                const proponents = row.slice(groupNameIndex + 1, groupNameIndex + 5)
                                      .map(name => typeof name === 'string' ? name.trim() : String(name).trim())
                                      .filter(name => name);

                if (proponents.length < 3 || proponents.length > 4) {
                    errors.push(`Row ${i + 1}: Skipped because group "${groupName}" has ${proponents.length} proponents (must be 3 or 4).`);
                    continue;
                }

                const newSheet: Omit<GradeSheet, 'id' | 'status'> = {
                    groupName,
                    proponents: proponents.map((name, index) => ({ id: `s_upload_${i}_${index}_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name })),
                    program: (row[programIndex] || '') as GradeSheet['program'],
                    selectedTitle: 'Untitled Project',
                    proposedTitles: [],
                    date: 'Not Set',
                    venue: 'Not Set',
                    panel1Id: '',
                    panel2Id: '',
                };
                addGradeSheet(newSheet);
                addedCount++;
            }
            
            let alertMessage = `${addedCount} group(s) added successfully.`;
            if (errors.length > 0) {
                alertMessage += `\n\nErrors during import:\n${errors.join('\n')}`;
            }
            alert(alertMessage);
            event.target.value = ''; // Reset file input
            setPage('masterlist');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleAdd = () => {
        setEditingSheet(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sheet: GradeSheet) => {
        setEditingSheet(sheet);
        setIsModalOpen(true);
    };

    const handleDelete = (sheetId: string) => {
        if (window.confirm('Are you sure you want to delete this group? All associated data will be lost.')) {
            deleteGradeSheet(sheetId);
        }
    };
    
    const handleSave = (data: Omit<GradeSheet, 'id' | 'status'> | GradeSheet) => {
        if ('id' in data) {
            updateGradeSheet(data);
        } else {
            addGradeSheet(data);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <h2 className="text-3xl font-bold text-gray-800 mb-6">Group Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Manual Entry Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-gray-800 mb-2">Manage Groups</h3>
                    <p className="text-base text-gray-800 mb-4">Add, edit, or delete groups manually using the table below.</p>
                     <button onClick={handleAdd} className="w-full mb-4 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">
                        Add New Group Manually
                    </button>
                    <div className="overflow-y-auto max-h-96">
                        {gradeSheets.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {gradeSheets.map(sheet => (
                                    <li key={sheet.id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-base font-medium text-black">{sheet.groupName}</p>
                                            <p className="text-sm text-gray-800">{sheet.proponents.length} members</p>
                                        </div>
                                        <div className="space-x-2">
                                            <button onClick={() => handleEdit(sheet)} className="text-green-700 hover:text-green-900 p-1"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDelete(sheet.id)} className="text-red-600 hover:text-red-900 p-1"><TrashIcon className="w-5 h-s"/></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-700 py-4 text-base">No groups created yet.</p>
                        )}
                    </div>
                </div>

                {/* File Upload Section */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Spreadsheet</h3>
                    <p className="text-base text-gray-800 mb-4">Create groups in bulk by uploading an XLSX or CSV file.</p>
                     <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".xlsx, .csv"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="w-full cursor-pointer flex justify-center px-6 py-10 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500">
                        <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <p className="mt-1 text-sm text-gray-600">
                                <span className="font-medium text-green-700">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">XLSX, CSV up to 10MB</p>
                        </div>
                    </label>
                    <div className="mt-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                        <p className="font-bold mb-1">Spreadsheet Requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Must have a header row.</li>
                            <li>A column named <span className="font-mono bg-gray-200 px-1 rounded">GroupName</span> or <span className="font-mono bg-gray-200 px-1 rounded">Group Name</span> is required.</li>
                            <li>The 3-4 columns immediately following the group name will be treated as proponents.</li>
                            <li>An optional <span className="font-mono bg-gray-200 px-1 rounded">Program</span> column is supported.</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {isModalOpen && <GroupModal sheet={editingSheet} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default GroupManagement;