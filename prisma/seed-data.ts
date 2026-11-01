// © 2026 Heeya-Code. All rights reserved. Proprietary; see LICENSE. APAAR Nexus / EnrolTrust (SIH 2026, SIH26263).
// Static definitions for the DEMO dataset. Every institution here is FICTIONAL.
import type { InstitutionType, ProgrammeLevel, Region } from "../src/generated/prisma/client";

export type Culture =
  | "marathi" | "gujarati" | "tamil" | "malayalam" | "kannada"
  | "telugu" | "bengali" | "odia" | "assamese" | "hindi";

export const NAMES: Record<Culture, { m: string[]; f: string[]; s: string[] }> = {
  marathi:   { m: ["Aarav","Rohan","Omkar","Sahil","Atharv","Tejas","Pranav","Shubham","Aditya","Siddharth","Yash","Harshad"], f: ["Isha","Sneha","Pooja","Rutuja","Aishwarya","Gauri","Shruti","Pranjal","Manasi","Ketaki","Netra","Vaishnavi"], s: ["Patil","Deshmukh","Kulkarni","Jadhav","Pawar","Shinde","Joshi","Gaikwad","More","Bhosale","Kale","Salunkhe"] },
  gujarati:  { m: ["Dhruv","Jay","Parth","Harsh","Meet","Krunal","Nirav","Chirag","Darshan","Vivek","Raj","Hardik"], f: ["Khushi","Riya","Mansi","Nidhi","Hetvi","Bhavya","Dhara","Foram","Kinjal","Mitali","Urvi","Zalak"], s: ["Patel","Shah","Mehta","Desai","Trivedi","Parmar","Joshi","Thakkar","Modi","Vyas","Solanki","Chauhan"] },
  tamil:     { m: ["Arun","Karthik","Vignesh","Surya","Dinesh","Naveen","Praveen","Gokul","Harish","Manoj","Sathish","Vijay"], f: ["Divya","Kavya","Meena","Priyadharshini","Swetha","Lakshmi","Nandhini","Abirami","Janani","Harini","Keerthana","Ramya"], s: ["Subramanian","Krishnan","Raman","Iyer","Murugan","Natarajan","Sundaram","Rajan","Venkatesh","Annamalai","Balasubramanian","Selvam"] },
  malayalam: { m: ["Anand","Akhil","Arjun","Nikhil","Vishnu","Jithin","Midhun","Sreejith","Rahul","Abhijith","Adarsh","Gokul"], f: ["Anjana","Devika","Athira","Nandana","Gayathri","Meera","Aparna","Sreelakshmi","Neethu","Remya","Archana","Fathima"], s: ["Nair","Menon","Pillai","Varghese","Thomas","Kurian","Panicker","Warrier","Mathew","Joseph","Namboothiri","Kurup"] },
  kannada:   { m: ["Manjunath","Pradeep","Sachin","Darshan","Kiran","Nagesh","Prashanth","Vinay","Harsha","Girish","Mahesh","Suhas"], f: ["Shreya","Ananya","Bhavana","Chaitra","Deepika","Kavitha","Mamatha","Nisha","Pallavi","Rashmi","Spoorthi","Usha"], s: ["Gowda","Hegde","Shetty","Reddy","Naik","Bhat","Kamath","Rao","Patil","Hiremath","Kulkarni","Swamy"] },
  telugu:    { m: ["Sai","Venkat","Charan","Teja","Ramesh","Srikanth","Bharath","Naresh","Pavan","Kalyan","Mohan","Ravi"], f: ["Sravani","Lavanya","Harika","Bhavani","Sindhu","Mounika","Navya","Pranathi","Swathi","Tejaswi","Vaishnavi","Yamini"], s: ["Reddy","Naidu","Rao","Varma","Chowdary","Goud","Sastry","Raju","Prasad","Kumar","Babu","Yadav"] },
  bengali:   { m: ["Arnab","Sourav","Debashis","Subhajit","Anirban","Soumya","Rajib","Tanmoy","Pritam","Abhijit","Sayan","Joydeep"], f: ["Ritika","Sreya","Mousumi","Tanushree","Poulami","Debjani","Moumita","Sayani","Ananya","Madhurima","Piyali","Sohini"], s: ["Banerjee","Chatterjee","Mukherjee","Das","Ghosh","Sen","Bose","Dutta","Chakraborty","Roy","Majumdar","Sarkar"] },
  odia:      { m: ["Debasis","Manas","Prasanta","Rakesh","Subrat","Sambit","Ashis","Biswajit","Chinmay","Pratik","Smruti","Tapan"], f: ["Sasmita","Priyanka","Smita","Itishree","Lipsa","Pragyan","Sonali","Barsha","Jyotirmayee","Madhusmita","Rojalin","Subhashree"], s: ["Mohanty","Panda","Nayak","Behera","Sahoo","Das","Patra","Mishra","Swain","Jena","Pradhan","Rout"] },
  assamese:  { m: ["Bhaskar","Dipankar","Jyotirmoy","Pranjal","Rupam","Abhinash","Hemanta","Kaushik","Manash","Nilotpal","Rajdeep","Utpal"], f: ["Bidisha","Dhrubajyoti","Manjita","Nabanita","Pallavi","Rimjhim","Simran","Tamanna","Upasana","Mridusmita","Nayanmoni","Barnali"], s: ["Bora","Gogoi","Saikia","Hazarika","Dutta","Baruah","Kalita","Sarma","Choudhury","Phukan","Neog","Bhuyan"] },
  hindi:     { m: ["Aman","Ankit","Harsh","Mohit","Nikhil","Rishabh","Saurabh","Utkarsh","Vikas","Yogesh","Devansh","Kunal"], f: ["Aditi","Anjali","Divya","Kritika","Neha","Priya","Riya","Shivani","Tanvi","Vaishali","Ritu","Sakshi"], s: ["Sharma","Verma","Gupta","Singh","Tiwari","Mishra","Yadav","Pandey","Chauhan","Rathore","Shekhawat","Bisht"] },
};

