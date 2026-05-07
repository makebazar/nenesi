import React, { useState, useEffect } from "react";
import styles from "./Login.module.css";
import { useNavigate, Link } from "react-router-dom";
import { IMaskInput } from "react-imask";
import {
  login as apiLogin,
  register,
  fetchJks,
  fetchTariffs,
  voteForJk,
  voteForSchedule,
  voteForTariff,
  type JK,
  type Tariff,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

type Step = "phone" | "profile" | "address" | "schedule" | "tariff";

const Login: React.FC = () => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [jkId, setJkId] = useState("");
  const [street, setStreet] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");

  const [scheduleVote, setScheduleVote] = useState<
    "morning" | "evening" | null
  >(null);
  const [selectedTariff, setSelectedTariff] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("phone");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [jks, setJks] = useState<JK[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  useEffect(() => {
    if (user) {
      const target =
        user.role === "admin"
          ? "/admin"
          : user.role === "worker"
            ? "/worker"
            : "/client";
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jkData, tariffData] = await Promise.all([
          fetchJks(),
          fetchTariffs(),
        ]);
        setJks(jkData);
        setTariffs(tariffData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    loadData();
  }, []);

  const handleContinue = async () => {
    if (step === "phone") {
      try {
        const authData = await apiLogin(phone);
        if (authData) {
          login(authData.token, authData.user);
        } else {
          setStep("profile");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setStep("profile");
      }
    } else if (step === "profile") {
      if (name.trim()) setStep("address");
    } else if (step === "address") {
      if (
        jkId &&
        street.trim() &&
        entrance.trim() &&
        floor.trim() &&
        apartment.trim()
      ) {
        setStep("schedule");
      }
    } else if (step === "schedule") {
      if (scheduleVote) setStep("tariff");
    } else if (step === "tariff") {
      if (!selectedTariff) return;
      try {
        const authData = await register({
          phone,
          name,
          role: "client",
          address: { jkId, street, entrance, floor, apartment, intercom },
        });

        const token = authData.token;

        // Submit votes in parallel
        await Promise.all([
          voteForSchedule(token, scheduleVote!),
          voteForTariff(token, selectedTariff!),
          jkId ? voteForJk(Number(jkId)) : Promise.resolve(),
        ]);

        login(authData.token, authData.user);
      } catch (err) {
        console.error("Registration error:", err);
        alert("Ошибка регистрации. Проверьте данные.");
      }
    }
  };

  const handleBack = () => {
    if (step === "profile") setStep("phone");
    else if (step === "address") setStep("profile");
    else if (step === "schedule") setStep("address");
    else if (step === "tariff") setStep("schedule");
  };

  return (
    <div className={`${styles.wrapper} fade-in`}>
      <header className={styles.header}>
        {step !== "phone" ? (
          <button className={styles.backBtn} onClick={handleBack}>
            ← Назад
          </button>
        ) : (
          <Link to="/" className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </Link>
        )}
      </header>

      <main className={styles.main}>
        <div className={styles.loginCard}>
          {step === "phone" && (
            <>
              <h1 className={styles.title}>Присоединяйтесь</h1>
              <p className={styles.subtitle}>
                Введите номер телефона, чтобы проверить <br /> возможность
                запуска в&nbsp;вашем доме
              </p>
              <div className={styles.inputGroup}>
                <IMaskInput
                  mask="+7 (000) 000-00-00"
                  placeholder="+7 (999) 000-00-00"
                  className={styles.input}
                  value={phone}
                  onAccept={(value: string) => setPhone(value)}
                />
              </div>
            </>
          )}

          {step === "profile" && (
            <>
              <h1 className={styles.title}>Как вас зовут?</h1>
              <p className={styles.subtitle}>
                Используйте настоящее имя, чтобы <br /> воркер знал, к кому
                обращаться
              </p>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}

          {step === "address" && (
            <>
              <h1 className={styles.title}>Адрес вывоза</h1>
              <p className={styles.subtitle}>
                Укажите точные данные, чтобы <br /> мы нашли ваш пакет
              </p>

              <div className={styles.formGrid}>
                <div className={styles.inputGroupFull}>
                  <select
                    className={styles.inputSmall}
                    value={jkId}
                    onChange={(e) => setJkId(e.target.value)}
                    style={{ appearance: "none", backgroundColor: "#f5f5f7" }}
                  >
                    <option value="" disabled>
                      Выберите свой ЖК *
                    </option>
                    {jks.map((jk) => (
                      <option key={jk.id} value={jk.id}>
                        {jk.name} ({jk.address})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroupFull}>
                  <input
                    type="text"
                    placeholder="Улица и дом *"
                    className={styles.inputSmall}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Подъезд *"
                    className={styles.inputSmall}
                    value={entrance}
                    onChange={(e) => setEntrance(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Этаж *"
                    className={styles.inputSmall}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Кв. *"
                    className={styles.inputSmall}
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Код двери"
                    className={styles.inputSmall}
                    value={intercom}
                    onChange={(e) => setIntercom(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === "schedule" && (
            <>
              <h1 className={styles.title}>Когда удобно выставлять мусор?</h1>
              <p className={styles.subtitle}>
                Мы на предзапуске собираем отзывы, <br /> чтобы сделать сервис
                удобнее
              </p>
              <div className={styles.optionsList}>
                <button
                  className={`${styles.optionBtn} ${scheduleVote === "morning" ? styles.optionBtnActive : ""}`}
                  onClick={() => setScheduleVote("morning")}
                >
                  Утром (с 8:00 до 10:00)
                </button>
                <button
                  className={`${styles.optionBtn} ${scheduleVote === "evening" ? styles.optionBtnActive : ""}`}
                  onClick={() => setScheduleVote("evening")}
                >
                  Вечером (с 20:00 до 22:00)
                </button>
              </div>
            </>
          )}

          {step === "tariff" && (
            <>
              <h1 className={styles.title}>Какой тариф интересует?</h1>
              <p className={styles.subtitle}>
                Выберите тариф, который вам <br /> подходит больше всего
              </p>
              <div className={styles.tariffsList}>
                {tariffs.map((tariff) => (
                  <button
                    key={tariff.id}
                    className={`${styles.tariffOption} ${selectedTariff === tariff.title ? styles.tariffOptionActive : ""}`}
                    onClick={() => setSelectedTariff(tariff.title)}
                  >
                    <div className={styles.tariffTitleRow}>
                      <span className={styles.tariffTag}>{tariff.tag}</span>
                      <span className={styles.tariffPrice}>
                        {tariff.price} ₽
                      </span>
                    </div>
                    <div className={styles.tariffDesc}>{tariff.title}</div>
                    <ul className={styles.tariffFeatures}>
                      {tariff.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            className={styles.submitBtn}
            onClick={handleContinue}
            disabled={
              (step === "profile" && !name.trim()) ||
              (step === "address" &&
                (!jkId ||
                  !street.trim() ||
                  !entrance.trim() ||
                  !floor.trim() ||
                  !apartment.trim())) ||
              (step === "schedule" && !scheduleVote) ||
              (step === "tariff" && !selectedTariff)
            }
          >
            {step === "tariff" ? "Завершить" : "Продолжить"}
          </button>

          <p className={styles.policy}>
            Нажимая «{step === "tariff" ? "Завершить" : "Продолжить"}», вы
            соглашаетесь с <br />
            <span>условиями использования сервиса</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
