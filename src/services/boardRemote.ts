import type { Board, Column, Priority, Subtask, Task, TaskSource } from '../types';
import { isoNow } from '../lib/isoNow';
import { supabase } from './supabase';

const DEFAULT_COLUMN_TITLES = ['Бэклог', 'В работе', 'На проверке', 'Готово'];

const MIGRATED_KEY = 'aivibeboard.migratedBoards';

type BoardRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  member_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

type ColumnRow = {
  id: string;
  board_id: string;
  title: string;
  sort_order: number;
};

type TaskRow = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  priority: Priority;
  labels: string[] | null;
  subtasks: Subtask[] | null;
  parent_task_id: string | null;
  source: TaskSource;
  created_at: string;
  updated_at: string;
};

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Нет сессии Supabase');
  return uid;
}

function toBoard(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    memberIds: Array.isArray(row.member_ids) ? row.member_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumn(row: ColumnRow): Column {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    order: row.sort_order,
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    boardId: row.board_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description ?? '',
    assigneeId: row.assignee_id,
    priority: row.priority,
    labels: row.labels ?? [],
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    parentTaskId: row.parent_task_id,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(task: Task): Omit<TaskRow, 'created_at'> & { created_at?: string } {
  return {
    id: task.id,
    board_id: task.boardId,
    column_id: task.columnId,
    title: task.title,
    description: task.description,
    assignee_id: task.assigneeId,
    priority: task.priority,
    labels: task.labels,
    subtasks: task.subtasks,
    parent_task_id: task.parentTaskId,
    source: task.source,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export async function getAllBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as BoardRow[]).map(toBoard);
}

export async function putBoard(board: Board): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .update({
      name: board.name,
      description: board.description,
      member_ids: board.memberIds,
      updated_at: board.updatedAt,
    })
    .eq('id', board.id);
  if (error) throw error;
}

export async function insertBoard(board: Board, ownerId: string): Promise<void> {
  const { error } = await supabase.from('boards').insert({
    id: board.id,
    owner_id: ownerId,
    name: board.name,
    description: board.description,
    member_ids: board.memberIds,
    created_at: board.createdAt,
    updated_at: board.updatedAt,
  });
  if (error) throw error;
}

export async function deleteBoard(id: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllColumns(): Promise<Column[]> {
  const { data, error } = await supabase.from('board_columns').select('*').order('sort_order');
  if (error) throw error;
  return (data as ColumnRow[]).map(toColumn);
}

export async function listColumns(boardId: string): Promise<Column[]> {
  const { data, error } = await supabase
    .from('board_columns')
    .select('*')
    .eq('board_id', boardId)
    .order('sort_order');
  if (error) throw error;
  return (data as ColumnRow[]).map(toColumn);
}

export async function putColumn(column: Column): Promise<void> {
  const { error } = await supabase.from('board_columns').upsert({
    id: column.id,
    board_id: column.boardId,
    title: column.title,
    sort_order: column.order,
  });
  if (error) throw error;
}

export async function deleteColumn(id: string): Promise<void> {
  const { error } = await supabase.from('board_columns').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('board_tasks').select('*');
  if (error) throw error;
  return (data as TaskRow[]).map(toTask);
}

export async function putTask(task: Task): Promise<void> {
  const row = taskToRow(task);
  const { error } = await supabase.from('board_tasks').upsert(row);
  if (error) throw error;
}

export async function putTasks(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  const rows = tasks.map((task) => taskToRow(task));
  const { error } = await supabase.from('board_tasks').upsert(rows);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('board_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function createBoardWithColumns(
  name: string,
  description: string,
  memberIds: string[],
  options?: { boardId?: string; columnIds?: string[] },
): Promise<{ board: Board; columns: Column[] }> {
  const ownerId = await requireUserId();
  const now = isoNow();
  const boardId = options?.boardId ?? crypto.randomUUID();
  const board: Board = {
    id: boardId,
    name: name.trim(),
    description: description.trim(),
    memberIds,
    createdAt: now,
    updatedAt: now,
  };
  await insertBoard(board, ownerId);
  const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title, order) => ({
    id: options?.columnIds?.[order] ?? crypto.randomUUID(),
    boardId: board.id,
    title,
    order,
  }));
  for (const column of columns) await putColumn(column);
  return { board, columns };
}

export function findBacklogId(columns: Column[]): string | null {
  return columns.find((c) => c.title === 'Бэклог')?.id ?? columns[0]?.id ?? null;
}

export async function getBacklogColumnId(boardId: string): Promise<string | null> {
  const columns = await listColumns(boardId);
  return findBacklogId(columns);
}

export async function migrateBoardsFromIdbIfNeeded(
  localBoards: Board[],
  localColumns: Column[],
  localTasks: Task[],
): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY) === '1') return;
  const remote = await getAllBoards();
  if (remote.length > 0 || localBoards.length === 0) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }
  const ownerId = await requireUserId();
  for (const board of localBoards) {
    await insertBoard(board, ownerId);
  }
  for (const column of localColumns) {
    await putColumn(column);
  }
  for (const task of localTasks) {
    await putTask(task);
  }
  localStorage.setItem(MIGRATED_KEY, '1');
}
