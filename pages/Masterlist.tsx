import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { GradeSheet, PanelGrades, Student, UserRole, GradeSheetStatus } from '../types';
import { TITLE_DEFENSE_RUBRIC, INDIVIDUAL_GRADE_RUBRIC } from '../constants';

const calculatePanelScores = (grades: PanelGrades | undefined, proponents: Student[]) => {
    if (!grades) {
        return {
            titleDefenseWeighted: 0,
            individualWeighted: proponents.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {})
        };
    }
    const totalTdWeight = TITLE_DEFENSE_RUBRIC.reduce((sum, item) => sum + item.weight, 0);
    const totalIgWeight = INDIVIDUAL_GRADE_RUBRIC.reduce((sum, item) => sum + item.weight, 0);

    const tdRaw = TITLE_DEFENSE_RUBRIC.reduce((sum, item) => sum + (grades.titleDefenseScores[item.id] || 0), 0);
    const titleDefenseWeighted = (tdRaw / totalTdWeight) * 70;

    const individualWeighted = proponents.reduce((acc, p) => {
        const igRaw = INDIVIDUAL_GRADE_RUBRIC.reduce((sum, item) => sum + (grades.individualScores[p.id]?.[item.id] || 0), 0);
        acc[p.id] = (igRaw / totalIgWeight) * 30;
        return acc;
    }, {} as {[key: string]: number});
    
    return { titleDefenseWeighted, individualWeighted };
};

