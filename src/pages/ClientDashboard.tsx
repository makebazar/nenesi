import React, { useState, useEffect } from "react";
import styles from "./ClientDashboard.module.css";
import {
  fetchUserProfile,
  voteForSchedule,
  voteForTariff,
  fetchTariffs,
  type User,
  type Tariff,
} from "../services/api";
import { useAuth } from "../context/AuthContext.tsx";

import { Link } from "react-router-dom";

type EditingSection = null | "address" | "schedule" | "plan" | "payment";

const ClientDashboard: React.FC = () => {
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const { user: authUser, token, logout } = useAuth();
  const [user, setUser] = useState<User | null>(authUser);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [votedTime, setVotedTime] = useState<string | null>(null);
  const [votedTariff, setVotedTariff] = useState<string | null>(null);

  const getNextCollectionDate = () => {
    if (!votedTariff || !votedTime || !user) return null;
    
    const now = new Date();
    // Start calculating from tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const formatOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
    
    if (votedTariff !== "Эконом") {
      // Comfort/daily is always tomorrow
      const timeStr = votedTime === "morning" ? "утром" : "вечером";
      return {
        dateStr: tomorrow.toLocaleDateString("ru-RU", formatOptions),
        timeStr,
        dayName: "завтра"
      };
    } else {
      // Economy alternates based on user ID parity and day of month parity
      const tomorrowDay = tomorrow.getDate();
      const isTomorrowOdd = tomorrowDay % 2 !== 0;
      const userId = user.id || 1;
      
      const startsTomorrow = isTomorrowOdd ? (userId % 2 !== 0) : (userId % 2 === 0);
      const timeStr = votedTime === "morning" ? "утром" : "вечером";

      if (startsTomorrow) {
        return {
          dateStr: tomorrow.toLocaleDateString("ru-RU", formatOptions),
          timeStr,
          dayName: "завтра"
        };
      } else {
        const dayAfterTomorrow = new Date(now);
        dayAfterTomorrow.setDate(now.getDate() + 2);
        return {
          dateStr: dayAfterTomorrow.toLocaleDateString("ru-RU", formatOptions),
          timeStr,
          dayName: "послезавтра"
        };
      }
    }
  };


  useEffect(() => {
    const loadData = async () => {
      if (token) {
        try {
          const [userData, tariffData] = await Promise.all([
            fetchUserProfile(token),
            fetchTariffs(),
          ]);
          console.log("Loaded user data with votes:", userData);
          setUser(userData);
          setTariffs(tariffData);
          if (userData.schedule_vote) setVotedTime(userData.schedule_vote);
          if (userData.tariff_vote) setVotedTariff(userData.tariff_vote);
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
        }
      }
    };
    loadData();
  }, [token]);

  const timeSlots = [
    { id: "morning", label: "Утро (8:00 - 10:00)" },
    { id: "evening", label: "Вечер (20:00 - 22:00)" },
  ];

  const handleSave = () => {
    setEditingSection(null);
  };

  const handleTariffVote = async (tariffName: string) => {
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
          <Link to="/" className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </Link>
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
              <label className={styles.inputLabel}>ЖК *</label>
              <input
                type="text"
                className={styles.inputSmall}
                value={user.jk_name || ""}
                onChange={(e) => setUser({ ...user, jk_name: e.target.value })}
              />
            </div>
            <div className={styles.inputGroupFull}>
              <label className={styles.inputLabel}>Улица и дом *</label>
              <input
                type="text"
                className={styles.inputSmall}
                value={user.street || ""}
                onChange={(e) => setUser({ ...user, street: e.target.value })}
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Подъезд *</label>
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
                <label className={styles.inputLabel}>Этаж *</label>
                <input
                  type="text"
                  className={styles.inputSmall}
                  value={user.floor || ""}
                  onChange={(e) => setUser({ ...user, floor: e.target.value })}
                />
              </div>
              <div className={styles.inputGroupHalf}>
                <label className={styles.inputLabel}>Кв. *</label>
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
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={
                !user.jk_name?.trim() ||
                !user.street?.trim() ||
                !user.entrance?.trim() ||
                !user.floor?.trim() ||
                !user.apartment?.trim()
              }
            >
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
          <Link to="/" className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </Link>
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
              {tariffs.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.slotBtn} ${votedTariff === p.title ? styles.slotBtnActive : ""}`}
                  onClick={() => handleTariffVote(p.title)}
                >
                  <div className={styles.planSelectInfo}>
                    <span className={styles.slotTime}>{p.title}</span>
                    <span className={styles.planSelectDesc}>{p.tag}</span>
                  </div>
                  <span className={styles.planSelectPrice}>{p.price} ₽</span>
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
        <Link to="/" className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
        </Link>
        <button className={styles.logoutBtn} onClick={logout}>
          Выйти
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Личный кабинет</h1>
        </div>

        {votedTariff && votedTime ? (
          <section className={styles.promoSection} style={{ marginBottom: "2rem" }}>
            <div className={styles.promoCard} style={{ background: "linear-gradient(135deg, #007af5 0%, #0055b3 100%)", color: "#fff", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", background: "rgba(255, 255, 255, 0.2)", padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Заявка принята ✨
                </span>
                <span style={{ fontSize: "14px", fontWeight: "700", background: "#e8f5e9", color: "#2e7d32", padding: "4px 10px", borderRadius: "20px" }}>⏱ Предзапуск</span>
              </div>
              
              <h3 className={styles.promoTitle} style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px", color: "#fff", textAlign: "left" }}>
                Мы готовимся к запуску в вашем доме!
              </h3>
              
              <p className={styles.promoText} style={{ opacity: 0.95, fontSize: "14px", lineHeight: "1.5", color: "#fff", marginBottom: "16px", textAlign: "left" }}>
                Спасибо за доверие! Сейчас мы активно собираем заявки от жильцов вашего ЖК. Как только наберется необходимое количество участников, мы свяжемся с вами по телефону <strong>{user.phone}</strong> для подтверждения и запустим сервис.
              </p>

              <div style={{ background: "rgba(255, 255, 255, 0.15)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ opacity: 0.8 }}>Выбранный тариф:</span>
                    <strong style={{ fontWeight: "700" }}>«{votedTariff}» ({votedTariff === "Эконом" ? "через день" : "каждый день"})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ opacity: 0.8 }}>Удобное время:</span>
                    <strong style={{ fontWeight: "700" }}>{votedTime === "morning" ? "Утро (8:00 - 10:00)" : "Вечер (20:00 - 22:00)"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ opacity: 0.8 }}>Адрес подключения:</span>
                    <strong style={{ fontWeight: "700" }}>кв. {user.apartment}, эт. {user.floor}, подъезд {user.entrance}</strong>
                  </div>
                </div>
              </div>

              {/* Gift notice */}
              <div style={{
                marginTop: "4px",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "14px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  minWidth: "38px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}>🎁</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", opacity: 0.7 }}>Подарок за ожидание</span>
                  <span style={{ fontSize: "15px", fontWeight: "800", lineHeight: "1.2" }}>14 дней бесплатно</span>
                  <span style={{ fontSize: "12px", opacity: 0.8, lineHeight: "1.4", marginTop: "2px" }}>Активируются автоматически в первый месяц работы сервиса</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.promoSection}>
            <div className={styles.promoCard}>
              <span className={styles.promoIcon}>🚀</span>
              <h3 className={styles.promoTitle}>Готовимся к запуску!</h3>
              <p className={styles.promoText}>
                Сейчас мы собираем заявки в вашем доме. Как только наберется
                нужное количество участников, мы свяжемся с вами и запустим
                сервис.
              </p>
              <div className={styles.giftVoucher}>
                <div className={styles.voucherContent}>
                  <div className={styles.voucherTop}>
                    <span className={styles.voucherTitle}>
                      ПОДАРОК ЗА ОЖИДАНИЕ
                    </span>
                  </div>

                  <div className={styles.voucherBody}>
                    <span className={styles.voucherValue}>14 дней</span>
                    <span className={styles.voucherLabel}>
                      бесплатного сервиса
                    </span>
                  </div>
                  <p className={styles.voucherNote}>
                    Будет активирован автоматически в первый месяц работы
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}


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
            {user.jk_name && <p className={styles.jkName}>{user.jk_name}</p>}
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
            {tariffs.map((t) => (
              <button
                key={t.id}
                className={`${styles.tariffCard} ${votedTariff === t.title ? styles.tariffCardActive : ""} ${t.is_popular ? styles.tariffCardPopular : ""}`}
                onClick={() => handleTariffVote(t.title)}
              >
                <div className={styles.tariffMainInfo}>
                  <div className={styles.tariffHeader}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      {t.subtitle && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            opacity: 0.6,
                            textTransform: "uppercase",
                          }}
                        >
                          {t.subtitle}
                        </span>
                      )}
                      <span className={styles.tariffName}>{t.title}</span>
                    </div>
                    <span className={styles.tariffPrice}>{t.price} ₽</span>
                  </div>
                  <p className={styles.tariffTagline}>
                    ~{Math.round(t.price / 30)} ₽ / день
                  </p>
                  <ul className={styles.tariffFeaturesList}>
                    {t.features.map((feature, idx) => (
                      <li key={idx} className={styles.tariffFeatureItem}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                {votedTariff === t.title && (
                  <div className={styles.selectionIndicator}>
                    <span className={styles.checkIcon}>✓</span>
                  </div>
                )}
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
