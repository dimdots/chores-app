// Russian translation. Source of truth for the `Dict` shape that every
// other locale conforms to. Keep keys stable across translations.

export type Dict = {
  app: {
    name: string;
    loading: string;
    error: string;
    empty: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    confirm: string;
    create: string;
    back: string;
    yes: string;
    no: string;
    close: string;
    search: string;
    actions: string;
    details: string;
    optional: string;
    signOut: string;
    today: string;
    week: string;
    all: string;
    points: string;
    pointsShort: string;
    never: string;
    weekdaysShort: string[];
    undo: string;
  };
  login: {
    parentTitle: string;
    childTitle: string;
    pickerTitle: string;
    pickerSubtitle: string;
    pickerEmpty: string;
    email: string;
    password: string;
    pin: string;
    pinPromptFor: string;
    backToPicker: string;
    submit: string;
    switchToChild: string;
    switchToParent: string;
    loginWithEmail: string;
    invalid: string;
    required: string;
    tooManyAttempts: string;
    roleParent: string;
    roleChild: string;
    fallbackEmailWithPin: string;
    fallbackEmailOrInvite: string;
    childNoChildrenYet: string;
  };
  setup: {
    title: string;
    description: string;
    token: string;
    name: string;
    success: string;
    disabled: string;
  };
  signup: {
    title: string;
    description: string;
    familyName: string;
    familyNameHelp: string;
    success: string;
    tokenMissing: string;
    tokenExpired: string;
    tokenUsed: string;
    emailTaken: string;
  };
  nav: {
    dashboard: string;
    tasks: string;
    approvals: string;
    rewards: string;
    categories: string;
    reports: string;
    settings: string;
    history: string;
    children: string;
  };
  parentDashboard: {
    pendingApprovals: string;
    pendingRewards: string;
    balance: string;
    recentActivity: string;
    weeklySummary: string;
    topChores: string;
    quickActions: string;
    createTask: string;
    createReward: string;
    addBonus: string;
    addPenalty: string;
    noPendingApprovals: string;
    noPendingRewards: string;
    tasksToday: string;
    noTasksToday: string;
  };
  childDashboard: {
    hello: string;
    yourPoints: string;
    level: string;
    streak: string;
    progressToNext: string;
    today: string;
    pending: string;
    rewardsAvailable: string;
    recent: string;
    allDone: string;
    days: string;
    streakZero: string;
    maxLevel: string;
  };
  tasks: {
    list: string;
    new: string;
    edit: string;
    title: string;
    description: string;
    category: string;
    points: string;
    recurrence: string;
    recurrenceNone: string;
    recurrenceDaily: string;
    recurrenceWeekly: string;
    recurrenceWeekdays: string;
    weekdays: string[];
    active: string;
    inactive: string;
    assign: string;
    assigned: string;
    markDone: string;
    childNew: string;
    childNewTitle: string;
    createdByChild: string;
    markedPending: string;
    approve: string;
    reject: string;
    rejectReason: string;
    status: {
      ASSIGNED: string;
      PENDING_APPROVAL: string;
      APPROVED: string;
      REJECTED: string;
      CANCELED: string;
    };
    rejectedNote: string;
    todoEmpty: string;
    todoHeading: string;
    doneTodayHeading: string;
    doneTodayEmpty: string;
    pendingEmpty: string;
    archive: string;
    restore: string;
    delete: string;
    confirmDelete: string;
    createdBy: string;
    presets: string;
    presetsTitle: string;
    presetsHelp: string;
    presetsSelected: string;
    presetsAdd: string;
    presetsNoneSelected: string;
    presetsCreated: string;
    presetsSelectAll: string;
    presetsDeselectAll: string;
    presetsCreditNow: string;
    bulkAssign: string;
    bulkAssignNoneSelected: string;
    bulkAssignDone: string;
    bulkAssignNeedsSingleChild: string;
    selectAll: string;
    deselectAll: string;
    pointsInvalid: string;
  };
  categories: {
    title: string;
    name: string;
    new: string;
    order: string;
    empty: string;
    cannotDeleteWithTasks: string;
  };
  rewards: {
    list: string;
    new: string;
    edit: string;
    title: string;
    description: string;
    cost: string;
    active: string;
    inactive: string;
    expiresAt: string;
    quantityLimit: string;
    quantityUsed: string;
    request: string;
    available: string;
    notEnoughPoints: string;
    expired: string;
    soldOut: string;
    pending: string;
    approve: string;
    reject: string;
    confirmRequest: string;
    requested: string;
    empty: string;
    costInvalid: string;
    expiresUntilPrefix: string;
  };
  approvals: {
    title: string;
    tasksTab: string;
    rewardsTab: string;
    empty: string;
    requestedAt: string;
    approveConfirm: string;
    rejectConfirm: string;
    rewardApproveConfirm: string;
    rewardRejectConfirm: string;
    tooLowBalance: string;
  };
  points: {
    adjustTitle: string;
    bonus: string;
    penalty: string;
    value: string;
    reason: string;
    confirmPenalty: string;
    negativeNotAllowed: string;
    saved: string;
    valueInvalid: string;
  };
  reports: {
    title: string;
    weekly: string;
    topChores: string;
    rewardsHistory: string;
    activity: string;
    export: string;
    exportActivity: string;
    exportTasks: string;
    exportPoints: string;
    exportRewards: string;
    dateFrom: string;
    dateTo: string;
    noData: string;
  };
  settings: {
    title: string;
    children: string;
    addChild: string;
    addParent: string;
    resetPin: string;
    newPin: string;
    pinReset: string;
    cycleReset: string;
    cycleResetHelp: string;
    cycleResetDone: string;
    noChildren: string;
    myPinTitle: string;
    myPinHelp: string;
    myPinSet: string;
    myPinExistsHelp: string;
    languageTitle: string;
    languageHelp: string;
    languageSaved: string;
    parentName: string;
    childName: string;
    childDisplayName: string;
  };
  activity: {
    TASK_APPROVED: string;
    TASK_REJECTED: string;
    TASK_COMPLETED: string;
    REWARD_REQUESTED: string;
    REWARD_APPROVED: string;
    REWARD_REJECTED: string;
    ADJUSTMENT_BONUS: string;
    ADJUSTMENT_PENALTY: string;
    CYCLE_RESET: string;
    LOGIN_PARENT: string;
    LOGIN_CHILD: string;
    PIN_RESET: string;
    TASK_UNCREDITED: string;
  };
  errors: {
    notAuthenticated: string;
    notAuthorized: string;
    notFound: string;
    validation: string;
    unknown: string;
    childNotFound: string;
    taskNotFound: string;
    rewardNotFound: string;
    rewardUnavailable: string;
    insufficientPoints: string;
    alreadyProcessed: string;
    pinMustBeSixDigits: string;
    invalidToken: string;
    parentsExist: string;
  };
  /**
   * Localized default category names seeded on signup. Each locale gets its
   * own set so a new family starts with categories in their language.
   * The order in the array becomes the sortOrder (10, 20, 30…).
   */
  defaultCategories: readonly string[];
};

