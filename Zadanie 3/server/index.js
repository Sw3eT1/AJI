import express from 'express';
import db from './db.js';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import axios from 'axios';
import 'dotenv/config';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";


console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);

const app = express();
app.use(express.json());

function auth(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "No token provided"
        });
    }

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // zapisujemy użytkownika w req
        next();
    } catch {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Invalid token"
        });
    }
}

const upload = multer({ dest: "uploads/" });

const ORDER_STATUS = {
    UNCONFIRMED: 'UNCONFIRMED',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED'
};

app.get('/', (req, res) => {
    res.send('API działa poprawnie!');
});

// ---------- PRODUCTS ----------

// GET /products - lista
app.get('/products', async (req, res) => {
    const products = await db('products');
    res.json(products);
});

// GET /products/:id - jeden produkt
app.get('/products/:id', async (req, res) => {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: 'Product not found' });
    }
    res.json(product);
});

// POST /products - dodanie produktu
app.post('/products', auth, async (req, res) => {
    try {
        const { name, description, unit_price, unit_weight, category_id } = req.body;

        if (!name || !description) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Name and description are required'
            });
        }

        if (
            unit_price == null ||
            unit_weight == null ||
            Number(unit_price) <= 0 ||
            Number(unit_weight) <= 0
        ) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Price and weight must be positive numbers'
            });
        }

        const category = await db('categories')
            .where({ id: category_id })
            .first();
        if (!category) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Invalid category_id'
            });
        }

        const [newProduct] = await db('products').insert({
            name,
            description,
            unit_price,
            unit_weight,
            category_id
        })
            .returning('*');
        res.status(StatusCodes.CREATED).json(newProduct);
    } catch (err) {
        console.error(err);
        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: 'Error creating product' });
    }
});

// PUT /products/:id - aktualizacja
app.put('/products/:id',auth, async (req, res) => {
    const { name, description, unit_price, unit_weight, category_id } = req.body;
    const id = req.params.id;

    const product = await db('products').where({ id }).first();
    if (!product) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: 'Product not found' });
    }

    if (name !== undefined && name.trim() === '') {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Name cannot be empty' });
    }

    if (description !== undefined && description.trim() === '') {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Description cannot be empty' });
    }

    if (unit_price !== undefined && Number(unit_price) <= 0) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Price must be positive' });
    }

    if (unit_weight !== undefined && Number(unit_weight) <= 0) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Weight must be positive' });
    }

    if (category_id !== undefined) {
        const category = await db('categories').where({ id: category_id }).first();
        if (!category) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: 'Invalid category_id' });
        }
    }

    await db('products').where({ id }).update({
        name,
        description,
        unit_price,
        unit_weight,
        category_id
    });

    const updated = await db('products').where({ id }).first();
    res.json(updated);
});

// ---------- CATEGORIES ----------

app.get('/categories', async (req, res) => {
    const categories = await db('categories');
    res.json(categories);
});

// ---------- ORDER STATUSES ----------

app.get('/status', async (req, res) => {
    const statuses = await db('order_statuses');
    res.json(statuses);
});

// ---------- ORDERS ----------

// GET /orders - wszystkie zamówienia
app.get('/orders', async (req, res) => {
    const orders = await db('orders');
    res.json(orders);
});

// GET /orders/user/:username - zamówienia danego usera
app.get('/orders/user/:username', async (req, res) => {
    const orders = await db('orders').where({ username: req.params.username });
    res.json(orders);
});

// GET /orders/:id - jedno zamówienie z pozycjami
app.get('/orders/:id', async (req, res) => {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: 'Order not found' });
    }

    const items = await db('order_items')
        .join('products', 'order_items.product_id', 'products.id')
        .select(
            'order_items.id',
            'order_items.quantity',
            'products.name',
            'products.unit_price'
        )
        .where('order_items.order_id', order.id);

    res.json({ ...order, items });
});

