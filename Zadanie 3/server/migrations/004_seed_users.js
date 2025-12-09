import bcrypt from "bcrypt";

export async function up(knex) {
    const hash1 = await bcrypt.hash("1234", 10);
    const hash2 = await bcrypt.hash("admin123", 10);

    await knex("users").insert([
        { username: "klient", password: hash1, role: "KLIENT" },
        { username: "admin", password: hash2, role: "PRACOWNIK" }
    ]);
}

export async function down(knex) {
    await knex("users").del();
}
