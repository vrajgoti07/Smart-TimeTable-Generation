// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        SET_PASSWORD: '/auth/set-password',
        CHANGE_PASSWORD: '/auth/change-password',
        DELETE_ACCOUNT: '/auth/me',
    },
    ADMIN: {
        DASHBOARD: '/admin/dashboard-data',
        CREATE_USER: '/admin/create-user',
    },
    FACULTY: {
        DASHBOARD: '/faculty/dashboard-data',
        DOWNLOAD_TIMETABLE: '/faculty/download-timetable-pdf',
    },
    STUDENT: {
        DASHBOARD: '/student/dashboard-data',
        DOWNLOAD_TIMETABLE: '/student/download-timetable-pdf',
        UPDATE_PROFILE: '/student/update-profile',
    },
    TIMETABLE: {
        LIST: '/timetable',
        CREATE: '/timetable',
    },
};
