'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Plus, Search, CheckSquare, StickyNote, Calendar, User, Flag, CheckCircle, Circle, Trash2, Edit2, X, Clock, Pin, Palette, ShieldAlert } from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Task {
    id: string;
    store_id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assigned_to?: string;
    created_by?: string;
    created_at: string;
}

interface Note {
    id: string;
    store_id: string;
    title: string;
    content: string;
    color: string;
    is_pinned: boolean;
    created_by?: string;
    created_at: string;
}

const colors = ['#ffffff', '#fecaca', '#fde047', '#bbf7d0', '#bfdbfe', '#e9d5ff'];

export default function TasksNotesPage() {
    const { activeStore, user, hasPermission, businessId } = useAuth();
    const { showToast } = useToast();

    if (!activeStore) return null;
    if (!hasPermission('access_tasks')) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-rose-50 p-6 rounded-full dark:bg-rose-900/20 mb-6">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    You do not have permission to access tasks and notes.
                </p>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [employees, setEmployees] = useState<{ name: string, id: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'task' | 'note' | null>(null);

    // Form states
    const [taskForm, setTaskForm] = useState<Partial<Task>>({ status: 'pending', priority: 'medium' });
    const [noteForm, setNoteForm] = useState<Partial<Note>>({ color: '#ffffff', is_pinned: false });

    useEffect(() => {
        if (activeStore?.id) {
            fetchTasks();
            fetchNotes();
            fetchEmployees();
        }
    }, [activeStore?.id]);

    const fetchTasks = async () => {
        if (!activeStore) return;
        let query = supabase.from('tasks').select('*').eq('store_id', activeStore.id);
        if (businessId) query = query.eq('business_id', businessId);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            console.error('Error info:', error);
        } else if (data) setTasks(data);
    };

    const fetchNotes = async () => {
        if (!activeStore) return;
        let query = supabase.from('notes').select('*').eq('store_id', activeStore.id);
        if (businessId) query = query.eq('business_id', businessId);

        const { data, error } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
        if (!error && data) setNotes(data);
    };

    const fetchEmployees = async () => {
        if (!activeStore) return;
        let query = supabase.from('employees').select('id, name').eq('store_id', activeStore.id);
        if (businessId) query = query.eq('business_id', businessId);
        
        const { data, error } = await query;
        if (!error && data) setEmployees(data);
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStore || !user) return;

        try {
            if (editingTask) {
                const { error } = await supabase.from('tasks').update(taskForm).eq('id', editingTask.id).eq('business_id', businessId);
                if (error) throw error;
                showToast('success', 'Task updated');
            } else {
                const { error } = await supabase.from('tasks').insert({
                    ...taskForm,
                    store_id: activeStore.id,
                    business_id: businessId,
                    created_by: user.name
                });
                if (error) throw error;
                showToast('success', 'Task created');
            }
            fetchTasks();
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setTaskForm({ status: 'pending', priority: 'medium' });
        } catch (error: any) {
            showToast('error', error.message || 'Error saving task');
        }
    };

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeStore || !user) return;

        try {
            if (editingNote) {
                const { error } = await supabase.from('notes').update(noteForm).eq('id', editingNote.id).eq('business_id', businessId);
                if (error) throw error;
                showToast('success', 'Note updated');
            } else {
                const { error } = await supabase.from('notes').insert({
                    ...noteForm,
                    store_id: activeStore.id,
                    business_id: businessId,
                    created_by: user.name
                });
                if (error) throw error;
                showToast('success', 'Note created');
            }
            fetchNotes();
            setIsNoteModalOpen(false);
            setEditingNote(null);
            setNoteForm({ color: '#ffffff', is_pinned: false });
        } catch (error: any) {
            showToast('error', error.message || 'Error saving note');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId || !deleteType) return;

        try {
            const table = deleteType === 'task' ? 'tasks' : 'notes';
            const { error } = await supabase.from(table).delete().eq('id', deleteConfirmId).eq('business_id', businessId);
            if (error) throw error;

            showToast('success', `${deleteType === 'task' ? 'Task' : 'Note'} deleted`);
            if (deleteType === 'task') fetchTasks();
            else fetchNotes();
        } catch (error: any) {
            showToast('error', error.message || 'Deletion failed');
        } finally {
            setDeleteConfirmId(null);
            setDeleteType(null);
        }
    };

    const toggleTaskStatus = async (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id).eq('business_id', businessId);
        if (!error) {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        }
    };

    const toggleNotePin = async (note: Note) => {
        const { error } = await supabase.from('notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id).eq('business_id', businessId);
        if (!error) {
            fetchNotes(); // re-fetch to resolve sorting
        }
    };

    // Filters
    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredNotes = notes.filter(n => (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (n.content || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400';
            case 'medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
            case 'low': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks & Notes</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Organize your workflow, assign tasks, and capture ideas.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg dark:bg-slate-800">
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                        >
                            <CheckSquare className="h-4 w-4" /> Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'notes' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                        >
                            <StickyNote className="h-4 w-4" /> Notes
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'tasks') {
                                setEditingTask(null);
                                setTaskForm({ status: 'pending', priority: 'medium' });
                                setIsTaskModalOpen(true);
                            } else {
                                setEditingNote(null);
                                setNoteForm({ color: '#ffffff', is_pinned: false });
                                setIsNoteModalOpen(true);
                            }
                        }}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add {activeTab === 'tasks' ? 'Task' : 'Note'}</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {activeTab === 'tasks' ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {/* Tasks Columns */}
                    {['pending', 'in_progress', 'completed'].map((status) => {
                        const colTasks = filteredTasks.filter(t => t.status === status);
                        return (
                            <div key={status} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 min-h-[400px]">
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 capitalize flex items-center gap-2">
                                    {status === 'pending' && <Circle className="h-4 w-4 text-slate-400" />}
                                    {status === 'in_progress' && <Clock className="h-4 w-4 text-indigo-500" />}
                                    {status === 'completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                    {status.replace('_', ' ')}
                                    <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-800 py-0.5 px-2 rounded-full">{colTasks.length}</span>
                                </h3>

                                <div className="space-y-3">
                                    {colTasks.map(task => (
                                        <div key={task.id} className={`group bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${task.status === 'completed' ? 'border-slate-200 dark:border-slate-700 opacity-70' : 'border-slate-200 dark:border-slate-700'}`}>
                                            <div className="flex items-start gap-3">
                                                <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 mt-1 flex-shrink-0">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-slate-300 hover:text-indigo-400 transition-colors" />
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>{task.title}</h4>
                                                    {task.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                                                            <Flag className="h-3 w-3" /> {task.priority}
                                                        </span>
                                                        {task.due_date && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {task.assigned_to && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                                <User className="h-3 w-3" /> {task.assigned_to}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 -mt-1 -mr-1">
                                                    <button onClick={() => { setEditingTask(task); setTaskForm(task); setIsTaskModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => { setDeleteType('task'); setDeleteConfirmId(task.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                            No {status.replace('_', ' ')} tasks
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 masonry">
                    {filteredNotes.map(note => {
                        const isDarkColor = note.color === '#ffffff' ? false : false; // simplistic
                        return (
                            <div
                                key={note.id}
                                className="group relative rounded-xl p-5 shadow-sm border transition-all hover:shadow-md hover:-translate-y-1"
                                style={{ backgroundColor: note.color, borderColor: note.color === '#ffffff' ? '#e2e8f0' : note.color }}
                            >
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                    <button onClick={() => toggleNotePin(note)} className={`p-1.5 rounded-full bg-black/5 hover:bg-black/10 ${note.is_pinned ? 'text-amber-600' : 'text-slate-600'}`}>
                                        <Pin className={`h-4 w-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                                    </button>
                                    <button onClick={() => { setEditingNote(note); setNoteForm(note); setIsNoteModalOpen(true); }} className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-slate-600">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setDeleteType('note'); setDeleteConfirmId(note.id); }} className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {note.is_pinned && <Pin className="h-4 w-4 text-amber-500 absolute top-3 right-3 fill-current group-hover:opacity-0 transition-opacity" />}

                                {note.title && <h3 className="font-bold text-slate-800 mb-2 pr-6">{note.title}</h3>}
                                <div className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</div>

                                <div className="mt-4 pt-4 border-t border-black/5 text-[10px] text-slate-500 font-medium">
                                    {new Date(note.created_at).toLocaleDateString()} {note.created_by && `• ${note.created_by}`}
                                </div>
                            </div>
                        )
                    })}
                    {filteredNotes.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <StickyNote className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No notes found. Create your first note.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modals & Dialogs */}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingTask ? 'Edit Task' : 'New Task'}</h2>
                            <button onClick={() => setIsTaskModalOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                                <input
                                    type="text" required
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={taskForm.title || ''} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <textarea
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    value={taskForm.description || ''} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={taskForm.status || 'pending'} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as any })}
                                    >
                                        <option value="pending">Todo</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={taskForm.priority || 'medium'} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={taskForm.due_date ? taskForm.due_date.split('T')[0] : ''} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Assign To</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={taskForm.assigned_to || ''} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full mt-4 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                                {editingTask ? 'Save Changes' : 'Create Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {isNoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col" style={{ backgroundColor: noteForm.color || '#ffffff' }}>
                        <div className="p-4 border-b border-black/10 flex items-center justify-between">
                            <div className="flex gap-2">
                                {colors.map(c => (
                                    <button
                                        key={c} type="button"
                                        onClick={() => setNoteForm({ ...noteForm, color: c })}
                                        className={`h-6 w-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${noteForm.color === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setNoteForm({ ...noteForm, is_pinned: !noteForm.is_pinned })} className={`p-1.5 rounded-full hover:bg-black/5 ${noteForm.is_pinned ? 'text-amber-600' : 'text-slate-400'}`}>
                                    <Pin className={`h-5 w-5 ${noteForm.is_pinned ? 'fill-current' : ''}`} />
                                </button>
                                <button type="button" onClick={() => setIsNoteModalOpen(false)} className="rounded-full p-1.5 hover:bg-black/5 text-slate-500">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                            <input
                                type="text" placeholder="Title"
                                className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-slate-400 text-slate-800"
                                value={noteForm.title || ''} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}
                            />
                            <textarea
                                rows={8} required placeholder="Take a note..."
                                className="w-full bg-transparent resize-none text-base outline-none placeholder:text-slate-400 text-slate-700"
                                value={noteForm.content || ''} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                            />
                            <div className="flex justify-end pt-4 border-t border-black/10">
                                <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                                    {editingNote ? 'Save' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteConfirmId}
                onClose={() => { setDeleteConfirmId(null); setDeleteType(null); }}
                onConfirm={handleDelete}
                title={`Delete ${deleteType}`}
                description={`Are you sure you want to delete this ${deleteType}?`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
