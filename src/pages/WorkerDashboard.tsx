import React, { useState, useEffect } from "react";
import styles from "./WorkerDashboard.module.css";
import { useAuth } from "../context/AuthContext.tsx";
import { Link } from "react-router-dom";
import {
  fetchActiveShift,
  startShift,
  endShift,
  collectTask,
  reportTaskProblem,
  type DbTask,
  type DbShift,
} from "../services/api";

type Tab = "tasks" | "profile";

interface GroupedEntrance {
  number: string;
  tasks: DbTask[];
}

interface GroupedBuilding {
  address: string;
  entrances: GroupedEntrance[];
}

interface GroupedJK {
  id: string;
  name: string;
  buildings: GroupedBuilding[];
}

const WorkerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Database states
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [shift, setShift] = useState<DbShift | null>(null);
  
  // Navigation states
  const [selectedJKId, setSelectedJKId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedEntrance, setSelectedEntrance] = useState<string | null>(null);
  const [isEntranceActive, setIsEntranceActive] = useState(false);

  // Camera and overlay states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [cameraMode, setCameraMode] = useState<"collect" | "problem">("collect");
  const { token, logout } = useAuth();

  // Problem modal states
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemTaskId, setProblemTaskId] = useState<number | null>(null);
  const [selectedProblemType, setSelectedProblemType] = useState<string | null>(null);
  const [problemComment, setProblemComment] = useState("");

  // Load active shift on mount
  useEffect(() => {
    const loadActiveShift = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetchActiveShift(token);
        if (res.active && res.shift && res.tasks) {
          setShift(res.shift);
          setTasks(res.tasks);
          setIsShiftActive(true);
        }
      } catch (err) {
        console.error("Failed to load active shift from DB:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadActiveShift();
  }, [token]);

  const handleStartShift = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await startShift(token);
      if (res.active && res.shift && res.tasks) {
        setShift(res.shift);
        setTasks(res.tasks);
        setIsShiftActive(true);
      }
    } catch (err) {
      console.error("Failed to start shift:", err);
      alert("Не удалось начать смену. Возможно, она уже начата на другом устройстве.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await endShift(token);
      if (res.success) {
        alert(`Смена завершена! Начислено: ${res.shift.earned_amount} ₽.`);
        setShift(null);
        setTasks([]);
        setIsShiftActive(false);
        // Clear navigation
        setSelectedJKId(null);
        setSelectedAddress(null);
        setSelectedEntrance(null);
        setIsEntranceActive(false);
      }
    } catch (err) {
      console.error("Failed to end shift:", err);
      alert("Ошибка при завершении смены.");
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = (taskId: number, mode: "collect" | "problem") => {
    setActiveTaskId(taskId);
    setCameraMode(mode);
    setIsCameraOpen(true);
  };

  const openProblemModal = (taskId: number) => {
    setProblemTaskId(taskId);
    setSelectedProblemType(null);
    setProblemComment("");
    setIsProblemModalOpen(true);
  };

  const handleProblemSubmit = async (photoUrl?: string) => {
    if (!problemTaskId || !token) return;

    const taskId = problemTaskId;
    const problemType = selectedProblemType === "Другое" 
      ? (problemComment.trim() || "Другое") 
      : (selectedProblemType || "Пакет не найден");

    setIsProblemModalOpen(false);
    setProblemTaskId(null);

    // 1. Instantly update UI locally (offline simulator)
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: "failed",
              isSynced: false,
              problem_type: problemType
            }
          : t
      )
    );
    setPendingSync(prev => prev + 1);

    // 2. Perform background API call
    try {
      await reportTaskProblem(token, taskId, problemType, photoUrl);
      
      // Simulate elevator delay
      setTimeout(() => {
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId ? { ...t, isSynced: true } : t
          )
        );
        setPendingSync(prev => Math.max(0, prev - 1));
      }, 1500);
    } catch (err) {
      console.error("Failed to sync problem task:", err);
    }
  };

  const handleProblemPhotoTrigger = () => {
    if (!problemTaskId) return;
    setActiveTaskId(problemTaskId);
    setCameraMode("problem");
    setIsCameraOpen(true);
    setIsProblemModalOpen(false); // Close modal to open camera
  };

  const handleCapture = async () => {
    if (!activeTaskId || !token) return;

    const taskId = activeTaskId;
    setActiveTaskId(null);
    setIsCameraOpen(false);

    if (cameraMode === "collect") {
      // 1. Instantly update UI locally to 'collected' with isSynced: false (offline simulator)
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: "collected",
                isSynced: false
              }
            : t
        )
      );
      setPendingSync(prev => prev + 1);

      try {
        await collectTask(token, taskId, "captured_img");
        setTimeout(() => {
          setTasks(prevTasks =>
            prevTasks.map(t =>
              t.id === taskId ? { ...t, isSynced: true } : t
            )
          );
          setPendingSync(prev => Math.max(0, prev - 1));
        }, 1500);
      } catch (err) {
        console.error("Failed to sync collect task:", err);
      }
    } else {
      // Problem photo capture
      const problemType = selectedProblemType === "Другое" 
        ? (problemComment.trim() || "Другое") 
        : (selectedProblemType || "Пакет не найден");

      // Instantly update UI
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: "failed",
                isSynced: false,
                problem_type: problemType
              }
            : t
        )
      );
      setPendingSync(prev => prev + 1);

      try {
        await reportTaskProblem(token, taskId, problemType, "captured_img");
        setTimeout(() => {
          setTasks(prevTasks =>
            prevTasks.map(t =>
              t.id === taskId ? { ...t, isSynced: true } : t
            )
          );
          setPendingSync(prev => Math.max(0, prev - 1));
        }, 1500);
      } catch (err) {
        console.error("Failed to sync problem task with photo:", err);
      }
    }
  };

  // Derive nested structure from flat tasks array dynamically
  const getGroupedData = (taskList: DbTask[]): GroupedJK[] => {
    const jksMap = new Map<string, { id: string; name: string; buildingsMap: Map<string, { address: string; entrancesMap: Map<string, DbTask[]> }> }>();

    taskList.forEach(task => {
      const jkKey = task.jk_id.toString();
      if (!jksMap.has(jkKey)) {
        jksMap.set(jkKey, {
          id: jkKey,
          name: task.jk_name,
          buildingsMap: new Map()
        });
      }

      const jk = jksMap.get(jkKey)!;
      const bKey = task.jk_address;
      if (!jk.buildingsMap.has(bKey)) {
        jk.buildingsMap.set(bKey, {
          address: bKey,
          entrancesMap: new Map()
        });
      }

      const b = jk.buildingsMap.get(bKey)!;
      const entKey = task.entrance;
      if (!b.entrancesMap.has(entKey)) {
        b.entrancesMap.set(entKey, []);
      }

      b.entrancesMap.get(entKey)!.push(task);
    });

    const result: GroupedJK[] = [];
    jksMap.forEach(jk => {
      const buildings: GroupedBuilding[] = [];
      jk.buildingsMap.forEach(b => {
        const entrances: GroupedEntrance[] = [];
        b.entrancesMap.forEach((entTasks, number) => {
          entrances.push({
            number,
            tasks: entTasks
          });
        });
        // Sort entrances by number
        entrances.sort((a, b) => a.number.localeCompare(b.number));
        buildings.push({
          address: b.address,
          entrances
        });
      });
      // Sort buildings by address
      buildings.sort((a, b) => a.address.localeCompare(b.address));
      result.push({
        id: jk.id,
        name: jk.name,
        buildings
      });
    });

    // Sort JKs by name
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  };

  const jks = getGroupedData(tasks);

  const getJKTasks = (jk: GroupedJK) => {
    const res: DbTask[] = [];
    jk.buildings.forEach(b => {
      b.entrances.forEach(ent => {
        res.push(...ent.tasks);
      });
    });
    return res;
  };

  const getBuildingTasks = (b: GroupedBuilding) => {
    const res: DbTask[] = [];
    b.entrances.forEach(ent => {
      res.push(...ent.tasks);
    });
    return res;
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status !== "pending").length;

  const currentJK = jks.find(jk => jk.id === selectedJKId);
  const currentBuilding = currentJK?.buildings.find(b => b.address === selectedAddress);
  const currentEntrance = currentBuilding?.entrances.find(ent => ent.number === selectedEntrance);

  const getRecommendedFloorText = (taskList: DbTask[]) => {
    const activeTasks = taskList.filter(t => t.status === "pending");
    if (activeTasks.length === 0) return "Все задачи выполнены! ✨";
    const maxFloor = Math.max(...activeTasks.map(t => t.floor));
    return `Рекомендация: поднимитесь на ${maxFloor}-й этаж и спускайтесь вниз`;
  };

  const resetBackNav = (level: "jk" | "address") => {
    if (level === "jk") {
      setSelectedJKId(null);
      setSelectedAddress(null);
      setSelectedEntrance(null);
      setIsEntranceActive(false);
    } else if (level === "address") {
      setSelectedAddress(null);
      setSelectedEntrance(null);
      setIsEntranceActive(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ fontSize: "28px", fontWeight: 800, color: "#000", marginBottom: "8px" }}>НЕ НЕСИ САМ</div>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#86868b" }}>Загрузка рабочего кабинета...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} fade-in`}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoTitle}>НЕ НЕСИ САМ</div>
          <div className={styles.logoSubtitle}>
            воркер{" "}
            {activeTab === "profile"
              ? "• профиль"
              : isEntranceActive
                ? "• обход"
                : selectedEntrance
                  ? "• подъезд"
                  : selectedAddress
                    ? "• дом"
                    : selectedJKId
                      ? "• объект"
                      : "• смена"}
          </div>
        </Link>
        <div className={styles.headerRight}>
          {pendingSync > 0 && (
            <div className={styles.syncBadge}>
              <span className={styles.syncIcon}>⏳</span> {pendingSync}
            </div>
          )}
          {isShiftActive && shift && (
            <div className={styles.earnings}>
              <span className={styles.earnLabel}>Баланс смены</span>
              <span className={styles.earnValue}>{completedTasks * 150} ₽</span>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === "tasks" ? (
          !isShiftActive ? (
            /* START SHIFT VIEW */
            <div className={styles.startShiftView}>
              <h1 className={styles.welcomeTitle}>Добрый вечер!</h1>
              <p className={styles.welcomeDesc}>
                Смена не начата. Нажмите кнопку, чтобы получить маршрутный лист.
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
                onClick={handleStartShift}
              >
                Начать смену
              </button>
            </div>
          ) : isEntranceActive && currentEntrance && currentBuilding && currentJK ? (
            /* LEVEL 4: FOCUS MODE FOR AN ENTRANCE */
            <div className={styles.focusMode}>
              <div className={styles.focusHeader}>
                <button
                  className={styles.backLink}
                  onClick={() => setIsEntranceActive(false)}
                >
                  ← К списку подъездов
                </button>
                <div className={styles.breadCrumbs}>
                  {currentJK.name} • {currentBuilding.address}
                </div>
                <h2 className={styles.focusTitle}>Подъезд {currentEntrance.number}</h2>
                
                <div className={styles.recommendationBox}>
                  💡 {getRecommendedFloorText(currentEntrance.tasks)}
                </div>

                <div className={styles.focusProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${(currentEntrance.tasks.filter(t => t.status !== "pending").length / currentEntrance.tasks.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span>
                    {currentEntrance.tasks.filter(t => t.status !== "pending").length} из{" "}
                    {currentEntrance.tasks.length}
                  </span>
                </div>
              </div>

              <div className={styles.taskList}>
                {[...currentEntrance.tasks]
                  .sort((a, b) => b.floor - a.floor)
                  .map(task => {
                    const isCompleted = task.status !== "pending";
                    return (
                      <div
                        key={task.id}
                        className={`${styles.floorCard} ${isCompleted ? styles.taskDone : ""}`}
                      >
                        <div className={styles.floorNum}>{task.floor} эт</div>
                        <div className={styles.taskCore}>
                          <div className={styles.flatInfo}>
                            кв. {task.apartment}
                            {task.status === "failed" && task.problem_type && (
                              <span className={styles.problemLabel}>
                                ⚠ {task.problem_type}
                              </span>
                            )}
                          </div>
                          <div className={styles.intercomInfo}>
                            Домофон: {task.intercom || "Не указан"}
                          </div>
                        </div>
                        <div className={styles.actionArea}>
                          {isCompleted ? (
                            <div className={styles.doneWrapper}>
                              {task.isSynced !== false ? (
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
                                onClick={() => openProblemModal(task.id)}
                              >
                                Проблема
                              </button>
                              <button
                                className={styles.collectBtn}
                                onClick={() => openCamera(task.id, "collect")}
                              >
                                Забрал
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {currentEntrance.tasks.every(t => t.status !== "pending") && (
                <div className={styles.completeEntranceBox}>
                  <button
                    className={styles.completeEntranceBtn}
                    onClick={() => setIsEntranceActive(false)}
                  >
                    Завершить подъезд
                  </button>
                </div>
              )}
            </div>
          ) : selectedAddress && currentBuilding && currentJK ? (
            /* LEVEL 3: SELECT ENTRANCE IN BUILDING */
            <div className={styles.objectsView}>
              <div className={styles.focusHeader}>
                <button
                  className={styles.backLink}
                  onClick={() => resetBackNav("address")}
                >
                  ← К списку домов
                </button>
                <div className={styles.breadCrumbs}>
                  {currentJK.name}
                </div>
                <h2 className={styles.focusTitle}>{currentBuilding.address}</h2>
                <div className={styles.statsMini}>
                  Всего подъездов: {currentBuilding.entrances.length} • Задач: {getBuildingTasks(currentBuilding).filter(t => t.status === "pending").length} active
                </div>
              </div>

              <div className={styles.jkGrid}>
                {currentBuilding.entrances.map(ent => {
                  const activeCount = ent.tasks.filter(t => t.status === "pending").length;
                  const isDone = ent.tasks.every(t => t.status !== "pending");

                  return (
                    <div key={ent.number} className={styles.objectCard}>
                      <div className={styles.objectInfo}>
                        <h3 className={styles.objectName}>Подъезд {ent.number}</h3>
                        <div className={styles.objectMeta}>
                          <span>{ent.tasks.length} квартир</span>
                          {isDone ? (
                            <span className={styles.allDoneBadge}>Готово</span>
                          ) : (
                            <span className={styles.activeBadge}>{activeCount} active</span>
                          )}
                        </div>
                      </div>
                      <button
                        className={isDone ? styles.objectBtnDisabled : styles.objectBtnActive}
                        onClick={() => {
                          setSelectedEntrance(ent.number);
                          setIsEntranceActive(true);
                        }}
                      >
                        {isDone ? "Просмотр" : "Начать этот подъезд"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedJKId && currentJK ? (
            /* LEVEL 2: SELECT BUILDING (ADDRESS) IN JK */
            <div className={styles.objectsView}>
              <div className={styles.focusHeader}>
                <button
                  className={styles.backLink}
                  onClick={() => resetBackNav("jk")}
                >
                  ← К списку объектов
                </button>
                <h2 className={styles.focusTitle}>{currentJK.name}</h2>
                <div className={styles.statsMini}>
                  Домов в работе: {currentJK.buildings.length} • Задач: {getJKTasks(currentJK).filter(t => t.status === "pending").length} active
                </div>
              </div>

              <div className={styles.jkGrid}>
                {currentJK.buildings.map(b => {
                  const bTasks = getBuildingTasks(b);
                  const activeCount = bTasks.filter(t => t.status === "pending").length;
                  const isDone = bTasks.every(t => t.status !== "pending");

                  return (
                    <div key={b.address} className={styles.objectCard}>
                      <div className={styles.objectInfo}>
                        <h3 className={styles.objectName}>{b.address}</h3>
                        <p className={styles.objectAddr}>{b.entrances.length} подъездов подключено</p>
                        <div className={styles.objectMeta}>
                          <span>{bTasks.length} квартир</span>
                          {isDone && <span className={styles.allDoneBadge}>Завершено</span>}
                        </div>
                      </div>
                      <button
                        className={styles.objectBtnActive}
                        onClick={() => setSelectedAddress(b.address)}
                      >
                        {isDone ? "Просмотр" : `Перейти к подъездам (${activeCount})`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* LEVEL 1: SELECT JK / DISTRICT */
            <div className={styles.objectsView}>
              <div className={styles.topActions}>
                <button
                  className={styles.finishBtnTop}
                  onClick={handleEndShift}
                >
                  Завершить смену
                </button>
              </div>
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{totalTasks}</span>
                  <span className={styles.statLabel}>Задач всего</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{completedTasks}</span>
                  <span className={styles.statLabel}>Собрано</span>
                </div>
              </div>
              
              {tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: "#86868b" }}>
                  <div style={{ fontSize: "50px", marginBottom: "16px" }}>📦</div>
                  <h3>На сегодня нет запланированных сборов</h3>
                  <p>Все жители отдыхают, либо выносы не требуются.</p>
                </div>
              ) : (
                <div className={styles.jkGrid}>
                  {jks.map(jk => {
                    const jkTasks = getJKTasks(jk);
                    const activeCount = jkTasks.filter(t => t.status === "pending").length;
                    const isDone = jkTasks.every(t => t.status !== "pending");

                    return (
                      <div key={jk.id} className={styles.objectCard}>
                        <div className={styles.objectInfo}>
                          <h3 className={styles.objectName}>{jk.name}</h3>
                          <p className={styles.objectAddr}>{jk.buildings.length} адресов в работе</p>
                          <div className={styles.objectMeta}>
                            <span>{jkTasks.length} квартир</span>
                            {isDone && <span className={styles.allDoneBadge}>Завершено</span>}
                          </div>
                        </div>
                        <button
                          className={styles.objectBtnActive}
                          onClick={() => setSelectedJKId(jk.id)}
                        >
                          {isDone ? "Просмотр" : `Выбрать объект (${activeCount})`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : (
          /* PROFILE TAB */
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

      {/* PROBLEM SELECTION MODAL */}
      {isProblemModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Что случилось?</h3>
              <button 
                className={styles.modalCloseBtn}
                onClick={() => setIsProblemModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.problemOptions}>
              {[
                "Пакет отсутствует",
                "Строительный мусор",
                "Закрыт тамбур / Нет доступа",
                "Другое"
              ].map(type => (
                <button
                  key={type}
                  className={`${styles.problemOptionBtn} ${selectedProblemType === type ? styles.problemOptionActive : ""}`}
                  onClick={() => setSelectedProblemType(type)}
                >
                  {type === "Пакет отсутствует" && "🚫 "}
                  {type === "Строительный мусор" && "🧱 "}
                  {type === "Закрыт тамбур / Нет доступа" && "🔒 "}
                  {type === "Другое" && "📝 "}
                  {type}
                </button>
              ))}
            </div>

            {selectedProblemType === "Другое" && (
              <textarea
                className={styles.problemTextarea}
                placeholder="Опишите проблему курьерским языком..."
                value={problemComment}
                onChange={e => setProblemComment(e.target.value)}
              />
            )}

            <div className={styles.modalFooter}>
              <button
                className={styles.photoProofBtn}
                onClick={handleProblemPhotoTrigger}
                disabled={!selectedProblemType}
              >
                📸 Сделать фото
              </button>
              <button
                className={styles.submitProblemBtn}
                onClick={() => handleProblemSubmit()}
                disabled={!selectedProblemType || (selectedProblemType === "Другое" && !problemComment.trim())}
              >
                Отправить отчет
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA OVERLAY */}
      {isCameraOpen && (
        <div className={styles.cameraOverlay}>
          <div className={styles.cameraUI}>
            <div className={styles.cameraHeader}>
              <button
                onClick={() => {
                  setIsCameraOpen(false);
                  if (cameraMode === "problem") {
                    setIsProblemModalOpen(true); // Return back to problem modal
                  }
                }}
                className={styles.cancelCamBtn}
              >
                Отмена
              </button>
              <span className={styles.camTitle}>
                {cameraMode === "collect" ? "Фотоотчет" : "Фиксация проблемы"}
              </span>
              <div style={{ width: 60 }}></div>
            </div>
            <div className={styles.viewfinder}>
              {cameraMode === "collect" && <div className={styles.scanLine}></div>}
              <p>
                {cameraMode === "collect" 
                  ? "Наведите на пакет у двери" 
                  : "Сфотографируйте препятствие, мусор или закрытую дверь"}
              </p>
            </div>
            <div className={styles.cameraFooter}>
              <div className={styles.shutterContainer}>
                <button
                  className={cameraMode === "collect" ? styles.shutterBtn : styles.problemShutterBtn}
                  onClick={handleCapture}
                ></button>
                <span className={styles.shutterLabel}>
                  {cameraMode === "collect" ? "Забрал" : "Снять"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
