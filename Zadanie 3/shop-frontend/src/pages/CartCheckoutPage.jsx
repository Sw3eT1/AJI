import React, { useMemo, useState } from "react";
import { useCart } from "../contexts/CartContext";
import { http } from "../api/http";
import { useNavigate } from "react-router-dom";

function validateContact({ name, email, phone }) {
    const errors = {};
    if (!name || name.trim().length < 2) errors.name = "Podaj nazwę użytkownika (min. 2 znaki).";
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = "Podaj poprawny email.";
    if (!phone || !/^[0-9+\-\s]{6,}$/.test(phone)) errors.phone = "Podaj poprawny numer telefonu.";
    return errors;
}

export default function CartCheckoutPage() {
    const { items, inc, dec, remove, setQty, total, clear } = useCart();
    const navigate = useNavigate();

    const [contact, setContact] = useState({ name: "", email: "", phone: "" });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [sending, setSending] = useState(false);

    const hasItems = items.length > 0;

    const orderPayload = useMemo(() => {
        return {
            items: items.map((x) => ({ product_id: x.product.id, quantity: x.quantity })),
            // backend ignoruje dodatkowe pola, ale my spełniamy wymaganie UI:
            contact,
        };
    }, [items, contact]);

    const submit = async () => {
        setServerError("");
        const e = validateContact(contact);
        if (!hasItems) e.cart = "Koszyk jest pusty.";
        setErrors(e);
        if (Object.keys(e).length) return;

        setSending(true);
        try {
            const res = await http.post("/orders", orderPayload);
            clear();
            const newId = res.data?.id;
            if (newId) navigate(`/orders/${newId}`);
            else navigate("/orders");
        } catch (err) {
            setServerError(err?.response?.data?.message || "Nie udało się złożyć zamówienia.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <h3 className="mb-3">Składanie zamówienia</h3>

            {!hasItems && (
                <div className="alert alert-warning">
                    Koszyk jest pusty. Wróć do produktów i dodaj coś do koszyka.
                </div>
            )}

            {errors.cart && <div className="alert alert-danger">{errors.cart}</div>}
            {serverError && <div className="alert alert-danger">{serverError}</div>}

            <div className="row g-3">
                <div className="col-lg-8">
                    <div className="card">
                        <div className="card-header">Towary w zamówieniu</div>
                        <div className="card-body table-responsive">
                            <table className="table align-middle">
                                <thead>
                                <tr>
                                    <th>Nazwa</th>
                                    <th style={{ width: 200 }}>Ilość</th>
                                    <th className="text-end">Cena łączna</th>
                                    <th className="text-end">Akcje</th>
                                </tr>
                                </thead>
                                <tbody>
                                {items.map((x) => (
                                    <tr key={x.product.id}>
                                        <td>{x.product.name}</td>
                                        <td>
                                            <div className="input-group">
                                                <button className="btn btn-outline-secondary" onClick={() => dec(x.product.id)}>
                                                    -
                                                </button>
                                                <input
                                                    className="form-control text-center"
                                                    type="number"
                                                    min={1}
                                                    value={x.quantity}
                                                    onChange={(e) => setQty(x.product.id, e.target.value)}
                                                />
                                                <button className="btn btn-outline-secondary" onClick={() => inc(x.product.id)}>
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            {(Number(x.product.unit_price) * x.quantity).toFixed(2)} zł
                                        </td>
                                        <td className="text-end">
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => remove(x.product.id)}>
                                                Usuń
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center text-muted py-4">
                                            Brak pozycji w koszyku
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>

                            <div className="d-flex justify-content-end">
                                <div className="fs-5">
                                    Razem: <strong>{total.toFixed(2)} zł</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-header">Dane kontaktowe</div>
                        <div className="card-body">
                            <label className="form-label">Nazwa użytkownika</label>
                            <input
                                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                value={contact.name}
                                onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))}
                            />
                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}

                            <label className="form-label mt-2">Email</label>
                            <input
                                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                value={contact.email}
                                onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))}
                            />
                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}

                            <label className="form-label mt-2">Telefon</label>
                            <input
                                className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                                value={contact.phone}
                                onChange={(e) => setContact((s) => ({ ...s, phone: e.target.value }))}
                            />
                            {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}

                            <button
                                className="btn btn-primary w-100 mt-3"
                                onClick={submit}
                                disabled={sending || !hasItems}
                            >
                                {sending ? "Wysyłam..." : "Złóż zamówienie"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
