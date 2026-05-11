import { create } from 'zustand';
import { getDb, initDatabase } from '../db/database';
import { 
  scheduleNaggingNotifications, 
  cancelTaskNotifications
} from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const NOTIF_KEY = '@due_reminders_notifs_enabled';

const ONBOARDING_KEY = '@due_reminders_onboarding_seen';

const useStore = create((set, get) => ({
  tasks: [],
  completedTasks: [],
  isLoading: true,
  alertConfig: null,
  notificationsEnabled: true,
  isPremium: false,
  hasSeenOnboarding: false,

  showAlert: (config) => set({ alertConfig: config }),
  hideAlert: () => set({ alertConfig: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  initialize: async () => {
    try {
      // Load preferences
      const [notifPref, onboardingSeen] = await Promise.all([
        AsyncStorage.getItem(NOTIF_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY)
      ]);

      const isNotifEnabled = notifPref === null ? true : notifPref === 'true';
      set({ 
        notificationsEnabled: isNotifEnabled,
        hasSeenOnboarding: onboardingSeen === 'true'
      });

      const db = await initDatabase();
      const tasks = await db.getAllAsync('SELECT * FROM tasks WHERE status != "completed" ORDER BY due_at ASC');
      const completedTasks = await db.getAllAsync('SELECT * FROM tasks WHERE status = "completed" ORDER BY created_at DESC LIMIT 50');
      
      set({ tasks, completedTasks, isLoading: false });

      if (isNotifEnabled) {
        for (const task of tasks) {
          scheduleNaggingNotifications(task).catch(e => console.log('Notification background error:', e));
        }
      }
    } catch (error) {
      console.error('Initialization error:', error);
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    set({ hasSeenOnboarding: true });
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  },

  toggleNotifications: async () => {
    const currentState = get().notificationsEnabled;
    const newState = !currentState;
    set({ notificationsEnabled: newState });
    await AsyncStorage.setItem(NOTIF_KEY, newState ? 'true' : 'false');
    
    if (!newState) {
      // Cancel all if disabling
      await Notifications.cancelAllScheduledNotificationsAsync();
    } else {
      // Reschedule all if enabling
      const tasks = get().tasks;
      for (const task of tasks) {
        scheduleNaggingNotifications(task).catch(() => {});
      }
    }
  },

  addTask: async (task) => {
    try {
      const db = await getDb();
      const { title, description, amount, currency, due_at, nag_interval, category, priority } = task;
      const created_at = Date.now();
      
      const sanitizedTitle = String(title || 'Untitled');
      const sanitizedDesc = String(description || '');
      const sanitizedAmt = Number(amount || 0);
      const sanitizedCur = String(currency || '$');
      const sanitizedDue = Number(due_at || Date.now());
      const sanitizedNag = Number(nag_interval || 0);
      const sanitizedCat = String(category || 'general');
      const sanitizedPri = String(priority || 'medium');

      const result = await db.runAsync(
        'INSERT INTO tasks (title, description, amount, currency, due_at, nag_interval, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [sanitizedTitle, sanitizedDesc, sanitizedAmt, sanitizedCur, sanitizedDue, sanitizedNag, sanitizedCat, sanitizedPri, 'pending', created_at]
      );
      
      const newTask = {
        id: result.lastInsertRowId,
        title: sanitizedTitle,
        description: sanitizedDesc,
        amount: sanitizedAmt,
        currency: sanitizedCur,
        due_at: sanitizedDue,
        nag_interval: sanitizedNag,
        category: sanitizedCat,
        priority: sanitizedPri,
        status: 'pending',
        created_at
      };

      if (get().notificationsEnabled) {
        scheduleNaggingNotifications(newTask).catch(e => console.log('Notification error:', e));
      }

      set((state) => ({ tasks: [...state.tasks, newTask].sort((a, b) => a.due_at - b.due_at) }));
      return newTask;
    } catch (error) {
      console.error('Add Task Error:', error);
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      const db = await getDb();
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      
      await db.runAsync(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...values, id]);
      
      const state = get();
      let wasFoundInActive = false;
      let wasFoundInCompleted = false;

      const isNotifOn = get().notificationsEnabled;

      // Try finding in active tasks
      const updatedActive = state.tasks.map(t => {
        if (t.id === id) {
          wasFoundInActive = true;
          const updated = { ...t, ...updates };
          if (isNotifOn) {
            scheduleNaggingNotifications(updated).catch(e => console.log('Notification update error:', e));
          }
          return updated;
        }
        return t;
      });

      // Try finding in completed tasks
      const updatedCompleted = state.completedTasks.map(t => {
        if (t.id === id) {
          wasFoundInCompleted = true;
          return { ...t, ...updates };
        }
        return t;
      });

      let finalActive = updatedActive;
      let finalCompleted = updatedCompleted;

      // Handle migration if status changed
      if (updates.status === 'pending' && wasFoundInCompleted) {
        const taskToMove = updatedCompleted.find(t => t.id === id);
        finalCompleted = updatedCompleted.filter(t => t.id !== id);
        finalActive = [...updatedActive, taskToMove].sort((a, b) => a.due_at - b.due_at);
        if (isNotifOn) {
          scheduleNaggingNotifications(taskToMove).catch(e => console.log('Notification restore error:', e));
        }
      } else if (updates.status === 'completed' && wasFoundInActive) {
        const taskToMove = updatedActive.find(t => t.id === id);
        finalActive = updatedActive.filter(t => t.id !== id);
        finalCompleted = [taskToMove, ...updatedCompleted];
        cancelTaskNotifications(id).catch(e => console.log('Cancel error:', e));
      }

      set({ tasks: finalActive, completedTasks: finalCompleted });
    } catch (error) {
      console.error('Update Task Error:', error);
    }
  },

  updateTaskTime: async (id, newDueAt) => {
    try {
      const db = await getDb();
      await db.runAsync('UPDATE tasks SET due_at = ? WHERE id = ?', [newDueAt, id]);
      
      const state = get();
      const isNotifOn = state.notificationsEnabled;
      const updatedTasks = state.tasks.map(t => {
        if (t.id === id) {
          const updated = { ...t, due_at: newDueAt };
          if (isNotifOn) {
            scheduleNaggingNotifications(updated).catch(e => console.log('Notification update error:', e));
          }
          return updated;
        }
        return t;
      }).sort((a, b) => a.due_at - b.due_at);

      set({ tasks: updatedTasks });
    } catch (error) {
      console.error('Update Task Time Error:', error);
    }
  },

  completeTask: async (id) => {
    try {
      const db = await getDb();
      const completedAt = Date.now();
      await db.runAsync('UPDATE tasks SET status = "completed", created_at = ? WHERE id = ?', [completedAt, id]);
      cancelTaskNotifications(id).catch(e => console.log('Cancel error:', e));
      const state = get();
      const completedTask = state.tasks.find(t => t.id === id);
      if (completedTask) {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          completedTasks: [{ ...completedTask, status: 'completed', created_at: completedAt }, ...s.completedTasks],
        }));
      } else {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      }
    } catch (error) {
      console.error('Complete Task Error:', error);
    }
  },

  uncompleteTask: async (id) => {
    try {
      const db = await getDb();
      await db.runAsync('UPDATE tasks SET status = "pending" WHERE id = ?', [id]);
      
      const state = get();
      const taskToRestore = state.completedTasks.find(t => t.id === id);
      
      if (taskToRestore) {
        const restoredTask = { ...taskToRestore, status: 'pending' };
        // Reschedule notifications if enabled
        if (get().notificationsEnabled) {
          scheduleNaggingNotifications(restoredTask).catch(e => console.log('Reschedule error:', e));
        }
        
        set((s) => ({
          completedTasks: s.completedTasks.filter(t => t.id !== id),
          tasks: [...s.tasks, restoredTask].sort((a, b) => a.due_at - b.due_at),
        }));
      }
    } catch (error) {
      console.error('Uncomplete Task Error:', error);
    }
  },

  deleteTask: async (id, isCompleted = false) => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
      cancelTaskNotifications(id).catch(e => console.log('Cancel error:', e));
      
      set((state) => {
        if (isCompleted) {
          return { completedTasks: state.completedTasks.filter((t) => t.id !== id) };
        }
        return { tasks: state.tasks.filter((t) => t.id !== id) };
      });
    } catch (error) {
      console.error('Delete Task Error:', error);
    }
  },

  clearHistory: async () => {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM tasks WHERE status = "completed"');
      set({ completedTasks: [] });
    } catch (error) {
      console.error('Clear History Error:', error);
    }
  },

  importData: async (data) => {
    try {
      const db = await getDb();
      const { tasks, completedTasks } = data;
      
      // Wipe current DB
      await db.runAsync('DELETE FROM tasks');
      
      // Cancel all existing notifications
      const state = get();
      for(const t of state.tasks) {
        cancelTaskNotifications(t.id).catch(() => {});
      }

      // Batch insert tasks
      for (const t of [...tasks, ...completedTasks]) {
        await db.runAsync(
          'INSERT INTO tasks (title, description, amount, currency, due_at, nag_interval, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [t.title, t.description, t.amount, t.currency, t.due_at, t.nag_interval, t.category, t.priority, t.status, t.created_at]
        );
      }

      // Reload state from DB to get correct IDs
      const newTasks = await db.getAllAsync('SELECT * FROM tasks WHERE status != "completed" ORDER BY due_at ASC');
      const newCompleted = await db.getAllAsync('SELECT * FROM tasks WHERE status = "completed" ORDER BY created_at DESC LIMIT 50');
      
      set({ tasks: newTasks, completedTasks: newCompleted });

      // Reschedule notifications for active tasks
      for (const t of newTasks) {
        scheduleNaggingNotifications(t).catch(() => {});
      }
    } catch (error) {
      console.error('Import Data Error:', error);
      throw error;
    }
  }

}));

export default useStore;
