import api from './client';
import {resource} from './contracts';
import type {Hold} from '../types/models';
export const holdsApi = {
  async createHold(input: {turfId: string; startTime: string; endTime: string}) {return resource<Hold>(await api.post('/holds', input));},
  async getHold(id: string) {return resource<Hold>(await api.get(`/holds/${encodeURIComponent(id)}`));},
  async releaseHold(id: string) {await api.delete(`/holds/${encodeURIComponent(id)}`);},
};
