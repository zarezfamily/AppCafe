import { useMemo, useRef, useState } from 'react';

export default function useForumState() {
  const [forumCategory, setForumCategory] = useState(null);
  const [forumThread, setForumThread] = useState(null);
  const [forumSort, setForumSort] = useState('top');
  const [forumThreads, setForumThreads] = useState([]);
  const [forumReplies, setForumReplies] = useState([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [forumError, setForumError] = useState(null);
  const [forumCreateOpen, setForumCreateOpen] = useState(false);
  const [forumSaving, setForumSaving] = useState(false);
  const [forumTitle, setForumTitle] = useState('');
  const [forumBody, setForumBody] = useState('');
  const [forumAccessLevel, setForumAccessLevel] = useState('public');
  const [forumPhoto, setForumPhoto] = useState(null);
  const [forumEditOpen, setForumEditOpen] = useState(false);
  const [forumEditing, setForumEditing] = useState(false);
  const [forumEditTarget, setForumEditTarget] = useState(null);
  const [forumEditCollection, setForumEditCollection] = useState('');
  const [forumEditTitle, setForumEditTitle] = useState('');
  const [forumEditBody, setForumEditBody] = useState('');
  const [forumReplyText, setForumReplyText] = useState('');
  const [forumReplyTo, setForumReplyTo] = useState(null);
  const [forumSendingReply, setForumSendingReply] = useState(false);

  const forumThreadScrollRef = useRef(null);
  const forumReplyInputRef = useRef(null);

  const forumThreadsByCategory = useMemo(() => (
    forumCategory
      ? forumThreads
          .filter((t) => t.categoryId === forumCategory.id)
          .sort((a, b) => {
            if (forumSort === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
            return (b.upvotes || 0) - (a.upvotes || 0);
          })
      : []
  ), [forumCategory, forumThreads, forumSort]);

  const forumRepliesByThread = useMemo(() => (
    forumThread
      ? forumReplies.filter((r) => r.threadId === forumThread.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : []
  ), [forumThread, forumReplies]);

  const forumTopReplies = useMemo(() => forumRepliesByThread.filter((r) => !r.parentId), [forumRepliesByThread]);

  return {
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumSort,
    setForumSort,
    forumThreads,
    setForumThreads,
    forumReplies,
    setForumReplies,
    forumLoading,
    setForumLoading,
    forumError,
    setForumError,
    forumCreateOpen,
    setForumCreateOpen,
    forumSaving,
    setForumSaving,
    forumTitle,
    setForumTitle,
    forumBody,
    setForumBody,
    forumAccessLevel,
    setForumAccessLevel,
    forumPhoto,
    setForumPhoto,
    forumEditOpen,
    setForumEditOpen,
    forumEditing,
    setForumEditing,
    forumEditTarget,
    setForumEditTarget,
    forumEditCollection,
    setForumEditCollection,
    forumEditTitle,
    setForumEditTitle,
    forumEditBody,
    setForumEditBody,
    forumReplyText,
    setForumReplyText,
    forumReplyTo,
    setForumReplyTo,
    forumSendingReply,
    setForumSendingReply,
    forumThreadScrollRef,
    forumReplyInputRef,
    forumThreadsByCategory,
    forumRepliesByThread,
    forumTopReplies,
  };
}
