import TwitterTestimonials from "@/components/ui/twitter-testimonial-cards";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestimonialCardProps } from "@/components/ui/twitter-testimonial-cards";

interface TestimonialData {
    id: string;
    username: string;
    handle: string;
    content: string;
    avatar_url: string | null;
    verified: boolean;
    likes: number;
    retweets: number;
    tweet_url: string | null;
    created_at: string;
}

export const TestimonialsSection = () => {
    // Fetch testimonials from database
    const { data: testimonials } = useQuery({
        queryKey: ['testimonials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('testimonials' as any)
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .limit(3);

            if (error) {
                console.error('Error fetching testimonials:', error);
                return null;
            }

            return (data || []) as unknown as TestimonialData[];
        },
    });

    // Convert database testimonials to component props format
    const testimonialCards: TestimonialCardProps[] | undefined = testimonials?.map((t, index) => ({
        className: index === 0
            ? "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/60 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-500 hover:grayscale-0 before:left-0 before:top-0"
            : index === 1
                ? "[grid-area:stack] translate-x-8 sm:translate-x-16 translate-y-6 sm:translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/60 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-500 hover:grayscale-0 before:left-0 before:top-0"
                : "[grid-area:stack] translate-x-16 sm:translate-x-32 translate-y-12 sm:translate-y-20 hover:translate-y-6 sm:hover:translate-y-10",
        avatar: t.avatar_url || undefined,
        username: t.username,
        handle: t.handle,
        content: t.content,
        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        verified: t.verified,
        likes: t.likes || 0,
        retweets: t.retweets || 0,
        tweetUrl: t.tweet_url || 'https://x.com',
    }));

    return (
        <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />

            <div className="relative max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-4">
                        What People Are Saying
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                        Join thousands of creators and collectors who are already building on The Lily Pad
                    </p>
                </div>

                {/* Testimonials Stack */}
                <div className="flex justify-center items-center min-h-[400px] sm:min-h-[500px]">
                    <TwitterTestimonials cards={testimonialCards} />
                </div>
            </div>
        </section>
    );
};
