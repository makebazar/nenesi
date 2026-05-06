import React, { useEffect, useRef, useState } from "react";
import styles from "./Landing.module.css";
import { useNavigate } from "react-router-dom";
import { fetchJks, fetchTariffs, type JK, type Tariff } from "../services/api";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const [jks, setJks] = useState<JK[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

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

  return (
    <div className={styles.wrapper}>
      <header className={`${styles.header} glass`}>
        <div className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>сервис по выносу мусора</div>
        </div>
        <button className={styles.loginBtn} onClick={() => navigate("/login")}>
          Войти
        </button>
      </header>

      <main className={styles.main}>
        {/* BIG HERO */}
        <section className={`${styles.hero} ${styles.reveal}`} ref={addToRefs}>
          <div className={styles.badge}>СДЕЛАНО В АСТРАХАНИ</div>
          <h1 className={styles.heroTitle}>
            Забудьте дорогу к&nbsp;мусорным бакам.
          </h1>
          <p className={styles.heroSubtitle}>
            Заберем мусор от&nbsp;вашей двери. Каждый день. <br />
            Пока вы&nbsp;спите или пьете кофе.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.ctaPrimary}
              onClick={() => navigate("/login")}
            >
              Хочу 2 недели бесплатно
            </button>
            <p className={styles.ctaHint}>Станьте первым в своем доме</p>
          </div>
        </section>

        {/* MOCKUP SECTION - Visual proof */}
        <section
          className={`${styles.mockupSection} ${styles.reveal}`}
          ref={addToRefs}
        >
          <div className={styles.mockupContainer}>
            <div className={`${styles.packageCard} floating`}>
              <div className={styles.packageIcon}>📦</div>
              <div className={styles.packageText}>
                <strong>Ваш пакет забрали</strong>
                <span>Сегодня в 20:14</span>
              </div>
            </div>
            <div className={styles.circleBg}></div>
          </div>
        </section>

        {/* HOW IT WORKS - EXPANDED */}
        <section className={`${styles.steps} ${styles.reveal}`} ref={addToRefs}>
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
                  Наш сотрудник бесшумно заберет мусор и&nbsp;протрет пол, если
                  это потребуется
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
                      style={{ width: `${Math.min(jk.votes, 100)}%` }}
                    ></div>
                  </div>
                  <div className={styles.progressLabels}>
                    <span className={styles.progressText}>
                      Собрано {jk.votes} из 100 заявок
                    </span>
                    {jk.votes > 0 && jk.status === "pending" && (
                      <span className={styles.activePulse}>
                        <span className={styles.dot}></span> +1 сегодня
                      </span>
                    )}
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
                {tariff.is_popular && (
                  <div className={styles.priceBadge}>ПОПУЛЯРНЫЙ</div>
                )}
                <div className={styles.priceTag}>{tariff.tag}</div>
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
                  className={tariff.is_popular ? styles.ctaPrimary : styles.ctaSecondary}
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
              <h3>Это не слишком дорого?</h3>
              <p>
                Всего от 26 ₽ в&nbsp;день — это дешевле проезда в&nbsp;автобусе.
                За&nbsp;эту сумму вы&nbsp;покупаете себе несколько часов
                свободного времени в&nbsp;месяц и&nbsp;полное отсутствие бытовой
                рутины.
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
                охране вашего ЖК. Вы&nbsp;всегда знаете, кто именно заберет ваш
                мусор.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>А если пакет не забрали?</h3>
              <p>
                Мы&nbsp;контролируем работу сотрудников в&nbsp;реальном времени.
                Если по&nbsp;какой-то причине пакет остался на&nbsp;месте, наша
                служба поддержки решит вопрос за&nbsp;15 минут.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
