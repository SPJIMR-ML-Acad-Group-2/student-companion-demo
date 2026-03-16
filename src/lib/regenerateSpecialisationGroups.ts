import { prisma } from "@/lib/prisma";

type GroupRecord = {
  id: string;
  name: string;
  batchId: string;
  type: string;
  specialisationId: string | null;
  erpGroupCode: string | null;
  allowedBatches: Array<{ batchId: string }>;
  members: Array<{ studentId: string; student: { batchId: string } }>;
  courseGroups: Array<{ courseId: string }>;
  timetable: Array<{
    id: string;
    date: string;
    slotNumber: number;
    courseId: string;
    facultyId: string | null;
    roomId: string | null;
    activityType: string;
    sessionNumber: number | null;
    visibility: string;
    isConducted: boolean;
  }>;
  draftTimetable: Array<{
    id: string;
    date: string;
    slotNumber: number;
    courseId: string;
    facultyId: string | null;
    roomId: string | null;
    activityType: string;
  }>;
};

type DraftEntryComparable = {
  courseId: string;
  facultyId: string | null;
  roomId: string | null;
  activityType: string;
};

type TimetableEntryComparable = DraftEntryComparable & {
  sessionNumber: number | null;
  visibility: string;
  isConducted: boolean;
};

export type SpecialisationRegenerationResult = {
  canonicalGroups: number;
  createdAllowedBatchLinks: number;
  movedStudentMemberships: number;
  movedTimetableEntries: number;
  movedDraftEntries: number;
  deletedDuplicateGroups: number;
  skippedDuplicateGroups: number;
  linkedCourseGroups: number;
  removedStaleCourseGroups: number;
};

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

function allowedBatchIds(group: {
  batchId: string;
  allowedBatches?: Array<{ batchId: string }>;
}) {
  const explicit = group.allowedBatches?.map((link) => link.batchId) ?? [];
  return uniqueIds([group.batchId, ...explicit]);
}

function timetableEntriesMatch(
  left: TimetableEntryComparable,
  right: TimetableEntryComparable,
) {
  return (
    left.courseId === right.courseId &&
    left.facultyId === right.facultyId &&
    left.roomId === right.roomId &&
    left.activityType === right.activityType &&
    left.sessionNumber === right.sessionNumber &&
    left.visibility === right.visibility &&
    left.isConducted === right.isConducted
  );
}

function draftEntriesMatch(
  left: DraftEntryComparable,
  right: DraftEntryComparable,
) {
  return (
    left.courseId === right.courseId &&
    left.facultyId === right.facultyId &&
    left.roomId === right.roomId &&
    left.activityType === right.activityType
  );
}

