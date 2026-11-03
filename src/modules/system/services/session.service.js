const { User } = require('../../../shared/database');

class SessionService {
    findAll(store) {
        return new Promise((resolve, reject) => {
            if (!store || !store.db) {
                return reject(new Error('Session store 不可用'));
            }

            const sql = `SELECT sid, expired, sess FROM "${store.table}"`;
            store.db.all(sql, [], async (err, rows) => {
                if (err) return reject(err);

                const sessions = rows.map(row => {
                    let sess;
                    try {
                        sess = JSON.parse(row.sess);
                    } catch {
                        sess = {};
                    }

                    const maxAge = sess.cookie?.maxAge;
                    const expired = maxAge
                        ? new Date(Date.now() + maxAge)
                        : (row.expired ? new Date(row.expired) : null);

                    return {
                        sid: row.sid,
                        userId: sess.userId || null,
                        userAgent: sess.userAgent || null,
                        expired,
                        cookie: sess.cookie || {},
                    };
                });

                const validSessions = sessions.filter(s => s.expired && s.expired > new Date());

                const userIds = [...new Set(validSessions.map(s => s.userId).filter(Boolean))];
                const userMap = {};
                if (userIds.length > 0) {
                    const users = await User.findAll({
                        where: { id: userIds },
                        attributes: ['id', 'username', 'email', 'status'],
                        raw: true,
                    });
                    users.forEach(u => { userMap[u.id] = u; });
                }

                const enriched = validSessions.map(s => ({
                    ...s,
                    user: userMap[s.userId] || null,
                    username: userMap[s.userId]?.username || null,
                    email: userMap[s.userId]?.email || null,
                    userStatus: userMap[s.userId]?.status || null,
                }));

                resolve(enriched);
            });
        });
    }

    destroy(store, sid) {
        return new Promise((resolve, reject) => {
            if (!store) {
                return reject(new Error('Session store 不可用'));
            }
            store.destroy(sid, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    async getUserSessions(store, userId) {
        const all = await this.findAll(store);
        return all.filter(s => s.userId === userId);
    }
}

module.exports = new SessionService();