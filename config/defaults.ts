// Default seed content. Edit to tune the initial experience.

export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; sortOrder: number }> = [
  { name: "Домашние дела", sortOrder: 10 },
  { name: "Учёба", sortOrder: 20 },
  { name: "Спорт", sortOrder: 30 },
  { name: "Чтение", sortOrder: 40 },
  { name: "Хорошее поведение", sortOrder: 50 },
  { name: "Особые миссии", sortOrder: 60 },
];

export const DEFAULT_TASKS: ReadonlyArray<{
  title: string;
  categoryName: string;
  points: number;
  description?: string;
  recurrenceType: "NONE" | "DAILY" | "WEEKLY" | "WEEKDAYS";
  recurrenceDays?: number[];
}> = [
  {
    title: "Заправить кровать",
    categoryName: "Домашние дела",
    points: 5,
    recurrenceType: "DAILY",
  },
  {
    title: "Убрать за собой посуду",
    categoryName: "Домашние дела",
    points: 5,
    recurrenceType: "DAILY",
  },
  {
    title: "Сделать домашнее задание",
    categoryName: "Учёба",
    points: 15,
    recurrenceType: "WEEKDAYS",
    recurrenceDays: [1, 2, 3, 4, 5],
  },
  {
    title: "Тренировка",
    categoryName: "Спорт",
    points: 10,
    recurrenceType: "WEEKDAYS",
    recurrenceDays: [2, 4, 6],
  },
  {
    title: "Чтение 20 минут",
    categoryName: "Чтение",
    points: 10,
    recurrenceType: "DAILY",
  },
  {
    title: "День без ссор",
    categoryName: "Хорошее поведение",
    points: 20,
    recurrenceType: "DAILY",
  },
  {
    title: "Выучить стихотворение",
    categoryName: "Особые миссии",
    points: 50,
    recurrenceType: "NONE",
  },
];

/**
 * Catalog of preset tasks rendered on the /parent/tasks and /child/tasks pages.
 *
 * Philosophy (see memory: project_chores_points_philosophy):
 *   - Obligatory daily things (homework, brushing teeth, own dishes) are NOT
 *     here — they live as an unrewarded "base" in the family's mental model.
 *   - Everything below is extra effort or initiative; points calibrated so a
 *     $40 game (100 points) takes ~3–5 weeks of real work.
 *
 * The `group` label is for UI grouping in the picker only. `categoryName` is
 * what gets written to the DB and must match a row in DEFAULT_CATEGORIES (or
 * any category the parent has added since). If a category isn't found at
 * apply-time, the first active category is used as a fallback.
 *
 * All presets default to recurrenceType=NONE — they're opportunities the kid
 * picks up when they do the thing, not daily obligations. The parent can
 * change recurrence on any task after creation.
 */
