# Biometric Log Demo - Edge Cases & Data Reference

## Fixed Time Slots (7 active slots per day - Slots 2-8)

| Slot # | Start Time | End Time | Duration | Usage |
|--------|-----------|----------|----------|-------|
| **1** | 08:15 | 09:00 | 45 min | **NOT USED** |
| **2** | 09:00 | 10:10 | 70 min | ✓ Morning Session |
| **3** | 10:40 | 11:50 | 70 min | ✓ Late Morning |
| **4** | 12:10 | 13:20 | 70 min | ✓ Post-Lunch |
| **5** | 14:30 | 15:40 | 70 min | ✓ Afternoon |
| **6** | 16:00 | 17:10 | 70 min | ✓ Late Afternoon |
| **7** | 17:30 | 18:40 | 70 min | ✓ Evening |
| **8** | 19:00 | 20:10 | 70 min | ✓ Night |

**Important:** Biometric punch timing - Biometric machine is circulated AFTER 10 minutes of class start and takes 7-10 minutes to complete across all students. Therefore:
- Swipes typically occur 10-17 minutes after official slot start time
- All swipes within the slot time window are marked PRESENT
- No "late" marking based on biometric time
- Late marking is done manually by faculty only

---

## Student Batches & Roll Numbers

| Batch | Programme | Roll Numbers | Students | Divisions |
|-------|-----------|--------------|----------|-----------|
| PGDM 2025-27 | Post Graduate Diploma in Management | PGP-25-001 to PGP-25-030 | 30 students | A, B, C (10 each) |
| PGDM (BM) 2025-27 | PGDM (Business Management) | PGPBM-25-001 to PGPBM-25-020 | 20 students | D, E (10 each) |

---

## Demo Files Overview

### File 1: `biometric-demo-Slot2-edge-cases.csv`
**Date:** March 3, 2026 | **Slot:** Slot 2 (09:00-10:10 AM) | **Total Records:** 35 students

#### Edge Cases Demonstrated:

**1. Normal Attendance - Slot 2 Window (09:00-10:10 AM)**
- All 30 PGDM students + 3 PGDM (BM) students swipe
- Swipes between 09:00-09:11 AM (within 10-minute processing window after slot start)
- Status: SUCCESS ✓
- Examples: Aditya Shah (09:05), Akash Chopra (09:03), Amit Banerjee (09:08)

**2. Duplicate/Multiple Swipes (Same Student, Same Slot)**
- **Chirag Pandey (PGP-25-009)**: Swipes at 09:03 AM, then again at 09:05 AM
- **Ishaan Khanna (PGP-25-015)**: Swipes at 09:01 AM, then again at 09:02 AM
- **Behavior to Test:** System gracefully handles duplicates - both recorded but attendance counted once
- Possible reasons: Hand/fingers not recognized on first scan, card reader hiccup, deliberate re-scan

**3. Absent Student**
- **Rahul Reddy (PGP-25-031)** - NOT in this log = ABSENT from Slot 2 on Mar 03

---

### File 2: `biometric-demo-multiple-slots.csv`
**Date:** March 4, 2026 | **Multiple Slots** | **Total Records:** 35 students

#### Cross-Slot Testing:

**Slot 3 (10:40-11:50 AM)** - 10 students
- Aditya Shah (10:43), Akash Chopra (10:45), Amit Banerjee (10:41), Ananya Mukherjee (10:48), Arjun Das (10:44)
- Arnav Sinha (10:46), Aryan Mishra (10:42), Bhavya Tiwari (10:47)
- **Duplicate:** Chirag Pandey (10:43 & 10:45), Ishaan Khanna (10:48 & 10:50 - Slot 3 ends at 11:50 so both valid)
- Deepak Thakur (10:44), Diya Yadav (10:46), Divya Dubey (10:43), Gaurav Rathore (10:47)

**Slot 4 (12:10-13:20 PM)** - 6 students
- Harsh Kapoor (12:13), Ishaan Khanna (12:15 & 12:18), Jatin Bhatt (12:14), Kavya Deshpande (12:12)
- Karan Goyal (moved to next slot)

**Slot 5 (14:30-15:40 PM)** - 3 students
- Karan Goyal (14:32), Kriti Jain (14:35), Lakshmi Sharma (14:31)

**Slot 6 (16:00-17:10 PM)** - 3 students
- Madhav Patel (16:02), Manisha Gupta (16:05), Meera Singh (16:03)

**Slot 7 (17:30-18:40 PM)** - 4 students
- Mohit Kumar (17:32), Nandini Iyer (17:35), Neha Rao (17:31), Nikhil Joshi (17:33)

**Slot 8 (19:00-20:10 PM)** - 2 students
- Pallavi Nair (19:02), Pranav Kulkarni (19:05)

**Priya Menon (PGP-25-030)** - Early swipe in Slot 2 (09:06 AM) instead of Slot 3

---

## Core Courses (Term 3 for 2025-27)

