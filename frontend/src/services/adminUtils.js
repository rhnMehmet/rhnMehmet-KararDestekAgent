import { resolvePlayerById, resolveTeamById } from "./api";

function isGenericEntityLabel(value, prefix) {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim();
  return new RegExp(`^${prefix}\\s*#\\d+$`, "i").test(normalized);
}

export function formatAdminDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("tr-TR");
}

export async function resolveCommentTargets(comments = []) {
  return Promise.all(
    comments.map(async (comment) => {
      try {
        if (comment.targetType === "team") {
          const resolvedTeam = await resolveTeamById(comment.targetId);
          return {
            ...comment,
            targetLabel:
              resolvedTeam?.name && !isGenericEntityLabel(resolvedTeam.name, "Takım")
                ? resolvedTeam.name
                : `Takım #${comment.targetId}`,
          };
        }

        const playerTargetId = comment.targetId || comment.playerId;
        const resolvedPlayer = await resolvePlayerById(playerTargetId);
        const resolvedPlayerName = resolvedPlayer?.name;

        return {
          ...comment,
          targetLabel:
            resolvedPlayerName && !isGenericEntityLabel(resolvedPlayerName, "Oyuncu")
              ? resolvedPlayerName
              : `Oyuncu #${playerTargetId}`,
        };
      } catch {
        return {
          ...comment,
          targetLabel:
            comment.targetType === "team"
              ? `Takım #${comment.targetId}`
              : `Oyuncu #${comment.targetId || comment.playerId}`,
        };
      }
    })
  );
}

export function getCommentTargetLabel(comment) {
  if (comment.targetType === "team") {
    return `Takım yorumu - ${comment.targetLabel || "Takım"}`;
  }

  return `Oyuncu yorumu - ${comment.targetLabel || "Oyuncu"}`;
}
