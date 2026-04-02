import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CommunityTab({
  s,
  theme,
  premiumAccent,
  forumCategories,
  forumCategory,
  setForumCategory,
  forumThread,
  setForumThread,
  forumCreateOpen,
  setForumCreateOpen,
  forumSort,
  setForumSort,
  forumLoading,
  forumThreadsByCategory,
  forumError,
  formatRelativeTime,
  forumThreadScrollRef,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
  forumTopReplies,
  forumRepliesByThread,
  prepararRespuestaForo,
  setForumReplyTo,
  forumReplyTo,
  forumReplyInputRef,
  forumReplyText,
  setForumReplyText,
  enviarRespuestaForo,
  forumSendingReply,
  forumTitle,
  setForumTitle,
  forumBody,
  setForumBody,
  forumPhoto,
  seleccionarFotoForo,
  crearHiloForo,
  forumSaving,
  forumEditOpen,
  setForumEditOpen,
  forumEditCollection,
  forumEditTitle,
  setForumEditTitle,
  forumEditBody,
  setForumEditBody,
  guardarEdicionForo,
  forumEditing,
}) {
  return (
    <View style={{ flex: 1 }}>
      {!forumCategory && (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={s.pageTitle}>Comunidad</Text>
            <Text style={s.sectionSub}>Elige una categoría para ver hilos.</Text>
          </View>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {forumCategories.map((cat) => (
              <TouchableOpacity key={cat.id} style={s.forumCategoryCard} onPress={() => setForumCategory(cat)} activeOpacity={0.88}>
                <Text style={s.forumCatEmoji}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.forumCatTitle}>{cat.label}</Text>
                  <Text style={s.forumCatDesc}>{cat.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.icon.inactive} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {forumCategory && !forumThread && (
        <View style={{ flex: 1 }}>
          <View style={s.forumHeaderRow}>
            <TouchableOpacity onPress={() => setForumCategory(null)} style={s.backRow}>
              <Ionicons name="chevron-back" size={20} color={premiumAccent} />
              <Text style={s.backText}>Categorías</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.forumNewBtn} onPress={() => setForumCreateOpen(true)}>
              <Text style={s.forumNewBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={s.sectionTitle}>{forumCategory.emoji} {forumCategory.label}</Text>
            <View style={s.forumSortRow}>
              <TouchableOpacity style={[s.forumSortChip, forumSort === 'top' && s.forumSortChipActive]} onPress={() => setForumSort('top')}>
                <Text style={[s.forumSortText, forumSort === 'top' && s.forumSortTextActive]}>Más votados</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.forumSortChip, forumSort === 'recent' && s.forumSortChipActive]} onPress={() => setForumSort('recent')}>
                <Text style={[s.forumSortText, forumSort === 'recent' && s.forumSortTextActive]}>Más recientes</Text>
              </TouchableOpacity>
            </View>
          </View>
          {forumLoading ? (
            <ActivityIndicator color={premiumAccent} style={{ marginTop: 24 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 10 }}>
              {forumThreadsByCategory.map((thread) => (
                <TouchableOpacity key={thread.id} style={s.forumThreadCard} activeOpacity={0.9} onPress={() => setForumThread(thread)}>
                  <Text style={s.forumThreadTitle} numberOfLines={2}>{thread.title}</Text>
                  <Text style={s.forumThreadBody} numberOfLines={2}>{thread.body}</Text>
                  <View style={s.forumMetaRow}>
                    <View style={s.forumAuthorRow}>
                      <View style={s.forumAvatar}><Text style={s.forumAvatarText}>{(thread.authorName || '?')[0]?.toUpperCase() || '?'}</Text></View>
                      <View>
                        <Text style={s.forumAuthorName}>{thread.authorName || 'Usuario'}</Text>
                        <Text style={s.forumAuthorLevel}>{thread.authorLevel || 'Novato'}</Text>
                      </View>
                    </View>
                    <Text style={s.forumMetaText}>{formatRelativeTime(thread.createdAt)}</Text>
                  </View>
                  <View style={s.forumCountersRow}>
                    <Text style={s.forumCounter}>💬 {thread.replyCount || 0}</Text>
                    <Text style={s.forumCounter}>❤️ {thread.upvotes || 0}</Text>
                    <Text style={s.forumCounter}>💔 {thread.reportedCount || 0}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {!forumLoading && forumThreadsByCategory.length === 0 && <Text style={s.empty}>Todavía no hay hilos en esta categoría.</Text>}
              {!!forumError && <Text style={s.empty}>{forumError}</Text>}
            </ScrollView>
          )}
        </View>
      )}

      {forumCategory && forumThread && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
        >
          <View style={s.forumHeaderRow}>
            <TouchableOpacity onPress={() => { setForumThread(null); setForumReplyTo(null); }} style={s.backRow}>
              <Ionicons name="chevron-back" size={20} color={premiumAccent} />
              <Text style={s.backText}>Hilos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={forumThreadScrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
          >
            {(() => {
              const threadUserVoted = hasUserVotedForoItem(forumThread);
              const threadUserReported = hasUserReportedForoItem(forumThread);
              return (
                <View style={s.forumMainPost}>
                  <View style={s.forumMainPostHead}>
                    <Text style={s.forumThreadTitle}>{forumThread.title}</Text>
                    {isForumOwner(forumThread) && (
                      <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_hilos', forumThread)}>
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.brand.accentDeep} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.forumThreadBody}>{forumThread.body}</Text>
                  {!!forumThread.image && <Image source={{ uri: forumThread.image }} style={s.forumMainPostImage} resizeMode="cover" />}
                  <View style={s.forumCountersRow}>
                    <Text style={s.forumCounter}>❤️ {forumThread.upvotes || 0}</Text>
                    <Text style={s.forumCounter}>💬 {forumThread.replyCount || 0}</Text>
                    <Text style={s.forumCounter}>💔 {forumThread.reportedCount || 0}</Text>
                    <Text style={s.forumMetaText}>{formatRelativeTime(forumThread.createdAt)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[s.forumActionBtn, (threadUserVoted || threadUserReported) && s.forumActionBtnDisabled]}
                      onPress={() => votarEnForo('foro_hilos', forumThread)}
                      disabled={threadUserVoted || threadUserReported}
                    >
                      <Text style={[s.forumActionText, (threadUserVoted || threadUserReported) && s.forumActionTextDisabled]}>❤️ INTERESANTE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.forumActionBtn, (threadUserReported || threadUserVoted) && s.forumActionBtnDisabled]}
                      onPress={() => reportarForo('foro_hilos', forumThread)}
                      disabled={threadUserReported || threadUserVoted}
                    >
                      <Text style={[s.forumActionText, (threadUserReported || threadUserVoted) && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 10 }]}>Respuestas</Text>
            {forumTopReplies.map((reply) => {
              const childReplies = forumRepliesByThread.filter((r) => r.parentId === reply.id).slice(0, 50);
              const replyUserReported = hasUserReportedForoItem(reply);
              return (
                <View key={reply.id} style={s.forumReplyCard}>
                  <View style={s.forumMetaRow}>
                    <View style={s.forumAuthorRow}>
                      <View style={s.forumAvatar}><Text style={s.forumAvatarText}>{(reply.authorName || '?')[0]?.toUpperCase() || '?'}</Text></View>
                      <View>
                        <Text style={s.forumAuthorName}>{reply.authorName || 'Usuario'}</Text>
                        <Text style={s.forumAuthorLevel}>{reply.authorLevel || 'Novato'}</Text>
                      </View>
                    </View>
                    <View style={s.forumMetaActions}>
                      <Text style={s.forumMetaText}>{formatRelativeTime(reply.createdAt)}</Text>
                      {isForumOwner(reply) && (
                        <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_respuestas', reply)}>
                          <Ionicons name="ellipsis-vertical" size={16} color={theme.brand.accentDeep} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={s.forumThreadBody}>{reply.body}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => prepararRespuestaForo(reply)}><Text style={s.forumActionText}>↩ Responder</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => reportarForo('foro_respuestas', reply)} disabled={replyUserReported}><Text style={[s.forumActionText, replyUserReported && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ {reply.reportedCount || 0}</Text></TouchableOpacity>
                  </View>

                  {childReplies.map((child) => (
                    <View key={child.id} style={s.forumChildReplyCard}>
                      <View style={s.forumMetaRow}>
                        <Text style={s.forumAuthorName}>{child.authorName || 'Usuario'}</Text>
                        <View style={s.forumMetaActions}>
                          <Text style={s.forumMetaText}>{formatRelativeTime(child.createdAt)}</Text>
                          {isForumOwner(child) && (
                            <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_respuestas', child)}>
                              <Ionicons name="ellipsis-vertical" size={15} color={theme.brand.accentDeep} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={s.forumThreadBody}>{child.body}</Text>
                      {(() => {
                        const childUserReported = hasUserReportedForoItem(child);
                        return (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                            <TouchableOpacity onPress={() => reportarForo('foro_respuestas', child)} disabled={childUserReported}><Text style={[s.forumActionText, childUserReported && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ {child.reportedCount || 0}</Text></TouchableOpacity>
                          </View>
                        );
                      })()}
                    </View>
                  ))}
                </View>
              );
            })}
            {forumTopReplies.length === 0 && <Text style={s.empty}>Sé el primero en responder.</Text>}
          </ScrollView>

          <View style={s.forumComposerWrap}>
            {!!forumReplyTo && (
              <View style={s.forumReplyingTag}>
                <Text style={s.forumReplyingText}>Respondiendo a {forumReplyTo.authorName}</Text>
                <TouchableOpacity onPress={() => setForumReplyTo(null)}><Ionicons name="close" size={16} color={theme.icon.inactive} /></TouchableOpacity>
              </View>
            )}
            <View style={s.forumComposerRow}>
              <TextInput
                ref={forumReplyInputRef}
                style={s.forumComposerInput}
                placeholder="Escribe tu respuesta..."
                placeholderTextColor="#9e958d"
                value={forumReplyText}
                onChangeText={setForumReplyText}
                multiline
              />
              <TouchableOpacity style={s.forumSendBtn} onPress={enviarRespuestaForo} disabled={forumSendingReply}>
                {forumSendingReply ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={forumCreateOpen} animationType="slide" transparent onRequestClose={() => setForumCreateOpen(false)}>
        <KeyboardAvoidingView
          style={s.forumModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={s.forumModalCard}>
              <Text style={s.sectionTitle}>Nuevo hilo</Text>
              <Text style={s.sectionSub}>{forumCategory?.label || 'Comunidad'}</Text>
              <Text style={[s.label, { marginTop: 4 }]}>Título</Text>
              <TextInput
                style={s.input}
                value={forumTitle}
                onChangeText={(v) => setForumTitle(v.slice(0, 120))}
                placeholder="Máximo 120 caracteres"
                placeholderTextColor="#b3a9a0"
              />
              <Text style={[s.label, { marginTop: -6 }]}>Contenido</Text>
              <TextInput
                style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
                value={forumBody}
                onChangeText={(v) => setForumBody(v.slice(0, 1000))}
                placeholder="Comparte tu experiencia cafetera..."
                placeholderTextColor="#b3a9a0"
                multiline
              />
              <Text style={s.forumCountText}>{forumTitle.length}/120 · {forumBody.length}/1000</Text>
              <TouchableOpacity style={s.faceIdBtn} onPress={seleccionarFotoForo}>
                <Ionicons name="image-outline" size={18} color={theme.brand.accentDeep} />
                <Text style={s.faceIdText}>{forumPhoto ? 'Cambiar foto' : 'Añadir foto opcional'}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
                <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={() => setForumCreateOpen(false)}>
                  <Text style={s.authSecondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.redBtn, { flex: 1, marginTop: 0 }]} onPress={crearHiloForo} disabled={forumSaving}>
                  {forumSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Publicar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={forumEditOpen} animationType="slide" transparent onRequestClose={() => setForumEditOpen(false)}>
        <KeyboardAvoidingView
          style={s.forumModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={s.forumModalCard}>
              <Text style={s.sectionTitle}>{forumEditCollection === 'foro_hilos' ? 'Editar hilo' : 'Editar respuesta'}</Text>
              {forumEditCollection === 'foro_hilos' && (
                <>
                  <Text style={[s.label, { marginTop: 4 }]}>Título</Text>
                  <TextInput
                    style={s.input}
                    value={forumEditTitle}
                    onChangeText={(v) => setForumEditTitle(v.slice(0, 120))}
                    placeholder="Máximo 120 caracteres"
                    placeholderTextColor="#b3a9a0"
                  />
                </>
              )}
              <Text style={[s.label, { marginTop: forumEditCollection === 'foro_hilos' ? -6 : 4 }]}>Contenido</Text>
              <TextInput
                style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
                value={forumEditBody}
                onChangeText={(v) => setForumEditBody(v.slice(0, 1000))}
                placeholder="Escribe aquí..."
                placeholderTextColor="#b3a9a0"
                multiline
              />
              <Text style={s.forumCountText}>{forumEditCollection === 'foro_hilos' ? `${forumEditTitle.length}/120 · ` : ''}{forumEditBody.length}/1000</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
                <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={() => setForumEditOpen(false)}>
                  <Text style={s.authSecondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.redBtn, { flex: 1, marginTop: 0 }]} onPress={guardarEdicionForo} disabled={forumEditing}>
                  {forumEditing ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