### PGDM 2025-27 Core (All students)
1. **OLS515-PDM-46** - Human Resource Management (26 sessions, 3 credits)
2. **STR507-PDM-46** - Business Policy and Strategy II (26 sessions, 3 credits)
3. **QTM522-PDM-46** - Decision Science (26 sessions, 3 credits)
4. **ACC506-PDM-46** - Management Accounting (26 sessions, 3 credits)

### PGDM (BM) 2025-27 Core (All BM students)
1. **OLS515-PBM-04** - Human Resource Management (26 sessions, 3 credits)
2. **STR507-PBM-04** - Business Policy and Strategy II (26 sessions, 3 credits)
3. **QTM522-PBM-04** - Decision Science (26 sessions, 3 credits)
4. **ACC506-PBM-04** - Management Accounting (26 sessions, 3 credits)

### Specialisation Courses

**Information Management & Analytics (IM)**
- INF522-PDM-46: Digital Product Management
- ANA522-PDM-46: Business Intelligence and Analytics
- INF524-PDM-46: Enterprise IT
- INF530-PDM-46: Maker Lab

**Marketing (MKT)**
- MKT501-PDM-46: Consumer Behaviour
- MKT502-PDM-46: Marketing Research
- MKT503-PDM-46: Sales and Distribution Management
- MKT504-PDM-46: Strategic Brand Management

**Finance (FIN)**
- FIN501-PDM-46: Corporate Valuation
- FIN502-PDM-46: Security Analysis & Portfolio Management
- FIN503-PDM-46: Financial Laws
- FIN504-PDM-46: Financial Modelling

**Operations & Supply Chain (OPS)**
- OPS501-PDM-46: Service Operations Management
- OPS502-PDM-46: Logistics Management
- OPS503-PDM-46: Procurement and Strategic Sourcing
- OPS504-PDM-46: Supply Chain Planning and Coordination

---

## Testing Scenarios for Demo

### Scenario 1: Single Slot Analysis
**Use:** biometric-demo-Slot2-edge-cases.csv
- Upload file and show attendance for Slot 2 on Mar 3
- Highlight: Duplicate swipes for Chirag Pandey and Ishaan Khanna
- Show: System handles duplicates gracefully - attendance counted once per student
- Query: "Which students swiped for Slot 2?" - Should return 35 records (30 PGDM + 3 PGDM-BM), but 33 unique students (2 duplicates)

### Scenario 2: Cross-Slot Analysis
**Use:** biometric-demo-multiple-slots.csv
- Upload file showing attendance across Slots 2-8 on Mar 4
- Visualize: Attendance distribution across time slots
- Show: Same student (Chirag, Ishaan) with multiple swipes in different slots
- Key Insight: Can identify students' class schedule patterns

### Scenario 3: Absence Detection
- Mar 3 Slot 2: Rahul Reddy absent (expected but missing from log)
- Demonstrate: System can identify which registered students missed which classes
- Use for: Penalty calculation, attendance report generation

### Scenario 4: Data Quality
- Show handling of duplicate entries (Chirag, Ishaan)
- System design: Deduplication logic to prevent counting one student twice
- Key test: "Mark Chirag Pandey present for Slot 3 on Mar 4" - Should recognize both swipes as one attendance

---

## CSV Format Reference

```
Site | Location Name | Name | Card Id | Batch | Roll No | Provisional Roll No | Swipe Time | Swipe Type | Error Code | Pull Time | Geo Location | Controller Name
```

**Critical Fields:**
- **Roll No:** Must match database (e.g., PGP-25-001, PGPBM-25-001)
- **Batch:** Must match exact batch name (e.g., "PGDM 2025-27", "PGDM (BM) 2025-27")
- **Name:** Should match enrolled student names
- **Swipe Time:** "MMM DD YYYY HH:MM AM/PM" format (e.g., Mar 03 2026 09:05 AM)
- **Error Code:** Typically "Success" or error description (Card Error, Device Error, Network Error)

---

## Recommended Timetable Structure for Demo

### PGDM 2025-27 Core Courses - Weekly Schedule

| Day | Division A | Division B | Division C | Notes |
|-----|-----------|-----------|-----------|-------|
| **MON** | Slot 2: HRM (Dr. Nandini Shah) | Slot 3: BPS (Dr. Vinod Chopra) | Slot 4: DS (Dr. Sanjay Kulkarni) | Different divisions, different slots |
| **TUE** | Slot 3: MA (Dr. Rajesh Iyer) | Slot 4: HRM (Dr. Ashok Malhotra) | Slot 2: BPS (Dr. Lakshmi Thakur) | Rotating course-slot combinations |
| **WED** | Slot 4: DS (Dr. Rekha Joshi) | Slot 2: MA (Dr. Meena Kapoor) | Slot 3: HRM (Dr. Nandini Shah) | Avoids slot conflicts |
| **THU** | Slot 2: BPS (Dr. Vinod Chopra) | Slot 3: DS (Dr. Manoj Reddy) | Slot 4: MA (Dr. Sunil Verma) | Completes rotation |
| **FRI** | Slot 3: HRM (Dr. Ashok Malhotra) | Slot 2: DS (Dr. Sanjay Kulkarni) | Slot 3: BPS (Dr. Vinod Chopra) | Review/makeup day option |

