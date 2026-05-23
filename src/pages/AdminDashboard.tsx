import React, { useState, useEffect } from "react";
import { IMaskInput } from "react-imask";
import styles from "./AdminDashboard.module.css";
import {
  fetchJks,
  createJk,
  updateJk,
  deleteJk,
  fetchUsers,
  deleteUser,
  fetchScheduleVotes,
  fetchTariffVotes,
  fetchTariffs,
  updateTariff,
  deleteTariff,
  fetchQRCodes,
  createQRCode,
  deleteQRCode,
  fetchAdminWorkers,
  createAdminWorker,
  updateAdminWorker,
  payoutAdminWorker,
  fetchAdminWorkerShifts,
  type JK,
  type User,
  type ScheduleVote,
  type TariffVote,
  type Tariff,
  type QRCode,
  type AdminShiftHistory,
} from "../services/api";
import { useAuth } from "../context/AuthContext.tsx";
import { Link } from "react-router-dom";

type Tab = "overview" | "employees" | "jk" | "tariffs" | "users" | "qr";

type EmployeeStatus = "active" | "on_shift" | "sick" | "fired";
type PayType = "task" | "hour" | "fix";

interface Employee {
  id: number;
  name: string;
  phone: string;
  payType: PayType;
  rate: number;
  status: EmployeeStatus;
  balance: number;
  assignedJK: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { token, logout } = useAuth();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isJkModalOpen, setIsJkModalOpen] = useState(false);
  const [editingJk, setEditingJk] = useState<JK | null>(null);
  const [newJkName, setNewJkName] = useState("");
  const [newJkAddress, setNewJkAddress] = useState("");

  // Real DB state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeShifts, setEmployeeShifts] = useState<AdminShiftHistory[]>([]);

  const [users, setUsers] = useState<User[]>([]); // Use User[] type

  const [jkVotes, setJkVotes] = useState<JK[]>([]);
  const [tariffVotes, setTariffVotes] = useState<TariffVote[]>([]);
  const [scheduleVotes, setScheduleVotes] = useState<ScheduleVote[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

  // QR Codes State
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [newQrName, setNewQrName] = useState("");
  const [newQrCode, setNewQrCode] = useState("");
  const [newQrJkId, setNewQrJkId] = useState("");

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [jkFilter, setJkFilter] = useState<string>("all");

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await fetchUsers(token);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const loadWorkers = async () => {
    if (!token) return;
    try {
      const res = await fetchAdminWorkers(token);
      setEmployees(res.map(emp => ({
        id: emp.id,
        name: emp.name,
        phone: emp.phone,
        payType: emp.pay_type,
        rate: emp.rate,
        status: emp.status,
        balance: emp.balance,
        assignedJK: emp.assigned_jk
      })));
    } catch (err) {
      console.error("Failed to load workers:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const loadJks = async () => {
    try {
      const data = await fetchJks();
      setJkVotes(data);
    } catch (err) {
      console.error("Failed to fetch JKs:", err);
    }
  };

  const loadScheduleVotes = async () => {
    if (!token) return;
    try {
      const data = await fetchScheduleVotes(token);
      setScheduleVotes(data);
    } catch (err) {
      console.error("Failed to fetch schedule votes:", err);
    }
  };

  const loadTariffVotes = async () => {
    if (!token) return;
    try {
      const data = await fetchTariffVotes(token);
      setTariffVotes(data);
    } catch (err) {
      console.error("Failed to fetch tariff votes:", err);
    }
  };

  const loadTariffs = async () => {
    try {
      const data = await fetchTariffs();
      setTariffs(data);
    } catch (err) {
      console.error("Failed to fetch tariffs:", err);
    }
  };

  const loadQRCodes = async () => {
    if (!token) return;
    try {
      const data = await fetchQRCodes(token);
      setQrCodes(data);
    } catch (err) {
      console.error("Failed to fetch QR codes:", err);
    }
  };


  // Periodically refresh data
  useEffect(() => {
    if (!token) return;

    // Initial load
    loadJks();
    loadUsers();
    loadScheduleVotes();
    loadTariffVotes();
    loadTariffs();
    loadQRCodes();
    loadWorkers();

    const interval = setInterval(() => {
      loadJks();
      loadUsers();
      loadScheduleVotes();
      loadTariffVotes();
      loadTariffs();
      loadQRCodes();
      loadWorkers();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUpdateTariff = async () => {
    if (!editingTariff || !token) return;
    try {
      await updateTariff(token, editingTariff.id, editingTariff);
      loadTariffs();
      setEditingTariff(null);
    } catch (err) {
      console.error("Failed to update tariff:", err);
      alert("Ошибка при сохранении тарифа");
    }
  };

  const handleAddJk = async () => {
    if (!newJkName || !newJkAddress || !token) return;
    try {
      await createJk(token, {
        name: newJkName,
        address: newJkAddress,
        fake_votes: 0,
        status: "pending",
      });
      loadJks();
      setIsJkModalOpen(false);
      setNewJkName("");
      setNewJkAddress("");
    } catch (err) {
      console.error("Failed to create JK:", err);
      alert("Ошибка при создании ЖК");
    }
  };

  const toggleJkStatus = async (jk: JK) => {
    if (!token) return;
    try {
      await updateJk(token, jk.id, {
        ...jk,
        status: jk.status === "connected" ? "pending" : "connected",
      });
      loadJks();
    } catch (err) {
      console.error("Failed to update JK status:", err);
    }
  };

  const getStatusColorClass = (status: EmployeeStatus) => {
    switch (status) {
      case "active":
        return styles.dotActive;
      case "on_shift":
        return styles.dotShift;
      case "sick":
        return styles.dotSick;
      case "fired":
        return styles.dotFired;
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
  };

  const handleEmployeeClick = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeShifts([]); // Reset list
    if (!token) return;
    try {
      const shifts = await fetchAdminWorkerShifts(token, emp.id);
      setEmployeeShifts(shifts);
    } catch (err) {
      console.error("Failed to load shifts for worker:", err);
    }
  };

  const handleAddNewEmployee = () => {
    const newEmp: Employee = {
      id: Date.now(),
      name: "",
      phone: "",
      payType: "task",
      rate: 150,
      status: "active",
      balance: 0,
      assignedJK: "",
    };
    setSelectedEmployee(newEmp);
    setEmployeeShifts([]);
  };

  const handlePayout = async () => {
    if (!selectedEmployee || !token) return;
    try {
      await payoutAdminWorker(token, selectedEmployee.id);
      alert(`Успешно выплачено ${formatMoney(selectedEmployee.balance)} сотруднику ${selectedEmployee.name}!`);
      await loadWorkers();
      setSelectedEmployee(prev => prev ? { ...prev, balance: 0 } : null);
    } catch (err) {
      console.error("Payout failed:", err);
      alert("Не удалось совершить выплату.");
    }
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee || !token) return;
    try {
      // Check if it's a new or existing employee in our active list
      const exists = employees.find(e => e.id === selectedEmployee.id);
      
      const payload = {
        phone: selectedEmployee.phone,
        name: selectedEmployee.name,
        payType: selectedEmployee.payType,
        rate: selectedEmployee.rate,
        status: selectedEmployee.status,
        assignedJK: selectedEmployee.assignedJK,
      };

      if (exists) {
        await updateAdminWorker(token, selectedEmployee.id, payload);
      } else {
        await createAdminWorker(token, payload);
      }
      
      await loadWorkers();
      setSelectedEmployee(null);
    } catch (err) {
      console.error("Failed to save employee profile:", err);
      alert("Не удалось сохранить профиль сотрудника. Убедитесь, что номер телефона заполнен корректно и уникален.");
    }
  };

  const renderOverview = () => (
    <>
      <div className={styles.statsScroll}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Пользователи</div>
          <div className={styles.statValue}>{users.length}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAlt}`}>
          <div className={styles.statLabel}>Заявки (ЖК)</div>
          <div className={styles.statValue}>
            {jkVotes.reduce((acc, jk) => acc + Number(jk.real_votes), 0)}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAlt}`}>
          <div className={styles.statLabel}>Опросы</div>
          <div className={styles.statValue}>
            {scheduleVotes.reduce((acc, v) => acc + Number(v.count), 0) +
              tariffVotes.reduce((acc, v) => acc + Number(v.count), 0)}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Топ ЖК по заявкам</span>
          <button
            className={styles.actionBtn}
            onClick={() => setActiveTab("jk")}
          >
            Все
          </button>
        </div>
        <div className={styles.list}>
          {[...jkVotes]
            .sort((a, b) => b.real_votes - a.real_votes)
            .slice(0, 3)
            .map((jk) => (
              <div key={jk.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{jk.name}</span>
                  <span className={styles.itemSub}>{jk.real_votes} заявок</span>
                </div>
                <div
                  className={`${styles.itemBadge} ${jk.status === "connected" ? styles.itemBadgeAlt : ""}`}
                >
                  {jk.status === "connected" ? "Активен" : "Ожидает"}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Опрос по времени</span>
        </div>
        <div className={styles.list}>
          {scheduleVotes.map((vote) => (
            <div key={vote.vote_option} className={styles.listItem}>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>
                  {vote.vote_option === "morning" ? "Утро" : "Вечер"}
                </span>
              </div>
              <div className={styles.itemValueColumn}>
                <span className={styles.itemValue}>{vote.count} голосов</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Опрос по тарифам</span>
        </div>
        <div className={styles.list}>
          {tariffVotes.map((vote) => (
            <div key={vote.tariff_name} className={styles.listItem}>
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{vote.tariff_name}</span>
              </div>
              <div className={styles.itemValueColumn}>
                <span className={styles.itemValue}>{vote.count} голосов</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderUsers = () => {
    const getRoleLabel = (role: string) => {
      switch (role) {
        case "admin":
          return "Администратор";
        case "worker":
          return "Сотрудник";
        default:
          return "Клиент";
      }
    };

    const filteredUsers =
      jkFilter === "all" ? users : users.filter((u) => u.jk_name === jkFilter);

    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Клиенты</span>
          <select
            className={styles.inputSmall}
            style={{ width: "auto", padding: "8px 12px", fontSize: "13px" }}
            value={jkFilter}
            onChange={(e) => setJkFilter(e.target.value)}
          >
            <option value="all">Все ЖК</option>
            {jkVotes.map((jk) => (
              <option key={jk.id} value={jk.name}>
                {jk.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.list}>
          {filteredUsers.map((user) => {
            const address = [
              user.jk_name,
              user.street,
              user.entrance ? `под. ${user.entrance}` : null,
              user.floor ? `эт. ${user.floor}` : null,
              user.apartment ? `кв. ${user.apartment}` : null,
              user.intercom ? `код: ${user.intercom}` : null,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <div key={user.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{user.name}</span>
                  </div>
                  <span className={styles.itemSub}>{user.phone}</span>
                  {address && (
                    <span
                      className={styles.itemSub}
                      style={{
                        marginTop: "4px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {address}
                    </span>
                  )}
                  {(user.tariff_vote || user.schedule_vote || user.qr_source) && (
                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {user.qr_source && (
                        <span
                          style={{
                            background: "#e5f1ff",
                            color: "#0066cc",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.02em",
                          }}
                        >
                          📢 {user.qr_source}
                        </span>
                      )}
                      {user.tariff_vote && (
                        <span
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent-color)",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {user.tariff_vote}
                        </span>
                      )}
                      {user.schedule_vote && (
                        <span
                          style={{
                            background: "#f2f2f7",
                            color: "#8e8e93",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {user.schedule_vote === "morning" ? "Утро" : "Вечер"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.itemValueColumn}>
                  <div
                    className={`${styles.itemBadge} ${user.role === "admin" ? styles.itemBadgeAlt : ""}`}
                    style={{ fontSize: "11px", padding: "4px 10px" }}
                  >
                    {getRoleLabel(user.role)}
                  </div>
                  <div className={styles.actionMenu}>
                    <button
                      className={styles.dotsBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === user.id ? null : user.id,
                        );
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {activeMenuId === user.id && (
                      <div className={styles.dropdown}>
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (
                              confirm(`Удалить пользователя ${user.name}?`) &&
                              token
                            ) {
                              await deleteUser(token, user.id);
                              loadUsers();
                            }
                            setActiveMenuId(null);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEmployees = () => {
    if (selectedEmployee) {
      return (
        <div className={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px" }}>
            <button
              onClick={() => setSelectedEmployee(null)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "14px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "600",
                padding: "6px 12px",
                borderRadius: "10px",
                transition: "all 0.2s",
                backgroundColor: "#f5f5f7"
              }}
            >
              ← Назад
            </button>
            <span className={styles.label} style={{ fontSize: "16px", fontWeight: "700" }}>
              {employees.find(e => e.id === selectedEmployee.id) ? "Профиль сотрудника" : "Новый сотрудник"}
            </span>
          </div>

          <div className={styles.modalContent} style={{ padding: "0" }}>
            <div className={styles.block} style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <span className={styles.blockTitle} style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Личные данные</span>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>ФИО сотрудника</label>
                <input
                  type="text"
                  placeholder="Имя Фамилия"
                  value={selectedEmployee.name}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      name: e.target.value,
                    })
                  }
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Номер телефона</label>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  placeholder="+7 (999) 000-00-00"
                  value={selectedEmployee.phone}
                  onAccept={(value: string) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      phone: value,
                    })
                  }
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
                />
              </div>
            </div>


            <div className={styles.block} style={{ marginBottom: "20px" }}>
              <span className={styles.blockTitle} style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Баланс и Выплаты</span>
              <div className={styles.balanceBox} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f5f7", padding: "16px", borderRadius: "12px" }}>
                <div className={styles.balanceInfo} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span className={styles.balanceLabel} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>К выплате</span>
                  <span className={styles.balanceAmount} style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
                    {formatMoney(selectedEmployee.balance)}
                  </span>
                </div>
                <button
                  className={styles.payoutBtn}
                  onClick={handlePayout}
                  disabled={selectedEmployee.balance === 0}
                  style={{ 
                    opacity: selectedEmployee.balance === 0 ? 0.5 : 1,
                    background: "#2e7d32",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontWeight: "600",
                    cursor: selectedEmployee.balance === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  Выплатить
                </button>
              </div>
            </div>

            <div className={styles.block} style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span className={styles.blockTitle} style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Локация и Статус</span>
              <select
                className={styles.inputSmall}
                value={selectedEmployee.assignedJK}
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    assignedJK: e.target.value,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
              >
                <option value="">Выберите ЖК для сотрудника</option>
                <option value="Все ЖК (Резерв)">Все ЖК (Резерв)</option>
                {jkVotes.map((jk) => (
                  <option key={jk.id} value={jk.name}>
                    {jk.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.inputSmall}
                value={selectedEmployee.status}
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    status: e.target.value as EmployeeStatus,
                  })
                }
                style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
              >
                <option value="active">Свободен (Готов к работе)</option>
                <option value="on_shift">На смене (Разносит мусор)</option>
                <option value="sick">Болен / Отпуск</option>
                <option value="fired">Уволен</option>
              </select>
            </div>

            <div className={styles.block} style={{ marginBottom: "20px" }}>
              <span className={styles.blockTitle} style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Настройка зарплаты</span>
              <div className={styles.selectGroup} style={{ display: "flex", gap: "10px" }}>
                <select
                  className={styles.inputSmall}
                  value={selectedEmployee.payType}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      payType: e.target.value as PayType,
                    })
                  }
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
                >
                  <option value="task">За задачу (шт)</option>
                  <option value="hour">Почасовая (час)</option>
                  <option value="fix">Оклад (мес)</option>
                </select>
                <input
                  type="number"
                  className={styles.inputSmall}
                  placeholder="Ставка ₽"
                  value={selectedEmployee.rate || ""}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      rate: Number(e.target.value),
                    })
                  }
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e5e5ea", background: "#fff", outline: "none", fontSize: "14px" }}
                />
              </div>
            </div>

            {/* Shift History Section */}
            {selectedEmployee.id && employees.find(e => e.id === selectedEmployee.id) && (
              <div className={styles.block} style={{ marginBottom: "20px" }}>
                <span className={styles.blockTitle} style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>История смен</span>
                {employeeShifts.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", padding: "10px 0" }}>
                    История смен пуста. Сотрудник еще не выходил на смену.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                    {employeeShifts.map(s => {
                      const startedDate = new Date(s.started_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      });
                      const isCompleted = s.status === "completed";

                      return (
                        <div key={s.id} style={{ background: "#f5f5f7", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "700" }}>{startedDate}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                              {isCompleted 
                                ? `Собрано: ${s.collected_tasks} • Ошибок: ${s.failed_tasks}` 
                                : "На смене 🚚"}
                            </span>
                          </div>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: isCompleted ? "#2e7d32" : "#007af5" }}>
                            {isCompleted ? `+${s.earned_amount} ₽` : "В процессе"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSaveEmployee}
              style={{
                width: "100%",
                background: "#007af5",
                color: "#fff",
                border: "none",
                padding: "14px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                marginTop: "10px",
                transition: "background 0.2s"
              }}
            >
              Сохранить профиль
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.label}>Сотрудники</span>
        </div>
        <div className={styles.list}>
          {employees.map((emp) => (
            <div
              key={emp.id}
              className={styles.listItem}
              onClick={() => handleEmployeeClick(emp)}
            >
              <div className={styles.itemInfo}>
                <div className={styles.itemTitleRow} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    className={`${styles.statusDot} ${getStatusColorClass(emp.status)}`}
                  />
                  <span className={styles.itemTitle} style={{ fontWeight: "700" }}>{emp.name}</span>
                  <span style={{ 
                    fontSize: "10px", 
                    fontWeight: "600", 
                    padding: "2px 6px", 
                    borderRadius: "6px", 
                    background: emp.status === "active" ? "#e8f5e9" : emp.status === "on_shift" ? "#e3f2fd" : emp.status === "sick" ? "#fff3e0" : "#ffebee",
                    color: emp.status === "active" ? "#2e7d32" : emp.status === "on_shift" ? "#1565c0" : emp.status === "sick" ? "#e65100" : "#c62828",
                  }}>
                    {emp.status === "active" ? "Свободен" : emp.status === "on_shift" ? "На смене" : emp.status === "sick" ? "Болен/Отпуск" : "Уволен"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
                  <span className={styles.itemSub} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    🏢 {emp.assignedJK || "Не закреплен"}
                  </span>
                  {emp.phone && (
                    <span className={styles.itemSub} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      📞 {emp.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.itemValueColumn}>
                <span className={styles.itemValue}>
                  {emp.payType === "task"
                    ? `${emp.rate}₽/шт`
                    : emp.payType === "hour"
                      ? `${emp.rate}₽/ч`
                      : `${emp.rate / 1000}к фикс`}
                </span>
                {emp.balance > 0 && (
                  <span className={styles.itemBalance}>
                    Долг: {formatMoney(emp.balance)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className={styles.fab} onClick={handleAddNewEmployee}>
          +
        </button>
      </div>
    );
  };

  const renderJK = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.label}>Опросы по домам</span>
      </div>
      <div className={styles.gridList}>
        {jkVotes.map((jk) => (
          <div key={jk.id} className={styles.listItem}>
            <div
              className={styles.itemInfo}
              onClick={() => setEditingJk(jk)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.itemTitleRow}>
                <span className={styles.itemTitle}>{jk.name}</span>
                <div
                  className={`${styles.itemBadge} ${jk.status === "connected" ? styles.itemBadgeAlt : ""}`}
                  style={{ fontSize: "10px", padding: "2px 8px" }}
                >
                  {jk.status === "connected" ? "АКТИВЕН" : "ОЖИДАЕТ"}
                </div>
              </div>
              <span className={styles.itemSub}>{jk.address}</span>
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                  }}
                >
                  {jk.fake_votes}
                </span>
                <span
                  style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                >
                  всего (из них {jk.real_votes} реал.) • изменить
                </span>
              </div>
            </div>
            <div className={styles.itemValueColumn}>
              <div className={styles.actionMenu}>
                <button
                  className={styles.dotsBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === jk.id ? null : jk.id);
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
                {activeMenuId === jk.id && (
                  <div className={styles.dropdown}>
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleJkStatus(jk);
                        setActiveMenuId(null);
                      }}
                    >
                      {jk.status === "connected"
                        ? "Деактивировать"
                        : "Активировать"}
                    </button>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить ${jk.name}?`) && token) {
                          await deleteJk(token, jk.id);
                          loadJks();
                        }
                        setActiveMenuId(null);
                      }}
                    >
                      Удалить ЖК
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className={styles.fab} onClick={() => setIsJkModalOpen(true)}>
        +
      </button>
    </div>
  );

  const downloadQR = async (code: string, name: string) => {
    const fullRedirectUrl = window.location.origin + "/qr/" + code;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(fullRedirectUrl)}`;
    try {
      const res = await fetch(qrApiUrl);
      const blob = await res.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `QR_${code}_${name.replace(/[^a-zA-Z0-9А-Яа-я_-]/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      alert("Не удалось скачать QR-код.");
    }
  };

  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrName || !token) return;
    try {
      await createQRCode(token, {
        name: newQrName,
        code: newQrCode || undefined,
        jkId: newQrJkId ? Number(newQrJkId) : undefined,
      });
      setNewQrName("");
      setNewQrCode("");
      setNewQrJkId("");
      loadQRCodes();
    } catch (err) {
      console.error("Failed to create QR code:", err);
      alert("Ошибка при создании QR-кода. Возможно, такой слаг уже существует.");
    }
  };

  const handleDeleteQR = async (id: number, name: string) => {
    if (!token || !confirm(`Удалить QR-код "${name}"?`)) return;
    try {
      await deleteQRCode(token, id);
      loadQRCodes();
    } catch (err) {
      console.error("Failed to delete QR code:", err);
      alert("Не удалось удалить QR-код.");
    }
  };

  const renderQR = () => {
    const totalScans = qrCodes.reduce((acc, q) => acc + q.scans_count, 0);
    const totalRegs = qrCodes.reduce((acc, q) => acc + q.registrations_count, 0);
    const averageCR = totalScans > 0 ? ((totalRegs / totalScans) * 100).toFixed(1) : "0.0";

    return (
      <>
        {/* Analytics Summary */}
        <div className={styles.statsScroll}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Всего QR-кодов</div>
            <div className={styles.statValue}>{qrCodes.length}</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAlt}`}>
            <div className={styles.statLabel}>Всего сканирований</div>
            <div className={styles.statValue}>{totalScans}</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAlt}`}>
            <div className={styles.statLabel}>Регистраций по QR</div>
            <div className={styles.statValue}>{totalRegs}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Конверсия (CR)</div>
            <div className={styles.statValue}>{averageCR}%</div>
          </div>
        </div>

        {/* Creation Form */}
        <div className={styles.section} style={{ padding: "20px" }}>
          <h2 className={styles.label} style={{ marginBottom: "15px" }}>Создать новый QR-код</h2>
          <form onSubmit={handleCreateQR} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Название (источник) *</label>
              <input
                type="text"
                placeholder="Например: Листовка в лифте ЖК Прогресс, подъезд 1"
                className={styles.inputSmall}
                value={newQrName}
                onChange={(e) => setNewQrName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Короткий слаг-код (необязательно)</label>
                <input
                  type="text"
                  placeholder="Например: lift_p1 (только буквы и цифры)"
                  className={styles.inputSmall}
                  value={newQrCode}
                  onChange={(e) => setNewQrCode(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Привязать к ЖК (для автовыбора)</label>
                <select
                  className={styles.inputSmall}
                  value={newQrJkId}
                  onChange={(e) => setNewQrJkId(e.target.value)}
                  style={{ height: "40px" }}
                >
                  <option value="">Не привязывать</option>
                  {jkVotes.map((jk) => (
                    <option key={jk.id} value={jk.id}>
                      {jk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className={styles.actionBtn} style={{ alignSelf: "flex-start", marginTop: "8px", padding: "10px 24px" }}>
              Создать QR-код
            </button>
          </form>
        </div>

        {/* QR Code List */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Активные QR-коды</span>
          </div>
          <div className={styles.gridList}>
            {qrCodes.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                Вы еще не создали ни одного QR-кода.
              </div>
            ) : (
              qrCodes.map((q) => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.origin + "/qr/" + q.code)}`;
                const cr = q.scans_count > 0 ? ((q.registrations_count / q.scans_count) * 100).toFixed(1) : "0.0";
                return (
                  <div key={q.id} className={styles.listItem} style={{ alignItems: "center", gap: "20px" }}>
                    {/* QR Code Image Preview */}
                    <div style={{ background: "white", padding: "8px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", display: "flex" }}>
                      <img src={qrUrl} alt={`QR ${q.code}`} style={{ width: "90px", height: "90px", objectFit: "contain" }} />
                    </div>

                    {/* QR Code Info */}
                    <div className={styles.itemInfo} style={{ flex: 1 }}>
                      <span className={styles.itemTitle}>{q.name}</span>
                      <span className={styles.itemSub} style={{ fontFamily: "monospace", color: "var(--accent-color)", marginTop: "4px", fontSize: "13px" }}>
                        Ссылка: {window.location.origin}/qr/{q.code}
                      </span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                        {q.jk_name && (
                          <span style={{ fontSize: "11px", background: "#f2f2f7", padding: "2px 8px", borderRadius: "6px", color: "#8e8e93", fontWeight: "600" }}>
                            🏢 {q.jk_name}
                          </span>
                        )}
                        <span style={{ fontSize: "11px", background: "rgba(31, 122, 40, 0.08)", padding: "2px 8px", borderRadius: "6px", color: "#1f7a28", fontWeight: "600" }}>
                          Конверсия: {cr}%
                        </span>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className={styles.itemValueColumn} style={{ alignItems: "flex-end", gap: "10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600" }}>Сканирований: {q.scans_count}</span>
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Регистраций: {q.registrations_count}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className={styles.actionBtn} onClick={() => downloadQR(q.code, q.name)} style={{ padding: "6px 12px", fontSize: "12px" }}>
                          Скачать PNG
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnAlt}`}
                          onClick={() => handleDeleteQR(q.id, q.name)}
                          style={{ padding: "6px 12px", fontSize: "12px", background: "#ffeef0", color: "#ff3b30", border: "none" }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={`${styles.wrapper} fade-in`}>

      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoTitle}>Не неси сам</span>
          <span className={styles.logoSubtitle}>АДМИНИСТРАТОР</span>
        </Link>
        <button className={styles.actionBtn} onClick={logout}>
          Выйти
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Управление</h1>
          <p className={styles.pageSubtitle}>Бизнес-показатели и ресурсы</p>
        </div>

        <div className={styles.navScroll}>
          <button
            className={`${styles.navChip} ${activeTab === "overview" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Обзор
          </button>
          <button
            className={`${styles.navChip} ${activeTab === "users" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Пользователи
          </button>
          <button
            className={`${styles.navChip} ${activeTab === "employees" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("employees")}
          >
            Команда
          </button>
          <button
            className={`${styles.navChip} ${activeTab === "jk" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("jk")}
          >
            Заявки ЖК
          </button>
          <button
            className={`${styles.navChip} ${activeTab === "tariffs" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("tariffs")}
          >
            Тарифы
          </button>
          <button
            className={`${styles.navChip} ${activeTab === "qr" ? styles.navChipActive : ""}`}
            onClick={() => setActiveTab("qr")}
          >
            QR-коды
          </button>
        </div>

        {activeTab === "overview" && renderOverview()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "employees" && renderEmployees()}
        {activeTab === "jk" && renderJK()}
        {activeTab === "qr" && renderQR()}
        {activeTab === "tariffs" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.label}>Тарифы</span>
            </div>
            <div className={styles.gridList}>
              {tariffs.map((tariff) => (
                <div key={tariff.id} className={styles.listItem}>
                  <div
                    className={styles.itemInfo}
                    onClick={() => setEditingTariff(tariff)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className={styles.itemTitleRow}>
                      <span className={styles.itemTitle}>{tariff.title}</span>
                      {tariff.is_popular && (
                        <span
                          style={{
                            background: "#e3f9e5",
                            color: "#1f7a28",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          ПОПУЛЯРНЫЙ
                        </span>
                      )}
                    </div>
                    <span className={styles.itemSub}>
                      {tariff.tag} • {tariff.price}₽ / мес
                    </span>
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      {tariff.features.slice(0, 2).map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                            background: "var(--bg-color)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                      {tariff.features.length > 2 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          +{tariff.features.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemValueColumn}>
                    <div className={styles.actionMenu}>
                      <button
                        className={styles.dotsBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === tariff.id ? null : tariff.id,
                          );
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                      {activeMenuId === tariff.id && (
                        <div className={styles.dropdown}>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setEditingTariff(tariff);
                              setActiveMenuId(null);
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                            onClick={async () => {
                              if (
                                confirm(`Удалить тариф ${tariff.title}?`) &&
                                token
                              ) {
                                await deleteTariff(token, tariff.id);
                                loadTariffs();
                              }
                              setActiveMenuId(null);
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Tariff Modal */}
      {editingTariff && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Настройка карточки тарифа</div>
            <button
              className={styles.closeBtn}
              onClick={() => setEditingTariff(null)}
            >
              Отмена
            </button>
          </div>
          <div className={styles.modalContent}>
            <div
              style={{
                background: "#f9f9fb",
                padding: "20px",
                borderRadius: "16px",
                border: "1px dashed #d1d1d6",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#8e8e93",
                  marginBottom: "16px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                Структура карточки
              </p>

              <div className={styles.block}>
                <span className={styles.blockTitle}>
                  1. Синий бейдж (сверху)
                </span>
                <input
                  type="text"
                  className={styles.inputSmall}
                  placeholder="ПОПУЛЯРНЫЙ"
                  value={editingTariff.tag}
                  onChange={(e) =>
                    setEditingTariff({ ...editingTariff, tag: e.target.value })
                  }
                />
              </div>

              <div className={styles.block} style={{ marginTop: "16px" }}>
                <span className={styles.blockTitle}>
                  2. Маленький заголовок (над названием)
                </span>
                <input
                  type="text"
                  className={styles.inputSmall}
                  placeholder="КОМФОРТ"
                  value={editingTariff.subtitle || ""}
                  onChange={(e) =>
                    setEditingTariff({
                      ...editingTariff,
                      subtitle: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.block} style={{ marginTop: "16px" }}>
                <span className={styles.blockTitle}>3. Главный заголовок</span>
                <input
                  type="text"
                  className={styles.inputSmall}
                  placeholder="Каждый день"
                  value={editingTariff.title}
                  onChange={(e) =>
                    setEditingTariff({
                      ...editingTariff,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.block} style={{ marginTop: "16px" }}>
                <span className={styles.blockTitle}>4. Цена за месяц</span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <input
                    type="number"
                    className={styles.inputSmall}
                    value={editingTariff.price}
                    onChange={(e) =>
                      setEditingTariff({
                        ...editingTariff,
                        price: Number(e.target.value),
                      })
                    }
                  />
                  <span style={{ fontWeight: "700" }}>₽</span>
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  ~{Math.round(editingTariff.price / 30)} ₽ / день
                </p>
              </div>

              <div className={styles.block} style={{ marginTop: "16px" }}>
                <span className={styles.blockTitle}>5. Список преимуществ</span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {editingTariff.features.map((feature, index) => (
                    <div key={index} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className={styles.inputSmall}
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingTariff.features];
                          newFeatures[index] = e.target.value;
                          setEditingTariff({
                            ...editingTariff,
                            features: newFeatures,
                          });
                        }}
                      />
                      <button
                        style={{
                          color: "#ff3b30",
                          padding: "0 8px",
                          background: "none",
                        }}
                        onClick={() => {
                          const newFeatures = editingTariff.features.filter(
                            (_, i) => i !== index,
                          );
                          setEditingTariff({
                            ...editingTariff,
                            features: newFeatures,
                          });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    style={{
                      color: "var(--accent-color)",
                      fontWeight: "600",
                      textAlign: "left",
                      padding: "8px",
                      background: "none",
                    }}
                    onClick={() =>
                      setEditingTariff({
                        ...editingTariff,
                        features: [...editingTariff.features, ""],
                      })
                    }
                  >
                    + Добавить пункт
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.block}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  background: editingTariff.is_popular
                    ? "#000"
                    : "var(--card-bg)",
                  padding: "16px",
                  borderRadius: "12px",
                  transition: "all 0.3s",
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: "20px", height: "20px" }}
                  checked={editingTariff.is_popular}
                  onChange={(e) =>
                    setEditingTariff({
                      ...editingTariff,
                      is_popular: e.target.checked,
                    })
                  }
                />
                <span
                  style={{
                    color: editingTariff.is_popular
                      ? "#fff"
                      : "var(--text-primary)",
                    fontWeight: "700",
                  }}
                >
                  Выделить как "ПОПУЛЯРНЫЙ" (черная карточка)
                </span>
              </label>
            </div>

            <button className={styles.saveBtn} onClick={handleUpdateTariff}>
              Сохранить изменения
            </button>
          </div>
        </div>
      )}

      {/* JK Modal */}
      {isJkModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Добавить ЖК</div>
            <button
              className={styles.closeBtn}
              onClick={() => setIsJkModalOpen(false)}
            >
              Отмена
            </button>
          </div>
          <div className={styles.modalContent}>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Название ЖК</span>
              <input
                type="text"
                className={styles.inputSmall}
                placeholder="ЖК Ромашка"
                value={newJkName}
                onChange={(e) => setNewJkName(e.target.value)}
              />
            </div>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Адрес</span>
              <input
                type="text"
                className={styles.inputSmall}
                placeholder="ул. Ленина, 10"
                value={newJkAddress}
                onChange={(e) => setNewJkAddress(e.target.value)}
              />
            </div>
            <button className={styles.saveBtn} onClick={handleAddJk}>
              Добавить в голосование
            </button>
          </div>
        </div>
      )}

      {/* Edit JK Votes Modal */}
      {editingJk && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Настройка ЖК</div>
            <button
              className={styles.closeBtn}
              onClick={() => setEditingJk(null)}
            >
              Отмена
            </button>
          </div>
          <div className={styles.modalContent}>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Название ЖК</span>
              <input
                type="text"
                className={styles.inputSmall}
                value={editingJk.name}
                onChange={(e) =>
                  setEditingJk({
                    ...editingJk,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Адрес</span>
              <input
                type="text"
                className={styles.inputSmall}
                value={editingJk.address}
                onChange={(e) =>
                  setEditingJk({
                    ...editingJk,
                    address: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Количество голосов</span>
              <input
                type="number"
                className={styles.inputSmall}
                value={editingJk.fake_votes}
                onChange={(e) =>
                  setEditingJk({
                    ...editingJk,
                    fake_votes: Number(e.target.value),
                  })
                }
              />
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginTop: "8px",
                }}
              >
                Измените количество голосов, чтобы создать видимость спроса на
                лендинге.
              </p>
            </div>
            <button
              className={styles.saveBtn}
              onClick={async () => {
                if (editingJk && token) {
                  try {
                    // Update all fields: name, address, fake_votes (stored as 'votes' in DB logic often, but API handles it)
                    await updateJk(token, editingJk.id, {
                      name: editingJk.name,
                      address: editingJk.address,
                      votes: editingJk.fake_votes,
                      status: editingJk.status,
                    });
                    loadJks();
                    setEditingJk(null);
                  } catch (err) {
                    console.error("Failed to update JK:", err);
                    alert("Ошибка при сохранении");
                  }
                }
              }}
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
