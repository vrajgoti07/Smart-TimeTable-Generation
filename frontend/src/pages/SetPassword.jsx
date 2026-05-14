import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, Clock, CheckCircle, ArrowLeft, ArrowRight, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useDialog } from '../context/DialogContext';

export default function SetPassword() {
    const { alert } = useDialog();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!token) {
            setError('Security protocol blocked: The invitation token is invalid.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Security mismatch: Both keys must be identical.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Account security requires a minimum of 6 characters.');
            return;
        }

        setIsLoading(true);
        try {
            await api.setPassword(token, formData.password);
            setIsSuccess(true);
            await alert("Your profile has been secured and activated.", "Activation Successful", "success");
            navigate('/login');
        } catch (err) {
            setError(err.message || "Failed to set password. Link may have expired.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
            
            {/* Left Panel - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 sm:px-12 lg:px-24 py-12 relative z-10 bg-white">
                <div className="w-full max-w-md animate-fade-in">
                    
                    {/* Header branding */}
                    <div className="flex flex-col items-center mb-10 text-center lg:items-start lg:text-left">
                        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 mb-6 transition-transform hover:scale-105">
                            <Clock size={28} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Set Account Password</h1>
                        <p className="text-slate-500 mt-2">Initialize your security key to begin scheduling.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Choose Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-sans"
                                        placeholder="Min. 6 characters"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="block w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-sans"
                                        placeholder="Repeat your password"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-pop-in">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || isSuccess}
                            className={`w-full flex items-center justify-center py-4 rounded-xl text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 active:scale-95 ${isSuccess 
                                ? 'bg-emerald-500 shadow-none' 
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20'}`}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                                    Activating...
                                </div>
                            ) : isSuccess ? (
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Secured
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>Finalize Account</span>
                                    <ArrowRight size={18} />
                                </div>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-slate-100 text-center lg:text-left">
                        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-600 transition-all group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Panel - Hero Section (Site Theme: Dark Slate) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center p-16">
                
                {/* Animated Background Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl animate-float" style={{ animationDelay: '0s' }} />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
                </div>

                {/* Grid Pattern Mesh */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                <div className="max-w-md relative z-10 text-white text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-10 backdrop-blur-sm animate-fade-in">
                        <Sparkles className="w-4 h-4 animate-bounce-subtle" />
                        <span>Account Setup</span>
                    </div>

                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-10 backdrop-blur-md border border-white/10 shadow-2xl animate-float">
                        <Clock className="w-12 h-12 text-white" />
                    </div>
                    
                    <h2 className="text-5xl font-black tracking-tighter mb-6 animate-slide-up">
                        SMART <br/> 
                        <span className="text-emerald-400">TIMETABLE</span>
                    </h2>
                    
                    <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-cyan-500 mx-auto rounded-full mb-10 animate-fade-in" />
                    
                    <p className="text-xl text-slate-400 font-medium leading-relaxed mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Welcome to the institution. Set your credentials to access the most advanced scheduling system available.
                    </p>

                    <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Encrypted</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <Zap className="w-6 h-6 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified</div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-0 w-64 h-64 border border-white/5 rounded-full animate-float opacity-30 -translate-x-1/2" />
                <div className="absolute top-0 right-1/4 w-32 h-32 border border-emerald-500/5 rounded-3xl rotate-12 animate-float-slow opacity-20" />
            </div>
        </div>
    );
}
