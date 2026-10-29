import type { AllData, UserSesi } from '../types';

export interface PageProps {
  data: AllData;
  user: UserSesi;
  refresh: () => Promise<void>;
  go: (page: string) => void;
  setPesanGlobal: (pesan: string, jenis?: 'info' | 'sukses' | 'error') => void;
}
