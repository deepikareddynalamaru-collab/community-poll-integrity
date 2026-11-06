import { apiRequest } from './client';

export const pollApi = {
  createPoll: (pollData) =>
    apiRequest('/polls', {
      method: 'POST',
      body: pollData,
    }),

  getPolls: (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiRequest(`/polls${query}`, {
      method: 'GET',
    });
  },

  getMyPolls: () =>
    apiRequest('/polls/mine', {
      method: 'GET',
    }),

  getPollById: (id) =>
    apiRequest(`/polls/${id}`, {
      method: 'GET',
    }),

  vote: (pollId, optionId) =>
    apiRequest(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: { optionId },
    }),

  getResults: (pollId) =>
    apiRequest(`/polls/${pollId}/results`, {
      method: 'GET',
    }),

  closePoll: (pollId) =>
    apiRequest(`/polls/${pollId}/close`, {
      method: 'PATCH',
    }),
};

