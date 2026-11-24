import { Ticket, Department, NotificationItem, CampusInsight } from '../../src/types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'it_support',
    name: 'IT Support & Networks',
    description: 'Campus Wi-Fi, lab computers, portal logins, ERP access, network security',
    headName: 'Prof. Rajesh Sharma',
    headEmail: 'rajesh.sharma@campussaathi.edu',
    staffCount: 12,
    slaHours: 12,
    icon: 'Wifi'
  },
  {
    id: 'electrical',
    name: 'Electrical Engineering & Maintenance',
    description: 'Power backup, classroom lights, fans, transformer faults, emergency wiring',
    headName: 'Er. Sandeep Verma',
    headEmail: 'sandeep.verma@campussaathi.edu',
    staffCount: 16,
    slaHours: 6,
    icon: 'Zap'
  },
  {
    id: 'civil_maintenance',
    name: 'Civil & Infrastructure Maintenance',
    description: 'Water pipelines, washroom sanitation, building repairs, leaks, door/window fixtures',
    headName: 'Er. Manoj Tiwari',
    headEmail: 'manoj.tiwari@campussaathi.edu',
    staffCount: 22,
    slaHours: 8,
    icon: 'Wrench'
  },
  {
    id: 'hostel_management',
    name: 'Hostel Administration & Welfare',
    description: 'Hostel rooms, mess hygiene, water coolers, warden permissions, room allocation',
    headName: 'Dr. Sunita Kulkarni',
    headEmail: 'sunita.kulkarni@campussaathi.edu',
    staffCount: 18,
    slaHours: 8,
    icon: 'Home'
  },
  {
    id: 'library',
    name: 'Central Library Services',
    description: 'Digital reading room, book issue kiosk, RFID access, journal subscriptions, quiet zone',
    headName: 'Dr. Anand Mehrotra',
    headEmail: 'anand.mehrotra@campussaathi.edu',
    staffCount: 9,
    slaHours: 24,
    icon: 'BookOpen'
  },
  {
    id: 'transport',
    name: 'Campus Transport & Logistics',
    description: 'College shuttle buses, route timings, driver coordination, vehicle servicing',
    headName: 'Mr. Jagdish Chander',
    headEmail: 'jagdish.c@campussaathi.edu',
    staffCount: 14,
    slaHours: 16,
    icon: 'Bus'
  },
  {
    id: 'academic_admin',
    name: 'Academic Administration',
    description: 'Lecture hall projectors, smart boards, exam hall allotment, attendance kiosks',
    headName: 'Dr. Priyadarshini Rao',
    headEmail: 'priya.rao@campussaathi.edu',
    staffCount: 10,
    slaHours: 12,
    icon: 'GraduationCap'
  },
  {
    id: 'security',
    name: 'Campus Security & Vigilance',
    description: 'Gate pass verification, CCTV monitoring, boundary safety, night patrol',
    headName: 'Col. Vikram Rathore (Retd.)',
    headEmail: 'vikram.security@campussaathi.edu',
    staffCount: 30,
    slaHours: 2,
    icon: 'ShieldAlert'
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping & Campus Cleanliness',
    description: 'Corridor cleanliness, garbage disposal, chemical sanitization, lawn upkeep',
    headName: 'Mrs. Geeta Bisht',
    headEmail: 'geeta.b@campussaathi.edu',
    staffCount: 28,
    slaHours: 6,
    icon: 'Sparkles'
  }
];

