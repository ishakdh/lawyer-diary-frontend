import Dexie from 'dexie';

// 1. Create the mini-database inside the phone
export const db = new Dexie('LawyerDiaryDB');

// 2. Create the tables (one for cases, one for the waiting room/queue)
db.version(1).stores({
    cases: 'id, case_number, section, court_name, client_name, client_phone, next_hearing_date, is_closed, is_transferred',
    syncQueue: '++id, action_type, endpoint, method, payload, created_at'
});

// 3. Helper function to put offline actions into the waiting room
export const queueOfflineAction = async (action_type, endpoint, method, payload) => {
    await db.syncQueue.add({
        action_type,
        endpoint,
        method,
        payload,
        created_at: new Date().toISOString()
    });
};