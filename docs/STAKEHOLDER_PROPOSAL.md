# Classroom Companion — Next Phase Features
## Stakeholder Proposal (10-Day Sprint)

---

## Executive Summary

We propose **three new features** to be delivered in the next 10 days that will significantly improve operational efficiency for the Programme Office and modernize the student experience.

### The Ask
- **Timeline**: 10 days (Days 1-2: stakeholder approval, Days 3-10: build and deploy)
- **Effort**: 2-3 hours per day from the dev team
- **Investment**: Minimal (building on existing infrastructure)
- **ROI**: Eliminates dozens of hours of manual timetable work + introduces AI-driven scheduling

---

## Problem Statement

### Current Pain Points

1. **Timetable Creation is Manual & Time-Consuming**
   - Office staff create timetable slots **one at a time** via the manage page
   - For a typical term: 8 slots/day × 10 divisions × 10 weeks = **800+ manual entries**
   - Each entry requires 5 clicks and name lookups
   - **Estimated effort**: 40-50 hours per term

2. **Scheduling Ad-Hoc Changes is Cumbersome**
   - No easy way to bulk-schedule: "Add Marketing on Tue/Thu slot 3 for 8 weeks"
   - Currently requires manually entering each date and time

3. **No Real-Time Updates to Students**
   - When timetable changes, students find out via email or word-of-mouth
   - Students can't see updates in the system immediately

---

## Proposed Solution: Three-Feature Roadmap

### Feature 1: Excel Timetable Bulk Upload ⭐ MUST HAVE

**What**: Download a pre-formatted Excel template, fill in timetable data, upload to auto-create slots.

**How It Works**:
1. Office clicks "Download Timetable Template"
2. Template includes:
   - Pre-filled divisions, courses, faculty, and valid slot numbers
   - Instructions and examples
3. Staff fills in: Date, Division, Course, Faculty, Slot Number (multiple rows)
4. Upload file → System validates and creates all entries at once
5. Confirmation: "Created 150 timetable slots in 2 minutes"

**Business Value**:
- ✅ Reduces 40-50 hours of manual entry to **~30 minutes**
- ✅ Eliminates click-by-click data entry
- ✅ Reduces human error (dropdown lookups built into template)
- ✅ Enables bulk term planning in one go

**Example Use Case**:
> *"PGP 2025-27 Term 2 is starting Monday. I need timetable for all 4 core divisions ready by Friday. Using the Excel upload, I can batch-create 200 slots in 30 minutes instead of 8 hours of manual work."*

**Timeline**: Days 3-4 (4-6 hours)

---

### Feature 2: AI Timetable Scheduling Agent ⭐⭐ WOW FEATURE

**What**: A conversational AI assistant that creates timetable entries from plain English descriptions.

**How It Works**:
1. Office staff opens "Schedule Assistant" in the system
2. Describes what they want in natural language:
   - *"Schedule Brand Management for Core Division A every Tuesday and Thursday in slot 3, for 8 weeks starting March 10. Faculty is Prof. Sharma."*
3. AI Agent processes the request:
   - Resolves faculty name → finds "Dr. Priya Sharma"
   - Validates course exists → finds "Brand Management"
   - Finds "Core Division A"
   - Calculates 16 dates (8 Tuesdays + 8 Thursdays)
   - Checks for conflicts (other courses/faculty in that slot)
   - Creates entries automatically
4. Confirms: *"✓ Created 16 Brand Management sessions. Note: Prof. Sharma has a conflict on April 14, skipped."*

**Why This Matters**:
- **Innovation**: First AI-powered feature in Classroom Companion → demonstrates tech leadership
- **Operational**: Eliminates the Excel step for ad-hoc scheduling
- **User Experience**: Feels like a personal assistant helping you plan
- **Demo-able**: Very impressive to show to faculty/administration

**Business Value**:
- ✅ Makes ad-hoc scheduling instant (conversational vs. clicking around)
- ✅ Handles date calculations automatically (no mental math)
- ✅ Prevents conflicts (AI checks before creating)
- ✅ Positions SPJIMR as forward-thinking on AI

**Example Use Cases**:
> *"Oh, we need an extra elective session. Instead of downloading the template and re-uploading, I just tell the AI: 'Add Finance Elective for Spec Division MKT-A next Monday in slot 5 for 4 weeks' and it's done."*

> *"The Dean wants to see how AI can improve our operations. This feature is a perfect demo of that."*

**Timeline**: Days 5-7 (9-11 hours)

---

### Feature 3: Student Timetable Notifications 📢 NICE TO HAVE

**What**: In-app notification bell that alerts students when their timetable is updated.

**How It Works**:
1. When office adds/modifies a timetable slot for a student's division:
   - A notification is created in the system
   - Student sees a **notification badge** (red dot) in their sidebar
2. Student clicks the bell → sees recent updates:
   - *"New session added: Brand Management, Tuesday 3 PM, Classroom A2"*
   - *"Time change: Finance moved from Thu 2 PM to Thu 4 PM"*
3. Marks as read once viewed

**Business Value**:
- ✅ Students no longer miss timetable changes
- ✅ Reduces confusion and late arrivals
- ✅ Modern UX (students expect notifications)
- ✅ Can be extended to email later

**Timeline**: Days 8-9 (if time permits, 4-5 hours)

---

## Why Now? Why These Features?

| Feature | Problem Solved | Impact | Priority |
|---------|---|---|---|
| Excel Upload | Manual timetable creation | Save 40+ hours per term | Must Have |
| AI Agent | Ad-hoc scheduling friction | Demo-able innovation | Must Have |
| Notifications | Students miss updates | Student engagement | Nice to Have |

