export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
    id: string;
    user_id: string;
    team_id?: string | null;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    team?: { name: string } | null;
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    priority?: TaskPriority;
    due_date?: string;
    team_id?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string;
}
