import React, { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString();
}

function validateOpinion({ rating, content, date }) {
    const errors = {};
    const r = Number(rating);
    if (!(r >= 1 && r <= 5)) errors.rating = "Ocena musi być w skali 1-5.";
    if (!content || content.trim().length < 5) errors.content = "Treść opinii min. 5 znaków.";
    if (!date) errors.date = "Podaj datę.";
    return errors;
}

export default function OrderDetailsPage() {
    const { id } = useParams();
    const { isEmployee } = useAuth();

    const [order, setOrder] = useState(null);
    const [opinions, setOpinions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [opForm, setOpForm] = useState({
        rating: 5,
        content: "",
        date: new Date().toISOString().slice(0, 10),
    });
    const [opErrors, setOpErrors] = useState({});
    const [opServerError, setOpServerError] = useState("");
    const [sending, setSending] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const o = await http.get(`/orders/${id}`);
            setOrder(o.data);

            // D4: lista opinii
            try {
                const op = await http.get(`/orders/${id}/opinions`);
                setOpinions(op.data?.opinions || []);
            } catch {
                setOpinions([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const computedTotal = useMemo(() => {
        return (order?.items || []).reduce((sum, it) => {
            return sum + Number(it.unit_price || 0) * Number(it.quantity || 0);
        }, 0);
    }, [order]);


    const canAddOpinion = useMemo(() => {
        const status = String(order?.status || "");
        const finished = ["COMPLETED", "CANCELLED"].includes(status);
        const already = (opinions || []).length > 0;
        return finished && !already;
    }, [order, opinions]);

    const addOpinion = async () => {
        setOpServerError("");
        const e = validateOpinion(opForm);

        // wymaganie: przed wysłaniem upewnij się, że zamówienie COMPLETED/CANCELLED i brak opinii
        if (!canAddOpinion) {
            e.form =
                "Nie można dodać opinii: zamówienie musi być ZREALIZOWANE lub ANULOWANE i nie może mieć już opinii.";
        }

        setOpErrors(e);
        if (Object.keys(e).length) return;

        setSending(true);
        try {
            await http.post(`/orders/${id}/opinions`, {
                rating: Number(opForm.rating),
                content: opForm.content,
                date: opForm.date,
            });
            await load();
            setOpForm((s) => ({ ...s, content: "" }));
        } catch (err) {
            setOpServerError(err?.response?.data?.message || "Nie udało się dodać opinii.");
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="alert alert-info">Ładowanie...</div>;
    if (!order) return <div className="alert alert-danger">Nie znaleziono zamówienia.</div>;

    return (
        <div>
            <h3 className="mb-3">Zamówienie #{order.id}</h3>

            <div className="row g-3">
                <div className="col-lg-7">
                    <div className="card">
                        <div className="card-header">Pozycje</div>
                        <div className="card-body table-responsive">
                            <table className="table align-middle">
                                <thead>
                                <tr>
                                    <th>Nazwa</th>
                                    <th className="text-end">Sztuk</th>
                                    <th className="text-end">Cena łączna</th>
                                </tr>
                                </thead>
                                <tbody>
                                {(order.items || []).map((it, idx) => (
                                    <tr key={idx}>
                                        <td>{it.product_name || it.name}</td>
                                        <td className="text-end">{it.quantity}</td>
                                        <td className="text-end">
                                            {(Number(it.unit_price || 0) * Number(it.quantity || 0)).toFixed(2)} zł
                                        </td>
                                    </tr>
                                ))}
                                {(order.items || []).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center text-muted py-4">
                                            Brak pozycji
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>

                            <div className="d-flex justify-content-between">
                                <div>
                                    <div>Status: <strong>{order.status}</strong></div>
                                    <div className="text-muted">Data: {formatDate(order.created_at || order.createdAt)}</div>
                                </div>
                                <div className="fs-5">
                                    Razem: <strong>{computedTotal.toFixed(2)} zł</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="card mb-3">
                        <div className="card-header">Opinie (D4)</div>
                        <div className="card-body">
                            {opinions.length === 0 ? (
                                <div className="text-muted">Brak opinii</div>
                            ) : (
                                <ul className="list-group">
                                    {opinions.map((o) => (
                                        <li className="list-group-item" key={o.id || `${o.created_at}-${o.rating}`}>
                                            <div className="d-flex justify-content-between">
                                                <strong>Ocena: {o.rating}/5</strong>
                                                <span className="text-muted small">{formatDate(o.created_at || o.date)}</span>
                                            </div>
                                            <div className="mt-2">{o.content}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {(isEmployee || opinions.length > 0) && (
                                <div className="form-text mt-2">
                                    Pracownik widzi opinię przy zamówieniu (wymaganie D4).
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Dodaj opinię</div>
                        <div className="card-body">
                            {!canAddOpinion && (
                                <div className="alert alert-secondary">
                                    Opinię można dodać tylko gdy status to <strong>COMPLETED</strong> lub{" "}
                                    <strong>CANCELLED</strong> oraz gdy nie dodano jej wcześniej.
                                </div>
                            )}

                            {opErrors.form && <div className="alert alert-danger">{opErrors.form}</div>}
                            {opServerError && <div className="alert alert-danger">{opServerError}</div>}

                            <label className="form-label">Ocena (1-5)</label>
                            <input
                                type="number"
                                min={1}
                                max={5}
                                className={`form-control ${opErrors.rating ? "is-invalid" : ""}`}
                                value={opForm.rating}
                                onChange={(e) => setOpForm((s) => ({ ...s, rating: e.target.value }))}
                            />
                            {opErrors.rating && <div className="invalid-feedback">{opErrors.rating}</div>}

                            <label className="form-label mt-2">Treść</label>
                            <textarea
                                className={`form-control ${opErrors.content ? "is-invalid" : ""}`}
                                rows={4}
                                value={opForm.content}
                                onChange={(e) => setOpForm((s) => ({ ...s, content: e.target.value }))}
                            />
                            {opErrors.content && <div className="invalid-feedback">{opErrors.content}</div>}

                            <label className="form-label mt-2">Data</label>
                            <input
                                type="date"
                                className={`form-control ${opErrors.date ? "is-invalid" : ""}`}
                                value={opForm.date}
                                onChange={(e) => setOpForm((s) => ({ ...s, date: e.target.value }))}
                            />
                            {opErrors.date && <div className="invalid-feedback">{opErrors.date}</div>}

                            <button
                                className="btn btn-primary w-100 mt-3"
                                onClick={addOpinion}
                                disabled={sending || !canAddOpinion}
                            >
                                {sending ? "Wysyłam..." : "Dodaj opinię"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
