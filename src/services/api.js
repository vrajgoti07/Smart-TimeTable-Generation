import { API_CONFIG, API_ENDPOINTS } from '../config/api';

const API_URL = API_CONFIG.BASE_URL;

const getAuthHeaders = () => {
    // Check both potential storage locations
    const storedUser = localStorage.getItem('timetable_user') || sessionStorage.getItem('timetable_user');
    const user = JSON.parse(storedUser || '{}');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token || ''}`
    };
};

export const api = {
    // Authentication
    login: async (email, password, role) => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, role })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        return response.json();
    },

    setPassword: async (token, password) => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.SET_PASSWORD}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to set password');
        }

        return response.json();
    },

    forgotPassword: async (email, role) => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, role })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send reset link');
        }

        return response.json();
    },

    resetPassword: async (token, password) => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reset password');
        }

        return response.json();
    },

    changePassword: async (currentPassword, newPassword, confirmPassword) => {
        const response = await fetch(`${API_URL}/users/change-password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to change password');
        }

        return response.json();
    },

    deleteAccount: async (password) => {
        const response = await fetch(`${API_URL}/users/delete-account`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete account');
        }

        return response.json();
    },

    // Admin endpoints
    getAdminDashboard: async () => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.ADMIN.DASHBOARD}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch admin dashboard');
        }

        return response.json();
    },

    getMetricsHistory: async (limit = 60) => {
        const response = await fetch(`${API_URL}/admin/metrics-history?limit=${limit}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metrics history');
        }

        return response.json();
    },

    getActivities: async (limit = 50) => {
        const response = await fetch(`${API_URL}/admin/activities?limit=${limit}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch activities');
        }

        return response.json();
    },

    // Faculty endpoints
    getAllFaculty: async () => {
        const response = await fetch(`${API_URL}/faculty`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch faculty');
        }

        return response.json();
    },

    updateFaculty: async (id, data) => {
        const response = await fetch(`${API_URL}/faculty/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update faculty');
        }

        return response.json();
    },

    updateMyAvailability: async (availability) => {
        const response = await fetch(`${API_URL}/faculty/me/availability`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ availability })
        });

        if (!response.ok) {
            throw new Error('Failed to update availability');
        }

        return response.json();
    },

    getFacultyDashboard: async () => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.FACULTY.DASHBOARD}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch faculty dashboard');
        }

        return response.json();
    },

    downloadFacultyTimetablePDF: async () => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.FACULTY.DOWNLOAD_TIMETABLE}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'faculty_timetable.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    // Student endpoints
    getStudentDashboard: async () => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STUDENT.DASHBOARD}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch student dashboard');
        }

        return response.json();
    },

    downloadStudentTimetablePDF: async () => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STUDENT.DOWNLOAD_TIMETABLE}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    // Courses endpoints
    getAllCourses: async () => {
        const response = await fetch(`${API_URL}/courses`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch courses');
        }

        return response.json();
    },

    createCourse: async (data) => {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const detail = err.detail;
            const msg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
                    : 'Failed to create course';
            throw new Error(msg);
        }

        return response.json();
    },

    updateCourse: async (id, data) => {
        const response = await fetch(`${API_URL}/courses/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const detail = err.detail;
            const msg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
                    : 'Failed to update course';
            throw new Error(msg);
        }

        return response.json();
    },

    deleteCourse: async (id) => {
        const response = await fetch(`${API_URL}/courses/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete course');
        }

        return response.json();
    },

    autoAssignCourses: async () => {
        const response = await fetch(`${API_URL}/courses/auto-assign`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to auto-assign faculty');
        }

        return response.json();
    },

    // Room endpoints
    getAllRooms: async () => {
        const response = await fetch(`${API_URL}/rooms`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch rooms');
        return response.json();
    },

    createRoom: async (data) => {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const detail = err.detail;
            const msg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
                    : 'Failed to create room';
            throw new Error(msg);
        }
        return response.json();
    },

    updateRoom: async (id, data) => {
        const response = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const detail = err.detail;
            const msg = typeof detail === 'string' ? detail
                : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ')
                    : 'Failed to update room';
            throw new Error(msg);
        }
        return response.json();
    },

    deleteRoom: async (id) => {
        const response = await fetch(`${API_URL}/rooms/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete room');
        return response.json();
    },

    // Academic endpoints
    getDepartments: async () => {
        const response = await fetch(`${API_URL}/academic/departments`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }

        return response.json();
    },

    // Timetable endpoints
    getTimetable: async (departmentId = null, semester = null, section = null) => {
        let url = `${API_URL}${API_ENDPOINTS.TIMETABLE.LIST}`;
        const params = new URLSearchParams();
        if (departmentId && departmentId !== 'All') params.append('department_id', departmentId);
        if (semester && semester !== 'All') params.append('semester', semester);
        if (section && section !== 'All') params.append('section', section);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch timetable');
        }

        return response.json();
    },

    generateTimetable: async (departmentId = null, semester = null, section = null, constraints = null) => {
        const url = `${API_URL}${API_ENDPOINTS.TIMETABLE.LIST}/generate`;
        
        const body = {
            department_id: departmentId !== 'All' ? departmentId : null,
            branch: departmentId !== 'All' ? departmentId : null,
            semester: semester !== 'All' ? (typeof semester === 'string' ? parseInt(semester) : semester) : null,
            section: section !== 'All' ? section : null,
            constraints: constraints
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to generate timetable');
        }
        return response.json();
    },

    downloadAdminTimetablePDF: async (departmentId = null, semester = null, section = null) => {
        let url = `${API_URL}${API_ENDPOINTS.TIMETABLE.LIST}/download-pdf`;
        const params = new URLSearchParams();
        if (departmentId && departmentId !== 'All') params.append('department_id', departmentId);
        if (semester && semester !== 'All') params.append('semester', semester);
        if (section && section !== 'All') params.append('section', section);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }

        const blob = await response.blob();
        
        // Use filename from Content-Disposition header if available
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'timetable.pdf';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    },

    downloadAdminTimetableCSV: async (departmentId = null, semester = null, section = null) => {
        let url = `${API_URL}${API_ENDPOINTS.TIMETABLE.LIST}/download-csv`;
        const params = new URLSearchParams();
        if (departmentId && departmentId !== 'All') params.append('department_id', departmentId);
        if (semester && semester !== 'All') params.append('semester', semester);
        if (section && section !== 'All') params.append('section', section);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to download CSV');
        }

        const blob = await response.blob();
        
        // Use filename from Content-Disposition header if available
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'timetable.csv';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    },

    createTimetableEntry: async (entry) => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.TIMETABLE.CREATE}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(entry)
        });

        if (!response.ok) {
            throw new Error('Failed to create timetable entry');
        }

        return response.json();
    },

    // User management endpoints
    getAllUsers: async () => {
        const response = await fetch(`${API_URL}/users`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        return response.json();
    },

    createUser: async (userData) => {
        try {
            const response = await fetch(`${API_URL}${API_ENDPOINTS.ADMIN.CREATE_USER}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                let errorMessage = 'Failed to create user';
                try {
                    const error = await response.json();
                    if (error.detail && Array.isArray(error.detail)) {
                        errorMessage = error.detail.map(err => err.msg).join(', ');
                    } else {
                        errorMessage = error.detail || error.message || JSON.stringify(error);
                    }
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
    },

    updateUser: async (userId, userData) => {
        try {
            const response = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                let errorMessage = 'Failed to update user';
                try {
                    const error = await response.json();
                    if (error.detail && Array.isArray(error.detail)) {
                        errorMessage = error.detail.map(err => err.msg).join(', ');
                    } else {
                        errorMessage = error.detail || error.message || JSON.stringify(error);
                    }
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
    },

    deleteUser: async (userId) => {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        return response.json();
    },

    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const user = JSON.parse(localStorage.getItem('timetable_user') || '{}');
        const response = await fetch(`${API_URL}/users/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.token || ''}`
                // Note: Don't set Content-Type, browser will set it with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to upload avatar');
        }

        return response.json();
    },

    deleteAvatar: async () => {
        const response = await fetch(`${API_URL}/users/avatar`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to remove avatar');
        }

        return response.json();
    },

    updateStudentProfile: async (profileData) => {
        const response = await fetch(`${API_URL}${API_ENDPOINTS.STUDENT.UPDATE_PROFILE}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update profile');
        }

        return response.json();
    },

    // Notifications
    getNotifications: async () => {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return response.json();
    },

    getUnreadCount: async () => {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch unread count');
        return response.json();
    },

    markNotificationAsRead: async (id) => {
        const response = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to mark notification as read');
        return response.json();
    },

    markAllNotificationsAsRead: async () => {
        const response = await fetch(`${API_URL}/notifications/read-all`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to mark all notifications as read');
        return response.json();
    }
};
