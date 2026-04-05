import apiClient from './apiClient';

const createEntityApi = (basePath, options = {}) => {
  const { supportsDelete = true, supportsUpdate = true } = options;

  const buildQuery = (where, sort, limit) => {
    const params = {};
    if (where && Object.keys(where).length > 0) params.where = JSON.stringify(where);
    if (sort) params.sort = sort;
    if (limit) params.limit = limit;
    return { params };
  };

  const createQueryBuilder = (initialWhere = null, initialSort = null, initialLimit = null) => {
    const builder = {
      _where: initialWhere,
      _sort: initialSort,
      _limit: initialLimit,
      filter(where) { this._where = { ...this._where, ...where }; return this; },
      sort(sort) { this._sort = sort; return this; },
      limit(limit) { this._limit = limit; return this; },
      then(onResolve, onReject) {
        return apiClient.get(basePath, buildQuery(this._where, this._sort, this._limit)).then(onResolve, onReject);
      }
    };
    return builder;
  };

  const entity = {
    list: (sort, limit) => createQueryBuilder(null, sort, limit),
    filter: (where, sort, limit) => createQueryBuilder(where, sort, limit),
    get: (id) => apiClient.get(`${basePath}/${id}`),
    create: (data) => apiClient.post(basePath, data),
  };

  if (supportsUpdate) {
    entity.update = (id, data) => apiClient.patch(`${basePath}/${id}`, data);
  }
  if (supportsDelete) {
    entity.delete = (id) => apiClient.delete(`${basePath}/${id}`);
  }

  return entity;
};

export const api = {
  auth: {
    me: () => apiClient.get('/auth/me'),
    updateMe: (data) => apiClient.patch('/auth/me', data),
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (data) => apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
  },
  entities: {
    TeacherRegistration: createEntityApi('/teacher-registrations'),
    User: createEntityApi('/users', { supportsDelete: false }),
    VenueBooking: createEntityApi('/venue-bookings'),
    Announcement: createEntityApi('/announcements', { supportsUpdate: false }),
    TeamMembership: createEntityApi('/team-memberships', { supportsUpdate: false }),
    Team: createEntityApi('/teams', { supportsDelete: false, supportsUpdate: false }),
    TrainingLog: createEntityApi('/training-logs', { supportsDelete: false, supportsUpdate: false })
  }
};

export default api;
