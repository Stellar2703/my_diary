// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Token management
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
};

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON if not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Format validation errors for display
      let errorMessage = data.message || 'API request failed';
      if (data.errors && Array.isArray(data.errors)) {
        errorMessage = data.errors
          .map((err: any) => `${err.field}: ${err.message}`)
          .join(', ');
      }
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
        errors: data.errors
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Auth API
export const authApi = {
  register: async (formData: FormData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: formData,
    });
  },

  login: async (username: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST',
    });
  },

  getProfile: async () => {
    return apiCall('/auth/profile', {
      method: 'GET',
    });
  },

  updateProfile: async (data: { name?: string; email?: string; mobileNumber?: string }) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiCall('/auth/avatar', {
      method: 'POST',
      body: formData,
    });
  },
};

// Posts API
export const postsApi = {
  create: async (formData: FormData) => {
    return apiCall('/posts', {
      method: 'POST',
      body: formData,
    });
  },

  getAll: async (filters?: {
    departmentId?: number;
    country?: string;
    state?: string;
    city?: string;
    area?: string;
    street?: string;
    pinCode?: string;
    startDate?: string;
    endDate?: string;
    username?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    return apiCall(`/posts?${params.toString()}`, {
      method: 'GET',
    });
  },

  getById: async (id: string | number) => {
    return apiCall(`/posts/${id}`, {
      method: 'GET',
    });
  },

  update: async (id: string | number, content: string) => {
    return apiCall(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  delete: async (id: string | number) => {
    return apiCall(`/posts/${id}`, {
      method: 'DELETE',
    });
  },

  toggleLike: async (id: string | number) => {
    return apiCall(`/posts/${id}/like`, {
      method: 'POST',
    });
  },

  toggleShare: async (id: string | number) => {
    return apiCall(`/posts/${id}/share`, {
      method: 'POST',
    });
  },

  shareToUser: async (id: string | number, recipientUserId: string) => {
    return apiCall(`/posts/${id}/share-user`, {
      method: 'POST',
      body: JSON.stringify({ recipientUserId }),
    });
  },

  edit: async (id: string | number, content: string) => {
    return apiCall(`/posts/${id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  toggleSave: async (id: string | number, collectionName?: string) => {
    return apiCall(`/posts/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ collectionName }),
    });
  },

  getSaved: async (collection?: string) => {
    const params = collection ? `?collection=${collection}` : '';
    return apiCall(`/posts/saved${params}`, {
      method: 'GET',
    });
  },

  togglePin: async (id: string | number) => {
    return apiCall(`/posts/${id}/pin`, {
      method: 'POST',
    });
  },

  search: async (params: {
    query?: string;
    type?: 'all' | 'posts' | 'users' | 'departments' | 'hashtags';
    sortBy?: 'relevance' | 'recent' | 'popular';
    dateFrom?: string;
    dateTo?: string;
    hasMedia?: boolean;
    country?: string;
    state?: string;
    city?: string;
    area?: string;
    department?: string;
    mediaType?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    return apiCall(`/search?${searchParams.toString()}`, {
      method: 'GET',
    });
  },

  getByHashtag: async (tag: string, page = 1, limit = 20) => {
    return apiCall(`/posts/hashtag/${tag}?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  getTrendingHashtags: async (limit = 10) => {
    return apiCall(`/posts/trending/hashtags?limit=${limit}`, {
      method: 'GET',
    });
  },

  getEditHistory: async (id: string | number) => {
    return apiCall(`/posts/${id}/history`, {
      method: 'GET',
    });
  },
};

// Departments API
export const departmentsApi = {
  create: async (data: {
    name: string;
    type: 'college' | 'government' | 'corporate' | 'community';
    description?: string;
    location?: string;
    country?: string;
    state?: string;
    city?: string;
  }) => {
    return apiCall('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAll: async (filters?: { type?: string; search?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    return apiCall(`/departments?${params.toString()}`, {
      method: 'GET',
    });
  },

  getById: async (id: string | number) => {
    return apiCall(`/departments/${id}`, {
      method: 'GET',
    });
  },

  join: async (id: string | number) => {
    return apiCall(`/departments/${id}/join`, {
      method: 'POST',
    });
  },

  leave: async (id: string | number) => {
    return apiCall(`/departments/${id}/leave`, {
      method: 'POST',
    });
  },

  getMembers: async (id: string | number, page = 1, limit = 20) => {
    return apiCall(`/departments/${id}/members?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  getPosts: async (id: string | number, page = 1, limit = 10) => {
    return apiCall(`/departments/${id}/posts?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  update: async (id: string | number, data: { name?: string; description?: string; location?: string }) => {
    return apiCall(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string | number) => {
    return apiCall(`/departments/${id}`, {
      method: 'DELETE',
    });
  },

  uploadAvatar: async (id: string | number, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiCall(`/departments/${id}/avatar`, {
      method: 'POST',
      body: formData,
    });
  },
};

// Comments API
export const commentsApi = {
  add: async (postId: string | number, content: string, isBold = false, isItalic = false) => {
    return apiCall(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, isBold, isItalic }),
    });
  },

  getAll: async (postId: string | number, page = 1, limit = 20) => {
    return apiCall(`/posts/${postId}/comments?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  update: async (id: string | number, content: string) => {
    return apiCall(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  delete: async (id: string | number) => {
    return apiCall(`/comments/${id}`, {
      method: 'DELETE',
    });
  },

  createReply: async (postId: string | number, parentCommentId: string | number, content: string) => {
    return apiCall(`/posts/${postId}/comments/${parentCommentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  getReplies: async (commentId: string | number) => {
    return apiCall(`/comments/${commentId}/replies`, {
      method: 'GET',
    });
  },

  getThread: async (commentId: string | number) => {
    return apiCall(`/comments/${commentId}/thread`, {
      method: 'GET',
    });
  },
};

// User API
export const userApi = {
  getLocations: async () => {
    return apiCall('/user/locations', {
      method: 'GET',
    });
  },

  getShareRecipients: async (query = '', page = 1, limit = 20) => {
    const params = new URLSearchParams({
      query,
      page: String(page),
      limit: String(limit),
    });
    return apiCall(`/user/share-recipients?${params.toString()}`, {
      method: 'GET',
    });
  },

  getNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    return apiCall(`/user/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`, {
      method: 'GET',
    });
  },

  markNotificationRead: async (id: string | number) => {
    return apiCall(`/user/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  markAllNotificationsRead: async () => {
    return apiCall('/user/notifications/read-all', {
      method: 'PUT',
    });
  },

  getFeed: async (page = 1, limit = 10) => {
    return apiCall(`/user/feed?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },
};

// Profile API
export const profileApi = {
  getProfile: async (username: string) => {
    return apiCall(`/profile/${username}`, {
      method: 'GET',
    });
  },

  getPosts: async (username: string, page = 1, limit = 10) => {
    return apiCall(`/profile/${username}/posts?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  getActivity: async (username: string, page = 1, limit = 20) => {
    return apiCall(`/profile/${username}/activity?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },
};
// Follow API
export const followApi = {
  followUser: async (userId: number) => {
    return apiCall(`/follow/follow/${userId}`, {
      method: 'POST',
    });
  },

  unfollowUser: async (userId: number) => {
    return apiCall(`/follow/unfollow/${userId}`, {
      method: 'DELETE',
    });
  },

  getFollowers: async (userId: number) => {
    return apiCall(`/follow/${userId}/followers`, {
      method: 'GET',
    });
  },

  getFollowing: async (userId: number) => {
    return apiCall(`/follow/${userId}/following`, {
      method: 'GET',
    });
  },

  getFollowStats: async (userId: number) => {
    return apiCall(`/follow/${userId}/stats`, {
      method: 'GET',
    });
  },

  checkFollowing: async (userId: number) => {
    return apiCall(`/follow/check/${userId}`, {
      method: 'GET',
    });
  },

  blockUser: async (targetUserId: number, reason?: string) => {
    return apiCall(`/follow/block/${targetUserId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  unblockUser: async (targetUserId: number) => {
    return apiCall(`/follow/unblock/${targetUserId}`, {
      method: 'DELETE',
    });
  },

  getBlockedUsers: async () => {
    return apiCall('/follow/blocked', {
      method: 'GET',
    });
  },

  getSuggestedUsers: async (limit = 10) => {
    return apiCall(`/follow/suggestions/users?limit=${limit}`, {
      method: 'GET',
    });
  },
};
// Reaction API
export const reactionApi = {
  togglePostReaction: async (postId: number, reactionType: string) => {
    return apiCall(`/reactions/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    });
  },

  getPostReactions: async (postId: number) => {
    return apiCall(`/reactions/posts/${postId}/reactions`, {
      method: 'GET',
    });
  },

  toggleCommentReaction: async (commentId: number, reactionType: string) => {
    return apiCall(`/reactions/comments/${commentId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    });
  },

  getCommentReactions: async (commentId: number) => {
    return apiCall(`/reactions/comments/${commentId}/reactions`, {
      method: 'GET',
    });
  },
};

// Messaging API
export const messagingApi = {
  getOrCreateConversation: async (recipientId: number) => {
    return apiCall('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    });
  },

  getConversations: async () => {
    return apiCall('/messages/conversations', {
      method: 'GET',
    });
  },

  createGroupConversation: async (name: string, participantIds: number[]) => {
    return apiCall('/messages/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ name, participantIds }),
    });
  },

  deleteConversation: async (conversationId: number) => {
    return apiCall(`/messages/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },

  sendMessage: async (conversationId: number, content: string, messageType = 'text') => {
    return apiCall(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType }),
    });
  },

  sendMediaMessage: async (conversationId: number, formData: FormData) => {
    return apiCall(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData,
    });
  },

  getMessages: async (conversationId: number, page = 1, limit = 50) => {
    return apiCall(`/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  },

  markAsRead: async (conversationId: number) => {
    return apiCall(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },
};

// Department Enhancements API
export const departmentEnhancementsApi = {
  addModerator: async (departmentId: number, userId: number, permissions?: any) => {
    return apiCall(`/departments/enhancements/${departmentId}/moderators`, {
      method: 'POST',
      body: JSON.stringify({ userId, permissions }),
    });
  },

  removeModerator: async (departmentId: number, moderatorId: number) => {
    return apiCall(`/departments/enhancements/${departmentId}/moderators/${moderatorId}`, {
      method: 'DELETE',
    });
  },

  getModerators: async (departmentId: number) => {
    return apiCall(`/departments/enhancements/${departmentId}/moderators`, {
      method: 'GET',
    });
  },

  updateModeratorPermissions: async (departmentId: number, moderatorId: number, permissions: any) => {
    return apiCall(`/departments/enhancements/${departmentId}/moderators/${moderatorId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  },

  createEvent: async (departmentId: number, eventData: any) => {
    return apiCall(`/departments/enhancements/${departmentId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  getEvents: async (departmentId: number, upcoming = true) => {
    return apiCall(`/departments/enhancements/${departmentId}/events?upcoming=${upcoming}`, {
      method: 'GET',
    });
  },

  rsvpEvent: async (eventId: number, status: string) => {
    return apiCall(`/departments/enhancements/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  getEventAttendees: async (eventId: number) => {
    return apiCall(`/departments/enhancements/events/${eventId}/attendees`, {
      method: 'GET',
    });
  },

  submitPostForApproval: async (postId: number, departmentId: number) => {
    return apiCall('/departments/enhancements/posts/submit', {
      method: 'POST',
      body: JSON.stringify({ postId, departmentId }),
    });
  },

  getPendingPosts: async (departmentId: number) => {
    return apiCall(`/departments/enhancements/${departmentId}/pending-posts`, {
      method: 'GET',
    });
  },

  reviewPendingPost: async (postId: number, action: string, rejectionReason?: string) => {
    return apiCall(`/departments/enhancements/posts/${postId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },

  updateDepartmentSettings: async (departmentId: number, settings: any) => {
    return apiCall(`/departments/enhancements/${departmentId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};


// Stories API
export const storiesApi = {
  createStory: async (storyData: any) => {
    return apiCall('/stories', {
      method: 'POST',
      body: JSON.stringify(storyData),
    });
  },

  getStories: async () => {
    return apiCall('/stories', {
      method: 'GET',
    });
  },

  getUserStories: async (userId: number) => {
    return apiCall(`/stories/user/${userId}`, {
      method: 'GET',
    });
  },

  viewStory: async (storyId: number) => {
    return apiCall(`/stories/${storyId}/view`, {
      method: 'POST',
    });
  },

  getStoryViewers: async (storyId: number) => {
    return apiCall(`/stories/${storyId}/viewers`, {
      method: 'GET',
    });
  },

  deleteStory: async (storyId: number) => {
    return apiCall(`/stories/${storyId}`, {
      method: 'DELETE',
    });
  },
};


// Notifications API
export const notificationsApi = {
  getNotifications: async (type?: string, unreadOnly = false, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('unreadOnly', unreadOnly.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return apiCall(`/notifications?${params.toString()}`, {
      method: 'GET',
    });
  },

  getUnreadCount: async () => {
    return apiCall('/notifications/unread-count', {
      method: 'GET',
    });
  },

  markAsRead: async (notificationId: number) => {
    return apiCall(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return apiCall('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  deleteNotification: async (notificationId: number) => {
    return apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  getSettings: async () => {
    return apiCall('/notifications/settings', {
      method: 'GET',
    });
  },

  updateSettings: async (settings: any) => {
    return apiCall('/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

