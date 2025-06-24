export interface SSHCommandDTO {
  id: string;
  sessionId: string;
  deviceId: string;
  command: string;
  output: string;
  error: string | null;
  exitCode: number;
  executedAt: string;
  executionTime: number; // in milliseconds
}

export interface ExecuteCommandDTO {
  sessionId: string;
  command: string;
}

export interface CommandResultDTO {
  id: string;
  command: string;
  output: string;
  error: string | null;
  exitCode: number;
  executedAt: string;
  executionTime: number; // in milliseconds
  success: boolean;
}

export interface CommandHistoryItemDTO {
  id: string;
  deviceId: string;
  deviceName: string;
  command: string;
  executedAt: string;
  success: boolean;
}

export interface CommandHistoryFilterDTO {
  deviceId?: string;
  sessionId?: string;
  command?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
}

export interface BatchCommandDTO {
  sessionId: string;
  commands: string[];
  stopOnError?: boolean;
}

export interface BatchCommandResultDTO {
  batchId: string;
  results: CommandResultDTO[];
  startedAt: string;
  completedAt: string;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
}