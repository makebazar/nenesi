import React, { useState, useEffect } from "react";
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
  type JK,
  type User,
  type ScheduleVote,
  type TariffVote,
  type Tariff,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

type Tab = "overview" | "employees" | "jk" | "tariffs" | "users";
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
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isJkModalOpen, setIsJkModalOpen] = useState(false);
  const [editingJk, setEditingJk] = useState<JK | null>(null);
  const [newJkName, setNewJkName] = useState("");
  const [newJkAddress, setNewJkAddress] = useState("");

  // Mock data
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: 1,
      name: "Алексей Петров",
      phone: "+7 999 123-45-67",
      payType: "task",
      rate: 150,
      status: "on_shift",
      balance: 1450,
      assignedJK: "ЖК Сердце Каспия",
    },
    {
      id: 2,
      name: "Мария Иванова",
      phone: "+7 900 000-00-00",
      payType: "hour",
      rate: 250,
      status: "active",
      balance: 0,
      assignedJK: "ЖК Лазурный",
    },
    {
      id: 3,
      name: "Дмитрий Сидоров",
      phone: "+7 911 111-22-33",
      payType: "fix",
      rate: 45000,
      status: "sick",
      balance: 45000,
      assignedJK: "Все ЖК (Резерв)",
    },
  ]);

  const [users, setUsers] = useState<User[]>([]); // Use User[] type

  const [jkVotes, setJkVotes] = useState<JK[]>([]);
  const [tariffVotes, setTariffVotes] = useState<TariffVote[]>([]);
  const [scheduleVotes, setScheduleVotes] = useState<ScheduleVote[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

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

  // Periodically refresh JKs to get live votes
  useEffect(() => {
    loadJks();
    loadUsers();
    loadScheduleVotes();
    loadTariffVotes();
    loadTariffs();
    const interval = setInterval(() => {
      loadJks();
      loadUsers();
      loadScheduleVotes();
      loadTariffVotes();
      loadTariffs();
    }, 5000);
    return () => clearInterval(interval);
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

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleAddNewEmployee = () => {
    const newEmp: Employee = {
      id: Date.now(),
      name: "",
      phone: "",
      payType: "task",
      rate: 0,
      status: "active",
      balance: 0,
      assignedJK: "",
    };
    setSelectedEmployee(newEmp);
    setIsEmployeeModalOpen(true);
  };

  const handlePayout = () => {
    if (!selectedEmployee) return;
    // In real app: API call here
    alert(
      `Выплачено ${formatMoney(selectedEmployee.balance)} сотруднику ${selectedEmployee.name}`,
    );

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === selectedEmployee.id ? { ...emp, balance: 0 } : emp,
      ),
    );

    setSelectedEmployee((prev) => (prev ? { ...prev, balance: 0 } : null));
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
              user.apartment ? `кв. ${user.apartment}` : null,
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
                  {(user.tariff_vote || user.schedule_vote) && (
                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
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

  const renderEmployees = () => (
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
              <div className={styles.itemTitleRow}>
                <div
                  className={`${styles.statusDot} ${getStatusColorClass(emp.status)}`}
                />
                <span className={styles.itemTitle}>{emp.name}</span>
              </div>
              <span className={styles.itemSub}>{emp.assignedJK}</span>
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

  const renderJK = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.label}>Опросы по домам</span>
      </div>
      <div className={styles.list}>
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
        </div>

        {activeTab === "overview" && renderOverview()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "employees" && renderEmployees()}
        {activeTab === "jk" && renderJK()}
        {activeTab === "tariffs" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.label}>Тарифы</span>
            </div>
            <div className={styles.list}>
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

      {/* Employee Modal */}
      {isEmployeeModalOpen && selectedEmployee && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>Профиль</div>
            <button
              className={styles.closeBtn}
              onClick={() => setIsEmployeeModalOpen(false)}
            >
              Закрыть
            </button>
          </div>

          <div className={styles.modalContent}>
            <div className={styles.profileCard}>
              <div className={styles.profileAvatar}>
                {selectedEmployee.name
                  ? selectedEmployee.name.charAt(0).toUpperCase()
                  : "?"}
              </div>
              <input
                type="text"
                className={styles.profileName}
                style={{
                  textAlign: "center",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  width: "100%",
                }}
                value={selectedEmployee.name}
                placeholder="Имя Фамилия"
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    name: e.target.value,
                  })
                }
              />
              <input
                type="tel"
                className={styles.profilePhone}
                style={{
                  textAlign: "center",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  width: "100%",
                }}
                value={selectedEmployee.phone}
                placeholder="+7 (___) ___-__-__"
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div className={styles.block}>
              <span className={styles.blockTitle}>Баланс и Выплаты</span>
              <div className={styles.balanceBox}>
                <div className={styles.balanceInfo}>
                  <span className={styles.balanceLabel}>К выплате</span>
                  <span className={styles.balanceAmount}>
                    {formatMoney(selectedEmployee.balance)}
                  </span>
                </div>
                <button
                  className={styles.payoutBtn}
                  onClick={handlePayout}
                  disabled={selectedEmployee.balance === 0}
                  style={{ opacity: selectedEmployee.balance === 0 ? 0.5 : 1 }}
                >
                  Выплатить
                </button>
              </div>
            </div>

            <div className={styles.block}>
              <span className={styles.blockTitle}>Локация и Статус</span>
              <select
                className={styles.inputSmall}
                value={selectedEmployee.assignedJK}
                onChange={(e) =>
                  setSelectedEmployee({
                    ...selectedEmployee,
                    assignedJK: e.target.value,
                  })
                }
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
              >
                <option value="active">Свободен (Готов к работе)</option>
                <option value="on_shift">На смене (Разносит мусор)</option>
                <option value="sick">Болен / Отпуск</option>
                <option value="fired">Уволен</option>
              </select>
            </div>

            <div className={styles.block}>
              <span className={styles.blockTitle}>Настройка зарплаты</span>
              <div className={styles.selectGroup}>
                <select
                  className={styles.inputSmall}
                  value={selectedEmployee.payType}
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      payType: e.target.value as PayType,
                    })
                  }
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
                />
              </div>
            </div>

            <button
              className={styles.saveBtn}
              onClick={() => {
                const exists = employees.find(
                  (e) => e.id === selectedEmployee.id,
                );
                if (exists) {
                  setEmployees(
                    employees.map((e) =>
                      e.id === selectedEmployee.id ? selectedEmployee : e,
                    ),
                  );
                } else {
                  setEmployees([...employees, selectedEmployee]);
                }
                setIsEmployeeModalOpen(false);
              }}
            >
              Сохранить профиль
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
