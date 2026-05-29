import { seedData } from "@/lib/seed-data";
import { normalizeMediaItems } from "@/lib/media";

const STORAGE_KEY = "fleetops-local-db";
const SESSION_KEY = "fleetops-demo-user-id";

const clone = (value) => JSON.parse(JSON.stringify(value));

const mediaFieldsByEntity = {
  Vehicle: ["photo_gallery", "contract_document"],
  Driver: [
    "profile_photo",
    "fayda_id_photos",
    "normal_id_photos",
    "wastena_documents",
    "contract_document",
  ],
  Trip: ["evidence_photos"],
  ServiceSession: ["attachments"],
};

const migrateDb = (db) => {
  const existingUserIds = new Set(
    (Array.isArray(db.User) ? db.User : []).map((user) => user.id),
  );

  seedData.User.forEach((user) => {
    if (!existingUserIds.has(user.id)) {
      db.User = Array.isArray(db.User) ? db.User : [];
      db.User.push(clone(user));
    }
  });

  Object.entries(seedData).forEach(([entityName, records]) => {
    if (!Array.isArray(db[entityName])) {
      db[entityName] = clone(records);
    }
  });

  Object.entries(mediaFieldsByEntity).forEach(([entityName, fields]) => {
    const collection = Array.isArray(db[entityName]) ? db[entityName] : [];
    collection.forEach((record) => {
      fields.forEach((fieldName) => {
        record[fieldName] = normalizeMediaItems(record[fieldName]);
      });
    });
    db[entityName] = collection;
  });

  if (Array.isArray(db.User)) {
    db.User = db.User.map((user) =>
      user?.role === "sub_mechanic" ? { ...user, role: "main_mechanic" } : user,
    );
  }

  if (Array.isArray(db.ServiceSession)) {
    db.ServiceSession = db.ServiceSession.map((session) => {
      if (!session || !("assigned_sub_mechanic_ids" in session)) {
        return session;
      }

      const nextSession = { ...session };
      delete nextSession.assigned_sub_mechanic_ids;
      return nextSession;
    });
  }

  return db;
};

const loadDb = () => {
  if (typeof window === "undefined") {
    return clone(seedData);
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = clone(seedData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return migrateDb(initial);
  }

  try {
    return migrateDb(JSON.parse(saved));
  } catch {
    const initial = clone(seedData);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return migrateDb(initial);
  }
};

const saveDb = (db) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
};

const ensureCollection = (db, entityName) => {
  if (!Array.isArray(db[entityName])) {
    db[entityName] = [];
  }
  return db[entityName];
};

const sortRecords = (records, sortField, limit) => {
  let next = [...records];

  if (sortField) {
    const descending = sortField.startsWith("-");
    const field = descending ? sortField.slice(1) : sortField;
    next.sort((a, b) => {
      const left = a?.[field];
      const right = b?.[field];

      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;

      const leftTime = Date.parse(left);
      const rightTime = Date.parse(right);
      const comparableLeft = Number.isNaN(leftTime) ? left : leftTime;
      const comparableRight = Number.isNaN(rightTime) ? right : rightTime;

      if (comparableLeft < comparableRight) return descending ? 1 : -1;
      if (comparableLeft > comparableRight) return descending ? -1 : 1;
      return 0;
    });
  }

  if (typeof limit === "number") {
    next = next.slice(0, limit);
  }

  return next;
};

const matchesQuery = (record, query) =>
  Object.entries(query).every(([field, expected]) => {
    const actual = record?.[field];
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  });

const createEntityApi = (entityName) => ({
  async list(sortField, limit) {
    const db = loadDb();
    return sortRecords(ensureCollection(db, entityName), sortField, limit);
  },

  async filter(query = {}) {
    const db = loadDb();
    const collection = ensureCollection(db, entityName);
    return collection.filter((record) => matchesQuery(record, query));
  },

  async get(id) {
    const db = loadDb();
    return ensureCollection(db, entityName).find((record) => record.id === id) || null;
  },

  async create(payload) {
    const db = loadDb();
    const collection = ensureCollection(db, entityName);
    const record = {
      id: `${entityName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_date: new Date().toISOString(),
      ...payload,
    };
    collection.unshift(record);
    saveDb(db);
    return record;
  },

  async update(id, payload) {
    const db = loadDb();
    const collection = ensureCollection(db, entityName);
    const index = collection.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new Error(`${entityName} record not found: ${id}`);
    }
    collection[index] = {
      ...collection[index],
      ...payload,
      updated_date: new Date().toISOString(),
    };
    saveDb(db);
    return collection[index];
  },
});

const entityNames = Object.keys(seedData).filter((entityName) => entityName !== "HandoverCheck");

export const appClient = {
  entities: Object.fromEntries(
    entityNames.map((entityName) => [entityName, createEntityApi(entityName)]),
  ),
  auth: {
    async me() {
      const db = loadDb();
      const users = ensureCollection(db, "User");
      const storedId =
        typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
      const selectedUser = users.find((user) => user.id === storedId) || null;

      if (typeof window !== "undefined" && selectedUser) {
        window.localStorage.setItem(SESSION_KEY, selectedUser.id);
      }

      return selectedUser;
    },

    async signIn(userId) {
      const db = loadDb();
      const users = ensureCollection(db, "User");
      const selectedUser = users.find((user) => user.id === userId) || null;

      if (typeof window !== "undefined") {
        if (selectedUser) {
          window.localStorage.setItem(SESSION_KEY, selectedUser.id);
          window.location.href = "/";
        }
      }

      return selectedUser;
    },

    logout() {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_KEY);
        window.location.href = "/login";
      }
    },

    redirectToLogin() {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  },
  reset() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      window.location.reload();
    }
  },
};
