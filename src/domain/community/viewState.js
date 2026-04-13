export const getCommunityRoleFlags = (perfil) => ({
  isAdmin: perfil?.role === 'admin',
  isStaff: perfil?.role === 'staff',
});

export const getCommunityVisibleViews = ({ forumCategory, forumThread }) => ({
  showCategories: !forumCategory,
  showThreadList: !!forumCategory && !forumThread,
  showThreadDetail: !!forumCategory && !!forumThread,
});
