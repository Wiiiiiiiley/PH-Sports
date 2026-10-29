import apiClient from './apiClient';

export const api = {
  auth: {
    me: () => apiClient.get('/auth/me'),
    updateMe: (data) => apiClient.patch('/auth/updateMe', data),
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (data) => apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
  },
  entities: {
    TeacherRegistration: {
      filter: (filter, sort, limit) => apiClient.get('/teacher-registrations', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/teacher-registrations', { params: { sort, limit } }),
      get: (id) => apiClient.get(`/teacher-registrations/${id}`),
      create: (data) => apiClient.post('/teacher-registrations', data),
      update: (id, data) => apiClient.patch(`/teacher-registrations/${id}`, data),
      delete: (id) => apiClient.delete(`/teacher-registrations/${id}`),
    },
    User: {
      filter: (filter, sort, limit) => apiClient.get('/users', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/users', { params: { sort, limit } }),
      get: (id) => apiClient.get(`/users/${id}`),
      update: (id, data) => apiClient.patch(`/users/${id}`, data),
    },
    VenueBooking: {
      filter: (filter, sort, limit) => apiClient.get('/venue-bookings', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/venue-bookings', { params: { sort, limit } }),
      get: (id) => apiClient.get(`/venue-bookings/${id}`),
      create: (data) => apiClient.post('/venue-bookings', data),
      update: (id, data) => apiClient.patch(`/venue-bookings/${id}`, data),
      delete: (id) => apiClient.delete(`/venue-bookings/${id}`),
    },
    Announcement: {
      filter: (filter, sort, limit) => apiClient.get('/announcements', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/announcements', { params: { sort, limit } }),
      create: (data) => apiClient.post('/announcements', data),
      delete: (id) => apiClient.delete(`/announcements/${id}`),
    },
    TeamMembership: {
      filter: (filter, sort, limit) => apiClient.get('/team-memberships', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/team-memberships', { params: { sort, limit } }),
      create: (data) => apiClient.post('/team-memberships', data),
      delete: (id) => apiClient.delete(`/team-memberships/${id}`),
    },
    Team: {
      filter: (filter, sort, limit) => apiClient.get('/teams', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/teams', { params: { sort, limit } }),
      get: (id) => apiClient.get(`/teams/${id}`),
    },
    TrainingLog: {
      leaderboard: (sport, month) => apiClient.get('/training-leaderboard', { params: { sport, month } }),
      filter: (filter, sort, limit) => apiClient.get('/training-logs', { params: { filter: JSON.stringify(filter), sort, limit } }),
      list: (sort, limit) => apiClient.get('/training-logs', { params: { sort, limit } }),
      create: (data) => apiClient.post('/training-logs', data),
    }
  }
};

export default api;
