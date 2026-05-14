import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check localStorage or sessionStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('timetable_user') || sessionStorage.getItem('timetable_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('timetable_user');
                sessionStorage.removeItem('timetable_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email, password, role, rememberMe = false) => {
        setIsLoading(true);

        try {
            // Call real API
            const data = await api.login(email, password, role);
            
            // Store user data with token
            const userData = {
                ...data.user,
                token: data.access_token,
                remembered: rememberMe // Store preference
            };

            setUser(userData);
            
            // Use storage based on preference
            if (rememberMe) {
                localStorage.setItem('timetable_user', JSON.stringify(userData));
                sessionStorage.removeItem('timetable_user');
            } else {
                sessionStorage.setItem('timetable_user', JSON.stringify(userData));
                localStorage.removeItem('timetable_user');
            }
            
            setIsLoading(false);
            return { success: true };
        } catch (error) {
            setIsLoading(false);
            return { 
                success: false, 
                error: error.message || 'Invalid email, password, or role combination' 
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('timetable_user');
        sessionStorage.removeItem('timetable_user');
    };

    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        
        // Sync with wherever it was stored
        if (user?.remembered) {
            localStorage.setItem('timetable_user', JSON.stringify(updatedUser));
        } else {
            sessionStorage.setItem('timetable_user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
