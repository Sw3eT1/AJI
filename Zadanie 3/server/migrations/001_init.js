export function up(knex) {
    return knex.schema

        .createTable("categories", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable().unique();
        })

        .createTable("order_statuses", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable().unique();
        })

        .createTable("users", (table) => {
            table.increments("id").primary();
            table.string("username").notNullable().unique();
            table.string("password").notNullable();
            table.string("role").notNullable();
        })

        .createTable("products", (table) => {
            table.increments("id").primary();
            table.string("name").notNullable();
            table.text("description").notNullable();
            table.decimal("unit_price", 10, 2).notNullable();
            table.decimal("unit_weight", 10, 3).notNullable();
            table
                .integer("category_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("categories");
        })

        .createTable("orders", (table) => {
            table.increments("id").primary();
            table.timestamp("approved_at").nullable();

            table
                .integer("status_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("order_statuses");

            table
                .integer("user_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("users")
                .onDelete("CASCADE");

            table.timestamp("created_at").defaultTo(knex.fn.now());
        })

        .createTable("order_items", (table) => {
            table.increments("id").primary();
            table
                .integer("order_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("orders")
                .onDelete("CASCADE");

            table
                .integer("product_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("products");

            table.integer("quantity").unsigned().notNullable();
        })

        .createTable("opinions", (table) => {
            table.increments("id").primary();
            table
                .integer("order_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("orders")
                .onDelete("CASCADE");

            table.integer("rating").notNullable();
            table.text("content").notNullable();
            table.timestamp("created_at").defaultTo(knex.fn.now());
        });
}

export function down(knex) {
    return knex.schema
        .dropTableIfExists("opinions")
        .dropTableIfExists("order_items")
        .dropTableIfExists("orders")
        .dropTableIfExists("products")
        .dropTableIfExists("users")
        .dropTableIfExists("order_statuses")
        .dropTableIfExists("categories");
}