export const ru: Dict = {
  app: {
    name: "Семейные задания и награды",
    loading: "Загрузка…",
    error: "Произошла ошибка",
    empty: "Пока ничего нет",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Изменить",
    confirm: "Подтвердить",
    create: "Создать",
    back: "Назад",
    yes: "Да",
    no: "Нет",
    close: "Закрыть",
    search: "Поиск",
    actions: "Действия",
    details: "Детали",
    optional: "необязательно",
    signOut: "Выйти",
    today: "Сегодня",
    week: "Неделя",
    all: "Все",
    points: "очки",
    pointsShort: "очк.",
    never: "никогда",
    weekdaysShort: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    undo: "Отменить",
  },
  login: {
    parentTitle: "Вход для родителя",
    childTitle: "Вход для ребёнка",
    pickerTitle: "Кто это?",
    pickerSubtitle: "Выберите профиль и введите PIN",
    pickerEmpty: "Профилей пока нет — войдите по email, чтобы создать их.",
    email: "Email",
    password: "Пароль",
    pin: "PIN-код (6 цифр)",
    pinPromptFor: "PIN для {name}",
    backToPicker: "Назад",
    submit: "Войти",
    switchToChild: "Ребёнок? Войти с PIN",
    switchToParent: "Родитель? Войти по email",
    loginWithEmail: "Нет PIN-кода? Войти по email",
    invalid: "Неверные данные",
    required: "Заполните все поля",
    tooManyAttempts: "Слишком много попыток. Попробуйте позже.",
    roleParent: "Родитель",
    roleChild: "Ребёнок",
    fallbackEmailWithPin: "Войдите по email и задайте PIN в настройках.",
    fallbackEmailOrInvite: "Войдите по email или используйте ссылку-приглашение.",
    childNoChildrenYet: "Родитель сначала должен создать профиль ребёнка.",
  },
  setup: {
    title: "Первичная настройка",
    description:
      "Создайте первую родительскую учётную запись. Токен bootstrap можно взять из переменной окружения BOOTSTRAP_TOKEN.",
    token: "Bootstrap-токен",
    name: "Имя",
    success: "Родитель создан. Теперь можно войти.",
    disabled:
      "Настройка отключена: родительские учётные записи уже существуют или токен удалён.",
  },
  signup: {
    title: "Создание семьи",
    description:
      "Заполните форму, чтобы создать семью и первый родительский профиль. Ссылка-приглашение одноразовая.",
    familyName: "Название семьи",
    familyNameHelp: "Например, «Семья Ивановых» — видно только вам.",
    success: "Готово! Открываем приложение…",
    tokenMissing: "Ссылка-приглашение недействительна. Запросите новую.",
    tokenExpired: "Срок действия ссылки истёк. Запросите новую.",
    tokenUsed: "Эта ссылка уже была использована.",
    emailTaken: "Этот email уже зарегистрирован.",
  },
  nav: {
    dashboard: "Главная",
    tasks: "Задания",
    approvals: "Одобрения",
    rewards: "Награды",
    categories: "Категории",
    reports: "Отчёты",
    settings: "Настройки",
    history: "История",
    children: "Дети",
  },
  parentDashboard: {
    pendingApprovals: "Ожидают одобрения",
    pendingRewards: "Запросы наград",
    balance: "Текущий баланс",
    recentActivity: "Последняя активность",
    weeklySummary: "Очки за неделю",
    topChores: "Самые частые задания",
    quickActions: "Быстрые действия",
    createTask: "Новое задание",
    createReward: "Новая награда",
    addBonus: "Начислить бонус",
    addPenalty: "Списать очки",
    noPendingApprovals: "Очередь пуста",
    noPendingRewards: "Новых запросов нет",
    tasksToday: "Открытые задания",
    noTasksToday: "Открытых заданий нет",
  },
  childDashboard: {
    hello: "Привет",
    yourPoints: "Твои очки",
    level: "Уровень",
    streak: "Серия",
    progressToNext: "До следующего уровня",
    today: "Сегодня",
    pending: "Ждут одобрения",
    rewardsAvailable: "Доступные награды",
    recent: "Что было",
    allDone: "На сегодня всё! 🎉",
    days: "дн.",
    streakZero: "Серии пока нет",
    maxLevel: "Макс. уровень",
  },
  tasks: {
    list: "Задания",
    new: "Новое задание",
    edit: "Изменить задание",
    title: "Название",
    description: "Описание",
    category: "Категория",
    points: "Очки",
    recurrence: "Повтор",
    recurrenceNone: "Без повтора",
    recurrenceDaily: "Каждый день",
    recurrenceWeekly: "Раз в неделю",
    recurrenceWeekdays: "Выбранные дни",
    weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    active: "Активно",
    inactive: "Отключено",
    assign: "Назначить",
    assigned: "Задание назначено",
    markDone: "Готово!",
    childNew: "Добавить своё задание",
    childNewTitle: "Новое задание",
    createdByChild: "Добавил(а) сам",
    markedPending: "Ждёт одобрения",
    approve: "Одобрить",
    reject: "Отклонить",
    rejectReason: "Причина (необязательно)",
    status: {
      ASSIGNED: "К выполнению",
      PENDING_APPROVAL: "На одобрении",
      APPROVED: "Сделано",
      REJECTED: "Отклонено",
      CANCELED: "Отменено",
    },
    rejectedNote: "Задание отклонено",
    todoEmpty: "Открытых заданий нет",
    todoHeading: "Сделать",
    doneTodayHeading: "Уже сделано сегодня",
    doneTodayEmpty: "Пока ничего не выполнено",
    pendingEmpty: "Нет ожидающих одобрения",
    archive: "Архивировать",
    restore: "Восстановить",
    delete: "Удалить задание",
    confirmDelete: "Удалить задание «{title}» и все его назначения?",
    createdBy: "Кем создано",
    presets: "Готовые задания",
    presetsTitle: "Добавить из готового списка",
    presetsHelp: "Отметьте, что добавить. Очки можно изменить перед сохранением.",
    presetsSelected: "Выбрано: {count}",
    presetsAdd: "Добавить выбранные",
    presetsNoneSelected: "Ничего не выбрано",
    presetsCreated: "Задания добавлены: {count}",
    presetsSelectAll: "Все",
    presetsDeselectAll: "Снять",
    presetsCreditNow: "Готово",
    bulkAssign: "Назначить на сегодня",
    bulkAssignNoneSelected: "Ничего не выбрано",
    bulkAssignDone: "Назначено: {count}",
    bulkAssignNeedsSingleChild:
      "Массовое назначение работает, только когда в семье один активный ребёнок. Назначьте задания вручную через карточку задания.",
    selectAll: "Выбрать все",
    deselectAll: "Снять выделение",
    pointsInvalid: "Введите количество очков",
  },
  categories: {
    title: "Категории",
    name: "Название",
    new: "Новая категория",
    order: "Порядок",
    empty: "Категорий пока нет",
    cannotDeleteWithTasks:
      "Нельзя удалить категорию, к которой привязаны задания. Отключите её.",
  },
  rewards: {
    list: "Награды",
    new: "Новая награда",
    edit: "Изменить награду",
    title: "Название",
    description: "Описание",
    cost: "Стоимость",
    active: "Активна",
    inactive: "Отключена",
    expiresAt: "Действует до",
    quantityLimit: "Лимит",
    quantityUsed: "Использовано",
    request: "Хочу!",
    available: "Доступна",
    notEnoughPoints: "Недостаточно очков",
    expired: "Срок истёк",
    soldOut: "Закончилось",
    pending: "Запрошено",
    approve: "Одобрить",
    reject: "Отклонить",
    confirmRequest: "Потратить очки на эту награду?",
    requested: "Запрос отправлен",
    empty: "Наград пока нет",
    costInvalid: "Введите стоимость в очках",
    expiresUntilPrefix: "до",
  },
  approvals: {
    title: "Одобрения",
    tasksTab: "Задания",
    rewardsTab: "Награды",
    empty: "Ничего не ждёт одобрения",
    requestedAt: "Запрошено",
    approveConfirm: "Одобрить и начислить очки?",
    rejectConfirm: "Отклонить без начисления?",
    rewardApproveConfirm: "Одобрить и списать очки?",
    rewardRejectConfirm: "Отклонить запрос?",
    tooLowBalance: "Недостаточно очков у ребёнка",
  },
  points: {
    adjustTitle: "Коррекция очков",
    bonus: "Бонус",
    penalty: "Штраф",
    value: "Сколько очков",
    reason: "Причина",
    confirmPenalty: "Списать очки?",
    negativeNotAllowed: "Баланс не может стать отрицательным",
    saved: "Готово",
    valueInvalid: "Введите количество очков",
  },
  reports: {
    title: "Отчёты",
    weekly: "Очки за неделю",
    topChores: "Самые частые задания",
    rewardsHistory: "История наград",
    activity: "Вся активность",
    export: "Экспорт CSV",
    exportActivity: "Активность",
    exportTasks: "Задания",
    exportPoints: "Очки",
    exportRewards: "Награды",
    dateFrom: "С",
    dateTo: "По",
    noData: "Нет данных за период",
  },
  settings: {
    title: "Настройки",
    children: "Дети",
    addChild: "Добавить ребёнка",
    addParent: "Добавить родителя",
    resetPin: "Сбросить PIN",
    newPin: "Новый PIN (6 цифр)",
    pinReset: "PIN обновлён",
    cycleReset: "Сбросить цикл",
    cycleResetHelp:
      "Отметит текущий момент как начало нового цикла отчётности. История не удаляется.",
    cycleResetDone: "Цикл сброшен",
    noChildren: "Детей пока нет",
    myPinTitle: "Мой PIN-код",
    myPinHelp:
      "Задайте 6-значный PIN, чтобы входить со всеми остальными из одного экрана выбора профиля.",
    myPinSet: "PIN сохранён",
    myPinExistsHelp: "PIN задан. Можно менять в любой момент.",
    languageTitle: "Язык",
    languageHelp: "Язык интерфейса для всех в семье.",
    languageSaved: "Язык изменён",
    parentName: "Имя",
    childName: "Имя",
    childDisplayName: "Отображаемое имя",
  },
  activity: {
    TASK_APPROVED: "Задание сделано",
    TASK_REJECTED: "Задание отклонено",
    TASK_COMPLETED: "Ребёнок отметил задание",
    REWARD_REQUESTED: "Запрос награды",
    REWARD_APPROVED: "Награда получена",
    REWARD_REJECTED: "Награда отклонена",
    ADJUSTMENT_BONUS: "Бонус",
    ADJUSTMENT_PENALTY: "Штраф",
    CYCLE_RESET: "Цикл сброшен",
    LOGIN_PARENT: "Вход родителя",
    LOGIN_CHILD: "Вход ребёнка",
    PIN_RESET: "Сброс PIN",
    TASK_UNCREDITED: "Начисление отменено",
  },
  errors: {
    notAuthenticated: "Нужно войти",
    notAuthorized: "Нет доступа",
    notFound: "Не найдено",
    validation: "Проверьте заполнение полей",
    unknown: "Что-то пошло не так",
    childNotFound: "Ребёнок не найден",
    taskNotFound: "Задание не найдено",
    rewardNotFound: "Награда не найдена",
    rewardUnavailable: "Награда недоступна",
    insufficientPoints: "Недостаточно очков",
    alreadyProcessed: "Запрос уже обработан",
    pinMustBeSixDigits: "PIN должен состоять из 6 цифр",
    invalidToken: "Неверный токен",
    parentsExist: "Родительские аккаунты уже существуют",
  },
  defaultCategories: [
    "Домашние дела",
    "Учёба",
    "Спорт",
    "Чтение",
    "Хорошее поведение",
    "Особые миссии",
  ],
};
