export interface AlarmItem {
  id: string;
  title: string;
  description: string;
  time: string;
  timestamp?: number;
  isActive: boolean;
}