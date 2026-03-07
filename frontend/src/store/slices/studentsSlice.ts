import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

// Types
export interface Student {
    id: number;
    student_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    phone?: string;
    class_id?: number;
    status: string;
    enrollment_date: string;
    date_of_birth: string;
    gender: string;
    address?: string;
}

export interface StudentListItem {
    id: number;
    student_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
    phone?: string;
    class_id?: number;
    status: string;
    enrollment_date: string;
}

interface StudentsState {
    students: StudentListItem[];
    currentStudent: Student | null;
    total: number;
    skip: number;
    limit: number;
    loading: boolean;
    error: string | null;
    searchQuery: string;
    statusFilter: string;
    classFilter: number | null;
}

const initialState: StudentsState = {
    students: [],
    currentStudent: null,
    total: 0,
    skip: 0,
    limit: 50,
    loading: false,
    error: null,
    searchQuery: '',
    statusFilter: '',
    classFilter: null,
};

// Async thunks
export const fetchStudents = createAsyncThunk(
    'students/fetchStudents',
    async (params: { skip?: number; limit?: number; search?: string; class_id?: number; status?: string }, { rejectWithValue }) => {
        try {
            const response = await api.get('/students/', { params });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch students');
        }
    }
);

export const fetchStudentById = createAsyncThunk(
    'students/fetchStudentById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await api.get(`/students/${id}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch student');
        }
    }
);

export const createStudent = createAsyncThunk(
    'students/createStudent',
    async (studentData: Partial<Student>, { rejectWithValue }) => {
        try {
            const response = await api.post('/students/', studentData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to create student');
        }
    }
);

export const updateStudent = createAsyncThunk(
    'students/updateStudent',
    async ({ id, data }: { id: number; data: Partial<Student> }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/students/${id}`, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update student');
        }
    }
);

export const deleteStudent = createAsyncThunk(
    'students/deleteStudent',
    async (id: number, { rejectWithValue }) => {
        try {
            await api.delete(`/students/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to delete student');
        }
    }
);

export const bulkImportStudents = createAsyncThunk(
    'students/bulkImport',
    async (csvContent: string, { rejectWithValue }) => {
        try {
            const response = await api.post('/students/bulk', csvContent, {
                headers: { 'Content-Type': 'text/plain' },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to import students');
        }
    }
);

export const importStudentsExcel = createAsyncThunk(
    'students/importExcel',
    async (file: File, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/students/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to import students');
        }
    }
);

// Slice
const studentsSlice = createSlice({
    name: 'students',
    initialState,
    reducers: {
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
            state.skip = 0; // Reset pagination
        },
        setStatusFilter: (state, action: PayloadAction<string>) => {
            state.statusFilter = action.payload;
            state.skip = 0;
        },
        setClassFilter: (state, action: PayloadAction<number | null>) => {
            state.classFilter = action.payload;
            state.skip = 0;
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.skip = action.payload * state.limit;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentStudent: (state) => {
            state.currentStudent = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch students
            .addCase(fetchStudents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStudents.fulfilled, (state, action) => {
                state.loading = false;
                state.students = action.payload.students;
                state.total = action.payload.total;
                state.skip = action.payload.skip;
                state.limit = action.payload.limit;
            })
            .addCase(fetchStudents.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch student by ID
            .addCase(fetchStudentById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStudentById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentStudent = action.payload;
            })
            .addCase(fetchStudentById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create student
            .addCase(createStudent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createStudent.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(createStudent.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Update student
            .addCase(updateStudent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateStudent.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateStudent.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Delete student
            .addCase(deleteStudent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteStudent.fulfilled, (state, action) => {
                state.loading = false;
                state.students = state.students.filter(s => s.id !== action.payload);
                state.total -= 1;
            })
            .addCase(deleteStudent.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Bulk import
            .addCase(bulkImportStudents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(bulkImportStudents.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(bulkImportStudents.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Excel import
            .addCase(importStudentsExcel.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(importStudentsExcel.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(importStudentsExcel.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setSearchQuery,
    setStatusFilter,
    setClassFilter,
    setPage,
    clearError,
    clearCurrentStudent,
} = studentsSlice.actions;

export default studentsSlice.reducer;