export const STATE_REGION: Record<string, Region> = {
  MH: "WEST", GJ: "WEST", GA: "WEST", TN: "SOUTH", KL: "SOUTH", KA: "SOUTH", TS: "SOUTH",
  WB: "EAST", OD: "EAST", RJ: "NORTH", UK: "NORTH", MP: "CENTRAL", UP: "CENTRAL", AS: "NORTH_EAST",
};

export const DEPARTMENTS: Record<string, string> = {
  CSE: "Computer Science & Engineering", IT: "Information Technology", ISE: "Information Science & Engineering",
  ME: "Mechanical Engineering", EC: "Electronics & Communication Engineering", EE: "Electrical Engineering",
  CE: "Civil Engineering", CH: "Chemical Engineering", MGT: "Management Studies", MCA: "Computer Applications",
};

export type ProgSpec = { code: string; name: string; level: ProgrammeLevel; years: number; dept: string; intake: number };
const be = (deg: string, code: string, dept: string, intake: number): ProgSpec =>
  ({ code, name: `${deg} ${DEPARTMENTS[dept]}`, level: "UG", years: 4, dept, intake });
const dip = (code: string, dept: string, intake: number): ProgSpec =>
  ({ code, name: `Diploma in ${DEPARTMENTS[dept]}`, level: "DIPLOMA", years: 3, dept, intake });

export type Profile = {
  /** ordinary-category admissions as a fraction of approved intake, by AY (overrides default curve) */
  util?: Partial<Record<string, number>>;
  /** probability that the APAAR ID is missing, by AY (default curve x missMult) */
  missing?: Partial<Record<string, number>>;
  missMult?: number;
  invalidRate?: number;
  /** supernumerary admissions as fraction of approved intake (per programme), by AY or default */
  nri?: Partial<Record<string, number>> | number;
  oci?: number; fn?: number; tfws?: number;
  femaleShare?: number;
  /** academic years with NO accepted submission */
  pending?: string[];
  /** category mix override for an AY (fractions summing to ~1 across ordinary categories) */
  mix?: Partial<Record<string, Record<string, number>>>;
};

export type InstSpec = {
  slug: string; name: string; short: string; type: InstitutionType; state: string; stateName: string;
  city: string; district?: string; est: number; roll: string; culture: Culture;
  programmes: ProgSpec[]; profile: Profile; story: string;
};