// Exact Hackathon dataset specified in prompt:
// - 3 hostel water complaints
// - 2 classroom projector complaints
// - 2 Wi-Fi complaints
// - 1 library issue
// - 1 electrical issue
export const HACKATHON_DEMO_TICKETS: Ticket[] = [
  // 3 Hostel Water Complaints
  {
    id: 'CS-2026-1001',
    title: 'Water supply interrupted in Block B Washroom 2nd Floor',
    originalDescription: 'Hostel Block B 2nd floor ke washroom me paani subah 6 baje se bilkul band hai. Hum sab exam ke liye late ho rahe hain please urgent check karein.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'Water supply has been completely halted in Hostel Block B 2nd floor washroom since 6 AM. Students are getting late for exams, urgent inspection needed.',
      category: 'Water Supply Outage',
      recommendedDepartment: 'hostel_management',
      priority: 'high',
      summary: 'Hostel Block B 2nd floor experiencing total water supply cutoff affecting morning routine.',
      recommendedAction: 'Dispatch maintenance plumber and switch on secondary booster overhead pump immediately.',
      suggestedReply: 'Your complaint regarding Block B water outage has been logged with High priority. The plumbing supervisor has been notified.',
      confidence: 96,
      isLiveAi: false,
      sentiment: 'urgent'
    },
    department: 'hostel_management',
    priority: 'high',
    status: 'in_progress',
    userId: 'STU-1029',
    userName: 'Aman Singhal',
    userEmail: 'aman.singhal@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Hostel Block B, Floor 2, Wing North',
    assignedTo: 'Er. Manoj Tiwari (Civil/Plumbing Team)',
    assignedStaffEmail: 'manoj.tiwari@campussaathi.edu',
    adminReplyDraft: 'Technician assigned. Inspection team is on site fixing the main riser pipe valve.',
    adminReplySent: 'Technician assigned. Inspection team is on site fixing the main riser pipe valve.',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    timeline: [
      {
        id: 'tl-1',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Aman Singhal via Student Mobile Portal',
        actor: 'Aman Singhal',
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString()
      },
      {
        id: 'tl-2',
        status: 'ai_analyzed',
        title: 'CampusSaathi AI Classification',
        description: 'Detected: Water Supply Outage -> Routed to Hostel Management (High Priority)',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 179).toISOString()
      },
      {
        id: 'tl-3',
        status: 'assigned',
        title: 'Assigned to Maintenance',
        description: 'Auto-assigned to Er. Manoj Tiwari based on department SLA',
        actor: 'System Admin',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      },
      {
        id: 'tl-4',
        status: 'in_progress',
        title: 'Work In Progress',
        description: 'Plumbing technician deployed at Hostel B pump house',
        actor: 'Er. Manoj Tiwari',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
      }
    ]
  },
  {
    id: 'CS-2026-1002',
    title: 'Severe pipeline leakage near Hostel C water storage tank',
    originalDescription: 'Hostel C ke rooftop storage tank se paani leak hokar terrace pe bhar gaya hai aur niche corridor me tapak raha hai.',
    inputMode: 'multimodal',
    language: 'Hindi',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    aiAnalysis: {
      originalLanguage: 'Hindi',
      translatedText: 'Water is leaking from the rooftop storage tank in Hostel C, causing accumulation on the terrace and dripping into the corridor downstairs.',
      category: 'Water Supply / Pipeline Leak',
      recommendedDepartment: 'civil_maintenance',
      priority: 'high',
      summary: 'Rooftop water tank leakage at Hostel C causing structural water pooling and corridor seepage.',
      recommendedAction: 'Close main intake line for Hostel C tank and replace cracked PVC union joint.',
      suggestedReply: 'Thank you for reporting the rooftop tank leakage. Civil maintenance engineers have isolated the supply line.',
      confidence: 94,
      isLiveAi: false,
      visualFindings: 'Visible pressurized water dripping around joint; water puddling on concrete terrace.',
      sentiment: 'urgent'
    },
    department: 'civil_maintenance',
    priority: 'high',
    status: 'assigned',
    userId: 'STU-1088',
    userName: 'Rohan Deshmukh',
    userEmail: 'rohan.d@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Hostel Block C, Rooftop Tank 3',
    assignedTo: 'Er. Manoj Tiwari',
    assignedStaffEmail: 'manoj.tiwari@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    timeline: [
      {
        id: 'tl-201',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Uploaded with photo verification',
        actor: 'Rohan Deshmukh',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString()
      },
      {
        id: 'tl-202',
        status: 'ai_analyzed',
        title: 'AI Multimodal Vision Inspection',
        description: 'Identified pipeline seepage at 94% confidence',
        actor: 'CampusSaathi Vision AI',
        timestamp: new Date(Date.now() - 1000 * 60 * 238).toISOString()
      },
      {
        id: 'tl-203',
        status: 'assigned',
        title: 'Assigned to Civil Maintenance',
        description: 'Assigned to Er. Manoj Tiwari',
        actor: 'Admin Dashboard',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString()
      }
    ]
  },
  {
    id: 'CS-2026-1003',
    title: 'Drinking water dispenser foul odor and low pressure in Hostel A',
    originalDescription: 'Hostel A ground floor water cooler me paani bahut slow aa raha hai aur ajeeb si smell hai. Filter replace hona chahiye.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'The water cooler on the ground floor of Hostel A has very low pressure and emits a strange odor. The RO filter needs replacement.',
      category: 'Drinking Water Quality',
      recommendedDepartment: 'hostel_management',
      priority: 'medium',
      summary: 'RO water dispenser in Hostel A ground floor has low flow and odor, indicating expired filter cartridges.',
      recommendedAction: 'Replace RO carbon and sediment filters, sanitize dispenser reservoir.',
      suggestedReply: 'Your ticket regarding the Hostel A drinking cooler has been recorded. Sanitization and filter replacement scheduled.',
      confidence: 92,
      isLiveAi: false,
      sentiment: 'frustrated'
    },
    department: 'hostel_management',
    priority: 'medium',
    status: 'submitted',
    userId: 'STU-1044',
    userName: 'Kavya Sharma',
    userEmail: 'kavya.s@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Hostel A, Ground Floor Mess Entrance',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    timeline: [
      {
        id: 'tl-301',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Kavya Sharma',
        actor: 'Kavya Sharma',
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString()
      },
      {
        id: 'tl-302',
        status: 'ai_analyzed',
        title: 'AI Analysis Complete',
        description: 'Assigned Medium Priority -> Hostel Management',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 89).toISOString()
      }
    ]
  },

  // 2 Classroom Projector Complaints
  {
    id: 'CS-2026-1004',
    title: 'LH-302 Overhead Projector HDMI input flicker & bulb overheating',
    originalDescription: 'Lecture Hall 302 me projector bar bar disconnect ho raha hai aur RED lamp blinking warning aa rahi hai. Classes disrupt ho rahi hain.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'In Lecture Hall 302, the projector disconnects intermittently and shows a blinking RED lamp overheat warning. Lectures are getting interrupted.',
      category: 'AV Equipment Failure',
      recommendedDepartment: 'academic_admin',
      priority: 'high',
      summary: 'LH-302 ceiling projector experiencing HDMI signal loss and thermal lamp shutdown.',
      recommendedAction: 'Clean cooling exhaust filter and replace faulty HDMI wall port cable.',
      suggestedReply: 'LH-302 AV issue registered with high priority. Tech technician dispatched before next lecture slot.',
      confidence: 95,
      isLiveAi: false,
      sentiment: 'urgent'
    },
    department: 'academic_admin',
    priority: 'high',
    status: 'in_progress',
    userId: 'FAC-201',
    userName: 'Dr. Ramesh Chandra (Faculty of CS)',
    userEmail: 'r.chandra@campussaathi.edu',
    userRole: 'faculty',
    locationDetails: 'Academic Block 3, LH-302',
    assignedTo: 'Dr. Priyadarshini Rao / AV Team',
    assignedStaffEmail: 'priya.rao@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    timeline: [
      {
        id: 'tl-401',
        status: 'submitted',
        title: 'Faculty Report Filed',
        description: 'Submitted by Dr. Ramesh Chandra',
        actor: 'Dr. Ramesh Chandra',
        timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString()
      },
      {
        id: 'tl-402',
        status: 'ai_analyzed',
        title: 'AI Classified: Classroom AV Equipment',
        description: 'Routed to Academic Administration (High Priority)',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 299).toISOString()
      },
      {
        id: 'tl-403',
        status: 'in_progress',
        title: 'Replacement Unit Dispatched',
        description: 'Technician on site with spare Epson lamp module',
        actor: 'AV Staff',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      }
    ]
  },
  {
    id: 'CS-2026-1005',
    title: 'Seminar Hall 1 motorized projector screen jammed half-way',
    originalDescription: 'Seminar Hall 1 me projector screen neeche aate waqt jam ho gayi hai. Tomorrow morning guest lecture scheduled hai.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'The motorized projector screen in Seminar Hall 1 got stuck halfway down. A guest lecture is scheduled for tomorrow morning.',
      category: 'AV & Classroom Infrastructure',
      recommendedDepartment: 'academic_admin',
      priority: 'high',
      summary: 'Motorized screen in Seminar Hall 1 mechanical jam obstructing presentation surface.',
      recommendedAction: 'Reset screen limiter gear and check 220V tubular motor synchronization.',
      suggestedReply: 'Ticket logged. AV support technician will attend to Seminar Hall 1 motorized screen today.',
      confidence: 93,
      isLiveAi: false,
      sentiment: 'urgent'
    },
    department: 'academic_admin',
    priority: 'high',
    status: 'assigned',
    userId: 'FAC-205',
    userName: 'Prof. Neha Gupta (Dean Academics Office)',
    userEmail: 'neha.gupta@campussaathi.edu',
    userRole: 'faculty',
    locationDetails: 'Admin Block Ground Floor, Seminar Hall 1',
    assignedTo: 'Dr. Priyadarshini Rao',
    assignedStaffEmail: 'priya.rao@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    timeline: [
      {
        id: 'tl-501',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Filed by Prof. Neha Gupta',
        actor: 'Prof. Neha Gupta',
        timestamp: new Date(Date.now() - 1000 * 60 * 400).toISOString()
      },
      {
        id: 'tl-502',
        status: 'ai_analyzed',
        title: 'AI Analysis Complete',
        description: 'Routed to Academic Administration (High Priority)',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 398).toISOString()
      },
      {
        id: 'tl-503',
        status: 'assigned',
        title: 'Assigned to Staff',
        description: 'Assigned to Dr. Priyadarshini Rao',
        actor: 'Admin Dashboard',
        timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString()
      }
    ]
  },

  // 2 Wi-Fi Complaints
  {
    id: 'CS-2026-1006',
    title: 'Frequent DNS disconnects and packet loss on Campus_Student_5G in Library',
    originalDescription: 'Library 1st floor reading room me Campus_Student_5G Wi-Fi connects but shows "Connected without Internet" every 5 minutes.',
    inputMode: 'text',
    language: 'English',
    aiAnalysis: {
      originalLanguage: 'English',
      translatedText: 'Library 1st floor reading room Wi-Fi connects but displays "Connected without Internet" intermittently with frequent packet dropouts.',
      category: 'Network / Wi-Fi Access Point Failure',
      recommendedDepartment: 'it_support',
      priority: 'medium',
      summary: 'Access Point AP-LIB-02 in reading zone experiencing DHCP lease exhaustion or rogue interference.',
      recommendedAction: 'Reboot Cisco AP-LIB-02 and increase DHCP pool subnet allocation on VLAN 40.',
      suggestedReply: 'Your IT ticket has been recorded. Network engineers have been assigned to inspect Library AP-LIB-02.',
      confidence: 97,
      isLiveAi: false,
      sentiment: 'frustrated'
    },
    department: 'it_support',
    priority: 'medium',
    status: 'assigned',
    userId: 'STU-1055',
    userName: 'Vikramaditya Roy',
    userEmail: 'vikram.roy@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Central Library, 1st Floor Digital Reading Zone',
    assignedTo: 'Prof. Rajesh Sharma (IT NOC)',
    assignedStaffEmail: 'rajesh.sharma@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    timeline: [
      {
        id: 'tl-601',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Vikramaditya Roy',
        actor: 'Vikramaditya Roy',
        timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString()
      },
      {
        id: 'tl-602',
        status: 'ai_analyzed',
        title: 'AI Analysis Complete',
        description: 'Routed to IT Support (Medium Priority)',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 499).toISOString()
      },
      {
        id: 'tl-603',
        status: 'assigned',
        title: 'Assigned to IT NOC',
        description: 'Assigned to Prof. Rajesh Sharma',
        actor: 'Admin Dashboard',
        timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString()
      }
    ]
  },
  {
    id: 'CS-2026-1007',
    title: 'Girls Hostel Block 1 zero Wi-Fi signal in rooms 201 to 215',
    originalDescription: 'Girls Hostel Block 1 ke second floor corridor me router off hai. Rooms me bilkul signal nahi aa raha research work ruka hua hai.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'The router in the 2nd floor corridor of Girls Hostel Block 1 is switched off. There is zero signal in rooms 201-215, halting research study.',
      category: 'Network Hardware / Power Outage',
      recommendedDepartment: 'it_support',
      priority: 'high',
      summary: 'PoE power injector tripped for corridor Wi-Fi bridge in Girls Hostel Block 1 (Rooms 201-215).',
      recommendedAction: 'Check PoE switch port in floor telecommunications rack and reset Access Point GH1-2F-01.',
      suggestedReply: 'IT Support NOC is informed. Network team will reset the floor repeater within 2 hours.',
      confidence: 96,
      isLiveAi: false,
      sentiment: 'urgent'
    },
    department: 'it_support',
    priority: 'high',
    status: 'in_progress',
    userId: 'STU-1072',
    userName: 'Ananya Mukherjee',
    userEmail: 'ananya.m@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Girls Hostel Block 1, 2nd Floor Corridor',
    assignedTo: 'Prof. Rajesh Sharma (IT NOC)',
    assignedStaffEmail: 'rajesh.sharma@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    timeline: [
      {
        id: 'tl-701',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Ananya Mukherjee',
        actor: 'Ananya Mukherjee',
        timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString()
      },
      {
        id: 'tl-702',
        status: 'ai_analyzed',
        title: 'AI Classification Complete',
        description: 'Routed to IT Support (High Priority)',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 598).toISOString()
      },
      {
        id: 'tl-703',
        status: 'in_progress',
        title: 'Switch Port Reset Scheduled',
        description: 'Technician on floor telecommunications rack',
        actor: 'IT Staff',
        timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString()
      }
    ]
  },

  // 1 Library Issue
  {
    id: 'CS-2026-1008',
    title: 'Self-checkout RFID kiosk screen freezing during book return scan',
    originalDescription: 'Central library entrance pe jo automatic RFID drop kiosk hai, barcode scan karte hi screen freeze ho rahi hai aur receipt generate nahi hoti.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'The automatic RFID drop kiosk at Central Library entrance freezes during barcode scan and fails to generate the return receipt.',
      category: 'Library Automation / RFID Hardware',
      recommendedDepartment: 'library',
      priority: 'medium',
      summary: 'Central Library automated RFID kiosk software stall on book checkout scanner.',
      recommendedAction: 'Restart Koha ILS client service and re-calibrate RFID serial tag reader.',
      suggestedReply: 'Your feedback on the RFID kiosk has been forwarded to Chief Librarian Dr. Anand Mehrotra.',
      confidence: 94,
      isLiveAi: false,
      sentiment: 'neutral'
    },
    department: 'library',
    priority: 'medium',
    status: 'assigned',
    userId: 'STU-1011',
    userName: 'Tanmay Saxena',
    userEmail: 'tanmay.s@campussaathi.edu',
    userRole: 'student',
    locationDetails: 'Central Library Ground Floor Kiosk-1',
    assignedTo: 'Dr. Anand Mehrotra',
    assignedStaffEmail: 'anand.mehrotra@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 350).toISOString(),
    timeline: [
      {
        id: 'tl-801',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Tanmay Saxena',
        actor: 'Tanmay Saxena',
        timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString()
      },
      {
        id: 'tl-802',
        status: 'ai_analyzed',
        title: 'AI Analysis Complete',
        description: 'Routed to Library Services',
        actor: 'CampusSaathi AI Engine',
        timestamp: new Date(Date.now() - 1000 * 60 * 719).toISOString()
      },
      {
        id: 'tl-803',
        status: 'assigned',
        title: 'Assigned to Library Admin',
        description: 'Assigned to Dr. Anand Mehrotra',
        actor: 'System Admin',
        timestamp: new Date(Date.now() - 1000 * 60 * 350).toISOString()
      }
    ]
  },

  // 1 Electrical Issue (Critical safety hazard)
  {
    id: 'CS-2026-1009',
    title: 'Exposed high-voltage sparking wire near Science Lab Block corridor switchboard',
    originalDescription: 'Physics Lab Block ground floor corridor ke main switchboard se sparks nikal rahe hain aur burning wire smell aa rahi hai. Dangerous situation!',
    inputMode: 'multimodal',
    language: 'Hinglish',
    imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'Main switchboard in Physics Lab Block ground floor corridor is sparking with strong burning wire odor. Severe fire danger!',
      category: 'Electrical Safety Hazard',
      recommendedDepartment: 'electrical',
      priority: 'critical',
      summary: 'High-voltage electric arcing and cable insulation burning at Physics Lab switchboard.',
      recommendedAction: 'Trip MCB breaker sub-panel 2 immediate lockdown and replace melted copper terminal busbar.',
      suggestedReply: 'CRITICAL SAFETY ALERT RECEIVED: Electrical quick response team and fire marshal dispatched immediately. Area is being cordoned off.',
      confidence: 99,
      isLiveAi: false,
      visualFindings: 'Charred insulation around breaker switch, arcing flash evidence visible.',
      sentiment: 'urgent'
    },
    department: 'electrical',
    priority: 'critical',
    status: 'in_progress',
    userId: 'FAC-209',
    userName: 'Prof. Arvind Nambiar (Head of Physics)',
    userEmail: 'arvind.n@campussaathi.edu',
    userRole: 'faculty',
    locationDetails: 'Science Block A, Corridor Outside Physics Lab 104',
    assignedTo: 'Er. Sandeep Verma (Chief Electrical Officer)',
    assignedStaffEmail: 'sandeep.verma@campussaathi.edu',
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    timeline: [
      {
        id: 'tl-901',
        status: 'submitted',
        title: 'Critical Hazard Alert Registered',
        description: 'Reported by Faculty with Photo verification',
        actor: 'Prof. Arvind Nambiar',
        timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString()
      },
      {
        id: 'tl-902',
        status: 'ai_analyzed',
        title: 'AI Priority Escalate: CRITICAL HAZARD',
        description: 'Auto-escalated to Electrical emergency response',
        actor: 'CampusSaathi Safety AI',
        timestamp: new Date(Date.now() - 1000 * 60 * 69).toISOString()
      },
      {
        id: 'tl-903',
        status: 'in_progress',
        title: 'Sub-panel Isolated',
        description: 'Er. Sandeep Verma isolated the corridor feeder busbar',
        actor: 'Er. Sandeep Verma',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      }
    ]
  },

  // 1 Resolved example ticket for historical stats
  {
    id: 'CS-2026-1010',
    title: 'Computer Lab 4 air conditioning thermostat not cooling',
    originalDescription: 'CS Dept Lab 4 me AC cooling nahi kar raha tha.',
    inputMode: 'text',
    language: 'Hinglish',
    aiAnalysis: {
      originalLanguage: 'Hinglish',
      translatedText: 'The AC in CS Department Lab 4 was not providing cooling.',
      category: 'HVAC Maintenance',
      recommendedDepartment: 'electrical',
      priority: 'medium',
      summary: 'Thermostat cooling fault in CS Lab 4.',
      recommendedAction: 'Clean condenser fins and recharge R32 refrigerant.',
      suggestedReply: 'AC compressor unit serviced and operational.',
      confidence: 94,
      isLiveAi: false,
      sentiment: 'neutral'
    },
    department: 'electrical',
    priority: 'medium',
    status: 'resolved',
    userId: 'FAC-201',
    userName: 'Dr. Ramesh Chandra',
    userEmail: 'r.chandra@campussaathi.edu',
    userRole: 'faculty',
    locationDetails: 'Academic Block 2, Room 401',
    assignedTo: 'Er. Sandeep Verma',
    assignedStaffEmail: 'sandeep.verma@campussaathi.edu',
    adminReplyDraft: 'AC serviced and verified at 21 degrees C.',
    adminReplySent: 'AC serviced and verified at 21 degrees C.',
    resolutionRemarks: 'Cleaned dust filters and refilled refrigerant gas. Temperature brought down to 21 C.',
    resolvedAt: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    timeline: [
      {
        id: 'tl-1001',
        status: 'submitted',
        title: 'Complaint Registered',
        description: 'Submitted by Faculty',
        actor: 'Dr. Ramesh Chandra',
        timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString()
      },
      {
        id: 'tl-1002',
        status: 'resolved',
        title: 'Resolved by Technician',
        description: 'AC serviced, filter cleaned, cooling verified.',
        actor: 'Er. Sandeep Verma',
        timestamp: new Date(Date.now() - 1000 * 60 * 900).toISOString()
      }
    ]
  }
];

