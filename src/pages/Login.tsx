import React, { useState, useEffect } from "react";
import styles from "./Login.module.css";
import { useNavigate } from "react-router-dom";
import { IMaskInput } from "react-imask";
import { login, register, fetchJks, voteForJk, type JK } from "../services/api";

type Step = "phone" | "profile" | "address";

const Login: React.FC = () => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [jkId, setJkId] = useState("");
  const [street, setStreet] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [intercom, setIntercom] = useState("");

  const [step, setStep] = useState<Step>("phone");
  const navigate = useNavigate();

  const [jks, setJks] = useState<JK[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchJks();
        setJks(data);
      } catch (err) {
        console.error("Failed to fetch JKs:", err);
      }
    };
    loadData();
  }, []);

  const handleContinue = async () => {
    if (step === "phone") {
      try {
        const authData = await login(phone);
        if (authData) {
          localStorage.setItem("token", authData.token);
          localStorage.setItem("user", JSON.stringify(authData.user));

          if (authData.user.role === "admin") navigate("/admin");
          else if (authData.user.role === "worker") navigate("/worker");
          else navigate("/client");
        } else {
          setStep("profile");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setStep("profile");
      }
    } else if (step === "profile") {
      setStep("address");
    } else {
      try {
        const authData = await register({
          phone,
          name,
          role: "client",
          address: { jkId, street, entrance, floor, apartment, intercom },
        });

        localStorage.setItem("token", authData.token);
        localStorage.setItem("user", JSON.stringify(authData.user));

        if (jkId) {
          try {
            await voteForJk(Number(jkId));
          } catch (vErr) {
            console.error("Voting error:", vErr);
          }
        }
        navigate("/client");
      } catch (err) {
        console.error("Registration error:", err);
        alert("Ошибка регистрации. Проверьте данные.");
      }
    }
  };

  const handleBack = () => {
    if (step === "profile") setStep("phone");
    else if (step === "address") setStep("profile");
  };

  return (
    <div className={`${styles.wrapper} fade-in`}>
      <header className={styles.header}>
        {step !== "phone" ? (
          <button className={styles.backBtn} onClick={handleBack}>
            ← Назад
          </button>
        ) : (
          <div className={styles.logo}>
            <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
            <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
          </div>
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
                      Выберите свой ЖК
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
                    placeholder="Улица и дом"
                    className={styles.inputSmall}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Подъезд"
                    className={styles.inputSmall}
                    value={entrance}
                    onChange={(e) => setEntrance(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Этаж"
                    className={styles.inputSmall}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
                <div className={styles.inputGroupHalf}>
                  <input
                    type="text"
                    placeholder="Кв."
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

          <button className={styles.submitBtn} onClick={handleContinue}>
            {step === "address" ? "Завершить" : "Продолжить"}
          </button>

          <p className={styles.policy}>
            Нажимая «{step === "address" ? "Завершить" : "Продолжить"}», вы
            соглашаетесь с <br />
            <span>условиями использования сервиса</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
