import React, { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ProductEditModal from "../components/ProductEditModal";

export default function ProductsPage() {
    const { add } = useCart();
    const { isEmployee } = useAuth();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [qName, setQName] = useState("");
    const [catId, setCatId] = useState("");

    const [editing, setEditing] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([http.get("/products"), http.get("/categories")]);
            setProducts(p.data || []);
            setCategories(c.data || []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const name = qName.trim().toLowerCase();
        return products.filter((p) => {
            const matchName =
                !name || String(p.name || "").toLowerCase().includes(name);
            const matchCat = !catId || String(p.category_id) === String(catId);
            return matchName && matchCat;
        });
    }, [products, qName, catId]);

    return (
        <div>
            <h3 className="mb-3">Towary</h3>

            <div className="row g-2 mb-3">
                <div className="col-md-6">
                    <input
                        className="form-control"
                        placeholder="Filtruj po nazwie..."
                        value={qName}
                        onChange={(e) => setQName(e.target.value)}
                    />
                </div>
                <div className="col-md-6">
                    <select
                        className="form-select"
                        value={catId}
                        onChange={(e) => setCatId(e.target.value)}
                    >
                        <option value="">Wszystkie kategorie</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="alert alert-info">Ładowanie...</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped align-middle">
                        <thead>
                        <tr>
                            <th>Nazwa</th>
                            <th>Opis</th>
                            <th className="text-end">Cena</th>
                            <th className="text-end">Akcje</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td style={{ maxWidth: 520 }}>
                                    <div className="text-truncate">{p.description}</div>
                                </td>
                                <td className="text-end">{Number(p.unit_price).toFixed(2)} zł</td>
                                <td className="text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                        <button className="btn btn-success btn-sm" onClick={() => add(p)}>
                                            Kup
                                        </button>
                                        {isEmployee && (
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => setEditing(p)}
                                            >
                                                Edytuj
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center text-muted py-4">
                                    Brak produktów dla wybranych filtrów
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <ProductEditModal
                    product={editing}
                    categories={categories}
                    onClose={() => setEditing(null)}
                    onSaved={async () => {
                        setEditing(null);
                        await load();
                    }}
                />
            )}
        </div>
    );
}