export async function regenerateSpecialisationGroups() {
  const result: SpecialisationRegenerationResult = {
    canonicalGroups: 0,
    createdAllowedBatchLinks: 0,
    movedStudentMemberships: 0,
    movedTimetableEntries: 0,
    movedDraftEntries: 0,
    deletedDuplicateGroups: 0,
    skippedDuplicateGroups: 0,
    linkedCourseGroups: 0,
    removedStaleCourseGroups: 0,
  };

  const groups = (await prisma.group.findMany({
    where: {
      type: "specialisation",
      specialisationId: { not: null },
    },
    include: {
      allowedBatches: { select: { batchId: true } },
      members: {
        include: { student: { select: { batchId: true } } },
      },
      courseGroups: { select: { courseId: true } },
      timetable: {
        select: {
          id: true,
          date: true,
          slotNumber: true,
          courseId: true,
          facultyId: true,
          roomId: true,
          activityType: true,
          sessionNumber: true,
          visibility: true,
          isConducted: true,
        },
      },
      draftTimetable: {
        select: {
          id: true,
          date: true,
          slotNumber: true,
          courseId: true,
          facultyId: true,
          roomId: true,
          activityType: true,
        },
      },
    },
    orderBy: [{ name: "asc" }, { batchId: "asc" }],
  })) as GroupRecord[];

  const clusters = new Map<string, GroupRecord[]>();
  for (const group of groups) {
    const key = `${group.specialisationId}:${group.name}`;
    const current = clusters.get(key) ?? [];
    current.push(group);
    clusters.set(key, current);
  }

  for (const cluster of clusters.values()) {
    const sorted = [...cluster].sort((left, right) => {
      const leftScore =
        left.members.length +
        left.timetable.length * 10 +
        left.draftTimetable.length * 5 +
        (left.erpGroupCode ? 1 : 0);
      const rightScore =
        right.members.length +
        right.timetable.length * 10 +
        right.draftTimetable.length * 5 +
        (right.erpGroupCode ? 1 : 0);
      return rightScore - leftScore;
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    result.canonicalGroups += 1;

    const targetAllowedBatchIds = uniqueIds(
      cluster.flatMap((group) => [
        group.batchId,
        ...group.allowedBatches.map((link) => link.batchId),
        ...group.members.map((member) => member.student.batchId),
      ]),
    );
    const existingAllowedBatchIds = new Set(allowedBatchIds(canonical));
    const missingAllowedBatchIds = targetAllowedBatchIds.filter(
      (batchId) => !existingAllowedBatchIds.has(batchId),
    );
    if (missingAllowedBatchIds.length > 0) {
      await prisma.group.update({
        where: { id: canonical.id },
        data: {
          allowedBatches: {
            create: missingAllowedBatchIds.map((batchId) => ({ batchId })),
          },
        },
      });
      result.createdAllowedBatchLinks += missingAllowedBatchIds.length;
    }

    if (!canonical.erpGroupCode) {
      const inheritedErpGroupCode = duplicates.find(
        (group) => group.erpGroupCode,
      )?.erpGroupCode;
      if (inheritedErpGroupCode) {
        await prisma.group.update({
          where: { id: canonical.id },
          data: { erpGroupCode: inheritedErpGroupCode },
        });
      }
    }

    for (const duplicate of duplicates) {
      if (duplicate.members.length > 0) {
        for (const member of duplicate.members) {
          const existingMembership = await prisma.studentGroup.findUnique({
            where: {
              studentId_groupId: {
                studentId: member.studentId,
                groupId: canonical.id,
              },
            },
          });
          if (!existingMembership) {
            await prisma.studentGroup.create({
              data: {
                studentId: member.studentId,
                groupId: canonical.id,
              },
            });
          }
        }
        await prisma.studentGroup.deleteMany({
          where: { groupId: duplicate.id },
        });
        result.movedStudentMemberships += duplicate.members.length;
      }

      if (duplicate.courseGroups.length > 0) {
        for (const courseGroup of duplicate.courseGroups) {
          const existingCourseGroup = await prisma.courseGroup.findUnique({
            where: {
              courseId_groupId: {
                courseId: courseGroup.courseId,
                groupId: canonical.id,
              },
            },
          });
          if (!existingCourseGroup) {
            await prisma.courseGroup.create({
              data: {
                courseId: courseGroup.courseId,
                groupId: canonical.id,
              },
            });
          }
        }
        await prisma.courseGroup.deleteMany({
          where: { groupId: duplicate.id },
        });
      }

      let canDeleteDuplicate = true;

      for (const draftEntry of duplicate.draftTimetable) {
        const conflictingEntry = await prisma.draftTimetable.findFirst({
          where: {
            groupId: canonical.id,
            date: draftEntry.date,
            slotNumber: draftEntry.slotNumber,
          },
          select: {
            id: true,
            courseId: true,
            facultyId: true,
            roomId: true,
            activityType: true,
          },
        });

        if (!conflictingEntry) {
          await prisma.draftTimetable.update({
            where: { id: draftEntry.id },
            data: { groupId: canonical.id },
          });
          result.movedDraftEntries += 1;
          continue;
        }

        if (draftEntriesMatch(draftEntry, conflictingEntry)) {
          await prisma.draftTimetable.delete({ where: { id: draftEntry.id } });
          result.movedDraftEntries += 1;
          continue;
        }

        canDeleteDuplicate = false;
      }

      for (const timetableEntry of duplicate.timetable) {
        const conflictingEntry = await prisma.timetable.findFirst({
          where: {
            groupId: canonical.id,
            date: timetableEntry.date,
            slotNumber: timetableEntry.slotNumber,
          },
          select: {
            id: true,
            courseId: true,
            facultyId: true,
            roomId: true,
            activityType: true,
            sessionNumber: true,
            visibility: true,
            isConducted: true,
          },
        });

        if (!conflictingEntry) {
          await prisma.timetable.update({
            where: { id: timetableEntry.id },
            data: { groupId: canonical.id },
          });
          result.movedTimetableEntries += 1;
          continue;
        }

        if (timetableEntriesMatch(timetableEntry, conflictingEntry)) {
          await prisma.timetable.delete({ where: { id: timetableEntry.id } });
          result.movedTimetableEntries += 1;
          continue;
        }

        canDeleteDuplicate = false;
      }

      const remainingTimetableCount = await prisma.timetable.count({
        where: { groupId: duplicate.id },
      });
      const remainingDraftCount = await prisma.draftTimetable.count({
        where: { groupId: duplicate.id },
      });
      if (
        !canDeleteDuplicate ||
        remainingTimetableCount > 0 ||
        remainingDraftCount > 0
      ) {
        result.skippedDuplicateGroups += 1;
        continue;
      }

      await prisma.group.update({
        where: { id: duplicate.id },
        data: { allowedBatches: { deleteMany: {} } },
      });
      await prisma.group.delete({ where: { id: duplicate.id } });
      result.deletedDuplicateGroups += 1;
    }
  }

  const currentSpecialisationGroups = await prisma.group.findMany({
    where: {
      type: "specialisation",
      specialisationId: { not: null },
    },
    include: { allowedBatches: { select: { batchId: true } } },
  });
  const groupsBySpecialisation = new Map<
    string,
    typeof currentSpecialisationGroups
  >();
  for (const group of currentSpecialisationGroups) {
    if (!group.specialisationId) continue;
    const current = groupsBySpecialisation.get(group.specialisationId) ?? [];
    current.push(group);
    groupsBySpecialisation.set(group.specialisationId, current);
  }

  const specialisationCourses = await prisma.course.findMany({
    where: {
      type: "specialisation",
      specialisationId: { not: null },
    },
    include: {
      courseTerms: { include: { term: { select: { batchId: true } } } },
      courseGroups: {
        include: {
          group: {
            select: {
              id: true,
              type: true,
              specialisationId: true,
            },
          },
        },
      },
    },
  });

  for (const course of specialisationCourses) {
    if (!course.specialisationId) continue;
    const termBatchIds = uniqueIds(
      course.courseTerms.map((courseTerm) => courseTerm.term.batchId),
    );
    const eligibleGroups =
      groupsBySpecialisation.get(course.specialisationId)?.filter((group) => {
        if (termBatchIds.length === 0) return true;
        return allowedBatchIds(group).some((batchId) =>
          termBatchIds.includes(batchId),
        );
      }) ?? [];
    const desiredGroupIds = eligibleGroups.map((group) => group.id);
    const existingSpecialisationGroupIds = course.courseGroups
      .filter((courseGroup) => courseGroup.group.type === "specialisation")
      .map((courseGroup) => courseGroup.group.id);
    const staleGroupIds = existingSpecialisationGroupIds.filter(
      (groupId) => !desiredGroupIds.includes(groupId),
    );
    if (staleGroupIds.length > 0) {
      await prisma.courseGroup.deleteMany({
        where: {
          courseId: course.id,
          groupId: { in: staleGroupIds },
        },
      });
      result.removedStaleCourseGroups += staleGroupIds.length;
    }

    const missingGroupIds = desiredGroupIds.filter(
      (groupId) => !existingSpecialisationGroupIds.includes(groupId),
    );
    if (missingGroupIds.length > 0) {
      for (const groupId of missingGroupIds) {
        await prisma.courseGroup.create({
          data: {
            courseId: course.id,
            groupId,
          },
        });
      }
      result.linkedCourseGroups += missingGroupIds.length;
    }
  }

  return result;
}