export const INITIAL_INSIGHTS: CampusInsight[] = [
  {
    id: 'ins-1',
    type: 'cluster',
    title: 'Cluster: Hostel Water Supply Interruptions',
    description: '3 hostel water supply complaints reported this week across Block A, B, and C. Possible common cause: main booster pump pressure fluctuation or riser valve defect.',
    recommendedAction: 'Inspect central campus water pump house and perform preventive maintenance on the primary booster manifold.',
    affectedDepartment: 'hostel_management',
    confidence: 95,
    ticketCount: 3,
    timestamp: new Date().toISOString()
  },
  {
    id: 'ins-2',
    type: 'trend',
    title: 'Spike: Wi-Fi complaints increased by 35%',
    description: 'Wi-Fi connection dropouts and DHCP exhaustion tickets increased by 35% in the last 7 days, concentrated around the Central Library and Girls Hostel.',
    recommendedAction: 'Expand DHCP IP subnet pool on student VLAN and audit 5GHz channel interference.',
    affectedDepartment: 'it_support',
    confidence: 91,
    ticketCount: 2,
    timestamp: new Date().toISOString()
  },
  {
    id: 'ins-3',
    type: 'critical',
    title: 'Hazard Alert: Electrical Dept Unresolved Safety Issue',
    description: 'Electrical department has 1 critical sparking hazard active in Science Block. Prompt action required to prevent localized blackout or fire hazard.',
    recommendedAction: 'Verify isolation of Science Block sub-panel and approve emergency busbar replacement.',
    affectedDepartment: 'electrical',
    confidence: 99,
    ticketCount: 1,
    timestamp: new Date().toISOString()
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Critical Electrical Alert',
    message: 'High voltage sparking reported at Science Lab corridor (CS-2026-1009). Response team alerted.',
    type: 'urgent',
    ticketId: 'CS-2026-1009',
    timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    title: 'Hostel Water Cluster Detected',
    message: 'CampusSaathi AI identified 3 correlated water complaints in Hostels B, C, and A.',
    type: 'warning',
    ticketId: 'CS-2026-1001',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    read: false
  },
  {
    id: 'notif-3',
    title: 'Ticket Status Updated',
    message: 'Ticket CS-2026-1004 (LH-302 Projector) is now marked In Progress.',
    type: 'info',
    ticketId: 'CS-2026-1004',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true
  }
];
