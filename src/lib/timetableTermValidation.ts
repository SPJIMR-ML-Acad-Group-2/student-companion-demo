import { prisma } from "@/lib/prisma";

function getAllowedBatchIds(group: {
  batchId: string;
  allowedBatches?: Array<{ batchId: string }>;
}) {
  const allowed = group.allowedBatches?.map((link) => link.batchId) ?? [];
  return allowed.length > 0 ? allowed : [group.batchId];
}

export async function validateTimetableTermAssignment(input: {
  termId?: string | null;
  courseId: string;
  date: string;
  divisionId?: string | null;
  groupId?: string | null;
}) {
  const { termId, courseId, date, divisionId, groupId } = input;

  if (!termId) return { error: "termId is required" };

  const term = await prisma.term.findUnique({
    where: { id: termId },
    select: {
      id: true,
      name: true,
      batchId: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!term) return { error: "Selected term was not found" };

  if (term.startDate && date < term.startDate) {
    return {
      error: `Date is before ${term.name} start date (${term.startDate})`,
    };
  }
  if (term.endDate && date > term.endDate) {
    return {
      error: `Date is after ${term.name} end date (${term.endDate})`,
    };
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      courseTerms: { some: { termId: term.id } },
    },
    select: { id: true },
  });
  if (!course) {
    return { error: "Selected course is not offered in the selected term" };
  }

  if (divisionId) {
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: { id: true, batchId: true },
    });
    if (!division) return { error: "Selected division was not found" };
    if (division.batchId !== term.batchId) {
      return {
        error: "Selected division does not belong to the selected term batch",
      };
    }
  }

  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { allowedBatches: true },
    });
    if (!group) return { error: "Selected group was not found" };
    if (!getAllowedBatchIds(group).includes(term.batchId)) {
      return {
        error: "Selected group is not allowed for the selected term batch",
      };
    }
  }

  return { term };
}