export const INSTITUTIONS: InstSpec[] = [
  { slug: "sahyadri", name: "Sahyadri Institute of Technology", short: "Sahyadri IT", type: "PRIVATE", state: "MH", stateName: "Maharashtra", city: "Pune", district: "Pune", est: 2001, roll: "SIT", culture: "marathi",
    programmes: [be("B.E.", "CSE", "CSE", 120), be("B.E.", "IT", "IT", 60), be("B.E.", "ME", "ME", 60), be("B.E.", "EC", "EC", 60)],
    profile: { pending: ["2026-27"], nri: 0.02, tfws: 0.03, femaleShare: 0.34 },
    story: "Well-run institution with a clean history. 2026-27 not yet submitted: the demo upload target." },
  { slug: "kaveri", name: "Kaveri College of Engineering", short: "Kaveri CE", type: "GOVT_AIDED", state: "TN", stateName: "Tamil Nadu", city: "Chennai", district: "Chennai", est: 1978, roll: "KCE", culture: "tamil",
    programmes: [be("B.E.", "CSE", "CSE", 120), be("B.E.", "EC", "EC", 120), be("B.E.", "CE", "CE", 60), be("B.E.", "EE", "EE", 60)],
    profile: { nri: 0, tfws: 0.04, femaleShare: 0.4, missMult: 0.6 },
    story: "Consistently compliant reference institution." },
  { slug: "aravalli", name: "Aravalli Institute of Engineering & Technology", short: "Aravalli IET", type: "PRIVATE", state: "RJ", stateName: "Rajasthan", city: "Jaipur", district: "Jaipur", est: 2007, roll: "AIE", culture: "hindi",
    programmes: [be("B.Tech", "CSE", "CSE", 180), be("B.Tech", "ME", "ME", 90), be("B.Tech", "CE", "CE", 60), be("B.Tech", "EE", "EE", 60)],
    profile: { util: { "2025-26": 1.18, "2026-27": 1.26 }, nri: 0.02, tfws: 0.03, femaleShare: 0.3 },
    story: "Ordinary admissions exceed approved intake in 2025-26 and 2026-27." },
  { slug: "brahmaputra", name: "Brahmaputra Institute of Technology", short: "Brahmaputra IT", type: "GOVERNMENT", state: "AS", stateName: "Assam", city: "Guwahati", district: "Kamrup Metropolitan", est: 1994, roll: "BIT", culture: "assamese",
    programmes: [be("B.E.", "CSE", "CSE", 60), be("B.E.", "CE", "CE", 60), be("B.E.", "ME", "ME", 60), be("B.E.", "EE", "EE", 60)],
    profile: { util: { "2025-26": 0.74, "2026-27": 0.7 }, missing: { "2025-26": 0.38, "2026-27": 0.31 }, invalidRate: 0.08, nri: 0, tfws: 0.04, femaleShare: 0.36 },
    story: "High share of missing and malformed APAAR IDs." },
  { slug: "narmada", name: "Narmada University School of Engineering", short: "Narmada USE", type: "UNIVERSITY_DEPARTMENT", state: "MP", stateName: "Madhya Pradesh", city: "Bhopal", district: "Bhopal", est: 1989, roll: "NUS", culture: "hindi",
    programmes: [be("B.Tech", "CSE", "CSE", 90), be("B.Tech", "IT", "IT", 60), be("B.Tech", "EC", "EC", 60)],
    profile: { nri: 0.01, tfws: 0.03, femaleShare: 0.38 },
    story: "Counterpart in the cross-institution duplicate scenario with Gomti." },
  { slug: "gomti", name: "Gomti Technical Campus", short: "Gomti TC", type: "PRIVATE", state: "UP", stateName: "Uttar Pradesh", city: "Lucknow", district: "Lucknow", est: 2009, roll: "GTC", culture: "hindi",
    programmes: [be("B.Tech", "CSE", "CSE", 180), be("B.Tech", "IT", "IT", 120), be("B.Tech", "ME", "ME", 90), be("B.Tech", "EC", "EC", 90)],
    profile: { util: { "2023-24": 0.66, "2024-25": 0.62, "2025-26": 1.08, "2026-27": 0.78 }, nri: 0.015, tfws: 0.03, femaleShare: 0.31 },
    story: "Admissions jump about 90% in 2025-26 (above intake) and share students with Narmada." },
  { slug: "hooghly", name: "Hooghly Engineering College", short: "Hooghly EC", type: "GOVT_AIDED", state: "WB", stateName: "West Bengal", city: "Kolkata", district: "Hooghly", est: 1985, roll: "HEC", culture: "bengali",
    programmes: [be("B.E.", "CSE", "CSE", 60), be("B.E.", "EC", "EC", 60), be("B.E.", "ME", "ME", 60), be("B.E.", "CE", "CE", 60)],
    profile: { pending: ["2026-27"], invalidRate: 0.06, nri: 0, tfws: 0.04, femaleShare: 0.33 },
    story: "Four submission versions in 2025-26 (repeated corrections); 2026-27 overdue." },
  { slug: "deccan", name: "Deccan School of Management", short: "Deccan SoM", type: "PRIVATE", state: "TS", stateName: "Telangana", city: "Hyderabad", district: "Hyderabad", est: 1999, roll: "DSM", culture: "telugu",
    programmes: [
      { code: "PGDM", name: "Post Graduate Diploma in Management", level: "PGDM", years: 2, dept: "MGT", intake: 180 },
      { code: "MBA", name: "Master of Business Administration", level: "MBA", years: 2, dept: "MGT", intake: 120 },
    ],
    profile: { nri: 0.07, oci: 0.02, fn: 0.05, tfws: 0, femaleShare: 0.46, missMult: 0.5 },
    story: "PGDM institution with legitimate supernumerary NRI/OCI/FN admissions, all within caps: must NOT be flagged." },
  { slug: "malwa", name: "Malwa Institute of Technology", short: "Malwa IT", type: "PRIVATE", state: "MP", stateName: "Madhya Pradesh", city: "Indore", district: "Indore", est: 2004, roll: "MIT", culture: "hindi",
    programmes: [be("B.E.", "CSE", "CSE", 120), be("B.E.", "ME", "ME", 60), be("B.E.", "EE", "EE", 60)],
    profile: { pending: ["2026-27"], nri: 0.02, tfws: 0.03, femaleShare: 0.32 },
    story: "Otherwise clean; 2026-27 submission pending." },
  { slug: "nilgiri", name: "Nilgiri Government Polytechnic", short: "Nilgiri GP", type: "GOVERNMENT", state: "TN", stateName: "Tamil Nadu", city: "Coimbatore", district: "Coimbatore", est: 1972, roll: "NGP", culture: "tamil",
    programmes: [dip("CSE", "CSE", 60), dip("ME", "ME", 60), dip("EE", "EE", 60), dip("CE", "CE", 60)],
    profile: { pending: ["2026-27"], nri: 0, tfws: 0, femaleShare: 0.22, missMult: 1.2 },
    story: "Diploma institution; 2026-27 pending." },
  { slug: "sabarmati", name: "Sabarmati Institute of Technology", short: "Sabarmati IT", type: "PRIVATE", state: "GJ", stateName: "Gujarat", city: "Ahmedabad", district: "Ahmedabad", est: 2003, roll: "SBT", culture: "gujarati",
    programmes: [be("B.E.", "CSE", "CSE", 120), be("B.E.", "ME", "ME", 60), be("B.E.", "CE", "CE", 60), be("B.E.", "CH", "CH", 60)],
    profile: { nri: { default: 0.03, "2026-27": 0.237 } as Record<string, number>, fn: 0.015, tfws: 0.03, femaleShare: 0.35 },
    story: "NRI admissions in 2026-27 far exceed the configured supernumerary cap: needs regulatory review." },
  { slug: "himalaya", name: "Himalaya Institute of Engineering", short: "Himalaya IE", type: "PRIVATE", state: "UK", stateName: "Uttarakhand", city: "Dehradun", district: "Dehradun", est: 2010, roll: "HIE", culture: "hindi",
    programmes: [be("B.Tech", "CSE", "CSE", 120), be("B.Tech", "EC", "EC", 60), be("B.Tech", "ME", "ME", 60)],
    profile: { mix: { "2025-26": { GEN: 0.2, OBC: 0.12, SC: 0.08, ST: 0.05, EWS: 0.55 } }, nri: 0.02, tfws: 0.03, femaleShare: 0.3 },
    story: "EWS share of 55% in 2025-26: unusual category distribution." },
  { slug: "konkan", name: "Konkan School of Engineering", short: "Konkan SE", type: "GOVERNMENT", state: "GA", stateName: "Goa", city: "Panaji", district: "North Goa", est: 1995, roll: "KSE", culture: "marathi",
    programmes: [be("B.E.", "CSE", "CSE", 60), be("B.E.", "ME", "ME", 30), be("B.E.", "EC", "EC", 30)],
    profile: { pending: ["2026-27"], nri: 0, tfws: 0.03, femaleShare: 0.4 },
    story: "Small government college; 2026-27 pending." },
  { slug: "periyar", name: "Periyar Institute of Technology", short: "Periyar IT", type: "PRIVATE", state: "KL", stateName: "Kerala", city: "Kochi", district: "Ernakulam", est: 2002, roll: "PIT", culture: "malayalam",
    programmes: [be("B.Tech", "CSE", "CSE", 120), be("B.Tech", "EC", "EC", 60), be("B.Tech", "EE", "EE", 60), be("B.Tech", "ME", "ME", 60)],
    profile: { nri: 0.03, tfws: 0.03, femaleShare: 0.43, missMult: 0.7 },
    story: "Clean, high APAAR coverage." },
  { slug: "chilika", name: "Chilika Institute of Technology", short: "Chilika IT", type: "GOVT_AIDED", state: "OD", stateName: "Odisha", city: "Bhubaneswar", district: "Khordha", est: 1991, roll: "CIT", culture: "odia",
    programmes: [be("B.Tech", "CSE", "CSE", 90), be("B.Tech", "EC", "EC", 60), be("B.Tech", "ME", "ME", 60), be("B.Tech", "CE", "CE", 60)],
    profile: { nri: 0, tfws: 0.04, femaleShare: 0.37, missMult: 0.5 },
    story: "Mostly clean with a handful of missing identifiers." },
  { slug: "tungabhadra", name: "Tungabhadra Institute of Technology", short: "Tungabhadra IT", type: "PRIVATE", state: "KA", stateName: "Karnataka", city: "Bengaluru", district: "Bengaluru Urban", est: 2000, roll: "TIT", culture: "kannada",
    programmes: [be("B.E.", "CSE", "CSE", 180), be("B.E.", "ISE", "ISE", 120), be("B.E.", "EC", "EC", 120), be("B.E.", "ME", "ME", 60)],
    profile: { nri: 0.025, tfws: 0.03, fn: 0.005, femaleShare: 0.37 },
    story: "Same student entered twice within the institution in 2025-26." },
];

