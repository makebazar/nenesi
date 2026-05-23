import React, { useEffect, useRef, useState } from "react";
import styles from "./Landing.module.css";
import { useNavigate } from "react-router-dom";
import { fetchJks, fetchTariffs, type JK, type Tariff } from "../services/api";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(() => {
    return sessionStorage.getItem("hero_revealed") === "true";
  });

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const [jks, setJks] = useState<JK[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [calcFrequency, setCalcFrequency] = useState(4);
  const [calcDuration, setCalcDuration] = useState(10);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qr = params.get("qr");
    if (qr) {
      localStorage.setItem("nenesi_qr_code", qr);
      // Clean query parameter from browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isRevealed) return;

    const handleScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const height = heroRef.current.offsetHeight;
      const progress = Math.min(
        Math.max(-rect.top / (height - window.innerHeight), 0),
        1,
      );

      setScrollProgress(progress);

      if (progress >= 0.99) {
        setIsRevealed(true);
        sessionStorage.setItem("hero_revealed", "true");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isRevealed]);

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

  // Determine header visibility and style
  // Show header only when revealed or near the end of animation
  const showHeader = isRevealed || scrollProgress > 0.8;

  return (
    <div
      className={`${styles.wrapper} ${isRevealed ? styles.wrapperRevealed : ""}`}
    >
      {/* SINGLE CLEAN HEADER */}
      <header
        className={`${styles.header} ${showHeader ? styles.headerVisible : styles.headerHidden}`}
      >
        <div className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
        </div>
        <button
          className={styles.loginBtnLight}
          onClick={() => navigate("/login")}
        >
          Войти
        </button>
      </header>

      <main className={styles.main}>
        {/* CINEMATIC STICKY HERO */}
        <section
          className={isRevealed ? styles.heroSimple : styles.heroContainer}
          ref={heroRef}
        >
          <div
            className={isRevealed ? styles.simpleWrapper : styles.stickyWrapper}
          >
            {!isRevealed && (
              /* PAIN LAYER (Dark, Cinematic) - Only show if not revealed */
              <div className={`${styles.heroLayer} ${styles.painLayer}`}>
                <div className={styles.ambientGlow}></div>
                <div
                  className={styles.heroContentDark}
                  style={{
                    transform: `scale(${1 - scrollProgress * 0.1})`,
                    opacity: 1 - scrollProgress * 2,
                  }}
                >
                  <span className={styles.premiumBadgeDark}>
                    Ежедневная рутина
                  </span>
                  <h1 className={styles.heroTitleDark}>
                    Опять идти к бакам <br />
                    <span className={styles.textDimmed}>в жару и зной?</span>
                  </h1>
                  <p className={styles.heroSubtitleDark}>
                    Тяжелые пакеты, неприятные запахи и вечный спор, <br />
                    кто пойдет выбрасывать мусор сегодня.
                  </p>
                </div>
              </div>
            )}

            {/* SOLUTION LAYER (Light, Apple-like) */}
            <div
              className={`${styles.heroLayer} ${styles.solutionLayer} ${isRevealed ? styles.solutionLayerFull : ""}`}
              style={{
                clipPath: isRevealed
                  ? "none"
                  : `circle(${scrollProgress * 120}% at 50% 50%)`,
              }}
            >
              <div
                className={styles.heroContentLight}
                style={
                  isRevealed
                    ? {}
                    : {
                        transform: `translateY(${Math.max(0, (1 - scrollProgress) * 60)}px)`,
                        opacity: scrollProgress * 2,
                      }
                }
              >
                <span className={styles.premiumBadgeLight}>Решение</span>
                <h1 className={styles.heroTitleLight}>
                  Утро начинается <br />
                  с кофе. <br />
                  <span className={styles.textAccent}>А не с пакетов.</span>
                </h1>

                <p className={styles.heroSubtitleLight}>
                  Мы бесшумно заберем мусор от вашей двери. <br />
                  Каждый вечер, пока вы отдыхаете.
                </p>

                <div className={styles.actionGroup}>
                  <button
                    className={styles.btnPremium}
                    onClick={() => navigate("/login")}
                  >
                    Попробовать бесплатно
                  </button>
                  <span className={styles.actionHint}>
                    2 недели тест-драйва за наш счет
                  </span>
                </div>
              </div>
            </div>

            {!isRevealed && (
              /* Scroll Indicator */
              <div
                className={styles.scrollHintPremium}
                style={{ opacity: 1 - scrollProgress * 4 }}
              >
                <div className={styles.scrollLine}></div>
                <span>Скролльте, чтобы изменить реальность</span>
              </div>
            )}
          </div>
        </section>

        <div className={styles.contentWrapper}>
          {/* INTERACTIVE CALCULATOR SECTION */}
          <section
            className={`${styles.steps} ${styles.reveal}`}
            ref={addToRefs}
            style={{
              background: "#f5f5f7",
              borderRadius: "24px",
              padding: "40px 24px",
              textAlign: "center",
              marginBottom: "3rem"
            }}
          >
            <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className={styles.premiumBadgeLight} style={{ background: "#e3f2fd", color: "#007af5", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>Интерактивный калькулятор</span>
              <h2 style={{ fontSize: "28px", fontWeight: "900", color: "var(--text-primary)", marginTop: "12px", marginBottom: "8px" }}>
                Сколько времени вы дарите мусорным бакам?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "500px", margin: "0" }}>
                Посчитайте, сколько часов вашей жизни уходит на ежедневную рутину
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px", margin: "0 auto" }}>
              {/* Slider 1: Frequency */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "10px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Сколько раз в неделю вы выносите мусор?</span>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#007af5", whiteSpace: "nowrap", flexShrink: 0 }}>{calcFrequency} раз(а)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={calcFrequency}
                  onChange={(e) => setCalcFrequency(Number(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor: "#007af5",
                    cursor: "pointer",
                    height: "6px",
                    borderRadius: "3px"
                  }}
                />
              </div>

              {/* Slider 2: Duration */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "10px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Время на один поход (лифт, одевание, дорога)</span>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#007af5", whiteSpace: "nowrap", flexShrink: 0 }}>{calcDuration} минут(ы)</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={calcDuration}
                  onChange={(e) => setCalcDuration(Number(e.target.value))}
                  style={{
                    width: "100%",
                    accentColor: "#007af5",
                    cursor: "pointer",
                    height: "6px",
                    borderRadius: "3px"
                  }}
                />
              </div>

              {/* Dynamic Results Card */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e5e5ea",
                borderRadius: "16px",
                padding: "24px",
                marginTop: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "28px", fontWeight: "900", color: "#ff3b30" }}>
                      {Math.round((calcFrequency * 52 * calcDuration) / 60)} ч
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>В год теряется</span>
                  </div>
                  <div style={{ width: "1px", height: "40px", background: "#e5e5ea" }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "28px", fontWeight: "900", color: "#007af5" }}>
                      {Math.round(calcFrequency * 52)}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Походов к бакам</span>
                  </div>
                </div>

                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", borderTop: "1px solid #f5f5f7", paddingTop: "12px", textAlign: "left" }}>
                  💡 Это время эквивалентно <strong>{Math.round((calcFrequency * 52 * calcDuration) / 60 / 16)} дням</strong> полноценной активной жизни (по 16 бодрствующих часов в сутки). Вместо этого вы могли прочесть <strong>{Math.max(1, Math.round((calcFrequency * 52 * calcDuration) / 60 / 5))} книг</strong>, посмотреть <strong>{Math.max(1, Math.round((calcFrequency * 52 * calcDuration) / 60 / 2))} фильмов</strong> или просто отлично провести время без домашних хлопот!
                </div>
              </div>

              <button
                className={styles.btnPremium}
                onClick={() => navigate("/login")}
                style={{ width: "100%", marginTop: "12px" }}
              >
                Вернуть себе это время
              </button>
            </div>
          </section>

          {/* FOR WHOM IS THIS SUITABLE SECTION */}
          <section
            className={`${styles.steps} ${styles.reveal}`}
            ref={addToRefs}
            style={{
              padding: "40px 0",
              textAlign: "center",
              marginBottom: "3rem"
            }}
          >
            <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span className={styles.premiumBadgeLight} style={{ background: "#e8f5e9", color: "#2e7d32", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>Для кого это?</span>
              <h2 style={{ fontSize: "28px", fontWeight: "900", color: "var(--text-primary)", marginTop: "12px", marginBottom: "8px" }}>
                Кому идеально подходит наш сервис?
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "500px", margin: "0" }}>
                Найдите себя среди тех, кто уже навсегда забыл про походы к мусорным бакам
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "0 10px"
            }}>
              {/* Persona 1 */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e5e5ea",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#efebe9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  🍼
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "0" }}>Молодым семьям с детьми</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: "0" }}>
                  Горы подгузников и детского мусора накапливаются мгновенно, а выходить с коляской к бакам в дождь или мороз — настоящее испытание. Мы освободим время для семьи.
                </p>
              </div>

              {/* Persona 2 */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e5e5ea",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  💻
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "0" }}>Занятым и фрилансерам</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: "0" }}>
                  Когда вы работаете допоздна или находитесь на созвонах из дома, последнее, чего хочется перед сном или в спешке с утра — одеваться и нести пакеты на улицу.
                </p>
              </div>

              {/* Persona 3 */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e5e5ea",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#ffebee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  🐾
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "0" }}>Владельцам питомцев</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: "0" }}>
                  Наполнители лотков и органические остатки кормов требуют немедленной утилизации, чтобы дома пахло свежестью. Мы уберем запахи из вашей квартиры раз и навсегда.
                </p>
              </div>

              {/* Persona 4 */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #e5e5ea",
                borderRadius: "20px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#efebe9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  ❤️
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "0" }}>Пожилым родителям</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: "0" }}>
                  Ступеньки, тяжелые ведра и скользкий гололед у мусорных баков — постоянный риск. Закажите подписку для своих родителей в качестве заботы об их здоровье и безопасности.
                </p>
              </div>
            </div>
          </section>

          {/* NOTIFICATION TIMELINE SECTION */}
          <section
            className={`${styles.mockupSection} ${styles.reveal}`}
            ref={addToRefs}
          >
            <div className={styles.sectionHeaderCentered}>
              <h2 className={styles.sectionTitleSmall}>
                Сервис, который заботится о вас
              </h2>
              <p className={styles.sectionSubtitleSmall}>
                Весь процесс в реальном времени в вашем телефоне
              </p>
            </div>

            <div className={styles.notificationStack}>
              {/* Notification 1: Reminder */}
              <div
                className={`${styles.notifCard} ${styles.notifReminder} floating`}
              >
                <div className={styles.notifBody}>
                  <div className={styles.notifHeader}>
                    <strong>НЕ НЕСИ САМ</strong>
                    <span className={styles.notifTime}>сейчас</span>
                  </div>
                  <p>
                    Пора выставлять пакет! 📦 Наш курьер будет у вашей двери
                    через 45 минут.
                  </p>
                </div>
              </div>

              {/* Notification 2: Worker nearby */}
              <div
                className={`${styles.notifCard} ${styles.notifWorker} floating`}
              >
                <div className={styles.notifBody}>
                  <div className={styles.notifHeader}>
                    <strong>НЕ НЕСИ САМ</strong>
                    <span className={styles.notifTime}>5 мин. назад</span>
                  </div>
                  <p>Курьер Алексей начал обход вашего подъезда. Ожидайте!</p>
                </div>
              </div>

              {/* Notification 3: Collected */}
              <div
                className={`${styles.notifCard} ${styles.notifSuccess} floating`}
              >
                <div className={styles.notifBody}>
                  <div className={styles.notifHeader}>
                    <strong>НЕ НЕСИ САМ</strong>
                    <span className={styles.notifTime}>только что</span>
                  </div>
                  <p>Готово! Ваш мусор забран. Хорошего отдыха ✨</p>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS - EXPANDED */}
          <section
            className={`${styles.steps} ${styles.reveal}`}
            ref={addToRefs}
          >
            <h2 className={styles.sectionTitle}>Как это работает</h2>
            <div className={styles.stepGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepContent}>
                  <h3>Подписка</h3>
                  <p>
                    Выбираете удобный тариф и&nbsp;оплачиваете подписку
                    в&nbsp;приложении
                  </p>
                </div>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepContent}>
                  <h3>Уведомление</h3>
                  <p>
                    Каждый вечер присылаем напоминание, чтобы
                    вы&nbsp;не&nbsp;забыли про пакет
                  </p>
                </div>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepContent}>
                  <h3>Выставили</h3>
                  <p>
                    Просто оставьте пакет за&nbsp;дверью в&nbsp;согласованное
                    время
                  </p>
                </div>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNum}>4</div>
                <div className={styles.stepContent}>
                  <h3>Мы убрали</h3>
                  <p>
                    Наш сотрудник бесшумно заберет мусор и&nbsp;протрет пол,
                    если это потребуется
                  </p>
                </div>
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepNum}>5</div>
                <div className={styles.stepContent}>
                  <h3>Чистота</h3>
                  <p>
                    Ваш подъезд остается чистым, а&nbsp;вы&nbsp;забываете
                    о&nbsp;неприятных походах к&nbsp;контейнерам
                  </p>
                </div>
              </div>
            </div>
          </section>



          {/* REAL-TIME PROGRESS / WAITING LIST */}
          <section
            className={`${styles.statusSection} ${styles.reveal}`}
            ref={addToRefs}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                Ваш дом готов <br />
                к&nbsp;запуску?
              </h2>
              <p className={styles.sectionSubtitle}>
                Начинаем работу в&nbsp;доме, как только набираем 100 заявок. Ваш
                голос может стать решающим.
              </p>
            </div>
            <div className={styles.jkList}>
              {jks.map((jk) => (
                <div key={jk.id} className={styles.jkCard}>
                  <div className={styles.jkInfo}>
                    <div className={styles.jkTop}>
                      <h3>{jk.name}</h3>
                      <span className={styles.jkStatus}>
                        {jk.status === "connected"
                          ? "🔥 Подключен"
                          : "⏱ Копим голоса"}
                      </span>
                    </div>
                    <p className={styles.jkAddr}>{jk.address}</p>
                  </div>

                  <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${Math.min(jk.fake_votes, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className={styles.progressLabels}>
                      <span className={styles.progressText}>
                        Собрано {Math.min(jk.fake_votes, 100)} из 100 заявок
                      </span>
                    </div>
                  </div>

                  <button
                    className={styles.jkJoinBtn}
                    onClick={() => navigate("/login")}
                  >
                    Голосовать за дом
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* PRICING SECTION - SCROLLABLE */}
          <section
            className={`${styles.pricing} ${styles.reveal}`}
            ref={addToRefs}
          >
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Выберите свой комфорт</h2>
              <p className={styles.sectionSubtitle}>
                Прозрачные тарифы без скрытых платежей. Отменяйте в&nbsp;любой
                момент.
              </p>
            </div>

            <div className={styles.priceContainer}>
              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  className={`${styles.priceCard} ${tariff.is_popular ? styles.priceCardFeatured : ""}`}
                >
                  {tariff.is_popular && tariff.tag && (
                    <div className={styles.priceBadge}>{tariff.tag}</div>
                  )}
                  {tariff.subtitle && (
                    <div className={styles.priceTag}>{tariff.subtitle}</div>
                  )}
                  <h3 className={styles.priceTitle}>{tariff.title}</h3>
                  <div className={styles.priceAmount}>
                    {tariff.price} ₽ <small>/ мес</small>
                  </div>
                  <div className={styles.priceDailySub}>
                    ~{Math.round(tariff.price / 30)} ₽ / день
                  </div>
                  <ul className={styles.priceFeatures}>
                    {tariff.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                  <button
                    className={
                      tariff.is_popular
                        ? styles.ctaPrimary
                        : styles.ctaSecondary
                    }
                    onClick={() => navigate("/login")}
                  >
                    Начать бесплатно
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section
            className={`${styles.faqSection} ${styles.reveal}`}
            ref={addToRefs}
          >
            <h2 className={styles.sectionTitle}>Вопросы и ответы</h2>
            <div className={styles.faqList}>
              <div className={styles.faqItem}>
                <h3>Какой мусор вы заберете?</h3>
                <p>
                  Мы&nbsp;выносим стандартные бытовые отходы в&nbsp;пакетах
                  объемом до&nbsp;70&nbsp;литров. Мы&nbsp;не&nbsp;берем
                  строительный мусор. Если у&nbsp;вас есть коробки
                  от&nbsp;пиццы, пожалуйста, сложите их&nbsp;аккуратно
                  в&nbsp;плоские листы&nbsp;— так они не&nbsp;займут много места
                  и&nbsp;будут вынесены без проблем.
                </p>
              </div>
              <div className={styles.faqItem}>
                <h3>Это не слишком дорого?</h3>

                <p>
                  Всего от 26 ₽ в&nbsp;день — это дешевле проезда
                  в&nbsp;автобусе. За&nbsp;эту сумму вы&nbsp;покупаете себе
                  несколько часов свободного времени в&nbsp;месяц и&nbsp;полное
                  отсутствие бытовой рутины.
                </p>
              </div>
              <div className={styles.faqItem}>
                <h3>Что скажут соседи?</h3>
                <p>
                  Пакет стоит за&nbsp;дверью ограниченное время
                  в&nbsp;согласованное окно. Мы&nbsp;просим плотно завязывать
                  пакеты, чтобы исключить любые запахи. Обычно соседи, видя ваш
                  комфорт, сами присоединяются к&nbsp;сервису.
                </p>
              </div>
              <div className={styles.faqItem}>
                <h3>Это безопасно?</h3>
                <p>
                  За&nbsp;каждым домом закреплен постоянный сотрудник.
                  Мы&nbsp;проверяем каждого кандидата и&nbsp;передаем его данные
                  охране вашего ЖК. Вы&nbsp;всегда знаете, кто именно заберет
                  ваш мусор.
                </p>
              </div>
              <div className={styles.faqItem}>
                <h3>А если пакет не забрали?</h3>
                <p>
                  Мы&nbsp;контролируем работу сотрудников в&nbsp;реальном
                  времени. Если по&nbsp;какой-то причине пакет остался
                  на&nbsp;месте, наша служба поддержки решит вопрос за&nbsp;15
                  минут.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerCopyright}>© 2026 НЕ НЕСИ САМ</div>
          <div className={styles.footerLegal}>
            <div className={styles.footerInfo}>
              <span>ИП Сенектутов Николай Олегович</span>
              <span>ИНН: 302501866145</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
