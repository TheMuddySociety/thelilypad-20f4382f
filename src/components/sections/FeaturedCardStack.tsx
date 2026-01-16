import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CardStack, CardStackItem } from "@/components/ui/card-stack";
import { Skeleton } from "@/components/ui/skeleton";

interface CardStackItemRow {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    href: string | null;
    cta_label: string | null;
    tag: string | null;
    display_order: number;
    is_active: boolean;
}

export const FeaturedCardStack: React.FC = () => {
    const [items, setItems] = useState<CardStackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveCards();
    }, []);

    const fetchActiveCards = async () => {
        try {
            const { data, error } = await supabase
                .from("card_stack_items")
                .select("*")
                .eq("is_active", true)
                .order("display_order", { ascending: true });

            if (error) throw error;

            const cardStackItems: CardStackItem[] = (data || []).map((item: CardStackItemRow) => ({
                id: item.id,
                title: item.title,
                description: item.description || undefined,
                imageSrc: item.image_url || undefined,
                href: item.href || undefined,
                ctaLabel: item.cta_label || undefined,
                tag: item.tag || undefined,
            }));

            setItems(cardStackItems);
        } catch (error) {
            console.error("Error fetching card stack items:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full">
                <Skeleton className="h-[450px] w-full rounded-xl" />
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="w-full py-12">
            <div className="container mx-auto px-4">
                <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Collections</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Explore our curated selection of outstanding NFT collections
                    </p>
                </div>
                <CardStack
                    items={items}
                    cardWidth={520}
                    cardHeight={320}
                    autoAdvance
                    pauseOnHover
                    intervalMs={3500}
                />
            </div>
        </section>
    );
};