**Legend:**
- HRM = OLS515-PDM-46: Human Resource Management
- BPS = STR507-PDM-46: Business Policy and Strategy II
- DS = QTM522-PDM-46: Decision Science
- MA = ACC506-PDM-46: Management Accounting

### PGDM (BM) 2025-27 Core Courses - Weekly Schedule

| Day | Division D | Division E | Notes |
|-----|-----------|-----------|-------|
| **MON** | Slot 5: HRM (Dr. Nandini Shah) | Slot 6: BPS (Dr. Vinod Chopra) | Afternoon/Late afternoon slots |
| **TUE** | Slot 6: MA (Dr. Rajesh Iyer) | Slot 5: HRM (Dr. Ashok Malhotra) | Different time, different faculty |
| **WED** | Slot 5: DS (Dr. Rekha Joshi) | Slot 6: MA (Dr. Meena Kapoor) | Offset from PGDM schedule |
| **THU** | Slot 6: BPS (Dr. Vinod Chopra) | Slot 5: DS (Dr. Manoj Reddy) | Consistent spacing |
| **FRI** | Slot 5: HRM (Dr. Ashok Malhotra) | Slot 5: BPS (Dr. Vinod Chopra) | Optional joint session |

**Notes:**
- PGDM (BM) uses Slots 5-6 (afternoon slots: 14:30-17:10)
- PGDM uses Slots 2-4 (morning/early afternoon: 09:00-13:20)
- Reduces facility/classroom conflicts
- Faculty teaching same course to different divisions on same day possible

### Sample Specialisation Timetable (Optional for Demo)

For students in specialisation cohorts during Term 3:

| Specialisation | Division | Course | Slot | Day | Faculty |
|---|---|---|---|---|---|
| **Finance** | FIN-A | FIN501: Corporate Valuation | Slot 2 | WED | Dr. Rajesh Iyer |
| **Finance** | FIN-B | FIN501: Corporate Valuation | Slot 2 | THU | Dr. Rajesh Iyer |
| **Finance** | FIN-A | FIN502: Security Analysis | Slot 4 | MON | Dr. Meena Kapoor |
| **Finance** | FIN-B | FIN502: Security Analysis | Slot 4 | TUE | Dr. Meena Kapoor |
| **Marketing** | MKT-A | MKT501: Consumer Behaviour | Slot 3 | MON | Dr. Priya Sharma |
| **Marketing** | MKT-B | MKT501: Consumer Behaviour | Slot 3 | TUE | Dr. Priya Sharma |
| **Marketing** | MKT-A | MKT502: Marketing Research | Slot 5 | WED | Dr. Vikram Mehta |
| **Marketing** | MKT-B | MKT502: Marketing Research | Slot 5 | THU | Dr. Vikram Mehta |
| **IM & Analytics** | IM-A | INF522: Digital Product Mgmt | Slot 2 | FRI | Dr. Arun Nair |
| **IM & Analytics** | IM-B | INF522: Digital Product Mgmt | Slot 3 | FRI | Dr. Arun Nair |
| **Operations** | OPS-A | OPS501: Service Ops Mgmt | Slot 6 | MON | Dr. Sanjay Kulkarni |
| **Operations** | OPS-B | OPS501: Service Ops Mgmt | Slot 6 | TUE | Dr. Sanjay Kulkarni |

---

## Attendance Tracking by Division & Course

### Using Demo Data with Timetable

**Example 1: Division A attendance for HRM (Monday, Slot 2)**
- From: biometric-demo-Slot2-edge-cases.csv
- Expected: All 10 Division A students should swipe
- Shows: Course attendance for specific division

**Example 2: Division D afternoon class (Slot 5, Monday)**
- From: biometric-demo-multiple-slots.csv
- Expected: All Division D students present
- Shows: PGDM (BM) time slot tracking

---

## Key Points for Demonstration

✓ **Biometric Circulation Model**
- Machine circulated after 10 min of class start
- Takes 7-10 min for all students
- All swipes within slot window = PRESENT
- No automatic "late" marking

✓ **Graceful Duplicate Handling**
- Multiple swipes logged accurately
- System deduplicates for attendance
- Both swipes visible in audit trail
- Attendance counted once per student

✓ **Cross-Slot Tracking**
- Students can have attendance across multiple slots
- Useful for: Course allocation, timetable planning
- Can show: Which students are in which classes

✓ **Attendance Accuracy**
- Precise slot mapping based on time windows
- Both slot start/end times are inclusive
- System shows exact swipe time for reference

✓ **Division & Course Mapping**
- Each division has specific course schedule
- Biometric data linked to course/slot/division
- Enables attendance reports by course and division
- Can verify which students attended which courses
