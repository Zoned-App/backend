// Simple in-memory store — swap this out for PostgreSQL/MongoDB when ready.
// Data resets on server restart.

const users = new Map(); // email -> { id, username, email, passwordHash, createdAt }
let nextId = 1;

module.exports = {
  findByEmail(email) {
    return users.get(email.toLowerCase()) ?? null;
  },

  findById(id) {
    for (const user of users.values()) {
      if (user.id === id) return user;
    }
    return null;
  },

  create({ username, email, passwordHash }) {
    const user = {
      id: nextId++,
      username,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.set(user.email, user);
    return user;
  },
};
