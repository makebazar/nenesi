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