**Narrative for Stakeholders**:
> *"We're modernizing how the Programme Office manages the timetable. Feature 1 saves massive operational hours. Feature 2 showcases AI as a tool to augment human decision-making—not replace it. Feature 3 keeps students in the loop."*

---

## Timeline & Deliverables

### Week 1 (Days 1-2): Proposal & Approval
- Stakeholder review and feedback
- **Go/No-go decision**

### Week 1-2 (Days 3-10): Development
| Days | Feature | Deliverable |
|------|---------|------------|
| 3-4 | Excel Upload | Template download + bulk upload API, Test with 50+ timetable entries |
| 5-7 | AI Agent | Chat UI in manage page, Test conflict detection, Demonstrate on 3 scenarios |
| 8-9 | Notifications | Bell icon + dropdown, Test with timetable changes |
| 10 | QA & Deploy | Vercel deployment, Documentation, Training for office staff |

### Deployment
- **Vercel**: Zero-downtime deployment (Feature flags if needed)
- **Rollback**: Each feature can be disabled independently
- **Monitoring**: Error logging and performance tracking

---

## Technical Feasibility

### Why This is Feasible in 10 Days

✅ **Reuses Existing Code**:
- Excel upload pattern already exists (student bulk import)
- Timetable API already exists (just adding bulk operations)
- No new databases needed
- No external integrations required (AI via Claude API, already in use)

✅ **Proven Architecture**:
- Next.js 16 app with React 19
- Prisma ORM (already handling timetable queries)
- Tailwind CSS (UI components ready)
- `xlsx` library (already installed for biometric uploads)

✅ **Low Risk**:
- Features are isolated (no cross-system dependencies)
- Can be tested independently
- Can be deployed feature-by-feature

---

## What Success Looks Like

### Success Metrics

| Feature | Success Criterion |
|---------|--|
| Excel Upload | Office staff can bulk-create 100+ timetable entries in under 5 minutes |
| AI Agent | Conversational scheduling works for 5 different scheduling scenarios with zero errors |
| Notifications | Students see notification bell within 5 seconds of timetable change |

### User Testing
- Beta test with 2-3 office staff members on Day 8
- Gather feedback and iterate if needed
- Office approval before full rollout

---

## What We're NOT Changing

✅ **No disruption to existing features**
- Student dashboard: Unchanged
- Attendance marking: Unchanged
- Biometric uploads: Unchanged
- Login/authentication: Unchanged

✅ **No data migration needed**

✅ **Backward compatible**: All existing timetables continue to work

---

## Investment & Resources

| Item | Details |
|------|---------|
| **Dev Time** | 2-3 hours/day × 10 days |
| **Stakeholder Time** | ~30 min (this proposal + approval) + 30 min (demo on Day 10) |
| **Infrastructure** | Zero new costs (Vercel, Claude API already in budget) |
| **Training** | 15 min walkthrough for office staff (included in delivery) |

---

## Questions for Stakeholders

1. **Are you okay with the timeline (10 days)?** Or do we need longer?
2. **Priority**: If we run short on time, should we deliver Excel Upload + Notifications, or Excel Upload + AI Agent?
3. **AI Feature Comfort Level**: Are you comfortable with AI-assisted scheduling, or does this require additional approval from IT/administration?
4. **Go-Live Date**: Should we deploy all features at once on Day 10, or stagger them?
5. **Student Communication**: Should we send a student announcement about the notification feature?

---

## Next Steps

### If Approved:
1. **Day 1-2**: Finalize requirements (30 min meeting)
2. **Day 3**: Development starts
3. **Day 8**: Internal QA + office staff testing
4. **Day 9**: Refinements based on feedback
5. **Day 10**: Deploy to production + demo to stakeholders

### If Not Approved:
- Feedback incorporated into future roadmap

---

## Appendix: Mock-Ups & Examples

### Excel Template Preview
```
Division          | Course                | Faculty           | Date       | Slot
Core Division A   | Brand Management      | Dr. Priya Sharma  | 2026-03-10 | 3
Core Division A   | Brand Management      | Dr. Priya Sharma  | 2026-03-12 | 3
Core Division A   | Brand Management      | Dr. Priya Sharma  | 2026-03-17 | 3
...
```

### AI Agent Chat Example
```
Office: "Schedule Financial Analysis for Spec Division FIN-A,
         Mondays and Wednesdays in slot 4, starting March 17
         for 6 weeks. Faculty: Prof. Mehta"

Agent: ✓ Resolving...
       ✓ Found course: Financial Analysis (3 credits)
       ✓ Found faculty: Prof. Ravi Mehta
       ✓ Found division: Spec Division FIN-A (Finance)
       ✓ Calculating 12 dates (Mar 17, 19, 24, 26, 31, Apr 2, 7, 9, 14, 16, 21, 23)
       ✓ Checking conflicts...
       ✓ No conflicts found

       Created 12 Financial Analysis sessions for FIN-A with Prof. Mehta
       Next available: Friday slot 2 for any additional courses
```

### Notification Bell Preview
```
[🔔 3] ← Red badge with count

Click to expand:
─────────────────────────────────────
✓ New: Brand Management - Tue 3:00 PM (15 min ago)
✓ Updated: Finance - Time changed to Thu 4:00 PM (2 hours ago)
✓ New: Case Study Workshop - Mon 2:00 PM (yesterday)
─────────────────────────────────────
Mark all as read
```

---

## Contact & Questions

**Prepared by**: Development Team
**Date**: [Today's Date]
**Next Meeting**: [Proposed Approval Meeting Date]

For technical questions, please contact the development team.
For business questions, please contact [Program Director].

---

**This proposal is ready for stakeholder review and approval.**
