const API_URL = "/api";

export interface User {
  id: number;
  phone: string;
  name: string;
  role: "client" | "worker" | "admin";
  street?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  intercom?: string;
  jk_name?: string;
  schedule_vote?: "morning" | "evening";
  tariff_vote?: string;
  qr_source?: string;
  qr_id?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const login = async (phone: string): Promise<AuthResponse | null> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Login failed");

  return response.json();
};

export const register = async (data: {
  phone: string;
  name: string;
  role?: string;
  qrCode?: string;
  address?: {
    jkId: string;
    street: string;
    entrance: string;
    floor: string;
    apartment: string;
    intercom: string;
  };
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  return response.json();
};

export interface JK {
  id: number;
  name: string;
  address: string;
  votes: number;
  fake_votes: number;
  real_votes: number;
  status: "pending" | "connected";
}

export const fetchJks = async (): Promise<JK[]> => {
  const response = await fetch(`${API_URL}/jk`);
  if (!response.ok) throw new Error("Failed to fetch JKs");
  return response.json();
};

export const createJk = async (
  token: string,
  data: Partial<JK>,
): Promise<JK> => {
  const response = await fetch(`${API_URL}/jk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create JK");
  return response.json();
};

export const updateJk = async (
  token: string,
  id: number,
  data: Partial<JK>,
): Promise<JK> => {
  const response = await fetch(`${API_URL}/jk/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update JK");
  return response.json();
};

export const deleteJk = async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/jk/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to delete JK");
};

export const voteForJk = async (id: number): Promise<JK> => {
  const response = await fetch(`${API_URL}/jk/${id}/vote`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to vote");
  return response.json();
};

export const fetchUsers = async (token: string): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch users: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  return response.json();
};

export const deleteUser = async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to delete user");
};

export const voteForSchedule = async (
  token: string,
  voteOption: "morning" | "evening",
): Promise<void> => {
  const response = await fetch(`${API_URL}/schedule/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ voteOption }),
  });
  if (!response.ok) throw new Error("Failed to vote for schedule");
};

export interface ScheduleVote {
  vote_option: "morning" | "evening";
  count: number;
}

export const fetchScheduleVotes = async (
  token: string,
): Promise<ScheduleVote[]> => {
  const response = await fetch(`${API_URL}/schedule/votes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch schedule votes");
  return response.json();
};

export interface TariffVote {
  tariff_name: string;
  count: number;
}

export const voteForTariff = async (
  token: string,
  tariffName: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/tariff/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tariffName }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to vote for tariff: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
};