// POST /orders - dodanie zamówienia
app.post('/orders', auth, async (req, res) => {
    const trx = await db.transaction(); // ✅ TRANSAKCJA

    try {
        const { items } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(items) || items.length === 0) {
            await trx.rollback();
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Order items are required'
            });
        }

        // WALIDACJA + SPRAWDZENIE CZY PRODUKTY ISTNIEJĄ
        for (const item of items) {
            if (
                !item.product_id ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                await trx.rollback();
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: 'Invalid product data'
                });
            }

            const product = await trx('products')
                .where({ id: item.product_id })
                .first();

            if (!product) {
                await trx.rollback();
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: `Product with id ${item.product_id} does not exist`
                });
            }
        }

        const status = await trx('order_statuses')
            .where({ name: 'UNCONFIRMED' })
            .first();

        // TWORZENIE ORDERA
        const [newOrder] = await trx('orders')
            .insert({
                user_id: userId,
                status_id: status.id
            })
            .returning('*');

        const orderId = newOrder.id;

        // TWORZENIE ORDER_ITEMS
        const orderItems = items.map(i => ({
            order_id: orderId,
            product_id: i.product_id,
            quantity: i.quantity
        }));

        await trx('order_items').insert(orderItems);

        // COMMIT = ZAPIS WSZYSTKIEGO
        await trx.commit();

        res.status(StatusCodes.CREATED).json({
            id: orderId,
            message: "Order created successfully"
        });

    } catch (err) {
        await trx.rollback();
        console.error(err);

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error creating order'
        });
    }
});


// POST /orders/:id/opinions - dodanie opini do zamowienia
app.post("/orders/:id/opinions", auth, async (req, res) => {
    try {
        const { rating, content } = req.body;
        const orderId = req.params.id;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5 || !content) {
            return res.status(400).json({
                message: "Invalid rating or content"
            });
        }

        const order = await db("orders").where({ id: orderId }).first();
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({
                message: "You can only add opinion to your own order"
            });
        }

        const status = await db("order_statuses")
            .where({ id: order.status_id })
            .first();

        if (!["COMPLETED", "CANCELLED"].includes(status.name)) {
            return res.status(400).json({
                message: "Opinion can be added only to COMPLETED or CANCELLED order"
            });
        }

        await db("opinions").insert({
            order_id: orderId,
            rating,
            content
        });

        res.status(201).json({
            message: "Opinion added successfully"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Error adding opinion"
        });
    }
});

// GET /orders/:id/opinions - pobranie opinii dla zamówienia

app.get("/orders/:id/opinions", auth, async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        // sprawdzamy czy zamówienie istnieje
        const order = await db("orders").where({ id: orderId }).first();
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: "Order not found"
            });
        }

        // zabezpieczenie: tylko właściciel zamówienia lub pracownik
        if (order.user_id !== userId && req.user.role !== "PRACOWNIK") {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: "You are not allowed to view opinions of this order"
            });
        }

        // pobieramy opinie
        const opinions = await db("opinions")
            .where({ order_id: orderId })
            .orderBy("created_at", "desc");

        res.json({
            order_id: orderId,
            opinions
        });

    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching order opinions"
        });
    }
});


// GET /orders/status/:statusId - zamówienia wg statusu
app.get('/orders/status/:statusId', async (req, res) => {
    const orders = await db('orders').where({ status_id: req.params.statusId });
    res.json(orders);
});

// PATCH /orders/:id - zmiana stanu zamówienia
app.patch('/orders/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;   // <-- TERAZ PRZYJMUJEMY NAZWĘ
        const id = req.params.id;

        if (!status) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Status is required"
            });
        }

        const order = await db('orders').where({ id }).first();
        if (!order) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: 'Order not found' });
        }

        const newStatus = await db('order_statuses')
            .where({ name: status })
            .first();

        if (!newStatus) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: 'Invalid status name' });
        }

        const current = await db('order_statuses')
            .where({ id: order.status_id })
            .first();

        // Nie można zmienić anulowanego
        if (current.name === ORDER_STATUS.CANCELLED) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Cannot change status of a CANCELLED order'
            });
        }

        // Nie cofamy z COMPLETED
        if (
            current.name === ORDER_STATUS.COMPLETED &&
            newStatus.name !== ORDER_STATUS.COMPLETED
        ) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Cannot revert COMPLETED order to previous state'
            });
        }

        await db('orders').where({ id }).update({
            status_id: newStatus.id,
            approved_at:
                newStatus.name === ORDER_STATUS.CONFIRMED && !order.approved_at
                    ? db.fn.now()
                    : order.approved_at
        });

        const updated = await db('orders').where({ id }).first();
        res.json(updated);

    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error updating order status"
        });
    }
});


