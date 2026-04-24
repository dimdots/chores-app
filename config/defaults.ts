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
