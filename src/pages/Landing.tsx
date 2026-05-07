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