export const CATEGORIES = [
  { code: "GEN", name: "General", isSupernumerary: false, sortOrder: 1 },
  { code: "OBC", name: "Other Backward Classes", isSupernumerary: false, sortOrder: 2 },
  { code: "SC", name: "Scheduled Caste", isSupernumerary: false, sortOrder: 3 },
  { code: "ST", name: "Scheduled Tribe", isSupernumerary: false, sortOrder: 4 },
  { code: "EWS", name: "Economically Weaker Section", isSupernumerary: false, sortOrder: 5 },
  { code: "NRI", name: "Non-Resident Indian quota", isSupernumerary: true, sortOrder: 6 },
  { code: "OCI", name: "Overseas Citizen of India", isSupernumerary: true, sortOrder: 7 },
  { code: "FN", name: "Foreign National", isSupernumerary: true, sortOrder: 8 },
  { code: "TFWS", name: "Tuition Fee Waiver Scheme", isSupernumerary: true, sortOrder: 9 },
] as const;

const ILLUSTRATIVE = "ILLUSTRATIVE DEFAULT for the prototype. Confirm every threshold against the current AICTE Approval Process Handbook before any regulatory use.";

export const RULES = [
  { code: "INTAKE_ORDINARY_LIMIT", name: "Ordinary admissions within approved intake", description: "General, OBC, SC, ST and EWS admissions count toward approved intake and must not exceed it.", kind: "INTAKE_LIMIT", parameters: { countsCategories: ["GEN", "OBC", "SC", "ST", "EWS"], maxPercentOfBaseIntake: 100 }, severity: "REQUIRES_REVIEW", source: ILLUSTRATIVE },
  { code: "SUPERNUMERARY_CAP_NRI", name: "NRI quota cap", description: "NRI admissions are supernumerary up to a configurable share of approved intake.", kind: "SUPERNUMERARY_CAP", parameters: { categories: ["NRI"], maxPercentOfBaseIntake: 15 }, severity: "REQUIRES_REVIEW", source: ILLUSTRATIVE },
  { code: "SUPERNUMERARY_CAP_OCI_FN", name: "OCI and foreign national cap", description: "OCI and foreign-national admissions share one supernumerary cap.", kind: "SUPERNUMERARY_CAP", parameters: { categories: ["OCI", "FN"], maxPercentOfBaseIntake: 15 }, severity: "REQUIRES_REVIEW", source: ILLUSTRATIVE },
  { code: "SUPERNUMERARY_CAP_TFWS", name: "Tuition Fee Waiver Scheme cap", description: "TFWS seats are supernumerary up to a configurable share of approved intake.", kind: "SUPERNUMERARY_CAP", parameters: { categories: ["TFWS"], maxPercentOfBaseIntake: 5 }, severity: "WARNING", source: ILLUSTRATIVE },
  { code: "ANOMALY_YOY_GROWTH", name: "Year-on-year admission growth", description: "Flags institution-level admission growth above this percentage versus the previous year.", kind: "ANOMALY_THRESHOLD", parameters: { maxGrowthPercent: 40, minBaseline: 50 }, severity: "REQUIRES_REVIEW", source: ILLUSTRATIVE },
  { code: "ANOMALY_CATEGORY_SKEW", name: "Category share skew", description: "Flags any single ordinary category whose share exceeds this value.", kind: "ANOMALY_THRESHOLD", parameters: { maxShareByCategory: { GEN: 0.8, OBC: 0.6, SC: 0.4, ST: 0.3, EWS: 0.25 } }, severity: "REQUIRES_REVIEW", source: ILLUSTRATIVE },
] as const;