// ---------- USERS ----------
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await db("users").where({ username }).first();
    if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Invalid login data"
        });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Invalid login data"
        });
    }

    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
        accessToken,
        refreshToken
    });
});

app.post("/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "No refresh token provided"
        });
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ accessToken: newAccessToken });
    } catch {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: "Invalid refresh token"
        });
    }
});

// ---------- INIT FROM FILE ----------

app.post("/init", auth, upload.single("file"), async (req, res) => {
    try {
        // 1. SPRAWDZAMY CZY SĄ JUŻ PRODUKTY
        const existingProducts = await db("products")
            .count("id as count")
            .first();

        if (Number(existingProducts.count) > 0) {
            return res.status(StatusCodes.CONFLICT).json({
                message: "Products already exist in database. Initialization forbidden."
            });
        }

        // 2. SPRAWDZAMY CZY JEST PLIK
        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "No file uploaded"
            });
        }

        const filePath = req.file.path;
        const ext = req.file.originalname.split(".").pop().toLowerCase();

        let products = [];

        // 3. OBSŁUGA JSON
        if (ext === "json") {
            const rawData = fs.readFileSync(filePath);
            products = JSON.parse(rawData);
        }

        // 4. OBSŁUGA CSV
        else if (ext === "csv") {
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on("data", (data) => products.push(data))
                    .on("end", resolve)
                    .on("error", reject);
            });
        } else {
            fs.unlinkSync(filePath);
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid file format. Only CSV or JSON allowed."
            });
        }

        // 5. WALIDACJA DANYCH
        for (const p of products) {
            if (
                !p.name ||
                !p.description ||
                !p.unit_price ||
                !p.unit_weight ||
                !p.category_id
            ) {
                fs.unlinkSync(filePath);
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Invalid product data in file"
                });
            }
        }

        // 6. ZAPIS DO BAZY
        for (const p of products) {
            await db("products").insert({
                name: p.name,
                description: p.description,
                unit_price: p.unit_price,
                unit_weight: p.unit_weight,
                category_id: p.category_id
            });
        }

        // 7. USUWAMY PLIK TYMCZASOWY
        fs.unlinkSync(filePath);

        // 8. SUKCES
        res.status(StatusCodes.OK).json({
            message: "Database initialized successfully with products",
            count: products.length
        });
    } catch (err) {
        console.error(err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error initializing database"
        });
    }
});


// ---------- GLOBAL ERROR FALLBACK ----------

app.use((err, req, res, next) => {
    console.error(err);
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
});

// ---------- SEO PRODUCT DESCRIPTION WITH GROQ LLM (D1 PREMIUM) ----------

app.get('/products/:id/seo-description', async (req, res) => {
    try {
        const product = await db('products')
            .join('categories', 'products.category_id', 'categories.id')
            .select(
                'products.id',
                'products.name',
                'products.description',
                'products.unit_price',
                'products.unit_weight',
                'categories.name as category'
            )
            .where('products.id', req.params.id)
            .first();

        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({
                message: 'Product not found'
            });
        }

        // PROMPT DLA MODELU
        const prompt = `
            Wygeneruj profesjonalny opis SEO w formacie HTML dla produktu:
            Nazwa: ${product.name}
            Opis: ${product.description}
            Cena: ${product.unit_price} zł
            Waga: ${product.unit_weight} kg
            Kategoria: ${product.category}
            
            Zwróć tylko czysty kod HTML.
            Użyj znaczników: <h1>, <h2>, <p>, <ul>, <li>.
            Opis ma być marketingowy, naturalny i zoptymalizowany pod SEO.
        `;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Jesteś specjalistą SEO e-commerce.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const seoHtml = response.data.choices[0].message.content;

        res.status(StatusCodes.OK).send(seoHtml);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error generating SEO description with AI'
        });
    }
});


const PORT = 3000;
app.listen(PORT, () =>
    console.log(`API running on http://localhost:${PORT}`)
);
