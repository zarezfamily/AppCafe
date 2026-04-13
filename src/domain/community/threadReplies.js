export function buildThreadReplySections(forumTopReplies, forumRepliesByThread) {
  return forumTopReplies.map((reply) => ({
    reply,
    childReplies: forumRepliesByThread.filter((item) => item.parentId === reply.id).slice(0, 50),
  }));
}