const ErrorModal: React.FC<{ message: string }> = ({ message }) => {
    const [progressWidth, setProgressWidth] = useState('0%');

    useEffect(() => {
        const timer = setTimeout(() => setProgressWidth('100%'), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Assignment Error</h3>
                <p className="text-gray-600 mt-2 mb-6">{message}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-red-500 h-2.5 rounded-full transition-all duration-[3000ms] ease-linear"
                        style={{ width: progressWidth }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

const Masterlist: React.FC = () => {
    const { gradeSheets, users, updateGradeSheet, findUserById } = useAppContext();
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });

    useEffect(() => {
        if (errorModal.show) {
            const timer = setTimeout(() => {
                setErrorModal({ show: false, message: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [errorModal.show]);

    const handlePanelChange = (sheetId: string, panelKey: 'panel1Id' | 'panel2Id', userId: string) => {
        const sheet = gradeSheets.find(s => s.id === sheetId);
        if (!sheet) return;

        // Check for duplicate assignment
        if ((panelKey === 'panel1Id' && userId === sheet.panel2Id) ||
            (panelKey === 'panel2Id' && userId === sheet.panel1Id)) {
            
            const otherPanelKey = panelKey === 'panel1Id' ? 'Panel 2' : 'Panel 1';
            setErrorModal({ show: true, message: `This user is already assigned as ${otherPanelKey}. Please select a different user.` });
            return;
        }

        const updatedSheet = { ...sheet, [panelKey]: userId };
        updateGradeSheet(updatedSheet);
    };

    const panelOptions = useMemo(() => 
        users.filter(u => [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL].includes(u.role)),
    [users]);

    const stats = useMemo(() => {
        const graded = gradeSheets.filter(s => s.status === GradeSheetStatus.COMPLETED).length;
        const incomplete = gradeSheets.filter(s => [GradeSheetStatus.IN_PROGRESS, GradeSheetStatus.PANEL_1_SUBMITTED, GradeSheetStatus.PANEL_2_SUBMITTED].includes(s.status)).length;
        const ungraded = gradeSheets.filter(s => s.status === GradeSheetStatus.NOT_STARTED).length;
        return { graded, incomplete, ungraded };
    }, [gradeSheets]);

    const masterlistData = useMemo(() => {
        return gradeSheets.map(sheet => {
            const panel1Scores = calculatePanelScores(sheet.panel1Grades, sheet.proponents);
            const panel2Scores = calculatePanelScores(sheet.panel2Grades, sheet.proponents);
            
            const studentScores = sheet.proponents.map(proponent => {
                const p1Indiv = panel1Scores.individualWeighted[proponent.id] || 0;
                const p2Indiv = panel2Scores.individualWeighted[proponent.id] || 0;

                const p1Total = panel1Scores.titleDefenseWeighted + p1Indiv;
                const p2Total = panel2Scores.titleDefenseWeighted + p2Indiv;
                
                const finalScore = (p1Total + p2Total) / 2;

                return {
                    ...proponent,
                    p1Title: panel1Scores.titleDefenseWeighted,
                    p1Indiv: p1Indiv,
                    p2Title: panel2Scores.titleDefenseWeighted,
                    p2Indiv: p2Indiv,
                    finalScore: finalScore,
                };
            });
            
            const groupFinalScore = studentScores.reduce((sum, s) => sum + s.finalScore, 0) / (studentScores.length || 1);

            return {
                ...sheet,
                studentScores,
                groupFinalScore,
            };
        });
    }, [gradeSheets]);

    const handleExportWord = () => {
        let tableHtml = `
            <table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif;">
                <thead style="background-color: #2F855A; color: white; text-align: center; font-size: 10pt;">
                    <tr>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">GROUP NAME</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">PROPONENTS</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">ASSIGN PANEL 1</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">ASSIGN PANEL 2</th>
                        <th colspan="2" style="padding: 8px; border: 1px solid #ddd;">PANEL 1 (50%)</th>
                        <th colspan="2" style="padding: 8px; border: 1px solid #ddd;">PANEL 2 (50%)</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">TOTAL</th>
                        <th rowspan="2" style="padding: 8px; border: 1px solid #ddd;">FINAL SCORE</th>
                    </tr>
                    <tr>
                        <th style="padding: 8px; border: 1px solid #ddd;">TITLE DEFENSE (70%)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">INDIVIDUAL (30%)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">TITLE DEFENSE (70%)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">INDIVIDUAL (30%)</th>
                    </tr>
                </thead>
                <tbody>
        `;
    
        masterlistData.forEach(group => {
            const numProponents = group.studentScores.length || 1;
            const panel1Name = findUserById(group.panel1Id)?.name || 'N/A';
            const panel2Name = findUserById(group.panel2Id)?.name || 'N/A';
    
            group.studentScores.forEach((student, index) => {
                tableHtml += `<tr style="font-size: 9pt;">`;
                if (index === 0) {
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; vertical-align: top;">${group.groupName}</td>`;
                }
                tableHtml += `<td style="padding: 8px;">${student.name}</td>`;
                if (index === 0) {
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; vertical-align: middle;">${panel1Name}</td>`;
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; vertical-align: middle;">${panel2Name}</td>`;
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; text-align: center; vertical-align: middle;">${student.p1Title > 0 ? student.p1Title.toFixed(2) : '0.00'}</td>`;
                }
                tableHtml += `<td style="padding: 8px; text-align: center;">${student.p1Indiv > 0 ? student.p1Indiv.toFixed(2) : '0.00'}</td>`;
                if (index === 0) {
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; text-align: center; vertical-align: middle;">${student.p2Title > 0 ? student.p2Title.toFixed(2) : '0.00'}</td>`;
                }
                tableHtml += `<td style="padding: 8px; text-align: center;">${student.p2Indiv > 0 ? student.p2Indiv.toFixed(2) : '0.00'}</td>`;
                tableHtml += `<td style="padding: 8px; text-align: center; font-weight: bold;">${student.finalScore.toFixed(2)}</td>`;
                if (index === 0) {
                    tableHtml += `<td rowspan="${numProponents}" style="padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 1.2em;">${group.groupFinalScore.toFixed(2)}</td>`;
                }
                tableHtml += `</tr>`;
            });
        });
    
        tableHtml += `</tbody></table>`;
        
        const wordDocument = `
            <html xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <title>Masterlist Export</title>
                    <!--[if gte mso 9]>
                    <xml>
                        <w:WordDocument>
                            <w:View>Print</w:View>
                            <w:Zoom>90</w:Zoom>
                            <w:DoNotOptimizeForBrowser/>
                        </w:WordDocument>
                    </xml>
                    <![endif]-->
                    <style>
                        @page Section1 {
                            size: 11.0in 8.5in;
                            mso-page-orientation: landscape;
                            margin: 1.0in 1.0in 1.0in 1.0in;
                        }
                        div.Section1 {
                            page: Section1;
                        }
                    </style>
                </head>
                <body>
                    <div class="Section1">
                        <h1>Masterlist & Panel Assignment</h1>
                        ${tableHtml}
                    </div>
                </body>
            </html>
        `;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(wordDocument);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = 'masterlist-export.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    const handleExportCsv = () => {
        const headers = [
            'Group Name', 
            'Proponent', 
            'Assigned Panel 1', 
            'Assigned Panel 2', 
            'Panel 1 Title Defense (70%)', 
            'Panel 1 Individual (30%)', 
            'Panel 2 Title Defense (70%)', 
            'Panel 2 Individual (30%)', 
            'Proponent Final Score (Total)', 
            'Group Final Score'
        ];
        
        const csvRows = [headers.join(',')];

        masterlistData.forEach(group => {
            const panel1Name = findUserById(group.panel1Id)?.name || 'N/A';
            const panel2Name = findUserById(group.panel2Id)?.name || 'N/A';
    
            group.studentScores.forEach(student => {
                const row = [
                    `"${group.groupName.replace(/"/g, '""')}"`,
                    `"${student.name.replace(/"/g, '""')}"`,
                    `"${panel1Name.replace(/"/g, '""')}"`,
                    `"${panel2Name.replace(/"/g, '""')}"`,
                    student.p1Title > 0 ? student.p1Title.toFixed(2) : '0.00',
                    student.p1Indiv > 0 ? student.p1Indiv.toFixed(2) : '0.00',
                    student.p2Title > 0 ? student.p2Title.toFixed(2) : '0.00',
                    student.p2Indiv > 0 ? student.p2Indiv.toFixed(2) : '0.00',
                    student.finalScore.toFixed(2),
                    group.groupFinalScore.toFixed(2)
                ];
                csvRows.push(row.join(','));
            });
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'masterlist-export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Masterlist & Panel Assignment</h2>
                 <div className="flex space-x-2 no-print">
                     <button onClick={handleExportWord} className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Export to MS Word</button>
                     <button onClick={handleExportCsv} className="px-4 py-2 text-sm font-medium rounded-md bg-green-700 text-white hover:bg-green-800 shadow-sm">Export to CSV</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 no-print">
                <div className="bg-green-100 p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-green-800">{stats.graded}</p>
                    <p className="text-sm font-semibold text-green-700">Graded</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-yellow-800">{stats.incomplete}</p>
                    <p className="text-sm font-semibold text-yellow-700">Incomplete</p>
                </div>
                <div className="bg-gray-200 p-4 rounded-lg shadow text-center">
                    <p className="text-3xl font-bold text-gray-800">{stats.ungraded}</p>
                    <p className="text-sm font-semibold text-gray-700">Ungraded</p>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-base">
                    <thead className="bg-green-900 text-white">
                        <tr>
                            <th rowSpan={2} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Group Name</th>
                            <th rowSpan={2} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Proponents</th>
                            <th rowSpan={2} className="px-4 py-3 text-left font-semibold uppercase tracking-wider border-l border-green-800">Assign Panel 1</th>
                            <th rowSpan={2} className="px-4 py-3 text-left font-semibold uppercase tracking-wider border-l border-green-800">Assign Panel 2</th>
                            <th colSpan={2} className="px-4 py-3 text-center font-semibold uppercase tracking-wider border-l border-green-800">Panel 1 (50%)</th>
                            <th colSpan={2} className="px-4 py-3 text-center font-semibold uppercase tracking-wider border-l border-green-800">Panel 2 (50%)</th>
                            <th rowSpan={2} className="px-4 py-3 text-center font-semibold uppercase tracking-wider border-l border-green-800">Total</th>
                            <th rowSpan={2} className="px-4 py-3 text-center font-semibold uppercase tracking-wider border-l border-green-800">Final Score</th>
                        </tr>
                        <tr>
                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider border-l border-t border-green-800">Title Defense (70%)</th>
                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider border-t border-green-800">Individual (30%)</th>
                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider border-l border-t border-green-800">Title Defense (70%)</th>
                            <th className="px-2 py-2 text-center font-semibold uppercase tracking-wider border-t border-green-800">Individual (30%)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {masterlistData.map(group => (
                            <React.Fragment key={group.id}>
                                {group.studentScores.map((student, index) => (
                                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        {index === 0 && (
                                            <td rowSpan={group.proponents.length} className="px-4 py-4 align-top font-medium text-black border-r">{group.groupName}</td>
                                        )}
                                        <td className="px-4 py-2 text-black border-r">{student.name}</td>
                                        
                                        {index === 0 && (
                                            <>
                                                <td rowSpan={group.proponents.length} className="px-4 py-4 align-middle border-r">
                                                    <select
                                                        value={group.panel1Id}
                                                        onChange={(e) => handlePanelChange(group.id, 'panel1Id', e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 no-print"
                                                        aria-label={`Assign Panel 1 for ${group.groupName}`}
                                                    >
                                                        <option value="" disabled>-- Select --</option>
                                                        {panelOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                        ))}
                                                    </select>
                                                    <span className="print-only">{findUserById(group.panel1Id)?.name || 'N/A'}</span>
                                                </td>
                                                <td rowSpan={group.proponents.length} className="px-4 py-4 align-middle border-r">
                                                    <select
                                                        value={group.panel2Id}
                                                        onChange={(e) => handlePanelChange(group.id, 'panel2Id', e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 no-print"
                                                        aria-label={`Assign Panel 2 for ${group.groupName}`}
                                                    >
                                                        <option value="" disabled>-- Select --</option>
                                                        {panelOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                        ))}
                                                    </select>
                                                     <span className="print-only">{findUserById(group.panel2Id)?.name || 'N/A'}</span>
                                                </td>
                                            </>
                                        )}

                                        {/* Panel 1 */}
                                        {index === 0 && (
                                            <td rowSpan={group.proponents.length} className="px-4 py-4 align-middle text-center text-black border-r">
                                                {student.p1Title > 0 ? student.p1Title.toFixed(2) : '0.00'}
                                            </td>
                                        )}
                                        <td className="px-4 py-2 text-center text-black border-r">{student.p1Indiv > 0 ? student.p1Indiv.toFixed(2) : '0.00'}</td>

                                        {/* Panel 2 */}
                                        {index === 0 && (
                                            <td rowSpan={group.proponents.length} className="px-4 py-4 align-middle text-center text-black border-r">
                                                {student.p2Title > 0 ? student.p2Title.toFixed(2) : '0.00'}
                                            </td>
                                        )}
                                        <td className="px-4 py-2 text-center text-black border-r">{student.p2Indiv > 0 ? student.p2Indiv.toFixed(2) : '0.00'}</td>
                                        
                                        <td className="px-4 py-2 text-center font-bold text-green-800 border-r">{student.finalScore.toFixed(2)}</td>

                                        {index === 0 && (
                                            <td rowSpan={group.proponents.length} className="px-4 py-4 align-middle text-center font-extrabold text-xl text-green-700">
                                                {group.groupFinalScore.toFixed(2)}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                         {masterlistData.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center py-10 text-gray-700 text-lg">No groups have been created yet. Go to Group Management to add a group.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {errorModal.show && <ErrorModal message={errorModal.message} />}
        </div>
    );
};

export default Masterlist;