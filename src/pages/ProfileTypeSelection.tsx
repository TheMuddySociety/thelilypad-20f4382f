import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ShoppingBag, Rocket, Radio, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/providers/AuthProvider';
import { useSEO } from '@/hooks/useSEO';
import { LilyPadLogo } from '@/components/LilyPadLogo';

interface RoleOption {
    id: string;
    title: string;
    description: string;
    icon: typeof ShoppingBag;
    roles: {
        isCollector: boolean;
        isCreator: boolean;
        isStreamer: boolean;
    };
    gradient: string;
}

const roleOptions: RoleOption[] = [
    {
        id: 'collector',
        title: 'Collector',
        description: 'Buy, trade, and showcase NFTs from your favorite creators',
        icon: ShoppingBag,
        roles: { isCollector: true, isCreator: false, isStreamer: false },
        gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
        id: 'creator',
        title: 'Creator',
        description: 'Launch your own NFT collections and sell digital art',
        icon: Rocket,
        roles: { isCollector: false, isCreator: true, isStreamer: false },
        gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
        id: 'streamer',
        title: 'Streamer',
        description: 'Stream live content and engage with your community',
        icon: Radio,
        roles: { isCollector: false, isCreator: false, isStreamer: true },
        gradient: 'from-red-500/20 to-orange-500/20'
    },
    {
        id: 'collector-creator',
        title: 'Collector + Creator',
        description: 'Collect NFTs and create your own collections',
        icon: Sparkles,
        roles: { isCollector: true, isCreator: true, isStreamer: false },
        gradient: 'from-indigo-500/20 to-purple-500/20'
    },
    {
        id: 'creator-streamer',
        title: 'Creator + Streamer',
        description: 'Launch collections, stream, and build your brand',
        icon: Sparkles,
        roles: { isCollector: false, isCreator: true, isStreamer: true },
        gradient: 'from-pink-500/20 to-red-500/20'
    },
    {
        id: 'all',
        title: 'All Above',
        description: 'Full access to collect, create, and stream',
        icon: Sparkles,
        roles: { isCollector: true, isCreator: true, isStreamer: true },
        gradient: 'from-primary/20 to-accent/20'
    }
];

export default function ProfileTypeSelection() {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { createProfile } = useUserProfile();
    const { state: authState } = useAuth();

    // Navigate to home once AuthProvider confirms the profile is set up.
    // Do NOT navigate from handleSubmit — the state machine needs to tick first.
    useEffect(() => {
        if (authState === 'AUTHENTICATED') {
            navigate('/', { replace: true });
        }
    }, [authState, navigate]);

    useSEO({
        title: 'Welcome to The Lily Pad - Set Up Your Profile',
        description: 'Choose your role and get started on The Lily Pad'
    });

    const selectedOption = roleOptions.find(opt => opt.id === selectedRole);
    const isCreatorRole = selectedOption?.roles.isCreator ?? false;

    const handleSubmit = async () => {
        if (!selectedRole) {
            toast.error('Please select a profile type');
            return;
        }

        const option = roleOptions.find(opt => opt.id === selectedRole);
        if (!option) return;

        setIsSubmitting(true);

        try {
            await createProfile(option.roles, displayName);

            toast.success('Profile created successfully!', {
                description: 'Welcome to The Lily Pad'
            });

            // If the selected role includes Creator, redirect to Creator Beta application
            if (option.roles.isCreator) {
                navigate('/creator/apply', { replace: true });
                return;
            }

            // Navigation is handled by the authState useEffect above.
            // AuthProvider will detect profile_setup_completed=true and
            // transition NEEDS_PROFILE → AUTHENTICATED, which triggers navigate('/').
        } catch (error: any) {
            console.error('Error creating profile:', error);
            toast.error('Failed to create profile', {
                description: error.message || 'Please try again'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Animated background */}
            <div className="absolute inset-0 bg-hero-gradient" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-1000" />

            <div className="relative z-10 w-full max-w-4xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex justify-center mb-6">
                        <LilyPadLogo size={80} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Welcome to <span className="text-primary">The Lily Pad</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Choose your role to get started. You can always change this later.
                    </p>
                </motion.div>

                {/* Display Name Input */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 max-w-sm mx-auto"
                >
                    <Label htmlFor="display-name" className="block text-sm font-medium mb-2 text-center">
                        What should we call you? <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="display-name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name or alias..."
                            className="pl-9"
                            maxLength={30}
                        />
                    </div>
                </motion.div>

                {/* Role Selection Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {roleOptions.map((option, index) => {
                        const Icon = option.icon;
                        const isSelected = selectedRole === option.id;

                        return (
                            <motion.div
                                key={option.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 ${isSelected
                                        ? 'ring-2 ring-primary shadow-lg shadow-primary/30'
                                        : 'hover:ring-1 hover:ring-primary/50'
                                        }`}
                                    onClick={() => setSelectedRole(option.id)}
                                >
                                    <CardContent className="p-6">
                                        {/* Background gradient */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} rounded-lg opacity-50`} />

                                        {/* Content */}
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                    >
                                                        <CheckCircle2 className="w-6 h-6 text-primary" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
                                            <p className="text-sm text-muted-foreground">{option.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Continue Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-center"
                >
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!selectedRole || isSubmitting}
                        className="gap-2 px-12"
                    >
                        {isSubmitting ? 'Creating Profile...' : isCreatorRole ? 'Continue to Creator Application' : 'Continue'}
                    </Button>
                </motion.div>

                {/* Helper Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-sm text-muted-foreground mt-6"
                >
                    Don't worry! You can change or add more roles anytime in your profile settings.
                </motion.p>
            </div>
        </div>
    );
}
