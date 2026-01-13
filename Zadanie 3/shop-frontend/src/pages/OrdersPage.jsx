import React, { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString();
}

export default function OrdersPage() {
    const { isEmployee } = useAuth();


    const [orders, setOrders] = useState([]);
    const [statuses, setStatuses] = useState([]); // [{id,name}]
    const [statusFilter, setStatusFilter] = useState(""); // "" albo status_id
    const [totalsById, setTotalsById] = useState({}); // { [orderId]: number }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const statusNameById = useMemo(() => {
        const map = {};
        statuses.forEach((s) => (map[s.id] = s.name));
        return map;
    }, [statuses]);

    const loadTotals = async (ordersList) => {
        // dociągamy szczegóły /orders/:id i liczymy sumę
        const entries = await Promise.all(
            ordersList.map(async (o) => {
                try {
                    const details = await http.get(`/orders/${o.id}`);
                    const items = details.data?.items || [];
                    const total = items.reduce(
                        (sum, it) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0),
                        0
                    );
                    return [o.id, total];
                } catch {
                    return [o.id, 0];
                }
            })
        );

        const obj = {};
        entries.forEach(([id, total]) => (obj[id] = total));
        setTotalsById(obj);
    };

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [o, s] = await Promise.all([http.get("/orders"), http.get("/status")]);
            const ordersData = o.data || [];
            const statusData = s.data || [];
            setOrders(ordersData);
            setStatuses(statusData);
            await loadTotals(ordersData);
        } catch (e) {
            setError(e?.response?.data?.message || "Nie udało się pobrać zamówień.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        if (!statusFilter) return orders;
        return orders.filter((o) => String(o.status_id) === String(statusFilter));
    }, [orders, statusFilter]);

    const pendingOrders = useMemo(() => {
        // "niezrealizowane": status != COMPLETED i != CANCELLED
        return orders.filter((o) => {
            const name = statusNameById[o.status_id];
            return !["COMPLETED", "CANCELLED"].includes(String(name));
        });
    }, [orders, statusNameById]);

    const setOrderStatus = async (id, statusName) => {
        try {
            await http.patch(`/orders/${id}`, { status: statusName }); // backend chce name
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || "Błąd zmiany statusu zamówienia.");
        }
    };

    return (
        <div>
            <h3 className="mb-3">Zamówienia</h3>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
                <div className="alert alert-info">Ładowanie...</div>
            ) : (
                <>
                    <div className="row g-2 mb-3">
                        <div className="col-md-6">
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Wszystkie statusy</option>
                                {statuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6 d-flex justify-content-end align-items-center text-muted">
                            Kliknij zamówienie, aby zobaczyć szczegóły
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-header">Zamówienia wg stanu (tabela)</div>
                        <div className="card-body table-responsive">
                            <table className="table table-striped align-middle">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th className="text-end">Wartość</th>
                                    <th className="text-end">Szczegóły</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filtered.map((o) => (
                                    <tr key={o.id}>
                                        <td>{formatDate(o.created_at)}</td>
                                        <td>{statusNameById[o.status_id] || `status_id=${o.status_id}`}</td>
                                        <td className="text-end">{(totalsById[o.id] ?? 0).toFixed(2)} zł</td>
                                        <td className="text-end">
                                            <Link className="btn btn-outline-primary btn-sm" to={`/orders/${o.id}`}>
                                                Otwórz
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center text-muted py-4">
                                            Brak zamówień dla wybranego statusu
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Niezrealizowane zamówienia</div>
                        <div className="card-body table-responsive">
                            <table className="table align-middle">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th className="text-end">Wartość</th>
                                    <th>Status</th>
                                    {isEmployee && <th className="text-end">Akcje</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {pendingOrders.map((o) => (
                                    <tr key={o.id}>
                                        <td>{formatDate(o.created_at)}</td>
                                        <td className="text-end">{(totalsById[o.id] ?? 0).toFixed(2)} zł</td>
                                        <td>{statusNameById[o.status_id] || `status_id=${o.status_id}`}</td>
                                        {isEmployee && (
                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => setOrderStatus(o.id, "COMPLETED")}
                                                    >
                                                        Zrealizuj
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => setOrderStatus(o.id, "CANCELLED")}
                                                    >
                                                        Anuluj
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {pendingOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={isEmployee ? 4 : 3} className="text-center text-muted py-4">
                                            Brak niezrealizowanych zamówień
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>

                            {!isEmployee && (
                                <div className="alert alert-secondary mb-0">
                                    Zmiana statusu jest dostępna dla pracownika (zaloguj się jako <code>admin</code>).
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}