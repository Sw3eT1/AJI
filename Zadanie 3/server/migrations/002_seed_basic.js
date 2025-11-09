export async function up(knex) {
    await knex('categories').insert([
        { name: 'Electronics' },
        { name: 'Books' },
        { name: 'Clothes' }
    ]);

    await knex('order_statuses').insert([
        { name: 'UNCONFIRMED' },
        { name: 'CONFIRMED' },
        { name: 'CANCELLED' },
        { name: 'COMPLETED' }
    ]);
}

export async function down(knex) {
    await knex('order_statuses').del();
    await knex('categories').del();
}
