import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Page, GradeSheet, PanelGrades, RubricItem, Student } from '../types';
import { TITLE_DEFENSE_RUBRIC, INDIVIDUAL_GRADE_RUBRIC } from '../constants';
import { InfoIcon } from '../components/Icons';

interface GradingSheetProps {
    gradeSheetId: string;
    setPage: (page: Page) => void;
}

interface RubricModalState {
    show: boolean;
    item: RubricItem | null;
    studentId?: string;
}

// Helper component to avoid React Hook errors
const InfoIconWrapper: React.FC<{ item: RubricItem; studentId?: string; onClick: (item: RubricItem, studentId?: string) => void }> = ({ item, studentId, onClick }) => {
    return <InfoIcon className="w-5 h-5 text-gray-400 cursor-pointer hover:text-green-600" onClick={() => onClick(item, studentId)} />;
};

const SuccessModal: React.FC = () => {
    const [progressWidth, setProgressWidth] = useState('0%');

    useEffect(() => {
        const timer = setTimeout(() => setProgressWidth('100%'), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Congratulations!</h3>
                <p className="text-gray-600 mt-2 mb-6">Your grades have been submitted successfully.</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-[3000ms] ease-linear"
                        style={{ width: progressWidth }}
                    ></div>
                </div>
            </div>
        </div>
    );
};


const GradingSheet: React.FC<GradingSheetProps> = ({ gradeSheetId, setPage }) => {
    const { gradeSheets, updateGradeSheet, currentUser, venues, addVenue } = useAppContext();
    
    const sheet = useMemo(() => gradeSheets.find(s => s.id === gradeSheetId), [gradeSheetId, gradeSheets]);
    
    const { panelKey, isPanel1, isPanelist } = useMemo(() => {
        if (!currentUser || !sheet) return { panelKey: null, isPanel1: false, isPanelist: false };
        let key: 'panel1Grades' | 'panel2Grades' | null = null;
        let p1 = false;
        if (sheet.panel1Id === currentUser.id) {
            key = 'panel1Grades';
            p1 = true;
        } else if (sheet.panel2Id === currentUser.id) {
            key = 'panel2Grades';
        }
        return { panelKey: key, isPanel1: p1, isPanelist: !!key };
    }, [currentUser, sheet]);

    const [localDetails, setLocalDetails] = useState({ title: '', program: '', date: '', venue: '' });
    const [grades, setGrades] = useState<PanelGrades | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [rubricModal, setRubricModal] = useState<RubricModalState>({ show: false, item: null });
    const [showVenueInput, setShowVenueInput] = useState(false);
    const [newVenue, setNewVenue] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const areDetailsSet = sheet?.selectedTitle && sheet.selectedTitle !== 'Untitled Project' && sheet.program && sheet.date !== 'Not Set' && sheet.venue !== 'Not Set';

    useEffect(() => {
        if (sheet) {
            setLocalDetails({
                title: sheet.selectedTitle === 'Untitled Project' ? '' : sheet.selectedTitle,
                program: sheet.program,
                date: sheet.date === 'Not Set' ? '' : sheet.date,
                venue: sheet.venue === 'Not Set' ? '' : sheet.venue,
            });
            if (panelKey) {
                const existingGrades = sheet[panelKey];
                const initialGrades = {
                    titleDefenseScores: {},
                    individualScores: sheet.proponents.reduce((acc, p) => ({ ...acc, [p.id]: {} }), {}),
                    comments: '',
                    submitted: false
                };
                setGrades(JSON.parse(JSON.stringify(existingGrades || initialGrades)));
            }
        }
    }, [sheet, panelKey]);
    
     useEffect(() => {
        if (showSuccess) {
            const timer = setTimeout(() => {
                setShowSuccess(false);
                setPage('dashboard');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, setPage]);

    const handleDetailChange = (field: keyof typeof localDetails, value: string) => {
        setLocalDetails(prev => ({...prev, [field]: value}));
        if (field === 'venue' && value === 'Others') {
            setShowVenueInput(true);
        } else if (field === 'venue') {
            setShowVenueInput(false);
        }
    };
    
    const handleSaveDetails = () => {
        if (!sheet) return;
        let finalVenue = localDetails.venue;
        if (localDetails.venue === 'Others' && newVenue) {
            addVenue(newVenue);
            finalVenue = newVenue;
        }
        
        const updatedSheet = {
            ...sheet,
            selectedTitle: localDetails.title || 'Untitled Project',
            program: localDetails.program as GradeSheet['program'],
            date: localDetails.date || 'Not Set',
            venue: finalVenue || 'Not Set',
        };
        updateGradeSheet(updatedSheet);
    };

    const handleScoreChange = (rubricId: string, value: string | number, max: number, studentId?: string) => {
        if (!grades) return;
        let score = typeof value === 'string' ? parseInt(value, 10) : value;
        if (isNaN(score)) score = 0;
        if (score < 0) score = 0;
        if (score > max) score = max;

        const newGrades = JSON.parse(JSON.stringify(grades));
        if (studentId) {
            newGrades.individualScores[studentId][rubricId] = score;
        } else {
            newGrades.titleDefenseScores[rubricId] = score;
        }
        setGrades(newGrades);
    };
    
    const handleRubricClick = (range: string, item: RubricItem, studentId?: string) => {
        const maxScore = parseInt(range.split('-')[1] || range, 10);
        handleScoreChange(item.id, maxScore, item.weight, studentId);
        setRubricModal({ show: false, item: null });
    };

    const handleSubmit = () => {
        if (!sheet || !grades) return;

        const missing: string[] = [];
        // Check title defense scores
        TITLE_DEFENSE_RUBRIC.forEach(item => {
            if (grades.titleDefenseScores[item.id] === undefined || grades.titleDefenseScores[item.id] === null) {
                missing.push(`- Title Defense: ${item.criteria}`);
            }
        });
        // Check individual scores
        sheet.proponents.forEach(student => {
            INDIVIDUAL_GRADE_RUBRIC.forEach(item => {
                if (grades.individualScores[student.id]?.[item.id] === undefined || grades.individualScores[student.id]?.[item.id] === null) {
                    missing.push(`- ${student.name}: ${item.criteria}`);
                }
            });
        });
        // Check comments
        if (!grades.comments.trim()) {
            missing.push("- Comments section");
        }

        if (missing.length > 0) {
            setMissingFields(missing);
            return;
        }
        
        if (panelKey) {
            const updatedSheet = { ...sheet, [panelKey]: { ...grades, submitted: true } };
            updateGradeSheet(updatedSheet);
            setShowSuccess(true);
        }
    };
    
    if (!sheet || !currentUser || (!isPanelist)) {
        return <div className="p-8 text-center text-gray-500">Loading or you do not have permission...</div>;
    }
    
    const isReadOnly = grades?.submitted || false;
    const canSaveDetails = localDetails.title && localDetails.program && localDetails.date && localDetails.venue;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">Grading Sheet</h1>
                <p className="text-xl text-gray-600 mt-1">{sheet.groupName}</p>
            </div>

            {/* Group Details Section */}
            <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Group Presentation Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title:</label>
                        <input type="text" value={isPanel1 ? localDetails.title : sheet.selectedTitle} onChange={e => handleDetailChange('title', e.target.value)} disabled={!isPanel1 || areDetailsSet} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Program:</label>
                        <select value={isPanel1 ? localDetails.program : sheet.program} onChange={e => handleDetailChange('program', e.target.value)} disabled={!isPanel1 || areDetailsSet} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100">
                            <option value="" disabled>Select a program</option>
                            <option value="BSCS-AI">BSCS-AI</option>
                            <option value="BSCS-DS">BSCS-DS</option>
                            <option value="BSCS-SE">BSCS-SE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date / Time:</label>
                        <input type="datetime-local" value={isPanel1 ? localDetails.date : sheet.date} onChange={e => handleDetailChange('date', e.target.value)} disabled={!isPanel1 || areDetailsSet} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Venue:</label>
                        <select value={isPanel1 ? localDetails.venue : sheet.venue} onChange={e => handleDetailChange('venue', e.target.value)} disabled={!isPanel1 || areDetailsSet} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100">
                           <option value="" disabled>Select a venue</option>
                           {venues.map(v => <option key={v} value={v}>{v}</option>)}
                           <option value="Others">Others</option>
                        </select>
                        {isPanel1 && showVenueInput && !areDetailsSet && (
                            <input type="text" placeholder="Enter new venue" value={newVenue} onChange={e => setNewVenue(e.target.value)} className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                        )}
                    </div>
                </div>
                {isPanel1 && !areDetailsSet && (
                     <div className="text-right mt-4">
                        <button onClick={handleSaveDetails} disabled={!canSaveDetails} className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:opacity-50">Save Details</button>
                    </div>
                )}
            </div>

            {areDetailsSet && grades && (
            <>
                {/* Title Defense Rubric */}
                <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Title Defense Rubric (70%)</h3>
                    <table className="min-w-full">
                        <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-600">
                            <tr><th className="p-3 w-3/5">Criteria</th><th className="p-3 text-center">Weight</th><th className="p-3 text-center">Score</th></tr>
                        </thead>
                        <tbody>
                            {TITLE_DEFENSE_RUBRIC.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-3 align-top font-medium text-black text-base">{item.criteria}</td>
                                    <td className="p-3 align-middle text-center font-medium w-24">{item.weight}</td>
                                    <td className="p-3 align-middle w-32">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input type="number" value={grades.titleDefenseScores[item.id] ?? ''} placeholder="0" onChange={e => handleScoreChange(item.id, e.target.value, item.weight)} disabled={isReadOnly} className="w-20 p-2 border rounded-md text-center disabled:bg-gray-100"/>
                                            <InfoIconWrapper item={item} onClick={(item) => setRubricModal({show: true, item})} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Individual Grade Rubric */}
                <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
                     <h3 className="text-2xl font-bold text-gray-800 mb-4">Individual Performance (30%)</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-600">
                                <tr>
                                    <th className="p-3 min-w-[300px]">Criteria</th>
                                    <th className="p-3 text-center">Weight</th>
                                    {sheet.proponents.map((p, i) => <th key={p.id} className="p-3 text-center min-w-[150px]">{i+1}. {p.name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {INDIVIDUAL_GRADE_RUBRIC.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-3 align-top font-medium text-black text-base">{item.criteria}</td>
                                        <td className="p-3 align-middle text-center font-medium">{item.weight}</td>
                                        {sheet.proponents.map(student => (
                                            <td key={student.id} className="p-3 align-middle">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <input type="number" value={grades.individualScores[student.id]?.[item.id] ?? ''} placeholder="0" onChange={e => handleScoreChange(item.id, e.target.value, item.weight, student.id)} disabled={isReadOnly} className="w-20 p-2 border rounded-md text-center disabled:bg-gray-100"/>
                                                    <InfoIconWrapper item={item} studentId={student.id} onClick={(item, studentId) => setRubricModal({show: true, item, studentId})} />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>

                {/* Comments */}
                <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Comments & Feedback</h3>
                    <textarea value={grades.comments} onChange={e => setGrades(g => g ? { ...g, comments: e.target.value } : null)} disabled={isReadOnly} rows={6} className="w-full p-3 border rounded-md disabled:bg-gray-100" placeholder="Enter your overall comments for the group here..."/>
                </div>

                {/* Actions */}
                {!isReadOnly && (
                    <div className="flex justify-end">
                        <button onClick={handleSubmit} className="px-8 py-3 bg-green-700 text-white font-bold rounded-md hover:bg-green-800 disabled:opacity-50">
                            Submit Final Grades
                        </button>
                    </div>
                )}
            </>
            )}
            
            {showSuccess && <SuccessModal />}

            {/* Missing Fields Modal */}
            {missingFields.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-red-600 mb-4">Submission Incomplete</h3>
                        <p className="mb-4 text-sm text-gray-700">Please fill out the following required fields before submitting:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 max-h-60 overflow-y-auto">
                            {missingFields.map((field, i) => <li key={i}>{field}</li>)}
                        </ul>
                        <div className="text-right mt-6">
                            <button onClick={() => setMissingFields([])} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">OK</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rubric Modal */}
            {rubricModal.show && rubricModal.item && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => setRubricModal({show: false, item: null})}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">{rubricModal.item.criteria}</h3>
                        <div className="space-y-2">
                            {rubricModal.item.levels.map(level => (
                                <div key={level.range} onClick={() => handleRubricClick(level.range, rubricModal.item!, rubricModal.studentId)} className="p-3 rounded-md hover:bg-green-100 cursor-pointer border">
                                    <p className="font-bold text-green-700">{level.range}</p>
                                    <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="text-right mt-6">
                            <button onClick={() => setRubricModal({show: false, item: null})} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GradingSheet;