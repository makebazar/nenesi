import React, { useState } from "react";
import styles from "./WorkerDashboard.module.css";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

type Tab = "tasks" | "profile";

interface Task {
  id: number;
  flat: string;
  floor: number;
  entrance: string;
  intercom: string;
  completed: boolean;
  photo?: string;
  isSynced?: boolean;
  problem?: string;
}

interface JKGroup {
  id: string;
  name: string;
  address: string;
  tasks: Task[];
  isArrived: boolean;
}

const WorkerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [activeJKId, setActiveJKId] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const { logout } = useAuth();

  const [jks, setJks] = useState<JKGroup[]>([
    {
      id: "sk",
      name: "ЖК Сердце Каспия",
      address: "Наб. Приволжского затона, 20",
      isArrived: false,
      tasks: [
        {
          id: 1,
          floor: 12,
          flat: "101",
          entrance: "1",
          intercom: "1234",
          completed: false,
          isSynced: true,
        },
        {
          id: 2,
          floor: 10,
          flat: "85",
          entrance: "1",
          intercom: "1234",
          completed: true,
          isSynced: true,
          photo: "placeholder",
        },
        {
          id: 3,
          floor: 4,
          flat: "42",
          entrance: "1",
          intercom: "1234",
          completed: false,
          isSynced: true,
        },
      ],
    },
    {
      id: "laz",
      name: "ЖК Лазурный",
      address: "ул. Латышева, 3б",
      isArrived: false,
      tasks: [
        {
          id: 4,
          floor: 8,
          flat: "64",
          entrance: "2",
          intercom: "К42",
          completed: false,
          isSynced: true,
        },
        {
          id: 5,
          floor: 2,
          flat: "12",
          entrance: "2",
          intercom: "К42",
          completed: false,
          isSynced: true,
        },
      ],
    },
  ]);

  const handleArrive = (jkId: string) => {
    setJks(jks.map((jk) => (jk.id === jkId ? { ...jk, isArrived: true } : jk)));
    setActiveJKId(jkId);
  };

  const openCamera = (taskId: number) => {
    setActiveTaskId(taskId);
    setIsCameraOpen(true);
  };

  const handleCapture = (isProblem: boolean = false) => {
    if (!activeTaskId || !activeJKId) return;

    setJks(
      jks.map((jk) => {
        if (jk.id === activeJKId) {
          return {
            ...jk,
            tasks: jk.tasks.map((t) =>
              t.id === activeTaskId
                ? {
                    ...t,
                    completed: true,
                    photo: "captured_img",
                    isSynced: false,
                    problem: isProblem ? "Пакет не найден" : undefined,
                  }
                : t,
            ),
          };
        }
        return jk;
      }),
    );

    setPendingSync((prev) => prev + 1);
    setIsCameraOpen(false);
    setActiveTaskId(null);

    // Симуляция восстановления интернета через 3 секунды
    setTimeout(() => {
      setJks((prevJks) =>
        prevJks.map((jk) => ({
          ...jk,
          tasks: jk.tasks.map((t) =>
            t.isSynced === false ? { ...t, isSynced: true } : t,
          ),
        })),
      );
      setPendingSync(0);
    }, 3000);
  };

  const currentJK = jks.find((jk) => jk.id === activeJKId);
  const totalTasks = jks.reduce((acc, jk) => acc + jk.tasks.length, 0);
  const completedTasks = jks.reduce(
    (acc, jk) => acc + jk.tasks.filter((t) => t.completed).length,
    0,
  );

  return (
    <div className={`${styles.wrapper} fade-in`}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>
            воркер{" "}
            {activeTab === "profile"
              ? "• профиль"
              : activeJKId
                ? "• в работе"
                : "• смена"}
          </div>
        </Link>
        <div className={styles.headerRight}>
          {pendingSync > 0 && (
            <div className={styles.syncBadge}>
              <span className={styles.syncIcon}>⏳</span> {pendingSync}
            </div>
          )}
          {isShiftActive && (
            <div className={styles.earnings}>
              <span className={styles.earnLabel}>Баланс</span>
              <span className={styles.earnValue}>1 650 ₽</span>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === "tasks" ? (
          !isShiftActive ? (
            <div className={styles.startShiftView}>
              <h1 className={styles.welcomeTitle}>Добрый вечер!</h1>
              <p className={styles.welcomeDesc}>
                На сегодня: {totalTasks} задач в {jks.length} домах
              </p>

              <div className={styles.prepCard}>
                <h3 className={styles.prepTitle}>Перед началом</h3>
                <ul className={styles.prepList}>
                  <li>Запасные пакеты с собой</li>
                  <li>Телефон заряжен</li>
                  <li>Перчатки надеты</li>
                </ul>
              </div>

              <button
                className={styles.startBtn}
                onClick={() => setIsShiftActive(true)}
              >
                Начать смену
              </button>
            </div>
          ) : activeJKId && currentJK ? (
            <div className={styles.focusMode}>
              <div className={styles.focusHeader}>
                <button
                  className={styles.backLink}
                  onClick={() => setActiveJKId(null)}
                >
                  ← Все объекты
                </button>
                <h2 className={styles.focusTitle}>{currentJK.name}</h2>
                <div className={styles.focusProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${(currentJK.tasks.filter((t) => t.completed).length / currentJK.tasks.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span>
                    {currentJK.tasks.filter((t) => t.completed).length} из{" "}
                    {currentJK.tasks.length}
                  </span>
                </div>
              </div>

              <div className={styles.taskList}>
                {currentJK.tasks
                  .sort((a, b) => b.floor - a.floor)
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`${styles.floorCard} ${task.completed ? styles.taskDone : ""}`}
                    >
                      <div className={styles.floorNum}>{task.floor} эт</div>
                      <div className={styles.taskCore}>
                        <div className={styles.flatInfo}>
                          кв. {task.flat}
                          {task.problem && (
                            <span className={styles.problemLabel}>
                              ⚠ {task.problem}
                            </span>
                          )}
                        </div>
                        <div className={styles.intercomInfo}>
                          Домофон: {task.intercom}
                        </div>
                      </div>
                      <div className={styles.actionArea}>
                        {task.completed ? (
                          <div className={styles.doneWrapper}>
                            {task.isSynced ? (
                              <span className={styles.doneCheck}>
                                ✓ Отправлено
                              </span>
                            ) : (
                              <span className={styles.syncingText}>
                                ⏳ Синхронизация...
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className={styles.taskButtons}>
                            <button
                              className={styles.problemBtn}
                              onClick={() => openCamera(task.id)}
                            >
                              Проблема
                            </button>
                            <button
                              className={styles.collectBtn}
                              onClick={() => openCamera(task.id)}
                            >
                              Забрал
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className={styles.objectsView}>
              <div className={styles.topActions}>
                <button
                  className={styles.finishBtnTop}
                  onClick={() => setIsShiftActive(false)}
                >
                  Завершить смену
                </button>
              </div>
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{totalTasks}</span>
                  <span className={styles.statLabel}>Задач</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{completedTasks}</span>
                  <span className={styles.statLabel}>Готово</span>
                </div>
              </div>
              <div className={styles.jkGrid}>
                {jks.map((jk) => (
                  <div key={jk.id} className={styles.objectCard}>
                    <div className={styles.objectInfo}>
                      <h3 className={styles.objectName}>{jk.name}</h3>
                      <p className={styles.objectAddr}>{jk.address}</p>
                      <div className={styles.objectMeta}>
                        <span>{jk.tasks.length} задач</span>
                        {jk.tasks.every((t) => t.completed) && (
                          <span className={styles.allDoneBadge}>Завершено</span>
                        )}
                      </div>
                    </div>
                    <button
                      className={
                        jk.isArrived ? styles.objectBtnActive : styles.objectBtn
                      }
                      onClick={() =>
                        jk.isArrived
                          ? setActiveJKId(jk.id)
                          : handleArrive(jk.id)
                      }
                    >
                      {jk.isArrived ? "В работу" : "Я на месте"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className={styles.profileView}>
            <div className={styles.profileHeader}>
              <div className={styles.profileMeta}>
                <h2 className={styles.workerName}>Александр Петров</h2>
                <p className={styles.workerRole}>Сотрудник сервиса</p>
              </div>
            </div>
            <section className={styles.profileSection}>
              <span className={styles.label}>Финансы</span>
              <div className={styles.balanceCard}>
                <div className={styles.balanceInfo}>
                  <p className={styles.balanceLabel}>Доступно к выводу</p>
                  <h3 className={styles.balanceValue}>12 400 ₽</h3>
                </div>
                <button className={styles.withdrawBtn}>Вывести</button>
              </div>
            </section>
            <section className={styles.profileSection}>
              <span className={styles.label}>Статистика за месяц</span>
              <div className={styles.statsGrid}>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatVal}>428</span>
                  <span className={styles.miniStatLabel}>Выносов</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatVal}>160 ч</span>
                  <span className={styles.miniStatLabel}>В смене</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatVal}>0</span>
                  <span className={styles.miniStatLabel}>Жалоб</span>
                </div>
              </div>
            </section>
            <button className={styles.logoutBtn} onClick={logout}>
              Выйти из аккаунта
            </button>
          </div>
        )}
      </main>

      <nav className={styles.bottomNav}>
        <button
          className={`${styles.navItem} ${activeTab === "tasks" ? styles.navActive : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          <span className={styles.navLabel}>Задания</span>
        </button>
        <button
          className={`${styles.navItem} ${activeTab === "profile" ? styles.navActive : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <span className={styles.navLabel}>Профиль</span>
        </button>
      </nav>

      {isCameraOpen && (
        <div className={styles.cameraOverlay}>
          <div className={styles.cameraUI}>
            <div className={styles.cameraHeader}>
              <button
                onClick={() => setIsCameraOpen(false)}
                className={styles.cancelCamBtn}
              >
                Отмена
              </button>
              <span className={styles.camTitle}>Фотоотчет</span>
              <div style={{ width: 60 }}></div>
            </div>
            <div className={styles.viewfinder}>
              <div className={styles.scanLine}></div>
              <p>Наведите на пакет у двери</p>
            </div>
            <div className={styles.cameraFooter}>
              <div className={styles.shutterContainer}>
                <button
                  className={styles.shutterBtn}
                  onClick={() => handleCapture(false)}
                ></button>
                <span className={styles.shutterLabel}>Забрал</span>
              </div>
              <div className={styles.shutterContainer}>
                <button
                  className={styles.problemShutterBtn}
                  onClick={() => handleCapture(true)}
                >
                  ⚠
                </button>
                <span className={styles.shutterLabel}>Проблема</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
