import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  LogOut, 
  Save, 
  Camera,
  Twitter,
  MessageCircle,
  Youtube,
  Loader2,
  Settings as SettingsIcon,
  Wallet,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  Trash2,
  QrCode,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { z } from "zod";

const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialDiscord, setSocialDiscord] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [totpSecret, setTotpSecret] = useState<{ id: string; uri: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolling2FA, setIsEnrolling2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isUnenrolling2FA, setIsUnenrolling2FA] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from("streamer_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Query MFA factors
  const { data: mfaFactors, isLoading: mfaLoading, refetch: refetchMFA } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setPayoutWallet(profile.payout_wallet_address || "");
      setSocialTwitter(profile.social_twitter || "");
      setSocialDiscord(profile.social_discord || "");
      setSocialYoutube(profile.social_youtube || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Load notification preferences from localStorage
  useEffect(() => {
    const soundPref = localStorage.getItem("notification_sound_enabled");
    if (soundPref !== null) {
      setSoundNotifications(soundPref === "true");
    }
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");

      const profileData = {
        user_id: session.user.id,
        display_name: displayName || null,
        bio: bio || null,
        payout_wallet_address: payoutWallet || null,
        social_twitter: socialTwitter || null,
        social_discord: socialDiscord || null,
        social_youtube: socialYoutube || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("streamer_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handlePasswordChange = async () => {
    // Validate password
    const result = passwordSchema.safeParse({ newPassword, confirmPassword });
    
    if (!result.success) {
      const errors: { newPassword?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "newPassword") {
          errors.newPassword = err.message;
        } else if (err.path[0] === "confirmPassword") {
          errors.confirmPassword = err.message;
        }
      });
      setPasswordErrors(errors);
      return;
    }
    
    setPasswordErrors({});
    setIsChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Failed to change password: " + error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  // 2FA handlers
  const handleStart2FAEnrollment = async () => {
    setIsEnrolling2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });
      
      if (error) throw error;
      
      setTotpSecret({
        id: data.id,
        uri: data.totp.uri,
        secret: data.totp.secret,
      });
      setShow2FADialog(true);
    } catch (error: any) {
      toast.error("Failed to start 2FA setup: " + error.message);
    } finally {
      setIsEnrolling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpSecret || verifyCode.length !== 6) return;
    
    setIsVerifying2FA(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpSecret.id,
      });
      
      if (challengeError) throw challengeError;
      
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpSecret.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      
      if (verifyError) throw verifyError;
      
      toast.success("Two-factor authentication enabled!");
      setShow2FADialog(false);
      setTotpSecret(null);
      setVerifyCode("");
      refetchMFA();
    } catch (error: any) {
      toast.error("Invalid verification code: " + error.message);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleUnenroll2FA = async (factorId: string) => {
    setIsUnenrolling2FA(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      
      if (error) throw error;
      
      toast.success("Two-factor authentication disabled");
      refetchMFA();
    } catch (error: any) {
      toast.error("Failed to disable 2FA: " + error.message);
    } finally {
      setIsUnenrolling2FA(false);
    }
  };

  const handleSoundPreferenceChange = (enabled: boolean) => {
    setSoundNotifications(enabled);
    localStorage.setItem("notification_sound_enabled", String(enabled));
    toast.success(`Sound notifications ${enabled ? "enabled" : "disabled"}`);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${session.user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
      toast.success("Avatar uploaded! Don't forget to save your changes.");
    } catch (error: any) {
      toast.error("Failed to upload avatar: " + error.message);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate("/auth");
    }
  }, [session, sessionLoading, navigate]);

  if (sessionLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Bell className="w-4 h-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Shield className="w-4 h-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your public profile information visible to other users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-2xl">
                        {displayName?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-primary-foreground" />
                      <input 
                        id="avatar-upload"
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-medium">{displayName || "Set your display name"}</h3>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    rows={4}
                  />
                </div>

                <Separator />

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="font-medium">Social Links</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="w-4 h-4" /> Twitter/X
                    </Label>
                    <Input
                      id="twitter"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                      placeholder="@username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord" className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> Discord
                    </Label>
                    <Input
                      id="discord"
                      value={socialDiscord}
                      onChange={(e) => setSocialDiscord(e.target.value)}
                      placeholder="username#0000 or invite link"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="flex items-center gap-2">
                      <Youtube className="w-4 h-4" /> YouTube
                    </Label>
                    <Input
                      id="youtube"
                      value={socialYoutube}
                      onChange={(e) => setSocialYoutube(e.target.value)}
                      placeholder="Channel URL"
                    />
                  </div>
                </div>

                <Separator />

                {/* Payout Wallet */}
                <div className="space-y-2">
                  <Label htmlFor="payout" className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Payout Wallet Address
                  </Label>
                  <Input
                    id="payout"
                    value={payoutWallet}
                    onChange={(e) => setPayoutWallet(e.target.value)}
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This wallet will receive your earnings from tips and sales
                  </p>
                </div>

                <Button 
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when you receive notifications
                    </p>
                  </div>
                  <Switch
                    checked={soundNotifications}
                    onCheckedChange={handleSoundPreferenceChange}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the app looks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Theme
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      The app uses a dark theme by default
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    value={session.user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    value={session.user.id}
                    disabled
                    className="bg-muted font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <Input
                    value={new Date(session.user.created_at || "").toLocaleDateString()}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Password Change Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      placeholder="Enter new password"
                      className={passwordErrors.newPassword ? "border-destructive" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Confirm new password"
                      className={passwordErrors.confirmPassword ? "border-destructive" : ""}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full sm:w-auto"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mfaLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : mfaFactors?.totp && mfaFactors.totp.length > 0 ? (
                  <div className="space-y-3">
                    {mfaFactors.totp.map((factor) => (
                      <div
                        key={factor.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {factor.friendly_name || "Authenticator App"}
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added on {new Date(factor.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnenroll2FA(factor.id)}
                          disabled={isUnenrolling2FA}
                          className="text-destructive hover:text-destructive"
                        >
                          {isUnenrolling2FA ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Protect your account</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when signing in.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleStart2FAEnrollment}
                      disabled={isEnrolling2FA}
                      className="w-full sm:w-auto"
                    >
                      {isEnrolling2FA ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Enable 2FA
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full sm:w-auto"
                >
                  {isSigningOut ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 2FA Setup Dialog */}
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the verification code
              </DialogDescription>
            </DialogHeader>
            
            {totpSecret && (
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSecret.uri)}`}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Manual Entry Secret */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Or enter this code manually:
                  </Label>
                  <code className="block p-3 bg-muted rounded-lg text-center font-mono text-sm break-all">
                    {totpSecret.secret}
                  </code>
                </div>

                <Separator />

                {/* Verification Code Input */}
                <div className="space-y-4">
                  <Label>Enter the 6-digit code from your app:</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verifyCode}
                      onChange={setVerifyCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShow2FADialog(false);
                      setTotpSecret(null);
                      setVerifyCode("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerify2FA}
                    disabled={isVerifying2FA || verifyCode.length !== 6}
                    className="flex-1"
                  >
                    {isVerifying2FA ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Verify & Enable
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Settings;
