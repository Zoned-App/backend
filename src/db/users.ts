export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const users = new Map<string, User>();
let nextId = 1;

export function findByEmail(email: string): User | null {
  return users.get(email.toLowerCase()) ?? null;
}

export function findById(id: number): User | null {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export function createUser({
  username,
  email,
  passwordHash,
}: {
  username: string;
  email: string;
  passwordHash: string;
}): User {
  const user: User = {
    id: nextId++,
    username,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.set(user.email, user);
  return user;
}
