
import { UserRole, RubricItem } from './types';

export const APP_NAME = 'CS0025 Online Grading Sheet';

export const USER_ROLES = [UserRole.ADMIN, UserRole.COURSE_ADVISER, UserRole.PANEL];

export const TITLE_DEFENSE_RUBRIC: RubricItem[] = [
  { 
    id: 'td1', 
    criteria: 'Develops an analytical, critical paper that provides a description of how the ideas for the paper were formulated.', 
    weight: 35,
    levels: [
      { range: '30-35 points', description: 'The paper is exceptionally well-researched and presents a clear, compelling description of how the project\'s ideas were developed. It shows deep analytical and critical thinking.' },
      { range: '20-29 points', description: 'The paper is solid and describes the formulation of ideas, but it may lack some depth or critical analysis.' },
      { range: '10-19 points', description: 'The paper provides a basic description of the ideas, but it is weak in analysis or critical thought.' },
      { range: '0-9 points', description: 'The paper is disorganized, lacks a clear description of idea formulation, or is missing significant content.' }
    ]
  },
  { 
    id: 'td2', 
    criteria: 'Demonstrates unique/novel ideas for the proposed project and has societal impact.', 
    weight: 30,
    levels: [
        { range: '25-30 points', description: 'The project ideas are highly original and demonstrate significant potential for societal impact. The presentation clearly and convincingly highlights the novelty and importance of the work.' },
        { range: '15-24 points', description: 'The ideas are interesting and show some originality, with a plausible societal impact.' },
        { range: '5-14 points', description: 'The ideas are generic or lack originality, and the societal impact is unclear or minimal.' },
        { range: '0-4 points', description: 'The project ideas are unoriginal or are not demonstrated.' }
    ]
  },
  { 
    id: 'td3', 
    criteria: 'Proponents must make sure that required resources and algorithms are attainable.', 
    weight: 15,
    levels: [
        { range: '13-15 points', description: 'The presentation provides a thorough and realistic plan, demonstrating that all necessary resources and algorithms are easily accessible and feasible for the project.' },
        { range: '8-12 points', description: 'The plan is mostly realistic, but there may be some minor uncertainties regarding resource or algorithm availability.' },
        { range: '3-7 points', description: 'The plan is questionable, with significant doubts about the attainability of resources or algorithms.' },
        { range: '0-2 points', description: 'No plan is presented or the plan is completely unrealistic.' }
    ]
  },
  { 
    id: 'td4', 
    criteria: 'The group shows evidences that the title is feasible for project proposal.', 
    weight: 20,
    levels: [
        { range: '18-20 points', description: 'The group provides strong, compelling evidence that the proposed title is highly relevant and feasible for the project. The evidence is well-supported and convincing.' },
        { range: '12-17 points', description: 'The evidence is present and supports the feasibility of the title, but it may not be as strong or well-articulated.' },
        { range: '6-11 points', description: 'The evidence provided is weak or only marginally supports the title\'s feasibility.' },
        { range: '0-5 points', description: 'Little to no evidence is provided, and the title\'s feasibility is highly questionable.' }
    ]
  },
];

export const INDIVIDUAL_GRADE_RUBRIC: RubricItem[] = [
  { 
    id: 'ig1', 
    criteria: 'The presenter is knowledgeable of the materials or matter he/she discussed.', 
    weight: 30,
    levels: [
        { range: '25-30 points', description: 'The presenter demonstrates exceptional mastery of the material, answering all questions with confidence and authority.' },
        { range: '15-24 points', description: 'The presenter shows good knowledge of the material, but there may be some minor gaps in understanding.' },
        { range: '5-14 points', description: 'The presenter struggles with the material and appears unsure of the content.' },
        { range: '0-4 points', description: 'The presenter demonstrates a lack of knowledge or preparation.' }
    ] 
  },
  { 
    id: 'ig2', 
    criteria: 'The presenter answers questions directly and did not digress from the focus of the query.', 
    weight: 30,
    levels: [
        { range: '25-30 points', description: 'The presenter answers all questions clearly and directly, staying focused on the query without any digression.' },
        { range: '15-24 points', description: 'The presenter answers most questions directly, but may occasionally lose focus or digress slightly.' },
        { range: '5-14 points', description: 'The presenter often struggles to answer questions directly and frequently deviates from the topic.' },
        { range: '0-4 points', description: 'The presenter fails to answer questions or provides completely irrelevant answers.' }
    ]
  },
  { 
    id: 'ig3', 
    criteria: 'The presenter maintains a comfortable and reasonable pace during his/her delivery.', 
    weight: 20,
    levels: [
        { range: '18-20 points', description: 'The presenter speaks at a perfect pace, allowing the audience to easily follow along without feeling rushed or bored.' },
        { range: '12-17 points', description: 'The presenter\'s pace is generally good, but they may speak too quickly or too slowly at times.' },
        { range: '6-11 points', description: 'The presenter\'s pace is distracting, either speaking too fast and rushing through the material or too slow and causing the audience to lose interest.' },
        { range: '0-5 points', description: 'The presenter\'s pace is completely erratic and hinders communication.' }
    ]
  },
  { 
    id: 'ig4', 
    criteria: "The presenter's voice is well-modulated and can be heard throughout the room.", 
    weight: 10,
    levels: [
        { range: '9-10 points', description: 'The presenter\'s voice is consistently clear, loud, and well-projected, easily heard throughout the room.' },
        { range: '5-8 points', description: 'The presenter\'s voice is mostly clear, but they may occasionally mumble or speak too softly.' },
        { range: '2-4 points', description: 'The presenter\'s voice is often difficult to hear, either too soft or poorly projected.' },
        { range: '0-1 point', description: 'The presenter\'s voice is inaudible or the presenter mumbles throughout the presentation.' }
    ]
  },
  { 
    id: 'ig5', 
    criteria: 'The presenter is neatly groomed and properly attired.', 
    weight: 10,
    levels: [
        { range: '9-10 points', description: 'The presenter\'s attire is professional and appropriate for the occasion, reflecting respect for the audience and the event.' },
        { range: '5-8 points', description: 'The presenter\'s attire is acceptable but may not be fully professional or appropriate.' },
        { range: '2-4 points', description: 'The presenter\'s attire is unprofessional or inappropriate.' },
        { range: '0-1 point', description: 'The presenter\'s appearance is distracting or disrespectful.' }
    ]
  },
];