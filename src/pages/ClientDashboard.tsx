import React, { useState, useEffect } from "react";
import styles from "./ClientDashboard.module.css";
import {
  fetchUserProfile,
  voteForSchedule,
  voteForTariff,
  type User,
} from "../services/api";

type EditingSection = null | "address" | "schedule" | "plan" | "payment";

const ClientDashboard: React.FC = () => {
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userData = await fetchUserProfile(token);
          console.log("Loaded user data with votes:", userData);
          setUser(userData);
          if (userData.schedule_vote) setVotedTime(userData.schedule_vote);
          if (userData.tariff_vote) setVotedTariff(userData.tariff_vote);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
        }
      }
    };
    loadUser();
  }, []);

  const [votedTime, setVotedTime] = useState<string | null>(null);
  const [votedTariff, setVotedTariff] = useState<string | null>(null);

  const timeSlots = [
    { id: "morning", label: "Утро" },
    { id: "evening", label: "Вечер" },
  ];

  const plans = [
    { id: "economy", name: "Эконом", price: "790 ₽", desc: "Через день" },
    { id: "comfort", name: "Комфорт", price: "990 ₽", desc: "Каждый день" },
  ];

  const [plan, setPlan] = useState(plans[0]);

  const handleSave = () => {
    setEditingSection(null);
  };

  const handleTariffVote = async (tariffName: string) => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await voteForTariff(token, tariffName);
        setVotedTariff(tariffName);
      } catch (error) {
        console.error("Failed to vote for tariff:", error);
      }
    }
  };

  const handleVote = async (voteOption: "morning" | "evening") => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await voteForSchedule(token, voteOption);
        setVotedTime(voteOption);
      } catch (error) {
        console.error("Failed to vote:", error);
      }
    }
  };

  if (editingSection === "address") {
    if (!user) return null;
    return (
      <div className={`${styles.wrapper} fade-in`}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setEditingSection(null)}
          >
            ← Назад
          </button>
          <div className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Изменить адрес</h1>
            <p className={styles.pageSubtitle}>
              Укажите новые данные для вывоза
            </p>
          </div>
          <div className={styles.editForm}>
            <div className={styles.inputGroupFull}>
              <label className={styles.inputLabel}>ЖК</label>
              <input
                type="text"
                className={styles.inputSmall}
                value={user.jk_name || ""}
                onChange={(e) => setUser({ ...user, jk_name: e.target.value })}
              />
            </div>
            <div className={styles.inputGroupFull}>
              <label className={styles.inputLabel}>Улица и дом</label>
              <input
                type="text"
                className={styles.inputSmall}
                value={user.street || ""}
                onChange={(e) => setUser({ ...user, street: e.target.value })}
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Подъезд</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={user.entrance || ""}
                  onChange={(e) =>
                    setUser({ ...user, entrance: e.target.value })
                  }
                />
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Этаж</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={user.floor || ""}
                  onChange={(e) => setUser({ ...user, floor: e.target.value })}
                />
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Кв.</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={user.apartment || ""}
                  onChange={(e) =>
                    setUser({ ...user, apartment: e.target.value })
                  }
                />
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Код двери</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={user.intercom || ""}
                  onChange={(e) =>
                    setUser({ ...user, intercom: e.target.value })
                  }
                />
              </div>
            </div>
            <button className={styles.saveBtn} onClick={handleSave}>
              Сохранить изменения
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (editingSection === "plan") {
    return (
      <div className={`${styles.wrapper} fade-in`}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => setEditingSection(null)}
          >
            ← Назад
          </button>
          <div className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Тарифный план</h1>
            <p className={styles.pageSubtitle}>
              Выберите подходящий уровень комфорта
            </p>
          </div>
          <div className={styles.editForm}>
            <div className={styles.slotsList}>
              {plans.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.slotBtn} ${plan.id === p.id ? styles.slotBtnActive : ""}`}
                  onClick={() => setPlan(p)}
                >
                  <div className={styles.planSelectInfo}>
                    <span className={styles.slotTime}>{p.name}</span>
                    <span className={styles.planSelectDesc}>{p.desc}</span>
                  </div>
                  <span className={styles.planSelectPrice}>{p.price}</span>
                </button>
              ))}
            </div>
            <button className={styles.saveBtn} onClick={handleSave}>
              Сменить тариф
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <div>Загрузка...</div>; // Or a proper loader
  }

  return (
    <div className={`${styles.wrapper} fade-in`}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Личный кабинет</h1>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Ваш адрес</span>
            <button
              className={styles.editBtn}
              onClick={() => setEditingSection("address")}
            >
              Изм.
            </button>
          </div>
          <div className={styles.addressDisplay}>
            <h2 className={styles.addressMain}>{user.street}</h2>
            <p className={styles.addressDetails}>
              Подъезд {user.entrance}, этаж {user.floor}, кв. {user.apartment}
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Когда удобно забрать мусор?</span>
          </div>
          <p className={styles.pageSubtitle} style={{ marginBottom: "1rem" }}>
            Мы собираем обратную связь, чтобы улучшить наш сервис.
          </p>
          <div className={styles.slotsList}>
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                className={`${styles.slotBtn} ${votedTime === slot.id ? styles.slotBtnActive : ""}`}
                onClick={() => handleVote(slot.id as "morning" | "evening")}
              >
                <span className={styles.slotTime}>{slot.label}</span>
                {votedTime === slot.id && (
                  <span className={styles.slotCheck}>✓</span>
                )}
              </button>
            ))}
          </div>
          {votedTime && (
            <div
              className={styles.pageSubtitle}
              style={{ fontSize: "14px", marginTop: "0" }}
            >
              Спасибо, мы учтем ваш выбор!
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Какой тариф вы бы выбрали?</span>
          </div>
          <p className={styles.pageSubtitle} style={{ marginBottom: "1rem" }}>
            Мы собираем обратную связь, чтобы сделать наши тарифы лучше.
          </p>
          <div className={styles.slotsList}>
            {plans.map((p) => (
              <button
                key={p.id}
                className={`${styles.slotBtn} ${votedTariff === p.name ? styles.slotBtnActive : ""}`}
                onClick={() => handleTariffVote(p.name)}
              >
                <div className={styles.planSelectInfo}>
                  <span className={styles.slotTime}>{p.name}</span>
                  <span className={styles.planSelectDesc}>{p.desc}</span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span className={styles.planSelectPrice}>{p.price}</span>
                  {votedTariff === p.name && (
                    <span className={styles.slotCheck}>✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          {votedTariff && (
            <div
              className={styles.pageSubtitle}
              style={{ fontSize: "14px", marginTop: "0" }}
            >
              Спасибо, мы учтем ваш выбор!
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.label}>Способ оплаты</span>
          </div>
          <div className={styles.paymentRow}>
            <div className={styles.cardIcon}>💳</div>
            <div className={styles.paymentInfo}>
              <p className={styles.cardNumber}>
                Скоро можно будет привязать карту
              </p>
              <p className={styles.paymentStatus}>Мы работаем над этим</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClientDashboard;
