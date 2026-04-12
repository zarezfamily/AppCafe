import { csvToSet, setToCsv } from '../core/utils';

export function createMainScreenForumHandlers({
  user,
  voteWeight,
  forumReplies,
  forumThread,
  setForumThread,
  setForumThreads,
  setForumReplies,
  setForumLoading,
  setForumError,
  setForumReplyText,
  setForumReplyTo,
  setForumEditCollection,
  setForumEditTarget,
  setForumEditTitle,
  setForumEditBody,
  setForumEditOpen,
  setForumEditing,
  setForumSendingReply,
  forumThreadScrollRef,
  forumReplyInputRef,
  forumAuthorName,
  currentLevel,
  premium,
  forumReplyText,
  forumReplyTo,
  forumEditBody,
  forumEditTitle,
  forumEditCollection,
  forumEditTarget,
  forumPhoto,
  forumTitle,
  forumBody,
  forumAccessLevel,
  setForumSaving,
  setForumCreateOpen,
  setForumTitle,
  setForumBody,
  setForumAccessLevel,
  setForumPhoto,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  uploadImageToStorage,
  showDialog,
}) {
  const hasUserVotedForoItem = (item) => !!user?.uid && csvToSet(item?.voterUids).has(user.uid);
  const hasUserReportedForoItem = (item) => !!user?.uid && csvToSet(item?.reporterUids).has(user.uid);
  const isForumOwner = (item) => !!user?.uid && item?.authorUid === user.uid;

  const cargarForo = async () => {
    setForumLoading(true);
    setForumError(null);
    try {
      const [hilos, respuestas] = await Promise.all([
        getCollection('foro_hilos', 'createdAt', 300),
        getCollection('foro_respuestas', 'createdAt', 1200),
      ]);
      const canReadThread = (thread) => thread?.accessLevel !== 'registered_only' || !!user?.uid;
      const visibleThreads = (hilos || []).filter(canReadThread);
      const visibleThreadIds = new Set(visibleThreads.map((thread) => thread.id));
      const visibleReplies = (respuestas || []).filter((reply) => visibleThreadIds.has(reply.threadId));

      setForumThreads(visibleThreads);
      setForumReplies(visibleReplies);
      setForumThread((prev) => {
        if (!prev?.id) return prev;
        const updated = visibleThreads.find((thread) => thread.id === prev.id);
        return updated || null;
      });
    } catch {
      setForumError('No se pudo cargar la comunidad.');
    } finally {
      setForumLoading(false);
    }
  };

  const seleccionarFotoForo = async (pickImage) => {
    const result = await pickImage();
    if (result) {
      setForumPhoto(result);
    }
  };

  const crearHiloForo = async () => {
    const title = forumTitle.trim();
    const body = forumBody.trim();
    if (!title) return showDialog('Título vacío', 'Escribe un título para tu hilo.');
    if (title.length > 120) return showDialog('Título demasiado largo', 'Máximo 120 caracteres.');
    if (!body) return showDialog('Contenido vacío', 'Escribe algo para publicar.');
    if (body.length > 1000) return showDialog('Contenido demasiado largo', 'Máximo 1000 caracteres.');

    setForumSaving(true);
    try {
      let uploadedImage = '';
      if (forumPhoto) {
        uploadedImage = await uploadImageToStorage(forumPhoto, 'foro_hilos');
      }
      await addDocument('foro_hilos', {
        title,
        body,
        categoryId: 'general',
        accessLevel: forumAccessLevel || 'public',
        authorUid: user.uid,
        authorName: forumAuthorName,
        authorLevel: currentLevel.name,
        authorIsPremium: premium.isPremium,
        photo: uploadedImage,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        voterUids: '',
        replyCount: 0,
        reportedCount: 0,
        reporterUids: '',
      });
      setForumCreateOpen(false);
      setForumTitle('');
      setForumBody('');
      setForumAccessLevel('public');
      setForumPhoto(null);
      await cargarForo();
    } catch {
      showDialog('Error', 'No se pudo publicar el hilo.');
    } finally {
      setForumSaving(false);
    }
  };

  const votarEnForo = async (collection, item) => {
    if (!item?.id || !user?.uid) return;
    if (hasUserReportedForoItem(item)) {
      return showDialog('Acción no permitida', 'Ya reportaste este contenido. No puedes votarlo.');
    }
    const voters = csvToSet(item.voterUids);
    if (voters.has(user.uid)) return showDialog('Ya votado', 'Ya apoyaste este contenido.');
    voters.add(user.uid);
    const ok = await updateDocument(collection, item.id, {
      upvotes: Number(item.upvotes || 0) + voteWeight,
      voterUids: setToCsv(voters),
    });
    if (!ok) return showDialog('Error', 'No se pudo guardar tu voto. Inténtalo de nuevo.');
    await cargarForo();
  };

  const reportarForo = async (collection, item) => {
    if (!item?.id || !user?.uid) return;
    if (hasUserVotedForoItem(item)) {
      return showDialog('Acción no permitida', 'Ya votaste este contenido. No puedes reportarlo.');
    }
    const reporters = csvToSet(item.reporterUids);
    if (reporters.has(user.uid)) return showDialog('Reporte enviado', 'Ya reportaste este contenido.');
    reporters.add(user.uid);
    const ok = await updateDocument(collection, item.id, {
      reportedCount: Number(item.reportedCount || 0) + 1,
      reporterUids: setToCsv(reporters),
    });
    if (!ok) return showDialog('Error', 'No se pudo guardar tu reporte. Inténtalo de nuevo.');
    showDialog('Gracias', 'Reporte enviado a moderación.');
    await cargarForo();
  };

  const enviarRespuestaForo = async () => {
    if (!forumThread?.id) return;
    const text = forumReplyText.trim();
    if (!text) return;
    if (text.length > 1000) return showDialog('Respuesta demasiado larga', 'Máximo 1000 caracteres.');

    setForumSendingReply(true);
    try {
      await addDocument('foro_respuestas', {
        threadId: forumThread.id,
        parentId: forumReplyTo?.id || '',
        body: text,
        authorUid: user.uid,
        authorName: forumAuthorName,
        authorLevel: currentLevel.name,
        authorIsPremium: premium.isPremium,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        voterUids: '',
        reportedCount: 0,
        reporterUids: '',
      });
      await updateDocument('foro_hilos', forumThread.id, {
        replyCount: Number(forumThread.replyCount || 0) + 1,
      });
      setForumReplyText('');
      setForumReplyTo(null);
      await cargarForo();
    } catch {
      showDialog('Error', 'No se pudo enviar tu respuesta.');
    } finally {
      setForumSendingReply(false);
    }
  };

  const prepararRespuestaForo = (targetReply = null) => {
    setForumReplyTo(targetReply);
    requestAnimationFrame(() => {
      forumThreadScrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => forumReplyInputRef.current?.focus?.(), 120);
    });
  };

  const abrirEditorForo = (collection, item) => {
    if (!isForumOwner(item)) return;
    setForumEditCollection(collection);
    setForumEditTarget(item);
    setForumEditTitle(collection === 'foro_hilos' ? String(item.title || '') : '');
    setForumEditBody(String(item.body || ''));
    setForumEditOpen(true);
  };

  const guardarEdicionForo = async () => {
    if (!forumEditTarget?.id || !forumEditCollection) return;
    const body = forumEditBody.trim();
    if (!body) return showDialog('Contenido vacío', 'Escribe contenido para guardar.');
    if (body.length > 1000) return showDialog('Contenido demasiado largo', 'Máximo 1000 caracteres.');

    let payload = { body };
    if (forumEditCollection === 'foro_hilos') {
      const title = forumEditTitle.trim();
      if (!title) return showDialog('Título vacío', 'Escribe un título para el hilo.');
      if (title.length > 120) return showDialog('Título demasiado largo', 'Máximo 120 caracteres.');
      payload = { title, body };
    }

    setForumEditing(true);
    try {
      const ok = await updateDocument(forumEditCollection, forumEditTarget.id, payload);
      if (!ok) return showDialog('Error', 'No se pudo guardar la edición.');
      setForumEditOpen(false);
      setForumEditTarget(null);
      setForumEditCollection('');
      await cargarForo();
    } finally {
      setForumEditing(false);
    }
  };

  const eliminarItemForo = (collection, item) => {
    if (!item?.id || !isForumOwner(item)) return;
    showDialog('Eliminar', 'Esta acción no se puede deshacer. ¿Deseas continuar?', [
      { label: 'Cancelar' },
      {
        label: 'Eliminar',
        variant: 'danger',
        onPress: async () => {
          try {
            if (collection === 'foro_hilos') {
              const relatedReplies = forumReplies.filter((reply) => reply.threadId === item.id);
              if (relatedReplies.length > 0) {
                await Promise.allSettled(relatedReplies.map((reply) => deleteDocument('foro_respuestas', reply.id)));
              }
              await deleteDocument('foro_hilos', item.id);
              if (forumThread?.id === item.id) setForumThread(null);
            } else {
              const repliesToDelete = [item.id];
              if (!item.parentId) {
                forumReplies
                  .filter((reply) => reply.parentId === item.id)
                  .forEach((reply) => repliesToDelete.push(reply.id));
              }
              await Promise.allSettled(repliesToDelete.map((id) => deleteDocument('foro_respuestas', id)));
              if (forumThread?.id === item.threadId) {
                await updateDocument('foro_hilos', item.threadId, {
                  replyCount: Math.max(0, Number(forumThread.replyCount || 0) - repliesToDelete.length),
                });
              }
            }
            await cargarForo();
          } catch {
            showDialog('Error', 'No se pudo eliminar el contenido.');
          }
        },
      },
    ]);
  };

  const abrirMenuAutorForo = (collection, item) => {
    if (!isForumOwner(item)) return;
    showDialog('Opciones', 'Elige una acción', [
      { label: 'Editar', onPress: () => abrirEditorForo(collection, item) },
      { label: 'Eliminar', variant: 'danger', onPress: () => eliminarItemForo(collection, item) },
      { label: 'Cancelar' },
    ]);
  };

  return {
    cargarForo,
    hasUserVotedForoItem,
    hasUserReportedForoItem,
    isForumOwner,
    seleccionarFotoForo,
    crearHiloForo,
    votarEnForo,
    reportarForo,
    enviarRespuestaForo,
    prepararRespuestaForo,
    abrirEditorForo,
    guardarEdicionForo,
    eliminarItemForo,
    abrirMenuAutorForo,
  };
}
