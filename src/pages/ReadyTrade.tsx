 import React, { useState, useEffect, useMemo } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { 
   Swords, Trophy, TrendingUp, Flame, Crown, 
   Shield, Zap, Star, Target, Medal, Users,
   ChevronRight, Timer, Sparkles, Award
 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { useWallet } from '@/providers/WalletProvider';
 import { useNavigate } from 'react-router-dom';
 import { cn } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
 
 // Types
 interface TraderStats {
   rank: number;
   username: string;
   avatar: string;
   wins: number;
   losses: number;
   winStreak: number;
   totalVolume: number;
   profitPercent: number;
   tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
   isOnline: boolean;
 }
 
 interface BattleMode {
   id: string;
   name: string;
   description: string;
   icon: React.ReactNode;
   minBet: number;
   maxBet: number;
   duration: string;
   playerCount: string;
   color: string;
   gradient: string;
 }
 
 // Tier colors and styling
 const TIER_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
   bronze: { bg: 'bg-amber-900/20', border: 'border-amber-700/50', text: 'text-amber-500', glow: 'shadow-amber-500/20' },
   silver: { bg: 'bg-slate-400/20', border: 'border-slate-400/50', text: 'text-slate-300', glow: 'shadow-slate-400/20' },
   gold: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' },
   platinum: { bg: 'bg-cyan-400/20', border: 'border-cyan-400/50', text: 'text-cyan-300', glow: 'shadow-cyan-400/30' },
   diamond: { bg: 'bg-blue-400/20', border: 'border-blue-400/50', text: 'text-blue-300', glow: 'shadow-blue-400/40' },
   legendary: { bg: 'bg-purple-500/20', border: 'border-purple-400/50', text: 'text-purple-300', glow: 'shadow-purple-500/50' },
 };
 
 // Mock data
 const MOCK_LEADERBOARD: TraderStats[] = [
   { rank: 1, username: 'CryptoKing', avatar: '', wins: 156, losses: 23, winStreak: 12, totalVolume: 45000, profitPercent: 234.5, tier: 'legendary', isOnline: true },
   { rank: 2, username: 'DiamondHands', avatar: '', wins: 134, losses: 31, winStreak: 8, totalVolume: 38000, profitPercent: 189.2, tier: 'diamond', isOnline: true },
   { rank: 3, username: 'WhaleWatch', avatar: '', wins: 121, losses: 28, winStreak: 5, totalVolume: 32000, profitPercent: 156.8, tier: 'diamond', isOnline: false },
   { rank: 4, username: 'MoonShot', avatar: '', wins: 98, losses: 34, winStreak: 3, totalVolume: 25000, profitPercent: 134.5, tier: 'platinum', isOnline: true },
   { rank: 5, username: 'TradeWizard', avatar: '', wins: 87, losses: 41, winStreak: 6, totalVolume: 21000, profitPercent: 112.3, tier: 'platinum', isOnline: false },
   { rank: 6, username: 'BullRunner', avatar: '', wins: 76, losses: 38, winStreak: 2, totalVolume: 18500, profitPercent: 98.7, tier: 'gold', isOnline: true },
   { rank: 7, username: 'SolanaSage', avatar: '', wins: 65, losses: 42, winStreak: 4, totalVolume: 15000, profitPercent: 76.4, tier: 'gold', isOnline: true },
   { rank: 8, username: 'NFTNinja', avatar: '', wins: 54, losses: 45, winStreak: 1, totalVolume: 12000, profitPercent: 54.2, tier: 'silver', isOnline: false },
   { rank: 9, username: 'TokenTrader', avatar: '', wins: 43, losses: 48, winStreak: 0, totalVolume: 9500, profitPercent: 32.1, tier: 'silver', isOnline: true },
   { rank: 10, username: 'CryptoRookie', avatar: '', wins: 32, losses: 52, winStreak: 1, totalVolume: 7000, profitPercent: 15.8, tier: 'bronze', isOnline: false },
 ];
 
 const BATTLE_MODES: BattleMode[] = [
   {
     id: 'duel',
     name: '1v1 Duel',
     description: 'Head-to-head trading battle. First to profit wins!',
     icon: <Swords className="w-8 h-8" />,
     minBet: 0.1,
     maxBet: 10,
     duration: '5 min',
     playerCount: '2',
     color: 'from-red-500 to-orange-500',
     gradient: 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
   },
   {
     id: 'arena',
     name: 'Battle Arena',
     description: 'Free-for-all with up to 10 traders. Top 3 split the pot!',
     icon: <Shield className="w-8 h-8" />,
     minBet: 0.5,
     maxBet: 50,
     duration: '15 min',
     playerCount: '2-10',
     color: 'from-purple-500 to-pink-500',
     gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
   },
   {
     id: 'tournament',
     name: 'Tournament',
     description: 'Bracket-style elimination. Champion takes all!',
     icon: <Trophy className="w-8 h-8" />,
     minBet: 1,
     maxBet: 100,
     duration: '1 hour',
     playerCount: '8-32',
     color: 'from-yellow-500 to-amber-500',
     gradient: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20',
   },
   {
     id: 'blitz',
     name: 'Blitz Mode',
     description: 'Ultra-fast 60-second trades. Pure instinct!',
     icon: <Zap className="w-8 h-8" />,
     minBet: 0.05,
     maxBet: 5,
     duration: '60 sec',
     playerCount: '2-4',
     color: 'from-cyan-500 to-blue-500',
     gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
   },
 ];
 
 // Components
 const AnimatedBackground = () => (
   <div className="fixed inset-0 overflow-hidden pointer-events-none">
     <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
     {[...Array(20)].map((_, i) => (
       <motion.div
         key={i}
         className="absolute w-2 h-2 rounded-full bg-primary/20"
         initial={{ 
           x: Math.random() * window.innerWidth,
           y: Math.random() * window.innerHeight,
           scale: Math.random() * 0.5 + 0.5,
         }}
         animate={{
           y: [null, Math.random() * -200 - 100],
           opacity: [0.3, 0.8, 0],
         }}
         transition={{
           duration: Math.random() * 3 + 2,
           repeat: Infinity,
           ease: "easeOut",
           delay: Math.random() * 2,
         }}
       />
     ))}
   </div>
 );
 
 const HeroSection = () => {
   const [countdown, setCountdown] = useState({ hours: 2, minutes: 34, seconds: 56 });
 
   useEffect(() => {
     const timer = setInterval(() => {
       setCountdown(prev => {
         let { hours, minutes, seconds } = prev;
         seconds--;
         if (seconds < 0) { seconds = 59; minutes--; }
         if (minutes < 0) { minutes = 59; hours--; }
         if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
         return { hours, minutes, seconds };
       });
     }, 1000);
     return () => clearInterval(timer);
   }, []);
 
   return (
     <motion.div 
       className="relative text-center py-16 px-4"
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.6 }}
     >
       {/* Main Title */}
       <motion.div
         className="relative inline-block mb-6"
         animate={{ 
           textShadow: [
             "0 0 20px hsl(var(--primary) / 0.5)",
             "0 0 40px hsl(var(--primary) / 0.8)",
             "0 0 20px hsl(var(--primary) / 0.5)",
           ]
         }}
         transition={{ duration: 2, repeat: Infinity }}
       >
         <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient">
             READY
           </span>
           <br />
           <span className="text-foreground">TRADE</span>
         </h1>
         <motion.div
           className="absolute -top-4 -right-4"
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
         >
           <Sparkles className="w-8 h-8 text-primary" />
         </motion.div>
       </motion.div>
 
       <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
         Enter the arena. Battle traders. Claim glory.
         <br />
         <span className="text-primary font-semibold">Real trades. Real stakes. Real champions.</span>
       </p>
 
       {/* Next Tournament Countdown */}
       <motion.div 
         className="inline-flex items-center gap-4 bg-card/50 backdrop-blur-sm border border-primary/20 rounded-2xl px-8 py-4"
         whileHover={{ scale: 1.02, borderColor: 'hsl(var(--primary) / 0.5)' }}
       >
         <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
         <div className="text-left">
           <p className="text-sm text-muted-foreground">Next Grand Tournament</p>
           <div className="flex items-center gap-2 font-mono text-2xl font-bold">
             <span className="text-primary">{String(countdown.hours).padStart(2, '0')}</span>
             <span className="text-muted-foreground">:</span>
             <span className="text-primary">{String(countdown.minutes).padStart(2, '0')}</span>
             <span className="text-muted-foreground">:</span>
             <span className="text-primary">{String(countdown.seconds).padStart(2, '0')}</span>
           </div>
         </div>
         <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50">
           500 SOL Prize Pool
         </Badge>
       </motion.div>
     </motion.div>
   );
 };
 
 const BattleModeCard = ({ mode, onSelect }: { mode: BattleMode; onSelect: () => void }) => (
   <motion.div
     whileHover={{ scale: 1.03, y: -5 }}
     whileTap={{ scale: 0.98 }}
     className="group cursor-pointer"
     onClick={onSelect}
   >
     <Card className={cn(
       "relative overflow-hidden border-2 transition-all duration-300",
       "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
       mode.gradient
     )}>
       <div className={cn(
         "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
         `bg-gradient-to-r ${mode.color} blur-3xl`
       )} />
       
       <CardContent className="relative p-6">
         <div className={cn(
           "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
           `bg-gradient-to-br ${mode.color} text-white`
         )}>
           {mode.icon}
         </div>
         
         <h3 className="text-xl font-bold mb-2">{mode.name}</h3>
         <p className="text-sm text-muted-foreground mb-4">{mode.description}</p>
         
         <div className="grid grid-cols-3 gap-2 text-xs">
           <div className="bg-background/50 rounded-lg p-2 text-center">
             <p className="text-muted-foreground">Duration</p>
             <p className="font-semibold text-foreground">{mode.duration}</p>
           </div>
           <div className="bg-background/50 rounded-lg p-2 text-center">
             <p className="text-muted-foreground">Players</p>
             <p className="font-semibold text-foreground">{mode.playerCount}</p>
           </div>
           <div className="bg-background/50 rounded-lg p-2 text-center">
             <p className="text-muted-foreground">Min Bet</p>
             <p className="font-semibold text-foreground">{mode.minBet} SOL</p>
           </div>
         </div>
         
         <Button 
           className={cn(
             "w-full mt-4 font-bold",
             `bg-gradient-to-r ${mode.color} hover:opacity-90`
           )}
         >
           Enter Battle
           <ChevronRight className="w-4 h-4 ml-2" />
         </Button>
       </CardContent>
     </Card>
   </motion.div>
 );
 
 const LeaderboardRow = ({ trader, index }: { trader: TraderStats; index: number }) => {
   const tierStyle = TIER_STYLES[trader.tier];
   const isTop3 = trader.rank <= 3;
   
   return (
     <motion.div
       initial={{ opacity: 0, x: -20 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ delay: index * 0.05 }}
       className={cn(
         "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
         "hover:bg-card/80 hover:shadow-lg group",
         isTop3 && "bg-gradient-to-r from-primary/5 to-transparent"
       )}
     >
       {/* Rank */}
       <div className={cn(
         "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl",
         trader.rank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-600 text-black",
         trader.rank === 2 && "bg-gradient-to-br from-slate-300 to-slate-500 text-black",
         trader.rank === 3 && "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
         trader.rank > 3 && "bg-muted text-muted-foreground"
       )}>
         {trader.rank === 1 ? <Crown className="w-6 h-6" /> : `#${trader.rank}`}
       </div>
 
       {/* Avatar & Name */}
       <div className="flex items-center gap-3 flex-1 min-w-0">
         <div className="relative">
           <Avatar className="w-12 h-12 border-2 border-border">
             <AvatarImage src={trader.avatar} />
             <AvatarFallback className={cn(tierStyle.bg, tierStyle.text)}>
               {trader.username.slice(0, 2).toUpperCase()}
             </AvatarFallback>
           </Avatar>
           {trader.isOnline && (
             <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
           )}
         </div>
         <div className="min-w-0">
           <p className="font-bold truncate">{trader.username}</p>
           <Badge 
             variant="outline" 
             className={cn("text-xs capitalize", tierStyle.bg, tierStyle.border, tierStyle.text)}
           >
             {trader.tier}
           </Badge>
         </div>
       </div>
 
       {/* Stats */}
       <div className="hidden md:flex items-center gap-6 text-sm">
         <div className="text-center">
           <p className="text-muted-foreground text-xs">W/L</p>
           <p className="font-semibold">
             <span className="text-green-500">{trader.wins}</span>
             <span className="text-muted-foreground">/</span>
             <span className="text-red-500">{trader.losses}</span>
           </p>
         </div>
         <div className="text-center">
           <p className="text-muted-foreground text-xs">Win Rate</p>
           <p className="font-semibold">{((trader.wins / (trader.wins + trader.losses)) * 100).toFixed(1)}%</p>
         </div>
         <div className="text-center">
           <p className="text-muted-foreground text-xs">Streak</p>
           <p className="font-semibold flex items-center gap-1">
             {trader.winStreak > 0 && <Flame className="w-3 h-3 text-orange-500" />}
             {trader.winStreak}
           </p>
         </div>
         <div className="text-center">
           <p className="text-muted-foreground text-xs">Volume</p>
           <p className="font-semibold">{(trader.totalVolume / 1000).toFixed(1)}K</p>
         </div>
       </div>
 
       {/* Profit */}
       <div className="text-right">
         <p className="text-xs text-muted-foreground">Profit</p>
         <p className={cn(
           "font-bold text-lg",
           trader.profitPercent > 0 ? "text-green-500" : "text-red-500"
         )}>
           +{trader.profitPercent.toFixed(1)}%
         </p>
       </div>
 
       {/* Challenge Button */}
       <Button 
         variant="outline" 
         size="sm"
         className="opacity-0 group-hover:opacity-100 transition-opacity"
       >
         <Swords className="w-4 h-4 mr-1" />
         Challenge
       </Button>
     </motion.div>
   );
 };
 
 const StatsPanel = () => {
   const stats = [
     { label: 'Active Battles', value: '247', icon: Swords, color: 'text-red-500' },
     { label: 'Traders Online', value: '1,892', icon: Users, color: 'text-green-500' },
     { label: 'Total Volume (24h)', value: '45.2K SOL', icon: TrendingUp, color: 'text-blue-500' },
     { label: 'Biggest Win Today', value: '+892%', icon: Trophy, color: 'text-yellow-500' },
   ];
 
   return (
     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
       {stats.map((stat, i) => (
         <motion.div
           key={stat.label}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: i * 0.1 }}
         >
           <Card className="relative overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                   <stat.icon className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{stat.value}</p>
                   <p className="text-xs text-muted-foreground">{stat.label}</p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </motion.div>
       ))}
     </div>
   );
 };
 
 const YourRankCard = () => {
   const { isConnected, address } = useWallet();
   
   if (!isConnected) {
     return (
       <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
         <CardContent className="flex flex-col items-center justify-center py-12">
           <Shield className="w-16 h-16 text-primary/50 mb-4" />
           <h3 className="text-xl font-bold mb-2">Join the Battle</h3>
           <p className="text-muted-foreground text-center mb-4">
             Connect your wallet to start trading and climb the ranks!
           </p>
           <Button className="bg-gradient-to-r from-primary to-accent">
             Connect Wallet
           </Button>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Medal className="w-5 h-5 text-primary" />
           Your Battle Stats
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-sm text-muted-foreground">Current Rank</p>
             <p className="text-3xl font-black text-primary">#42</p>
           </div>
           <div>
             <p className="text-sm text-muted-foreground">Tier</p>
             <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
               Platinum
             </Badge>
           </div>
           <div>
             <p className="text-sm text-muted-foreground">Win Rate</p>
             <p className="text-xl font-bold">67.3%</p>
           </div>
           <div>
             <p className="text-sm text-muted-foreground">Total Battles</p>
             <p className="text-xl font-bold">156</p>
           </div>
         </div>
         
         <div className="mt-4">
           <div className="flex justify-between text-sm mb-1">
             <span className="text-muted-foreground">Progress to Diamond</span>
             <span className="text-primary font-semibold">2,340 / 5,000 XP</span>
           </div>
           <Progress value={46.8} className="h-2" />
         </div>
       </CardContent>
     </Card>
   );
 };
 
 // Main Component
 const ReadyTrade = () => {
   const navigate = useNavigate();
   const [selectedTab, setSelectedTab] = useState('leaderboard');
 
   return (
     <div className="min-h-screen bg-background relative">
      <Navbar />
       <AnimatedBackground />
       
       <div className="relative z-10 container mx-auto px-4 py-8">
         <HeroSection />
         
         <StatsPanel />
 
         {/* Battle Modes */}
         <motion.section 
           className="mb-12"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
         >
           <div className="flex items-center gap-3 mb-6">
             <Target className="w-6 h-6 text-primary" />
             <h2 className="text-2xl font-bold">Choose Your Battle</h2>
           </div>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
             {BATTLE_MODES.map((mode) => (
               <BattleModeCard 
                 key={mode.id} 
                 mode={mode}
                 onSelect={() => console.log('Selected:', mode.id)}
               />
             ))}
           </div>
         </motion.section>
 
         {/* Leaderboard & Stats */}
         <div className="grid lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
             <Card className="border-border/50">
               <CardHeader className="border-b border-border/50">
                 <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2">
                     <Trophy className="w-5 h-5 text-yellow-500" />
                     Leaderboard
                   </CardTitle>
                   <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                     <TabsList className="bg-muted/50">
                       <TabsTrigger value="leaderboard">All Time</TabsTrigger>
                       <TabsTrigger value="weekly">Weekly</TabsTrigger>
                       <TabsTrigger value="daily">Daily</TabsTrigger>
                     </TabsList>
                   </Tabs>
                 </div>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="divide-y divide-border/30">
                   {MOCK_LEADERBOARD.map((trader, index) => (
                     <LeaderboardRow key={trader.rank} trader={trader} index={index} />
                   ))}
                 </div>
                 
                 <div className="p-4 border-t border-border/50">
                   <Button variant="outline" className="w-full">
                     View Full Leaderboard
                     <ChevronRight className="w-4 h-4 ml-2" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           </div>
 
           <div className="space-y-6">
             <YourRankCard />
             
             {/* Live Battles */}
             <Card className="border-border/50">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                   Live Battles
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {[1, 2, 3].map((i) => (
                   <motion.div
                     key={i}
                     className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                     whileHover={{ scale: 1.02 }}
                   >
                     <div className="flex justify-between items-center mb-2">
                       <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/50">
                         LIVE
                       </Badge>
                       <span className="text-xs text-muted-foreground">2:34 left</span>
                     </div>
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Avatar className="w-6 h-6">
                           <AvatarFallback className="text-xs">CK</AvatarFallback>
                         </Avatar>
                         <span className="text-sm font-medium">CryptoKing</span>
                       </div>
                       <span className="text-sm font-bold">VS</span>
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-medium">WhaleWatch</span>
                         <Avatar className="w-6 h-6">
                           <AvatarFallback className="text-xs">WW</AvatarFallback>
                         </Avatar>
                       </div>
                     </div>
                     <div className="mt-2 text-center">
                       <Badge className="bg-primary/20 text-primary border-primary/30">
                         5 SOL pot
                       </Badge>
                     </div>
                   </motion.div>
                 ))}
                 
                 <Button variant="ghost" className="w-full text-primary">
                   Watch All Battles
                   <ChevronRight className="w-4 h-4 ml-1" />
                 </Button>
               </CardContent>
             </Card>
 
             {/* Rewards */}
             <Card className="border-border/50 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Award className="w-5 h-5 text-yellow-500" />
                   Season Rewards
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-center">
                   <p className="text-sm text-muted-foreground mb-2">Season 1 Prize Pool</p>
                   <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                     10,000 SOL
                   </p>
                   <p className="text-sm text-muted-foreground mt-2">23 days remaining</p>
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 export default ReadyTrade;