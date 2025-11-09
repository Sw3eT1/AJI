import 'dotenv/config';

export default {
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: './migrations'
        },
        pool: { min: 2, max: 10 }
    }
};
