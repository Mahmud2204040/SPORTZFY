import api from './client';
import {collection, resource, queryString} from './contracts';
import type {Match, JoinRequest} from '../types/models';
export const matchesApi = {
  async getMatches(filters: {format?: string; role?: string; area?: string; date?: string; cursor?: string} = {}) {return collection<Match>(await api.get(`/matches?${queryString({...filters, limit:30})}`));},
  async getMatchById(id: string) {return resource<Match>(await api.get(`/matches/${encodeURIComponent(id)}`));},
  async getMyMatches() {return resource<{hosting: Match[]; joined: Match[]}>(await api.get('/matches/my'));},
  async createMatch(input: Omit<Match, 'id' | 'hostUserId' | 'status'> & {turfId: string}) {return resource<Match>(await api.post('/matches', input));},
  async joinMatch(id: string, preferredRole: string) {return resource<JoinRequest>(await api.post(`/matches/${id}/join`, {preferredRole}));},
  async decideRequest(id: string, requestId: string, decision: string) {return resource<JoinRequest>(await api.post(`/matches/${id}/requests/${requestId}/decision`, {decision}));},
};
