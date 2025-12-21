import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  User, ArrowLeft, Save, Plus, Trash2,
  Twitter, Youtube, MessageCircle, Instagram, Music2, Calendar, Tag, X
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ScheduleItem {
  day: string;
  time: string;
  timezone?: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const availableCategories = [
  'Gaming', 'Just Chatting', 'Music', 'Art', 'Cooking', 
  'Sports', 'Education', 'Technology', 'Fitness', 'Travel',
  'Comedy', 'News', 'Crypto', 'DeFi', 'NFTs'
];

const EditStreamerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialDiscord, setSocialDiscord] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUserId(session.user.id);

      const { data: profile, error } = await supabase
        .from('streamer_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (profile) {
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setSocialTwitter(profile.social_twitter || "");
        setSocialYoutube(profile.social_youtube || "");
        setSocialDiscord(profile.social_discord || "");
        setSocialInstagram(profile.social_instagram || "");
        setSocialTiktok(profile.social_tiktok || "");
        
        // Parse schedule
        try {
          const rawSchedule = profile.schedule as unknown;
          const parsedSchedule = Array.isArray(rawSchedule) 
            ? (rawSchedule as ScheduleItem[])
            : [];
          setSchedule(parsedSchedule);
        } catch {
          setSchedule([]);
        }

        // Parse categories
        setCategories(Array.isArray(profile.categories) ? profile.categories : []);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('streamer_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const profileData = {
      user_id: userId,
      display_name: displayName || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      social_twitter: socialTwitter || null,
      social_youtube: socialYoutube || null,
      social_discord: socialDiscord || null,
      social_instagram: socialInstagram || null,
      social_tiktok: socialTiktok || null,
      schedule: JSON.parse(JSON.stringify(schedule)),
      categories: categories,
    };

    let error;
    if (existingProfile) {
      const result = await supabase
        .from('streamer_profiles')
        .update(profileData)
        .eq('user_id', userId);
      error = result.error;
    } else {
      const result = await supabase
        .from('streamer_profiles')
        .insert(profileData);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Profile saved!",
        description: "Your streamer profile has been updated."
      });
      navigate(`/streamer/${userId}`);
    }
  };

  const addScheduleItem = () => {
    setSchedule([...schedule, { day: 'Monday', time: '8:00 PM', timezone: 'EST' }]);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>

          {/* Basic Info */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your streamer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell viewers about yourself..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Categories / Genres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select categories that describe your content (click to toggle):
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={categories.includes(category) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      categories.includes(category) 
                        ? "bg-primary hover:bg-primary/80" 
                        : "hover:bg-primary/20"
                    }`}
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                    {categories.includes(category) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {categories.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Selected: {categories.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Twitter className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Youtube className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={socialYoutube}
                    onChange={(e) => setSocialYoutube(e.target.value)}
                    placeholder="https://youtube.com/@channel"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={socialDiscord}
                    onChange={(e) => setSocialDiscord(e.target.value)}
                    placeholder="https://discord.gg/invite"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/username"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Music2 className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={socialTiktok}
                    onChange={(e) => setSocialTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@username"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Streaming Schedule
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addScheduleItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedule.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No schedule items. Click "Add" to create your streaming schedule.
                </p>
              ) : (
                schedule.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <Select
                      value={item.day}
                      onValueChange={(value) => updateScheduleItem(index, 'day', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.time}
                      onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                      placeholder="8:00 PM"
                      className="flex-1"
                    />
                    <Input
                      value={item.timezone || ''}
                      onChange={(e) => updateScheduleItem(index, 'timezone', e.target.value)}
                      placeholder="EST"
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeScheduleItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EditStreamerProfile;
