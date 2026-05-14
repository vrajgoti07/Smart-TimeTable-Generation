import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Clock, Shield, CheckCircle, Zap, Users, Sparkles, UserCog, GraduationCap, LayoutDashboard, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Admin'); // Default role
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setIsSuccess(false);

        try {
            // Call login from context
            const result = await login(email, password, role, rememberMe);

            if (result.success) {
                setIsSuccess(true);
                // Wait for animation then redirect
                setTimeout(() => {
                    navigate('/dashboard'); // Navigate to protected route
                }, 1000);
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        { icon: Zap, text: 'AI-Powered Scheduling' },
        { icon: Shield, text: 'Conflict Detection' },
        { icon: Users, text: 'Multi-User Support' },
    ];

    const roles = [
        { id: 'Admin', icon: UserCog, label: 'Admin' },
        { id: 'Faculty', icon: LayoutDashboard, label: 'Faculty' },
        { id: 'Student', icon: GraduationCap, label: 'Student' },
    ];

    return (
        <div className="min-h-screen w-full flex bg-slate-50 font-sans overflow-hidden relative">
            {/* Aurora Mesh Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary emerald orb */}
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.08] animate-aurora-1"
                    style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
                {/* Cyan accent orb */}
                <div className="absolute -bottom-40 -right-20 w-[450px] h-[450px] rounded-full opacity-[0.06] animate-aurora-2"
                    style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
                {/* Teal mid orb */}
                <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] rounded-full opacity-[0.05] animate-aurora-3"
                    style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />
                {/* Subtle dot grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }} />
            </div>

            {/* Left Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 lg:px-24 py-12 relative z-10">

                {/* Glassmorphism Card Container */}
                <div className="w-full max-w-md bg-white border border-transparent shadow-2xl shadow-slate-200/50 rounded-3xl p-8 sm:p-10 animate-scale-in">
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-glow-pulse mb-4">
                            <Clock className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-slate-900 tracking-tight block">Smart Timetable</span>
                            <span className="text-sm text-emerald-600 font-semibold tracking-wide uppercase mt-1 block">Intelligent Scheduling System</span>
                        </div>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                        <p className="text-slate-500">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Role Selector - Interactive Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up stagger-1">
                            {roles.map((r) => {
                                const Icon = r.icon;
                                const isSelected = role === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRole(r.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 active:scale-95 ${isSelected
                                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm transform scale-105 animate-pop-in'
                                            : 'border-slate-100 bg-white text-slate-500 hover:border-emerald-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon size={20} className={`mb-1.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <span className="text-xs font-bold">{r.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-4 animate-slide-up stagger-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-white/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm group-hover:bg-white"
                                    placeholder="Email address"
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-4 bg-white/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm group-hover:bg-white"
                                    placeholder="Password"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 animate-fade-in">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm animate-slide-up stagger-3">
                            <label className="flex items-center text-slate-600 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mr-2 transition-all cursor-pointer" 
                                />
                                <span className="group-hover:text-emerald-600 transition-colors">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">Forgot password?</Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isSuccess}
                            className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 relative overflow-hidden animate-slide-up stagger-4 ${isSuccess
                                ? 'bg-emerald-500 shadow-emerald-500/40 cursor-default'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30'
                                }`}
                        >
                            {/* Shimmer Overlay */}
                            {!isSuccess && !isLoading && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
                            )}

                            {isLoading ? (
                                <div className="flex items-center relative z-10">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Validating...
                                </div>
                            ) : isSuccess ? (
                                <div className="flex items-center animate-scale-in relative z-10">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Success! Redirecting...
                                </div>
                            ) : (
                                <div className="flex items-center relative z-10">
                                    <Sparkles className="w-5 h-5 mr-2 group-hover:animate-bounce-subtle" />
                                    Sign In
                                </div>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Panel - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center p-12">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl animate-float" style={{ animationDelay: '0s' }} />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
                    <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
                </div>

                {/* Floating cards decoration */}
                <div className="absolute top-1/4 right-1/4 w-24 h-24 border border-white/10 rounded-2xl transform rotate-12 backdrop-blur-sm bg-white/5 animate-float" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-1/4 left-1/4 w-32 h-32 border border-white/10 rounded-3xl transform -rotate-6 backdrop-blur-md bg-white/5 animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/3 left-1/3 w-20 h-20 border border-emerald-500/20 rounded-xl transform rotate-45 animate-float" style={{ animationDelay: '1s' }} />

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }} />

                <div className="max-w-md relative z-10 text-white">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-sm animate-fade-in">
                        <Sparkles className="w-4 h-4 animate-bounce-subtle" />
                        <span>Smart Scheduling</span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-300">
                            Manage your academic schedule
                        </span>
                        <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                            effortlessly
                        </span>
                    </h2>

                    <p className="text-lg text-slate-400 mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Intelligent timetable generation with conflict detection, room allocation, and real-time updates.
                    </p>

                    {/* Feature list with animated checkmarks */}
                    <div className="space-y-4 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <div key={index} className="flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all duration-300">
                                        <Icon className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-300 font-medium group-hover:text-white transition-colors">{feature.text}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover-lift">
                            <div className="text-3xl font-bold text-emerald-400 mb-1">500+</div>
                            <div className="text-sm text-slate-400">Gen Schedules</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover-lift">
                            <div className="text-3xl font-bold text-cyan-400 mb-1">99%</div>
                            <div className="text-sm text-slate-400">Conflict Free</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
