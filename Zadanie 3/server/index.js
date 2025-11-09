import express from 'express';
import db from './db.js';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

const app = express();
app.use(express.json());

const ORDER_STATUS = {
    UNCONFIRMED: 'UNCONFIRMED',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED'
};

app.get('/', (req, res) => {
    res.send('✅ API działa poprawnie!');
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
app.post('/products', async (req, res) => {
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

        const [id] = await db('products').insert({
            name,
            description,
            unit_price,
            unit_weight,
            category_id
        });

        const newProduct = await db('products').where({ id }).first();
        res.status(StatusCodes.CREATED).json(newProduct);
    } catch (err) {
        console.error(err);
        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: 'Error creating product' });
    }
});

// PUT /products/:id - aktualizacja
app.put('/products/:id', async (req, res) => {
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
app.post('/orders', async (req, res) => {
    try {
        const { username, email, phone, items } = req.body;

        if (!username || !email || !phone) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Username, email and phone are required'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: 'Order items are required' });
        }

        // Walidacja pozycji i produktów
        for (const item of items) {
            if (
                !item.product_id ||
                !Number.isInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message:
                        'Each item must have valid product_id and positive integer quantity'
                });
            }

            const product = await db('products')
                .where({ id: item.product_id })
                .first();
            if (!product) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    message: `Product with id ${item.product_id} does not exist`
                });
            }
        }

        // status startowy = UNCONFIRMED
        const status = await db('order_statuses')
            .where({ name: ORDER_STATUS.UNCONFIRMED })
            .first();

        const [orderId] = await db('orders').insert({
            username,
            email,
            phone,
            status_id: status.id
        });

        const orderItems = items.map((i) => ({
            order_id: orderId,
            product_id: i.product_id,
            quantity: i.quantity
        }));

        await db('order_items').insert(orderItems);

        const newOrder = await db('orders').where({ id: orderId }).first();
        res.status(StatusCodes.CREATED).json(newOrder);
    } catch (err) {
        console.error(err);
        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: 'Error creating order' });
    }
});

// GET /orders/status/:statusId - zamówienia wg statusu
app.get('/orders/status/:statusId', async (req, res) => {
    const orders = await db('orders').where({ status_id: req.params.statusId });
    res.json(orders);
});

// PATCH /orders/:id - zmiana stanu zamówienia
app.patch('/orders/:id', async (req, res) => {
    const { status_id } = req.body;
    const id = req.params.id;

    const order = await db('orders').where({ id }).first();
    if (!order) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: 'Order not found' });
    }

    const newStatus = await db('order_statuses')
        .where({ id: status_id })
        .first();
    if (!newStatus) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: 'Invalid status_id' });
    }

    // proste reguły zmian statusów
    const current = await db('order_statuses')
        .where({ id: order.status_id })
        .first();

    if (current.name === ORDER_STATUS.CANCELLED) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'Cannot change status of a CANCELLED order'
        });
    }

    if (
        current.name === ORDER_STATUS.COMPLETED &&
        newStatus.name !== ORDER_STATUS.COMPLETED
    ) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'Cannot revert COMPLETED order to previous state'
        });
    }

    await db('orders').where({ id }).update({
        status_id: status_id,
        approved_at:
            newStatus.name === ORDER_STATUS.CONFIRMED && !order.approved_at
                ? db.fn.now()
                : order.approved_at
    });

    const updated = await db('orders').where({ id }).first();
    res.json(updated);
});

// ---------- GLOBAL ERROR FALLBACK ----------

app.use((err, req, res, next) => {
    console.error(err);
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
});

const PORT = 3000;
app.listen(PORT, () =>
    console.log(`API running on http://localhost:${PORT}`)
);