export const DEFAULT_TASK_PRESETS: ReadonlyArray<{
  title: string;
  group: string;
  categoryName: string;
  points: number;
  description?: string;
}> = [
  // Помощь по дому
  { title: "Вынести мусор", group: "Помощь по дому", categoryName: "Домашние дела", points: 2 },
  {
    title: "Помыть всю посуду после ужина",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 5,
    description: "Не только свою — всю посуду со стола и из раковины",
  },
  { title: "Накрыть на стол", group: "Помощь по дому", categoryName: "Домашние дела", points: 2 },
  {
    title: "Убрать со стола и протереть",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 2,
  },
  { title: "Полить цветы", group: "Помощь по дому", categoryName: "Домашние дела", points: 2 },
  {
    title: "Протереть пыль в комнате",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 3,
  },
  {
    title: "Пропылесосить свою комнату",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 3,
  },
  {
    title: "Пропылесосить всю квартиру",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 6,
  },
  {
    title: "Помыть пол в одной комнате",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 4,
  },
  {
    title: "Сложить и разложить чистое бельё",
    group: "Помощь по дому",
    categoryName: "Домашние дела",
    points: 3,
  },

  // Уход за котом
  {
    title: "Покормить кота и сменить воду",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 1,
  },
  {
    title: "Почистить лоток (убрать комочки)",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 2,
  },
  {
    title: "Вынести содержимое лотка в мусор",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 2,
  },
  {
    title: "Полная смена наполнителя в лотке",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 4,
  },
  { title: "Вычесать кота", group: "Уход за котом", categoryName: "Домашние дела", points: 2 },
  {
    title: "Поиграть с котом 15 минут",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 2,
  },
  {
    title: "Протереть и помыть миски",
    group: "Уход за котом",
    categoryName: "Домашние дела",
    points: 1,
  },

  // Кухня
  {
    title: "Сделать себе завтрак самостоятельно",
    group: "Кухня",
    categoryName: "Домашние дела",
    points: 2,
  },
  {
    title: "Сделать салат на всю семью",
    group: "Кухня",
    categoryName: "Домашние дела",
    points: 5,
  },
  { title: "Помочь приготовить ужин", group: "Кухня", categoryName: "Домашние дела", points: 4 },
  { title: "Испечь что-то по рецепту", group: "Кухня", categoryName: "Домашние дела", points: 7 },

  // Инициатива
  {
    title: "Помог донести и разобрать покупки",
    group: "Инициатива",
    categoryName: "Особые миссии",
    points: 4,
  },
  {
    title: "Сам предложил помощь и довёл до конца",
    group: "Инициатива",
    categoryName: "Особые миссии",
    points: 5,
  },
  {
    title: "Убрал общую зону, когда никто не просил",
    group: "Инициатива",
    categoryName: "Особые миссии",
    points: 7,
  },
  {
    title: "Позвонить или написать бабушке/дедушке",
    group: "Инициатива",
    categoryName: "Особые миссии",
    points: 3,
  },

  // Большие задачи
  {
    title: "Генеральная уборка своей комнаты",
    group: "Большие задачи",
    categoryName: "Особые миссии",
    points: 10,
  },
  {
    title: "Помыть машину снаружи",
    group: "Большие задачи",
    categoryName: "Особые миссии",
    points: 10,
  },
  {
    title: "Помочь с уборкой всей квартиры",
    group: "Большие задачи",
    categoryName: "Особые миссии",
    points: 12,
  },
  {
    title: "Разобрать шкаф или отсортировать старые вещи",
    group: "Большие задачи",
    categoryName: "Особые миссии",
    points: 8,
  },
  {
    title: "Помочь собрать или разобрать мебель",
    group: "Большие задачи",
    categoryName: "Особые миссии",
    points: 8,
  },

  // Учёба и развитие
  {
    title: "Почитать 30 минут сверх школьного",
    group: "Учёба и развитие",
    categoryName: "Чтение",
    points: 2,
  },
  {
    title: "Дочитать книгу до конца",
    group: "Учёба и развитие",
    categoryName: "Чтение",
    points: 10,
  },
  {
    title: "Выучить стихотворение наизусть",
    group: "Учёба и развитие",
    categoryName: "Учёба",
    points: 5,
  },
  {
    title: "Сделать дополнительное задание или проект",
    group: "Учёба и развитие",
    categoryName: "Учёба",
    points: 5,
  },
  {
    title: "Позаниматься музыкой или спортом 30 минут сверх нормы",
    group: "Учёба и развитие",
    categoryName: "Спорт",
    points: 3,
  },
  {
    title: "Закончить онлайн-урок или курс",
    group: "Учёба и развитие",
    categoryName: "Учёба",
    points: 8,
  },
  {
    title: "Научиться новому навыку и показать результат",
    group: "Учёба и развитие",
    categoryName: "Особые миссии",
    points: 12,
  },
];

export const DEFAULT_REWARDS: ReadonlyArray<{
  title: string;
  description?: string;
  cost: number;
}> = [
  { title: "30 минут мультфильмов", cost: 20 },
  { title: "Вечер игр с папой / мамой", cost: 60 },
  { title: "Поход в любимое кафе", cost: 150 },
  { title: "Новая книга", cost: 200 },
  { title: "Маленький сюрприз", cost: 80 },
];
