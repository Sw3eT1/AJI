import React, { useMemo, useState } from "react";
import { http } from "../api/http";

function stripHtmlTags(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    return tmp.textContent
        .replace(/\s+/g, " ")
        .trim();
}

export default function ProductEditModal({ product, categories, onClose, onSaved }) {
    const [form, setForm] = useState(() => ({
        name: product.name ?? "",
        description: product.description ?? "",
        unit_price: product.unit_price ?? 0,
        unit_weight: product.unit_weight ?? 0,
        category_id: product.category_id ?? "",
    }));

    const [serverError, setServerError] = useState("");
    const [saving, setSaving] = useState(false);
    const [optimizing, setOptimizing] = useState(false);

    const catOptions = useMemo(() => categories || [], [categories]);

    const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

    const optimizeDescription = async () => {
        setServerError("");
        setOptimizing(true);
        try {
            // backend: GET /products/:id/seo-description
            const res = await http.get(`/products/${product.id}/seo-description`);
            const html = res.data;
            setField("description", stripHtmlTags(html));
        } catch (e) {
            setServerError(e?.response?.data?.message || "Nie udało się zoptymalizować opisu.");
        } finally {
            setOptimizing(false);
        }
    };

    const save = async () => {
        setServerError("");
        setSaving(true);
        try {
            // UWAGA: walidacja ma być po stronie serwera (wymaganie),
            // więc tu nie blokujemy – tylko wysyłamy i pokazujemy message z backendu.
            await http.put(`/products/${product.id}`, {
                ...form,
                unit_price: Number(form.unit_price),
                unit_weight: Number(form.unit_weight),
                category_id: Number(form.category_id),
            });
            onSaved();
        } catch (e) {
            setServerError(e?.response?.data?.message || "Błąd zapisu produktu.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            style={{ background: "rgba(0,0,0,.5)" }}
        >
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Edycja produktu</h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body">
                        {serverError && <div className="alert alert-danger">{serverError}</div>}

                        <div className="row g-2">
                            <div className="col-md-6">
                                <label className="form-label">Nazwa</label>
                                <input
                                    className="form-control"
                                    value={form.name}
                                    onChange={(e) => setField("name", e.target.value)}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Kategoria</label>
                                <select
                                    className="form-select"
                                    value={form.category_id}
                                    onChange={(e) => setField("category_id", e.target.value)}
                                >
                                    <option value="">Wybierz...</option>
                                    {catOptions.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Cena</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={form.unit_price}
                                    onChange={(e) => setField("unit_price", e.target.value)}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Waga</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={form.unit_weight}
                                    onChange={(e) => setField("unit_weight", e.target.value)}
                                />
                            </div>

                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-center">
                                    <label className="form-label mb-0">Opis</label>
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={optimizeDescription}
                                        disabled={optimizing}
                                    >
                                        {optimizing ? "Optymalizuję..." : "Optymalizuj opis"}
                                    </button>
                                </div>
                                <textarea
                                    className="form-control mt-2"
                                    rows={6}
                                    value={form.description}
                                    onChange={(e) => setField("description", e.target.value)}
                                />
                                <div className="form-text">
                                    Opis po optymalizacji możesz jeszcze poprawić przed zapisem (D1).
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                            Anuluj
                        </button>
                        <button className="btn btn-primary" onClick={save} disabled={saving}>
                            {saving ? "Zapisuję..." : "Zapisz"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