export const fetchTariffVotes = async (
  token: string,
): Promise<TariffVote[]> => {
  const response = await fetch(`${API_URL}/tariff/votes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch tariff votes");
  return response.json();
};

export interface Tariff {
  id: number;
  tag: string;
  subtitle?: string;
  title: string;
  price: number;
  features: string[];
  is_popular: boolean;
}

export const fetchTariffs = async (): Promise<Tariff[]> => {
  const response = await fetch(`${API_URL}/tariffs`);
  if (!response.ok) throw new Error("Failed to fetch tariffs");
  return response.json();
};

export const deleteTariff = async (
  token: string,
  id: number,
): Promise<void> => {
  const response = await fetch(`${API_URL}/tariffs/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to delete tariff");
};

export const updateTariff = async (
  token: string,
  id: number,
  data: Partial<Tariff>,
): Promise<Tariff> => {
  const response = await fetch(`${API_URL}/tariffs/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update tariff");
  return response.json();
};

export const fetchUserProfile = async (token: string): Promise<User> => {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch user profile: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  return response.json();
};

export interface QRCode {
  id: number;
  code: string;
  name: string;
  jk_id?: number;
  jk_name?: string;
  scans_count: number;
  registrations_count: number;
  created_at: string;
}

export const fetchQRCodes = async (token: string): Promise<QRCode[]> => {
  const response = await fetch(`${API_URL}/qr`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch QR codes");
  return response.json();
};

export const createQRCode = async (
  token: string,
  data: { name: string; code?: string; jkId?: number },
): Promise<QRCode> => {
  const response = await fetch(`${API_URL}/qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create QR code: ${errorText}`);
  }
  return response.json();
};

export const deleteQRCode = async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/qr/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to delete QR code");
};

export interface QRInfo {
  id: number;
  code: string;
  jk_id: number;
  flat?: string;
  created_at?: string;
  jk_name?: string | null;
  jk_address?: string | null;
}

export const fetchQRInfo = async (code: string): Promise<QRInfo | null> => {
  const response = await fetch(`${API_URL}/qr/info/${code}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch QR code info");
  }
  return response.json();
};

export interface DbTask {
  id: number;
  shift_id: number;
  client_id: number;
  jk_id: number;
  jk_name: string;
  jk_address: string;
  apartment: string;
  floor: number;
  entrance: string;
  intercom?: string;
  status: "pending" | "collected" | "failed";
  problem_type?: string;
  photo_url?: string;
  collected_at?: string;
  isSynced?: boolean;
}

export interface DbShift {
  id: number;
  worker_id: number;
  started_at: string;
  ended_at?: string;
  status: "active" | "completed";
  earned_amount: number;
}

export interface ActiveShiftResponse {
  active: boolean;
  shift?: DbShift;
  tasks?: DbTask[];
}

export const fetchActiveShift = async (token: string): Promise<ActiveShiftResponse> => {
  const response = await fetch(`${API_URL}/worker/shift/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch active shift");
  return response.json();
};

export const startShift = async (token: string): Promise<ActiveShiftResponse> => {
  const response = await fetch(`${API_URL}/worker/shift/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to start shift");
  }
  return response.json();
};

export const endShift = async (token: string): Promise<{ success: boolean; shift: DbShift }> => {
  const response = await fetch(`${API_URL}/worker/shift/end`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to end shift");
  return response.json();
};

export const collectTask = async (
  token: string,
  taskId: number,
  photoUrl?: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/worker/tasks/${taskId}/collect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ photoUrl }),
  });
  if (!response.ok) throw new Error("Failed to collect task");
};

export const reportTaskProblem = async (
  token: string,
  taskId: number,
  problemType: string,
  photoUrl?: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/worker/tasks/${taskId}/problem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ problemType, photoUrl }),
  });
  if (!response.ok) throw new Error("Failed to report task problem");
};

export interface AdminEmployee {
  id: number;
  phone: string;
  name: string;
  role: string;
  created_at: string;
  pay_type: "task" | "hour" | "fix";
  rate: number;
  status: "active" | "on_shift" | "sick" | "fired";
  assigned_jk: string;
  balance: number;
}

export interface AdminShiftHistory {
  id: number;
  worker_id: number;
  started_at: string;
  ended_at?: string;
  status: "active" | "completed";
  earned_amount: number;
  total_tasks: number;
  collected_tasks: number;
  failed_tasks: number;
}

export const fetchAdminWorkers = async (token: string): Promise<AdminEmployee[]> => {
  const response = await fetch(`${API_URL}/admin/workers`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch workers list");
  return response.json();
};

export const createAdminWorker = async (
  token: string,
  data: {
    phone: string;
    name: string;
    payType?: string;
    rate?: number;
    status?: string;
    assignedJK?: string;
  }
): Promise<AdminEmployee> => {
  const response = await fetch(`${API_URL}/admin/workers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create worker");
  return response.json();
};

export const updateAdminWorker = async (
  token: string,
  id: number,
  data: {
    phone: string;
    name: string;
    payType?: string;
    rate?: number;
    status?: string;
    assignedJK?: string;
  }
): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/workers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update worker");
};

export const payoutAdminWorker = async (token: string, id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/workers/${id}/payout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to complete payout");
};

export const fetchAdminWorkerShifts = async (
  token: string,
  id: number
): Promise<AdminShiftHistory[]> => {
  const response = await fetch(`${API_URL}/admin/workers/${id}/shifts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch worker shift history");
  return response.json();
};



