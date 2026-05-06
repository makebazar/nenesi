import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminDashboard.module.css";
import {
  fetchJks,
  createJk,
  updateJk,
  deleteJk,
  fetchUsers,
  fetchScheduleVotes,
  fetchTariffVotes,
  fetchTariffs,
  updateTariff,
  type JK,
  type User,
  type ScheduleVote,
  type TariffVote,
  type Tariff,
} from "../services/api";

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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

  const token = localStorage.getItem("token") || "";

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await fetchUsers(token);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

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
  }, []);

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
    if (!newJkName || !newJkAddress) return;
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
          <div className={styles.statLabel}>Выручка</div>
          <div className={styles.statValue}>540к</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAlt}`}>
          <div className={styles.statLabel}>Юзеры</div>
          <div className={styles.statValue}>1,248</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAlt}`}>
          <div className={styles.statLabel}>Подписки</div>
          <div className={styles.statValue}>432</div>
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
            .sort((a, b) => (b.fake_votes + b.real_votes) - (a.fake_votes + a.real_votes))
            .slice(0, 3)
            .map((jk) => (
              <div key={jk.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{jk.name}</span>
                  <span className={styles.itemSub}>{jk.real_votes} + {jk.fake_votes} заявок</span>
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

  const renderUsers = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.label}>Клиенты</span>
      </div>
      <div className={styles.list}>
        {users.map((user) => {
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
                <span className={styles.itemTitle}>{user.name}</span>
                <span className={styles.itemSub}>{user.phone}</span>
                {address && <span className={styles.itemSub} style={{ marginTop: '4px', color: 'var(--text-secondary)'}}>{address}</span>}
              </div>
              <div className={styles.itemValueColumn}>
                <span className={styles.itemValue} style={{ fontSize: "15px" }}>
                  {user.role}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

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
            <div className={styles.itemInfo} onClick={() => setEditingJk(jk)}>
              <span className={styles.itemTitle}>{jk.name}</span>
              <span className={styles.itemSub}>
                {jk.address} • {jk.real_votes} + {jk.fake_votes} голосов (изменить)
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={styles.actionBtn}
                onClick={() => toggleJkStatus(jk)}
              >
                {jk.status === "connected" ? "Отключить" : "Активировать"}
              </button>
              <button
                className={styles.actionBtn}
                style={{
                  backgroundColor: "#ff4d4f",
                  color: "white",
                  border: "none",
                }}
                onClick={async () => {
                  if (confirm(`Удалить ${jk.name}?`)) {
                    await deleteJk(token, jk.id);
                    loadJks();
                  }
                }}
              >
                Удалить
              </button>
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
        <div className={styles.logo}>
          <span className={styles.logoTitle}>Не неси сам</span>
          <span className={styles.logoSubtitle}>АДМИНИСТРАТОР</span>
        </div>
        <button className={styles.actionBtn} onClick={() => navigate("/")}>
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
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>
                      {tariff.tag} - {tariff.title}
                    </span>
                    <span className={styles.itemSub}>
                      {tariff.price}₽ / мес
                    </span>
                  </div>
                  <button
                    className={styles.actionBtn}
                    onClick={() => setEditingTariff(tariff)}
                  >
                    Изменить
                  </button>
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
            <div className={styles.modalTitle}>Настройка тарифа</div>
            <button
              className={styles.closeBtn}
              onClick={() => setEditingTariff(null)}
            >
              Отмена
            </button>
          </div>
          <div className={styles.modalContent}>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Название (Тег)</span>
              <input
                type="text"
                className={styles.inputSmall}
                value={editingTariff.tag}
                onChange={(e) =>
                  setEditingTariff({ ...editingTariff, tag: e.target.value })
                }
              />
            </div>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Подзаголовок</span>
              <input
                type="text"
                className={styles.inputSmall}
                value={editingTariff.title}
                onChange={(e) =>
                  setEditingTariff({ ...editingTariff, title: e.target.value })
                }
              />
            </div>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Цена (₽/мес)</span>
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
            </div>
            <button
              className={styles.saveBtn}
              onClick={handleUpdateTariff}
            >
              Сохранить
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
            <div className={styles.modalTitle}>Настройка голосов</div>
            <button
              className={styles.closeBtn}
              onClick={() => setEditingJk(null)}
            >
              Отмена
            </button>
          </div>
          <div className={styles.modalContent}>
            <div className={styles.block}>
              <span className={styles.blockTitle}>Количество голосов</span>
              <input
                type="number"
                className={styles.inputSmall}
                value={editingJk.fake_votes}
                onChange={(e) =>
                  setEditingJk({ ...editingJk, fake_votes: Number(e.target.value) })
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
                if (editingJk) {
                  try {
                    await updateJk(token, editingJk.id, editingJk);
                    loadJks();
                    setEditingJk(null);
                  } catch (err) {
                    console.error("Failed to update JK:", err);
                    alert("Ошибка при сохранении");
                  }
                }
              }}
            >
              Сохранить
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
