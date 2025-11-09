/**
 * @param { import("knex").Knex } knex
 */
export function up(knex) {
    return knex.schema


        .createTable('categories', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable().unique();
        })

        .createTable('order_statuses', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable().unique();
        })

        .createTable('products', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.text('description').notNullable();
            table.decimal('unit_price', 10, 2).notNullable();
            table.decimal('unit_weight', 10, 3).notNullable();
            table
                .integer('category_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('categories')
                .onDelete('RESTRICT');
        })

        .createTable('orders', (table) => {
            table.increments('id').primary();
            table.timestamp('approved_at').nullable();
            table
                .integer('status_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('order_statuses')
                .onDelete('RESTRICT');
            table.string('username').notNullable();
            table.string('email').notNullable();
            table.string('phone').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
        })

        .createTable('order_items', (table) => {
            table.increments('id').primary();
            table
                .integer('order_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('orders')
                .onDelete('CASCADE');
            table
                .integer('product_id')
                .unsigned()
                .notNullable()
                .references('id')
                .inTable('products')
                .onDelete('RESTRICT');
            table.integer('quantity').unsigned().notNullable();
        });
}

/**
 * @param { import("knex").Knex } knex
 */
export function down(knex) {
    return knex.schema
        .dropTableIfExists('order_items')
        .dropTableIfExists('orders')
        .dropTableIfExists('products')
        .dropTableIfExists('order_statuses')
        .dropTableIfExists('categories');
}
